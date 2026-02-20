#!/usr/bin/env npx tsx
// scripts/seed-all-states.ts
// Run: npx tsx scripts/seed-all-states.ts

import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200
const BATCH_SIZE = 5      // smaller batches = less chance of timeout
const BATCH_DELAY = 1500  // ms between batches
const PAGE_DELAY = 3000   // ms between pages
const STATE_DELAY = 5000  // ms between states

// States already confirmed in DB — skip them.
const ALREADY_SEEDED = new Set([
  "CA", "TX", "FL", "NY", "CO", "WA", "NV", "OR", "AZ", // Phase 4 seeds
  "AL", "AK", "AR", "CT", "DE", "GA",  // Phase 6 run 1
])

const ALL_STATES = [
  "AL","AK","AR","CT","DE","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS",
  "MO","MT","NE","NH","NJ","NM","NC","ND","OH","OK",
  "PA","RI","SC","SD","TN","UT","VT","VA","WV","WI","WY","DC",
]

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function transactWithRetry(batch: ReturnType<typeof db.tx.stops[string]["update"]>[]) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await db.transact(batch)
      return // success
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt === 5) throw new Error(`Batch failed after 5 attempts: ${msg}`)
      console.warn(`    retry ${attempt}/5 after error: ${msg}`)
      await sleep(2000 * attempt)
    }
  }
}

async function fetchNrel(state: string, offset: number) {
  const url = new URL(NREL_BASE)
  url.searchParams.set("api_key", process.env.NREL_API_KEY!)
  url.searchParams.set("fuel_type", "ELEC")
  url.searchParams.set("status", "E")
  url.searchParams.set("access", "public")
  url.searchParams.set("state", state)
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("offset", String(offset))
  const res = await fetch(url.toString())
  return res.json() as Promise<{ fuel_stations: Record<string, unknown>[]; total_results: number }>
}

async function seedState(state: string): Promise<number> {
  let offset = 0
  let total = Infinity
  let stateInserted = 0

  while (offset < total) {
    const data = await fetchNrel(state, offset)
    const stations = data.fuel_stations ?? []
    total = data.total_results ?? 0
    if (stations.length === 0) break

    const txns = stations.map((s) => {
      const connectors = (s.ev_connector_types as string[] | null) ?? []
      return db.tx.stops[id()].update({
        nrelId:            String(s.id),
        name:              String(s.station_name),
        address:           String(s.street_address),
        city:              String(s.city),
        state:             String(s.state),
        zip:               String(s.zip),
        lat:               Number(s.latitude),
        lng:               Number(s.longitude),
        network:           String(s.ev_network ?? "Unknown"),
        maxPowerKw:        Number(s.ev_dc_fast_num ?? 0) > 0 ? 150 : 7,
        connectorTypesJson: JSON.stringify(connectors),
        hasCcs:            connectors.includes("J1772COMBO"),
        hasNacs:           connectors.includes("NACS"),
        hasChademo:        connectors.includes("CHADEMO"),
        totalStalls:       Number(s.ev_dc_fast_num ?? 0) + Number(s.ev_level2_evse_num ?? 0),
        pricePerKwh:       0,
        ccScore:           0,
        chargeScore:       0,
        brewScore:         0,
        reliabilityLevel:  "medium",
        availableStalls:   0,
        occupiedStalls:    0,
        brokenStalls:      0,
        statusUpdatedAt:   Date.now(),
        brewScoreComputedAt: 0,
        lastCheckInAt:     0,
        checkInCount:      0,
        photoCount:        0,
        lastVerifiedAt:    Date.now(),
        isActive:          s.status_code === "E",
      })
    })

    // Transact in small batches with retries
    for (let i = 0; i < txns.length; i += BATCH_SIZE) {
      await transactWithRetry(txns.slice(i, i + BATCH_SIZE))
      await sleep(BATCH_DELAY)
    }

    stateInserted += stations.length
    offset += PAGE_SIZE
    console.log(`  ${state}: ${stateInserted}/${total} inserted (offset ${offset})`)
    await sleep(PAGE_DELAY)
  }

  return stateInserted
}

async function main() {
  const states = ALL_STATES.filter(s => !ALREADY_SEEDED.has(s))
  console.log(`Seeding ${states.length} states: ${states.join(" ")}\n`)

  let grandTotal = 0
  const failed: string[] = []

  for (const state of states) {
    console.log(`── ${state} ──`)
    try {
      const inserted = await seedState(state)
      grandTotal += inserted
      console.log(`✓ ${state}: ${inserted} stations\n`)
    } catch (err) {
      console.error(`✗ ${state}: FAILED — ${err}\n`)
      failed.push(state)
    }
    await sleep(STATE_DELAY)
  }

  console.log(`\n✅ Done! ${grandTotal} stations seeded this run.`)
  if (failed.length) {
    console.log(`Failed states (add to ALREADY_SEEDED and rerun): ${failed.join(" ")}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
