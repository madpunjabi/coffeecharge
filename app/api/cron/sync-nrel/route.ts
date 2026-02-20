// app/api/cron/sync-nrel/route.ts
// Fetches NREL stations modified in the past 8 days (slight overlap for safety)
// Updates existing stops; inserts new ones
import { NextRequest, NextResponse } from "next/server"
import { init, id } from "@instantdb/admin"
import schema from "@/instant.schema"

const adminDB = init({ appId: process.env.INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

function normalizeNetwork(raw: string | null | undefined): string {
  const n = (raw ?? "").toLowerCase()
  if (n.includes("tesla") && n.includes("supercharger")) return "Tesla Supercharger"
  if (n.includes("tesla")) return "Tesla Supercharger"
  if (n.includes("electrify america")) return "Electrify America"
  if (n.includes("chargepoint")) return "ChargePoint"
  if (n.includes("evgo")) return "EVgo"
  if (n.includes("blink")) return "Blink"
  return "Unknown"
}

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const state = searchParams.get("state") ?? "CA"
  const offset = parseInt(searchParams.get("offset") ?? "0")

  // Fetch stations modified in the last 8 days
  const modifiedSince = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const url = new URL(NREL_BASE)
  url.searchParams.set("api_key", process.env.NREL_API_KEY!)
  url.searchParams.set("fuel_type", "ELEC")
  url.searchParams.set("status", "E")
  url.searchParams.set("access", "public")
  url.searchParams.set("state", state)
  url.searchParams.set("modified_since", modifiedSince)
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("offset", String(offset))

  const res = await fetch(url.toString())
  const data = await res.json()
  const stations = data.fuel_stations ?? []

  // For each station: find existing by nrelId or create new
  const existingResult = await adminDB.query({
    stops: {
      $: {
        where: {
          or: stations.map((s: Record<string, unknown>) => ({ nrelId: String(s.id) })),
        },
      },
    },
  })
  const existingByNrelId = new Map(existingResult.stops.map(s => [s.nrelId, s.id]))

  const transactions = stations.map((s: Record<string, unknown>) => {
    const nrelId = String(s.id)
    const stopId = existingByNrelId.get(nrelId) ?? id()
    const connectors = (s.ev_connector_types as string[] | null) ?? []

    return adminDB.tx.stops[stopId].update({
      nrelId,
      name: String(s.station_name),
      address: String(s.street_address),
      city: String(s.city),
      state: String(s.state),
      zip: String(s.zip),
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      network: normalizeNetwork(s.ev_network as string | null),
      maxPowerKw: Number(s.ev_dc_fast_num ?? 0) > 0 ? 150 : 7,
      connectorTypesJson: JSON.stringify(connectors),
      hasCcs: connectors.includes("J1772COMBO"),
      hasNacs: connectors.includes("NACS"),
      hasChademo: connectors.includes("CHADEMO"),
      totalStalls: Number(s.ev_dc_fast_num ?? 0) + Number(s.ev_level2_evse_num ?? 0),
      isActive: s.status_code === "E",
      lastVerifiedAt: Date.now(),
      statusUpdatedAt: Date.now(),
    })
  })

  for (let i = 0; i < transactions.length; i += 25) {
    await adminDB.transact(transactions.slice(i, i + 25))
  }

  return NextResponse.json({
    updated: stations.length,
    nextOffset: offset + PAGE_SIZE,
    total: data.total_results,
    modifiedSince,
  })
}
