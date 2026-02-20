#!/usr/bin/env npx tsx
// scripts/seed-target.ts
// Fetches all US Target stores from OSM Overpass API and seeds them as amenities
// linked to any charging stop within 400m.
// Run: npx tsx scripts/seed-target.ts

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

// ── Overpass query: all US Target stores by Wikidata ID ─────────────────────
const OVERPASS_QUERY = `[out:json][timeout:90];
node["brand:wikidata"="Q1046951"](24,-125,50,-66);
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
async function fetchTarget(): Promise<OverpassNode[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
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

async function fetchStops(db: ReturnType<typeof init<typeof schema>>): Promise<Stop[]> {
  const result = await db.query({ stops: {} })
  return (result.stops ?? []).map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
  }))
}

async function fetchExistingTargetStopIds(db: ReturnType<typeof init<typeof schema>>): Promise<Set<string>> {
  const result = await db.query({ amenities: {} })
  const seeded = new Set<string>()
  for (const a of result.amenities ?? []) {
    const brand = (a.brand ?? "") as string
    if (brand.toLowerCase().includes("target")) {
      seeded.add(a.stopId as string)
    }
  }
  return seeded
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Env-var guard
  if (!process.env.NEXT_PUBLIC_INSTANT_APP_ID || !process.env.INSTANT_ADMIN_TOKEN) {
    console.error("Missing NEXT_PUBLIC_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in .env.local")
    process.exit(1)
  }

  // InstantDB admin client — initialized after the env-var guard
  const db = init({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
    adminToken: process.env.INSTANT_ADMIN_TOKEN,
    schema,
  })

  console.log("Fetching Target locations + stops in parallel…")
  const [targets, stops] = await Promise.all([fetchTarget(), fetchStops(db)])
  console.log(`  ${targets.length} Target stores from Overpass`)
  console.log(`  ${stops.length} stops from InstantDB`)

  console.log("Checking existing Target amenities for idempotency…")
  const alreadySeeded = await fetchExistingTargetStopIds(db)
  console.log(`  ${alreadySeeded.size} stops already have a Target linked`)

  const grid = buildGrid(stops)

  // Match each Target → nearby stops, build transaction list
  type TxnGroup = ReturnType<typeof db.tx.amenities[string]["update"]>[]
  const allTxnGroups: TxnGroup[] = []
  let matchedPairs = 0

  for (const node of targets) {
    const nearby = findNearbyStops(node, grid)
    for (const { stop, distM } of nearby) {
      if (alreadySeeded.has(stop.id)) continue
      const amenityId = id()
      allTxnGroups.push([
        db.tx.amenities[amenityId].update({
          stopId: stop.id,
          overtureId: `osm-${node.id}`,
          name: node.tags["name"] ?? "Target",
          brand: "Target",
          category: "retail",
          lat: node.lat,
          lng: node.lon,
          walkMeters: Math.round(distM),
          walkMinutes: Math.max(1, Math.round(distM / WALK_SPEED_MPM)),
          hoursJson: node.tags["opening_hours"] ?? null,
          rating: 0,
          reviewCount: 0,
          isIndoor: true,
          hasWifi: false,
          hasFreeRestroom: true,
          hoursUpdatedAt: Date.now(),
        }),
        db.tx.amenities[amenityId].link({ stop: stop.id }),
      ])
      matchedPairs++
    }
  }

  console.log(`\n${matchedPairs} Target–stop pairs to seed`)
  if (matchedPairs === 0) {
    console.log("Nothing to seed. All stops already have Target or none are within 400m.")
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
    const windowLengths = window.map(chunk => chunk.length)  // capture before settling

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

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === "fulfilled") {
        written += result.value ?? 0
      } else {
        failedPairs += windowLengths[j]  // use actual chunk length, not TXN_BATCH_SIZE
      }
    }

    process.stdout.write(`  ${written}/${matchedPairs} pairs written\r`)

    // 300ms sleep between write windows
    await new Promise(r => setTimeout(r, 300))
  }

  if (failedPairs > 0) {
    console.log(`\n⚠️  Done with errors. ${written} pairs written, ${failedPairs} pairs failed after all retries.`)
  } else {
    console.log(`\n✅ Done! ${matchedPairs} Target amenities seeded.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
