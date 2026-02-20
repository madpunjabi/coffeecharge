// app/api/seed-stations/route.ts
import { NextRequest, NextResponse } from "next/server"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"
import { id } from "@instantdb/admin"

const adminDB = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200

export const maxDuration = 300  // Vercel Pro: 5 minutes. Free: 10s — use state param to seed by state

export async function POST(req: NextRequest) {
  const seedSecret = req.headers.get("x-seed-secret")
  if (!process.env.SEED_SECRET || seedSecret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const state = searchParams.get("state") ?? "CA"  // seed one state at a time
  const offset = parseInt(searchParams.get("offset") ?? "0")

  const url = new URL(NREL_BASE)
  url.searchParams.set("api_key", process.env.NREL_API_KEY!)
  url.searchParams.set("fuel_type", "ELEC")
  url.searchParams.set("status", "E")
  url.searchParams.set("access", "public")
  url.searchParams.set("state", state)
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("offset", String(offset))

  const res = await fetch(url.toString())
  const data = await res.json()
  const stations = data.alt_fuel_stations ?? []

  const transactions = stations.map((s: Record<string, unknown>) => {
    const connectors = (s.ev_connector_types as string[] | null) ?? []
    const stopId = id()
    return adminDB.tx.stops[stopId].update({
      nrelId: String(s.id),
      name: String(s.station_name),
      address: String(s.street_address),
      city: String(s.city),
      state: String(s.state),
      zip: String(s.zip),
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      network: String(s.ev_network ?? "Unknown"),
      maxPowerKw: Number(s.ev_dc_fast_num ?? 0) > 0 ? 150 : 7,  // DC fast = assume 150kW min
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

  // InstantDB transact in batches of 25
  for (let i = 0; i < transactions.length; i += 25) {
    await adminDB.transact(transactions.slice(i, i + 25))
  }

  return NextResponse.json({
    inserted: stations.length,
    nextOffset: offset + PAGE_SIZE,
    total: data.total_results,
  })
}
