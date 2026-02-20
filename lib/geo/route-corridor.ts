// lib/geo/route-corridor.ts
// Pure geo functions for route corridor filtering.
// Coordinates from Mapbox are [lng, lat] (GeoJSON order).

import type { BoundingBox, GeoPoint } from "@/lib/types"
import { haversineDistanceMiles } from "./distance"

/**
 * Minimum distance (miles) from point p to line segment a→b.
 * Projects p onto the segment, clamps to [0,1], returns haversine distance.
 */
function pointToSegmentDistanceMiles(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return haversineDistanceMiles(p, a)
  const t = Math.max(0, Math.min(1,
    ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq
  ))
  return haversineDistanceMiles(p, { lat: a.lat + t * dy, lng: a.lng + t * dx })
}

/**
 * Minimum distance (miles) from point p to any segment in a GeoJSON polyline.
 * coords is an array of [lng, lat] pairs (Mapbox GeoJSON order).
 */
export function minDistanceToPolyline(p: GeoPoint, coords: [number, number][]): number {
  let minDist = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const a: GeoPoint = { lat: coords[i][1], lng: coords[i][0] }
    const b: GeoPoint = { lat: coords[i + 1][1], lng: coords[i + 1][0] }
    const d = pointToSegmentDistanceMiles(p, a, b)
    if (d < minDist) minDist = d
  }
  return minDist
}

/**
 * Bounding box that covers all route coordinates, padded by paddingMiles on each side.
 */
export function routeBoundingBox(coords: [number, number][], paddingMiles: number): BoundingBox {
  const lats = coords.map(c => c[1])
  const lngs = coords.map(c => c[0])
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const padLat = paddingMiles / 69                                           // ~69 miles per degree lat
  const padLng = paddingMiles / (69 * Math.cos((centerLat * Math.PI) / 180)) // shrinks toward poles
  return {
    north: Math.max(...lats) + padLat,
    south: Math.min(...lats) - padLat,
    east:  Math.max(...lngs) + padLng,
    west:  Math.min(...lngs) - padLng,
  }
}
