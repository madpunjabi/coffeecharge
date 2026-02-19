// app/api/brew-score/[stationId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"
import { fetchGeoapifyRatings } from "@/lib/scoring/geoapify"
import { calculateBrewScore } from "@/lib/scoring/brew-score"

const adminDB = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

export async function POST(req: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { stationId } = await params
  const stopResult = await adminDB.query({ stops: { $: { where: { id: stationId } }, amenities: {} } })
  const stop = stopResult.stops[0]
  if (!stop) return NextResponse.json({ error: "Stop not found" }, { status: 404 })

  // Fetch Geoapify ratings
  const geoapifyPlaces = await fetchGeoapifyRatings(stop.lat, stop.lng)

  // Enrich amenities with ratings
  const enrichedAmenities = stop.amenities.map(a => {
    const match = geoapifyPlaces.find(p =>
      Math.abs(p.properties.lat - a.lat) < 0.0002 &&
      Math.abs(p.properties.lon - a.lng) < 0.0002
    )
    const rating = match?.properties?.datasource?.raw?.rating ?? 0
    return {
      category: a.category,
      walkMinutes: a.walkMinutes,
      rating,
      hoursJson: a.hoursJson ?? null,
      isIndoor: a.isIndoor ?? false,
      hasWifi: a.hasWifi ?? false,
      hasFreeRestroom: a.hasFreeRestroom ?? false,
    }
  })

  const brewScore = calculateBrewScore(enrichedAmenities)

  await adminDB.transact([
    adminDB.tx.stops[stationId].update({
      brewScore: brewScore.overall,
      brewScoreJson: JSON.stringify(brewScore),
      brewScoreComputedAt: Date.now(),
      ccScore: (stop.chargeScore ?? 0) + brewScore.overall,
    }),
  ])

  return NextResponse.json({ stationId, brewScore })
}
