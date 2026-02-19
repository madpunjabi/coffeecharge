"use client"
import { useState } from "react"
import { db } from "@/lib/db"

export function useAuthGate() {
  const { user } = db.useAuth()
  const [showGate, setShowGate] = useState(false)

  function requireAuth(action: () => void) {
    if (user) {
      action()
    } else {
      setShowGate(true)
    }
  }

  return { user, showGate, setShowGate, requireAuth }
}
