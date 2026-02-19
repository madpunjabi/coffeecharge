"use client"
import { db } from "@/lib/db"
import type { BoundingBox, Station } from "@/lib/types"

export function useStationQuery(bounds: BoundingBox | null, activeFilters?: Set<string>) {
  const filters = activeFilters ?? new Set<string>()

  // Build indexed where clauses to push to DB
  const baseWhere = bounds ? [
    { lat: { $gte: bounds.south } },
    { lat: { $lte: bounds.north } },
    { lng: { $gte: bounds.west } },
    { lng: { $lte: bounds.east } },
    { isActive: true },
    ...(filters.has("ccs")       ? [{ hasCcs: true }]   : []),
    ...(filters.has("nacs")      ? [{ hasNacs: true }]  : []),
    ...(filters.has("chademo")   ? [{ hasChademo: true }] : []),
    ...(filters.has("fast")      ? [{ maxPowerKw: { $gte: 150 } }] : []),
    ...(filters.has("available") ? [{ availableStalls: { $gte: 1 } }] : []),
  ] : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = baseWhere ? { stops: { $: { where: { and: baseWhere as any } }, amenities: {} } } : null

  const { data, isLoading, error } = db.useQuery(query)

  // Map InstantDB stops to Station type
  const stops = (data?.stops ?? []).map(s => ({
    id: s.id,
    externalId: s.nrelId ?? s.id,
    name: s.name,
    address: s.address,
    city: s.city,
    state: s.state,
    zip: s.zip,
    lat: s.lat,
    lng: s.lng,
    network: s.network as Station["network"],
    connectorTypes: JSON.parse(s.connectorTypesJson ?? "[]"),
    maxPowerKw: s.maxPowerKw,
    stalls: JSON.parse(s.stallsJson ?? "[]"),
    pricePerKwh: s.pricePerKwh ?? 0,
    ccScore: s.ccScore ?? 0,
    chargeScore: JSON.parse(s.chargeScoreJson ?? "{}"),
    brewScore: JSON.parse(s.brewScoreJson ?? "{}"),
    reliability: s.reliabilityLevel as Station["reliability"],
    lastVerified: formatRelativeTime(s.lastVerifiedAt ?? 0),
    lastVerifiedAt: s.lastVerifiedAt ?? 0,
    photoCount: s.photoCount ?? 0,
    distanceMiles: 0,  // computed by caller with haversine
    detourMiles: 0,
    amenities: (s.amenities ?? []).map(a => ({
      id: a.id,
      name: a.name,
      brand: a.brand,
      category: a.category as Station["amenities"][number]["category"],
      walkMinutes: a.walkMinutes,
      distanceMeters: a.walkMeters,
      rating: a.rating ?? 0,
      hours: formatHours(a.hoursJson),
      hoursJson: a.hoursJson ?? undefined,
      lat: a.lat,
      lng: a.lng,
      overtureId: a.overtureId ?? undefined,
    })),
    fallbackStationId: s.fallbackStopId ?? null,
    nrelId: s.nrelId ?? undefined,
    brewScoreUpdatedAt: s.brewScoreComputedAt ?? undefined,
  })) as Station[]

  return { stops, isLoading, error, isStale: !!error && stops.length > 0 }
}

function formatRelativeTime(ms: number): string {
  if (!ms) return "Unknown"
  const diff = Date.now() - ms
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatHours(hoursJson: string | null | undefined): string {
  if (!hoursJson) return "Unknown"
  try { return JSON.parse(hoursJson).display ?? "Unknown" } catch { return "Unknown" }
}
