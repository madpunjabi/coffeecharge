#!/usr/bin/env npx tsx
// scripts/seed-nrel.ts
// Fetches all US EV charging stations from NREL and seeds them into InstantDB.
// Run: npx tsx scripts/seed-nrel.ts

import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200
const TXN_BATCH_SIZE = 10

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]

async function fetchNrelPage(state: string, offset: number): Promise<{ stations: Record<string, unknown>[], total: number }> {
  const url = new URL(NREL_BASE)
  url.searchParams.set("api_key", process.env.NREL_API_KEY!)
  url.searchParams.set("fuel_type", "ELEC")
  url.searchParams.set("status", "E")
  url.searchParams.set("access", "public")
  url.searchParams.set("state", state)
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("offset", String(offset))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`NREL API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return { stations: data.fuel_stations ?? [], total: data.total_results ?? 0 }
}

async function seedState(
  db: ReturnType<typeof init<typeof schema>>,
  state: string
): Promise<number> {
  let offset = 0
  let totalInserted = 0

  while (true) {
    const { stations, total } = await fetchNrelPage(state, offset)
    if (stations.length === 0) break

    // Build transactions
    type Txn = ReturnType<typeof db.tx.stops[string]["update"]>
    const txns: Txn[] = stations.map((s) => {
      const connectors = (s.ev_connector_types as string[] | null) ?? []
      const stopId = id()
      return db.tx.stops[stopId].update({
        nrelId: String(s.id),
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
        isActive: true,
      })
    })

    // Write one at a time — stops entity has many indexed fields, batches time out
    for (const txn of txns) {
      await db.transact(txn)
    }

    totalInserted += stations.length
    process.stdout.write(`  ${state}: ${totalInserted}/${total}\r`)

    offset += PAGE_SIZE
    if (offset >= total) break
    await new Promise(r => setTimeout(r, 300))
  }

  return totalInserted
}

async function main() {
  if (!process.env.NEXT_PUBLIC_INSTANT_APP_ID || !process.env.INSTANT_ADMIN_TOKEN) {
    console.error("Missing NEXT_PUBLIC_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in .env.local")
    process.exit(1)
  }
  if (!process.env.NREL_API_KEY) {
    console.error("Missing NREL_API_KEY in .env.local")
    process.exit(1)
  }

  const db = init({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
    adminToken: process.env.INSTANT_ADMIN_TOKEN,
    schema,
  })

  console.log("Seeding all US EV charging stations from NREL...")
  let grandTotal = 0

  for (const state of STATES) {
    process.stdout.write(`  ${state}: fetching...\r`)
    const inserted = await seedState(db, state)
    grandTotal += inserted
    console.log(`  ${state}: ${inserted} stations done         `)
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nDone! ${grandTotal} stations seeded across ${STATES.length} states.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
