// app/api/cron/refresh-brew-scores/route.ts
import { NextRequest, NextResponse } from "next/server"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"

const adminDB = init({ appId: process.env.INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000  // 7 days ago

  // Query top 500 stale stops ordered by most recent activity
  const result = await adminDB.query({
    stops: {
      $: {
        where: { and: [{ brewScoreComputedAt: { $lt: staleThreshold } }, { isActive: true }] },
        order: { serverCreatedAt: "desc" },
        limit: 500,
      },
    },
  })

  let processed = 0
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

  for (const stop of result.stops) {
    try {
      await fetch(`${baseUrl}/api/brew-score/${stop.id}`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
      processed++
    } catch { /* continue on error */ }
  }

  return NextResponse.json({ processed })
}
