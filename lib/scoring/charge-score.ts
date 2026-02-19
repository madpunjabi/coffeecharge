// lib/scoring/charge-score.ts
// MVP: uses static benchmarks + NREL data + check-in recency
// V1.1: replace realTimeAvailability with live OCPI data
import type { ChargeScore } from "@/lib/types"
import { getNetworkBenchmark } from "./network-benchmarks"

interface ChargeScoreInput {
  network: string
  totalStalls: number
  availableStalls: number        // 0 at MVP (no live data) — set to totalStalls * 0.7 as proxy
  lastCheckInAt: number          // Unix ms; 0 if no check-ins
  nrelLastConfirmed?: string     // ISO date from NREL "date_last_confirmed"
}

export function calculateChargeScore(input: ChargeScoreInput): ChargeScore {
  const networkBenchmark = getNetworkBenchmark(input.network)  // 0–5

  // Uptime history (35%): proxy from network benchmark + NREL last_confirmed recency
  const daysSinceConfirmed = input.nrelLastConfirmed
    ? (Date.now() - new Date(input.nrelLastConfirmed).getTime()) / 86_400_000
    : 365
  const uptimeHistory = Math.max(0, networkBenchmark - (daysSinceConfirmed > 180 ? 1.0 : daysSinceConfirmed > 90 ? 0.5 : 0))

  // Real-time availability (30%): MVP uses stall ratio as proxy; V1.1 replaces with OCPI
  const stallRatio = input.totalStalls > 0
    ? input.availableStalls / input.totalStalls
    : 0.7  // assume 70% available when no data
  const realTimeAvailability = Math.min(5, stallRatio * 5)

  // Community verification recency (20%)
  const communityVerification = calculateCommunityScore(input.lastCheckInAt)

  // Network benchmark (15%)
  const overall =
    uptimeHistory * 0.35 +
    realTimeAvailability * 0.30 +
    communityVerification * 0.20 +
    networkBenchmark * 0.15

  return {
    overall: Math.round(overall * 10) / 10,
    uptimeHistory: Math.round(uptimeHistory * 10) / 10,
    realTimeAvailability: Math.round(realTimeAvailability * 10) / 10,
    communityVerification: Math.round(communityVerification * 10) / 10,
    networkBenchmark: Math.round(networkBenchmark * 10) / 10,
  }
}

function calculateCommunityScore(lastCheckInAt: number): number {
  if (!lastCheckInAt) return 0.5
  const hoursAgo = (Date.now() - lastCheckInAt) / 3_600_000
  if (hoursAgo < 1) return 5.0
  if (hoursAgo < 6) return 4.0
  if (hoursAgo < 24) return 3.0
  if (hoursAgo < 72) return 2.0
  if (hoursAgo < 168) return 1.0
  return 0.5
}
