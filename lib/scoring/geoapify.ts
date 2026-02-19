// lib/scoring/geoapify.ts
// Geoapify Places API client for ratings enrichment.
// Used by the Brew Score API route to enrich Overture amenities with star ratings.
// Free tier: ≤3,000 credits/day. One call per charging stop per weekly refresh.

const GEOAPIFY_BASE = "https://api.geoapify.com/v2/places"

export interface GeoapifyPlace {
  place_id: string
  properties: {
    name: string
    categories: string[]
    lat: number
    lon: number
    distance: number
    datasource?: {
      raw?: {
        stars?: number
        rating?: number
        "toilets:access"?: string
        internet_access?: string
      }
    }
  }
}

interface GeoapifyResponse {
  features: GeoapifyPlace[]
}

/**
 * Fetch nearby places from Geoapify for ratings enrichment.
 * Returns up to 20 places within radiusMeters of the given coordinates.
 */
export async function fetchGeoapifyRatings(
  lat: number,
  lng: number,
  radiusMeters = 400
): Promise<GeoapifyPlace[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY
  if (!apiKey) {
    console.warn("GEOAPIFY_API_KEY not set — skipping ratings enrichment")
    return []
  }

  const categories = [
    "catering.cafe",
    "catering.fast_food",
    "catering.restaurant",
    "commercial.supermarket",
    "commercial.shopping_mall",
    "commercial.convenience",
    "service.fuel",
  ].join(",")

  const url =
    `${GEOAPIFY_BASE}` +
    `?categories=${categories}` +
    `&filter=circle:${lng},${lat},${radiusMeters}` +
    `&limit=20` +
    `&apiKey=${apiKey}`

  const res = await fetch(url, { next: { revalidate: 0 } })

  if (!res.ok) {
    console.error(`Geoapify error: ${res.status} ${res.statusText}`)
    return []
  }

  const json: GeoapifyResponse = await res.json()
  return json.features ?? []
}

/**
 * Extract a normalised 0–5 rating from a Geoapify place feature.
 * Geoapify surfaces OSM `stars` (1–5) or `rating` (0–10) from the raw datasource.
 * Returns 0 when no rating data is available.
 */
export function extractRating(place: GeoapifyPlace): number {
  const raw = place.properties.datasource?.raw
  if (!raw) return 0

  if (raw.stars != null) {
    return Math.min(5, Math.max(0, raw.stars))
  }
  if (raw.rating != null) {
    // OSM rating is 0–10 scale
    return Math.min(5, Math.max(0, raw.rating / 2))
  }
  return 0
}

/**
 * Detect free restroom availability from Geoapify raw OSM tags.
 */
export function hasFreeRestroom(place: GeoapifyPlace): boolean {
  const access = place.properties.datasource?.raw?.["toilets:access"]
  return access === "yes" || access === "public"
}

/**
 * Detect WiFi availability from Geoapify raw OSM tags.
 */
export function hasWifi(place: GeoapifyPlace): boolean {
  const wifi = place.properties.datasource?.raw?.["internet_access"]
  return wifi === "wlan" || wifi === "yes"
}
