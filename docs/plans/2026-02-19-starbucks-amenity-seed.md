# Starbucks Amenity Seed — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Seed all ~16k US Starbucks locations as amenities in InstantDB so the Starbucks filter in the app returns real results.

**Architecture:** Single script `scripts/seed-starbucks.ts`. Fetches Starbucks from OSM Overpass API (free, no key, no DuckDB required), fetches all seeded stops from InstantDB, spatially matches each Starbucks to stops within 400m using a 0.1° grid index, then writes amenities in parallel batches.

**Tech Stack:** Node.js (tsx) · @instantdb/admin · Overpass API · dotenv

---

## Task 1: Create scripts/seed-starbucks.ts

**Files:**
- Create: `scripts/seed-starbucks.ts`

**Step 1: Create the file**

```typescript
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
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  })
  if (!res.ok) throw new Error(`Overpass API error: ${res.status} ${res.statusText}`)
  const json = await res.json() as { elements: OverpassNode[] }
  return json.elements.filter(e => e.type === "node")
}

async function fetchStops(): Promise<Stop[]> {
  const result = await db.query({ stops: {} })
  return (result.stops ?? []).map((s) => ({
    id: s.id as string,
    lat: s.lat as number,
    lng: s.lng as number,
  }))
}

async function fetchExistingStarbucksStopIds(): Promise<Set<string>> {
  const result = await db.query({ amenities: {} })
  const seeded = new Set<string>()
  for (const a of result.amenities ?? []) {
    const brand = (a.brand as string | null) ?? ""
    if (brand.toLowerCase().includes("starbucks")) {
      seeded.add(a.stopId as string)
    }
  }
  return seeded
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
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

  // Write CONCURRENT_BATCHES chunks at a time
  let written = 0
  for (let i = 0; i < chunks.length; i += CONCURRENT_BATCHES) {
    const window = chunks.slice(i, i + CONCURRENT_BATCHES)
    await Promise.allSettled(
      window.map(async (chunk) => {
        await db.transact(chunk.flat())
        written += chunk.length
      })
    )
    process.stdout.write(`  ${Math.min(written * TXN_BATCH_SIZE, matchedPairs)}/${matchedPairs} pairs written\r`)
  }

  console.log(`\n✅ Done! ${matchedPairs} Starbucks amenities seeded across ${matchedPairs} stop-Starbucks pairs.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 3: Commit**

```bash
git add scripts/seed-starbucks.ts
git commit -m "feat: add Starbucks amenity seeding script via Overpass API"
```

---

## Task 2: Dry-run verification

Verify data fetching works before writing to InstantDB.

**Step 1: Test Overpass fetch in isolation**

```bash
curl -s -X POST "https://overpass-api.de/api/interpreter" \
  --data 'data=[out:json][timeout=30];node["brand:wikidata"="Q37158"](37.7,-122.5,37.8,-122.4);out body;' \
  | npx tsx -e "
    const data = require('fs').readFileSync('/dev/stdin','utf8');
    const j = JSON.parse(data);
    console.log('nodes:', j.elements.length);
    console.log('sample:', JSON.stringify(j.elements[0], null, 2));
  "
```
Expected: 5–20 nodes near San Francisco, each with `lat`, `lon`, `tags.name`, `tags.opening_hours`.

**Step 2: Run script with dry-run log**

Add a temporary `process.exit(0)` before the write loop and run:

```bash
npx tsx scripts/seed-starbucks.ts
```
Expected output:
```
Fetching Starbucks locations + stops in parallel…
  ~16000 Starbucks from Overpass
  ~70000 stops from InstantDB
Checking existing Starbucks amenities for idempotency…
  0 stops already have a Starbucks linked
N Starbucks–stop pairs to seed
```
Verify N > 0 before proceeding.

**Step 3: Remove the early exit and run for real**

```bash
npx tsx scripts/seed-starbucks.ts
```
Expected: Completes in 2–5 minutes, prints `✅ Done!` with total pairs seeded.

---

## Task 3: Verify in app

**Step 1: Open the app and tap the Starbucks filter pill**

The filter should now return stops that have a Starbucks within 400m.

**Step 2: Spot-check a result**

Pick a station card that appears under the Starbucks filter and confirm its amenity pills include a Starbucks entry.

**Step 3: Commit any fixes if needed**

```bash
git add scripts/seed-starbucks.ts
git commit -m "fix: correct Starbucks seeding edge cases"
```
