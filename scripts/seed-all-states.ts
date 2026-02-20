#!/usr/bin/env npx tsx
// scripts/seed-all-states.ts
// Run: npx tsx scripts/seed-all-states.ts
// Seeds all US states into InstantDB directly using the admin SDK.

import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200

// States already seeded — skip them. Update this list as states complete.
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

async function seedState(state: string) {
  let offset = 0
  let total = Infinity
  let stateInserted = 0

  while (offset < total) {
    const data = await fetchNrel(state, offset)
    const stations = data.fuel_stations ?? []
    total = data.total_results ?? 0

    if (stations.length === 0) break

    // No dedup for initial seeding of new states — just insert fresh
    const txns = stations.map((s) => {
      const stopId = id()
      const nrelId = String(s.id)
      const connectors = (s.ev_connector_types as string[] | null) ?? []
      return db.tx.stops[stopId].update({
        nrelId,
        name: String(s.station_name),
        address: String(s.street_address),
        city: String(s.city),
        state: String(s.state),
        zip: String(s.zip),
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        network: String(s.ev_network ?? "Unknown"),
        maxPowerKw: Number(s.ev_dc_fast_num ?? 0) > 0 ? 150 : 7,
        connectorTypesJson: JSON.stringify(connectors),
        hasCcs: connectors.includes("J1772COMBO"),
        hasNacs: connectors.includes("NACS"),
        hasChademo: connectors.includes("CHADEMO"),
        totalStalls: Number(s.ev_dc_fast_num ?? 0) + Number(s.ev_level2_evse_num ?? 0),
        pricePerKwh: 0,
        ccScore: 0,
        chargeScore: 0,
        brewScore: 0,
        reliabilityLevel: "medium",
        availableStalls: 0,
        occupiedStalls: 0,
        brokenStalls: 0,
        statusUpdatedAt: Date.now(),
        brewScoreComputedAt: 0,
        lastCheckInAt: 0,
        checkInCount: 0,
        photoCount: 0,
        lastVerifiedAt: Date.now(),
        isActive: s.status_code === "E",
      })
    })

    for (let i = 0; i < txns.length; i += 10) {
      const batch = txns.slice(i, i + 10)
      let attempts = 0
      while (attempts < 5) {
        try {
          await db.transact(batch)
          break
        } catch {
          attempts++
          await new Promise(r => setTimeout(r, 2000 * attempts))
        }
      }
      await new Promise(r => setTimeout(r, 300))
    }

    stateInserted += stations.length
    offset += PAGE_SIZE
    process.stdout.write(`  ${state} offset=${offset}/${total} (+${stations.length})\r`)
    await new Promise(r => setTimeout(r, 1000)) // rate limiting between pages
  }

  return stateInserted
}

async function main() {
  const states = ALL_STATES.filter(s => !ALREADY_SEEDED.has(s))
  console.log(`Seeding ${states.length} states: ${states.join(" ")}`)

  let grandTotal = 0
  const failed: string[] = []
  for (const state of states) {
    process.stdout.write(`\n── ${state} ──\n`)
    try {
      const inserted = await seedState(state)
      grandTotal += inserted
      console.log(`\n  ✓ ${state}: ${inserted} stations`)
    } catch (err) {
      console.error(`\n  ✗ ${state}: failed — ${err}`)
      failed.push(state)
    }
  }
  if (failed.length) console.log(`\nFailed states (re-add to ALREADY_SEEDED for others and rerun): ${failed.join(" ")}`)

  console.log(`\n✅ Done! ${grandTotal} total stations seeded.`)
}

main().catch(err => { console.error(err); process.exit(1) })
