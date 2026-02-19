"use client"
import { useState } from "react"
import { db } from "@/lib/db"
import { id } from "@instantdb/react"

export function useCheckIn() {
  const [checkedInStopIds, setCheckedInStopIds] = useState<Set<string>>(new Set())
  const [pendingStopId, setPendingStopId] = useState<string | null>(null)
  const { user } = db.useAuth()

  async function checkIn(stopId: string) {
    if (!user) throw new Error("Must be authenticated")
    setPendingStopId(stopId)
    try {
      await db.transact([
        db.tx.checkIns[id()].update({
          stopId,
          userId: user.id,
          status: "working",
          createdAt: Date.now(),
          source: "mobile_web",
        }),
        db.tx.stops[stopId].update({
          lastCheckInAt: Date.now(),
          lastVerifiedAt: Date.now(),
        }),
      ])
      setCheckedInStopIds(prev => new Set([...prev, stopId]))
    } finally {
      setPendingStopId(null)
    }
  }

  return { checkIn, checkedInStopIds, pendingStopId }
}
