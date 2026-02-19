import type { GeoPoint } from "@/lib/types"
import { haversineDistanceMiles } from "./distance"

export function filterByRadius<T extends { lat: number; lng: number }>(
  items: T[],
  center: GeoPoint,
  radiusMiles: number
): T[] {
  return items.filter(
    item => haversineDistanceMiles(center, { lat: item.lat, lng: item.lng }) <= radiusMiles
  )
}
