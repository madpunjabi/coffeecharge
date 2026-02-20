#!/usr/bin/env npx tsx
// scripts/reseed-california.ts
// Idempotent re-seed of all California EV stations from NREL.
// Loads all existing CA stops into memory first, then processes NREL pages
// with no per-page DB queries — updates existing records, creates new ones.
// Run: npx tsx scripts/reseed-california.ts

import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

if (!process.env.NEXT_PUBLIC_INSTANT_APP_ID || !process.env.INSTANT_ADMIN_TOKEN || !process.env.NREL_API_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_INSTANT_APP_ID, INSTANT_ADMIN_TOKEN, NREL_API_KEY")
  process.exit(1)
}

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200
const BATCH_SIZE = 25
const BATCH_DELAY = 800
const PAGE_DELAY = 2000

function normalizeNetwork(raw: string | null | undefined): string {
  const n = (raw ?? "").toLowerCase()
  if (n.includes("tesla")) return "Tesla Supercharger"
  if (n.includes("electrify america")) return "Electrify America"
  if (n.includes("chargepoint")) return "ChargePoint"
  if (n.includes("evgo")) return "EVgo"
  if (n.includes("blink")) return "Blink"
  return "Unknown"
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function transactWithRetry(batch: object[]) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transact(batch as any)
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt === 5) throw new Error(`Batch failed after 5 attempts: ${msg}`)
      console.warn(`    retry ${attempt}/5: ${msg}`)
      await sleep(2000 * attempt)
    }
  }
}

async function fetchNrelPage(offset: number) {
  const url = new URL(NREL_BASE)
  url.searchParams.set("api_key", process.env.NREL_API_KEY!)
  url.searchParams.set("fuel_type", "ELEC")
  url.searchParams.set("status", "E")
  url.searchParams.set("access", "public")
  url.searchParams.set("state", "CA")
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("offset", String(offset))
  const res = await fetch(url.toString())
  return res.json() as Promise<{ fuel_stations: Record<string, unknown>[]; total_results: number }>
}

async function loadExistingCaStops(): Promise<Map<string, string>> {
  // Load all CA stops from DB in one query, return nrelId → stopId map
  console.log("Loading existing CA stops from DB…")
  const result = await db.query({
    stops: { $: { where: { state: "CA" } } },
  })
  const map = new Map<string, string>()
  for (const s of result.stops ?? []) {
    if (s.nrelId) map.set(s.nrelId as string, s.id)
  }
  console.log(`  ${map.size} existing CA stops loaded\n`)
  return map
}

async function main() {
  // Step 1: load existing CA stops into memory (one query, no per-page lookups)
  const existingMap = await loadExistingCaStops()

  // Step 2: fetch NREL total
  console.log("Fetching CA stations from NREL…")
  const firstPage = await fetchNrelPage(0)
  const total = firstPage.total_results
  console.log(`  ${total} CA stations in NREL\n`)

  let offset = 0
  let processed = 0
  let updated = 0
  let created = 0

  while (offset < total) {
    const data = offset === 0 ? firstPage : await fetchNrelPage(offset)
    const stations = data.fuel_stations ?? []
    if (stations.length === 0) break

    const txns = stations.map((s) => {
      const nrelId = String(s.id)
      const existingId = existingMap.get(nrelId)
      const stopId = existingId ?? id()
      if (existingId) updated++; else created++

      const connectors = (s.ev_connector_types as string[] | null) ?? []
      const dcFastCount = Number(s.ev_dc_fast_num ?? 0)
      const l2Count = Number(s.ev_level2_evse_num ?? 0)

      return db.tx.stops[stopId].update({
        nrelId,
        name: String(s.station_name),
        address: String(s.street_address),
        city: String(s.city),
        state: String(s.state),
        zip: String(s.zip),
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        network: normalizeNetwork(s.ev_network as string | null),
        maxPowerKw: dcFastCount > 0 ? 150 : 7,
        connectorTypesJson: JSON.stringify(connectors),
        hasCcs: connectors.includes("J1772COMBO"),
        hasNacs: connectors.includes("NACS"),
        hasChademo: connectors.includes("CHADEMO"),
        totalStalls: dcFastCount + l2Count,
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

    for (let i = 0; i < txns.length; i += BATCH_SIZE) {
      await transactWithRetry(txns.slice(i, i + BATCH_SIZE))
      await sleep(BATCH_DELAY)
    }

    processed += stations.length
    console.log(`  ${processed}/${total} (${updated} updated, ${created} new)`)

    offset += PAGE_SIZE
    if (offset < total) await sleep(PAGE_DELAY)
  }

  console.log(`\n✅ Done! ${processed} CA stations: ${updated} updated, ${created} new.`)
}

main().catch(err => { console.error(err); process.exit(1) })
