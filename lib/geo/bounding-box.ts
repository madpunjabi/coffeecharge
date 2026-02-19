import type { BoundingBox, GeoPoint } from "@/lib/types"

const MILES_PER_DEGREE_LAT = 69.0

export function radiusToBoundingBox(center: GeoPoint, radiusMiles: number): BoundingBox {
  const latDelta = radiusMiles / MILES_PER_DEGREE_LAT
  const lngDelta = radiusMiles / (MILES_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180))
  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  }
}
