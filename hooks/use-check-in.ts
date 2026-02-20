"use client"
import { useState, useEffect, useRef } from "react"
import { db } from "@/lib/db"
import { id } from "@instantdb/react"

const PENDING_CHECKIN_KEY = "cc_pending_checkin"

export function useCheckIn() {
  const [checkedInStopIds, setCheckedInStopIds] = useState<Set<string>>(new Set())
  const [pendingStopId, setPendingStopId] = useState<string | null>(null)
  const { user } = db.useAuth()
  const prevUserRef = useRef<typeof user>(undefined)

  // Fire any check-in that was queued before the OAuth redirect
  useEffect(() => {
    if (user && !prevUserRef.current) {
      const stopId = sessionStorage.getItem(PENDING_CHECKIN_KEY)
      if (stopId) {
        sessionStorage.removeItem(PENDING_CHECKIN_KEY)
        checkIn(stopId)
      }
    }
    prevUserRef.current = user
  // checkIn is stable (defined below in the same closure scope via hoisting)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
