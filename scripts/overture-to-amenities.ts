#!/usr/bin/env ts-node
// scripts/overture-to-amenities.ts
// For each seeded stop, find Overture POIs within 400m and import as amenities.
// Prerequisites:
//   - scripts/output/overture-us-pois.parquet must exist (run overture-extract.sh first)
//   - .env.local must have NEXT_PUBLIC_INSTANT_APP_ID and INSTANT_ADMIN_TOKEN
// Run: npx ts-node --project tsconfig.json scripts/overture-to-amenities.ts

import * as duckdb from "duckdb"
import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import * as path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

// ── Constants ──────────────────────────────────────────────────────────────
const PARQUET_PATH = path.resolve(__dirname, "output/overture-us-pois.parquet")
const RADIUS_METERS = 400
const WALK_SPEED_MPM = 80 // metres per minute
const BATCH_SIZE = 25    // InstantDB transaction batch size

// ── Overture → our AmenityCategory mapping ────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  coffee_shop: "coffee",
  fast_food: "food",
  restaurant: "food",
  grocery: "grocery",
  department_store: "retail",
  shopping_mall: "retail",
  convenience_store: "retail",
  gas_station: "gas",
}

// ── Helpers ────────────────────────────────────────────────────────────────
function haversineMeters(
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const R = 6_371_000 // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Latitude delta is constant: 1 degree ≈ 111,320 m everywhere. */
function latDelta(meters: number): number {
  return meters / 111_320
}

/** Longitude delta shrinks toward the poles: must be adjusted by cos(lat). */
function lngDelta(meters: number, lat: number): number {
  return meters / (111_320 * Math.cos((lat * Math.PI) / 180))
}

// ── InstantDB admin client ─────────────────────────────────────────────────
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

// ── DuckDB query helper ────────────────────────────────────────────────────
interface OvertureRow {
  id: string
  name: string
  category: string
  lng: number
  lat: number
  opening_hours: string | null
  brand: string
}

function queryPoisNear(
  database: duckdb.Database,
  stopLat: number,
  stopLng: number
): Promise<OvertureRow[]> {
  const latD = latDelta(RADIUS_METERS)
  const lngD = lngDelta(RADIUS_METERS, stopLat)
  const minLat = stopLat - latD
  const maxLat = stopLat + latD
  const minLng = stopLng - lngD
  const maxLng = stopLng + lngD

  const sql = `
    SELECT id, name, category, lng, lat, opening_hours, brand
    FROM read_parquet('${PARQUET_PATH}')
    WHERE lat BETWEEN ${minLat} AND ${maxLat}
      AND lng BETWEEN ${minLng} AND ${maxLng}
  `

  return new Promise((resolve, reject) => {
    database.all(sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows as OvertureRow[])
    })
  })
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Fetching all stops from InstantDB…")

  const result = await db.query({ stops: {} })
  if (!result?.stops) {
    console.error("Failed to fetch stops from InstantDB")
    process.exit(1)
  }

  const stops = result.stops
  console.log(`✅ Found ${stops.length} stops`)

  const database = new duckdb.Database(":memory:")
  console.log(`\n📦 Opening parquet: ${PARQUET_PATH}`)

  let totalAmenities = 0
  let processed = 0

  for (const stop of stops) {
    const pois = await queryPoisNear(database, stop.lat, stop.lng)

    // Filter to exact radius using haversine
    const nearby = pois.filter(poi => {
      const distM = haversineMeters(stop.lat, stop.lng, poi.lat, poi.lng)
      return distM <= RADIUS_METERS
    })

    if (nearby.length === 0) {
      processed++
      continue
    }

    // Idempotency: skip POIs already seeded for this stop
    const existing = await db.query({
      amenities: { $: { where: { stopId: stop.id } } },
    })
    const existingOvertureIds = new Set(
      (existing.amenities ?? []).map((a: { overtureId: string }) => a.overtureId)
    )
    const toInsert = nearby.filter(poi => !existingOvertureIds.has(poi.id))

    if (toInsert.length === 0) {
      processed++
      continue
    }

    // Build InstantDB transactions
    const txns: ReturnType<typeof db.tx.amenities[string]["update"]>[] = []

    for (const poi of toInsert) {
      const distM = haversineMeters(stop.lat, stop.lng, poi.lat, poi.lng)
      const amenityId = id()
      const category = CATEGORY_MAP[poi.category] ?? "retail"

      txns.push(
        db.tx.amenities[amenityId].update({
          stopId: stop.id,
          overtureId: poi.id,
          name: poi.name ?? "Unknown",
          brand: poi.brand ?? poi.name ?? "Unknown",
          category,
          lat: poi.lat,
          lng: poi.lng,
          walkMeters: Math.round(distM),
          walkMinutes: Math.max(1, Math.round(distM / WALK_SPEED_MPM)),
          hoursJson: poi.opening_hours ?? null,
          rating: 0,       // enriched later by Geoapify
          reviewCount: 0,
          isIndoor: ["retail", "grocery"].includes(category),
          hasWifi: category === "coffee",
          hasFreeRestroom: ["grocery", "retail"].includes(category),
          hoursUpdatedAt: Date.now(),
        }),
        // Link amenity → stop via stopAmenities
        db.tx.amenities[amenityId].link({ stop: stop.id })
      )
    }

    // Batch in groups of BATCH_SIZE to avoid transaction size limits
    for (let i = 0; i < txns.length; i += BATCH_SIZE) {
      const batch = txns.slice(i, i + BATCH_SIZE)
      await db.transact(batch)
    }

    totalAmenities += toInsert.length
    processed++

    if (processed % 50 === 0) {
      console.log(`  ${processed}/${stops.length} stops processed, ${totalAmenities} amenities inserted…`)
    }
  }

  database.close()

  console.log(`\n✅ Done!`)
  console.log(`   Stops processed : ${processed}`)
  console.log(`   Amenities seeded: ${totalAmenities}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
