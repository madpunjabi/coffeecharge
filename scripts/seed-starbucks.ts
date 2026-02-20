#!/usr/bin/env npx tsx
// scripts/seed-starbucks.ts
// Fetches all US Starbucks from OSM Overpass API and seeds them as amenities
// linked to any charging stop within 400m.
// Run: npx tsx scripts/seed-starbucks.ts

import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

// ── Config ──────────────────────────────────────────────────────────────────
const RADIUS_METERS = 400
const WALK_SPEED_MPM = 80        // metres per minute walking speed
const GRID_CELL_DEG = 0.1        // ~8km grid cells for spatial index
const CONCURRENT_BATCHES = 10    // parallel InstantDB write batches
const TXN_BATCH_SIZE = 25        // transactions per batch

// ── Overpass query: all US Starbucks by Wikidata ID ─────────────────────────
const OVERPASS_QUERY = `[out:json][timeout:90];
node["brand:wikidata"="Q37158"](24,-125,50,-66);
out body;`

// ── Types ────────────────────────────────────────────────────────────────────
interface OverpassNode {
  type: string
  id: number
  lat: number
  lon: number
  tags: Record<string, string>
}

interface Stop {
  id: string
  lat: number
  lng: number
}

// ── InstantDB admin client ───────────────────────────────────────────────────
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

// ── Spatial helpers ──────────────────────────────────────────────────────────
function gridKey(lat: number, lng: number): string {
  return `${Math.floor(lat / GRID_CELL_DEG)},${Math.floor(lng / GRID_CELL_DEG)}`
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildGrid(stops: Stop[]): Map<string, Stop[]> {
  const grid = new Map<string, Stop[]>()
  for (const stop of stops) {
    const key = gridKey(stop.lat, stop.lng)
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key)!.push(stop)
  }
  return grid
}

function findNearbyStops(
  node: OverpassNode,
  grid: Map<string, Stop[]>
): { stop: Stop; distM: number }[] {
  const results: { stop: Stop; distM: number }[] = []
  const cLat = Math.floor(node.lat / GRID_CELL_DEG)
  const cLng = Math.floor(node.lon / GRID_CELL_DEG)
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const key = `${cLat + dLat},${cLng + dLng}`
      for (const stop of grid.get(key) ?? []) {
        const distM = haversineMeters(node.lat, node.lon, stop.lat, stop.lng)
        if (distM <= RADIUS_METERS) results.push({ stop, distM })
      }
    }
  }
  return results
}

// ── Data fetchers ─────────────────────────────────────────────────────────────
async function fetchStarbucks(): Promise<OverpassNode[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass API error: ${res.status} ${res.statusText}`)
    const json = await res.json() as { elements: OverpassNode[] }
    return json.elements.filter(e => e.type === "node")
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchStops(): Promise<Stop[]> {
  const result = await db.query({ stops: {} })
  return (result.stops ?? []).map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
  }))
}

async function fetchExistingStarbucksStopIds(): Promise<Set<string>> {
  const result = await db.query({ amenities: {} })
  const seeded = new Set<string>()
  for (const a of result.amenities ?? []) {
    const brand = a.brand ?? ""
    if (brand.toLowerCase().includes("starbucks")) {
      seeded.add(a.stopId)
    }
  }
  return seeded
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Fix 4: Env-var guard
  if (!process.env.NEXT_PUBLIC_INSTANT_APP_ID || !process.env.INSTANT_ADMIN_TOKEN) {
    console.error("Missing NEXT_PUBLIC_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in .env.local")
    process.exit(1)
  }

  console.log("Fetching Starbucks locations + stops in parallel…")
  const [starbucks, stops] = await Promise.all([fetchStarbucks(), fetchStops()])
  console.log(`  ${starbucks.length} Starbucks from Overpass`)
  console.log(`  ${stops.length} stops from InstantDB`)

  console.log("Checking existing Starbucks amenities for idempotency…")
  const alreadySeeded = await fetchExistingStarbucksStopIds()
  console.log(`  ${alreadySeeded.size} stops already have a Starbucks linked`)

  const grid = buildGrid(stops)

  // Match each Starbucks → nearby stops, build transaction list
  type TxnGroup = ReturnType<typeof db.tx.amenities[string]["update"]>[]
  const allTxnGroups: TxnGroup[] = []
  let matchedPairs = 0

  for (const node of starbucks) {
    const nearby = findNearbyStops(node, grid)
    for (const { stop, distM } of nearby) {
      if (alreadySeeded.has(stop.id)) continue
      const amenityId = id()
      allTxnGroups.push([
        db.tx.amenities[amenityId].update({
          stopId: stop.id,
          overtureId: `osm-${node.id}`,
          name: node.tags["name"] ?? "Starbucks",
          brand: "Starbucks",
          category: "coffee",
          lat: node.lat,
          lng: node.lon,
          walkMeters: Math.round(distM),
          walkMinutes: Math.max(1, Math.round(distM / WALK_SPEED_MPM)),
          hoursJson: node.tags["opening_hours"] ?? null,
          rating: 0,
          reviewCount: 0,
          isIndoor: false,
          hasWifi: true,
          hasFreeRestroom: false,
          hoursUpdatedAt: Date.now(),
        }),
        db.tx.amenities[amenityId].link({ stop: stop.id }),
      ])
      matchedPairs++
    }
  }

  console.log(`\n${matchedPairs} Starbucks–stop pairs to seed`)
  if (matchedPairs === 0) {
    console.log("Nothing to seed. All stops already have Starbucks or none are within 400m.")
    return
  }

  // Chunk into batches of TXN_BATCH_SIZE
  const chunks: TxnGroup[][] = []
  for (let i = 0; i < allTxnGroups.length; i += TXN_BATCH_SIZE) {
    chunks.push(allTxnGroups.slice(i, i + TXN_BATCH_SIZE))
  }

  // Write CONCURRENT_BATCHES chunks at a time, with retry logic and 300ms sleep between windows
  let written = 0
  let failedPairs = 0

  for (let i = 0; i < chunks.length; i += CONCURRENT_BATCHES) {
    const window = chunks.slice(i, i + CONCURRENT_BATCHES)

    const results = await Promise.allSettled(
      window.map(async (chunk, windowIdx) => {
        const maxAttempts = 3
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            await db.transact(chunk.flat())
            return chunk.length
          } catch (err) {
            if (attempt === maxAttempts) {
              console.error(
                `\n  Chunk ${i + windowIdx} failed after ${maxAttempts} attempts:`,
                err instanceof Error ? err.message : err
              )
              throw err
            }
            const backoffMs = 1_000 * attempt
            await new Promise(r => setTimeout(r, backoffMs))
          }
        }
        // Unreachable — satisfies TypeScript
        throw new Error("Exhausted retries")
      })
    )

    for (const result of results) {
      if (result.status === "fulfilled") {
        written += result.value ?? 0
      } else {
        failedPairs += TXN_BATCH_SIZE
      }
    }

    process.stdout.write(`  ${written}/${matchedPairs} pairs written\r`)

    // Fix 5: 300ms sleep between write windows
    await new Promise(r => setTimeout(r, 300))
  }

  if (failedPairs > 0) {
    console.log(`\n⚠️  Done with errors. ${written} pairs written, ${failedPairs} pairs failed after all retries.`)
  } else {
    console.log(`\n✅ Done! ${matchedPairs} Starbucks amenities seeded.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
