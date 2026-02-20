// lib/scoring/brew-score.ts
import type { BrewScore } from "@/lib/types"

interface AmenityInput {
  category: string
  walkMinutes: number
  rating: number      // 0 = no data
  hoursJson: string | null
  isIndoor: boolean
  hasWifi: boolean
  hasFreeRestroom: boolean
}

export function calculateBrewScore(amenities: AmenityInput[]): BrewScore {
  const food = amenities.filter(a => ["coffee", "food"].includes(a.category))
  const restrooms = amenities.filter(a => a.category === "restroom" || a.hasFreeRestroom)
  const retail = amenities.filter(a => ["retail", "grocery"].includes(a.category))
  const rated = amenities.filter(a => a.rating > 0)

  // Food options (30%): count + proximity weighting
  const foodScore = Math.min(
    5,
    food.reduce((sum, a) => sum + (a.walkMinutes <= 2 ? 1.5 : a.walkMinutes <= 5 ? 1.0 : 0.5), 0)
  )

  // Restroom access (20%)
  const restroomScore = restrooms.length >= 2 ? 5 : restrooms.length === 1 ? 3.5 : 0

  // Retail quality (15%)
  const retailScore = Math.min(5, retail.length * 1.5)

  // Venue quality (15%): avg Geoapify rating or neutral if no data
  const venueScore = rated.length > 0
    ? rated.reduce((sum, a) => sum + a.rating, 0) / rated.length
    : 2.5  // neutral default when no Geoapify data

  // Environment (10%): indoor amenities available
  const indoorCount = amenities.filter(a => a.isIndoor).length
  const environmentScore = Math.min(5, (indoorCount / Math.max(amenities.length, 1)) * 5 + (amenities.some(a => a.hasWifi) ? 1 : 0))

  // Hours coverage (10%): fraction open during 8am–8pm charge window
  const openCount = amenities.filter(a => isLikelyOpenDuringChargeWindow(a.hoursJson)).length
  const hoursCoverageScore = amenities.length > 0 ? (openCount / amenities.length) * 5 : 0

  const overall =
    foodScore * 0.30 +
    restroomScore * 0.20 +
    retailScore * 0.15 +
    venueScore * 0.15 +
    environmentScore * 0.10 +
    hoursCoverageScore * 0.10

  return {
    overall: Math.round(overall * 10) / 10,
    foodOptions: Math.round(foodScore * 10) / 10,
    restroomAccess: Math.round(restroomScore * 10) / 10,
    retailQuality: Math.round(retailScore * 10) / 10,
    venueQuality: Math.round(venueScore * 10) / 10,
    environment: Math.round(environmentScore * 10) / 10,
    hoursCoverage: Math.round(hoursCoverageScore * 10) / 10,
  }
}

/**
 * Heuristic: returns true if the place is likely open during a typical charge window (8 am–8 pm).
 * Known approximation: any hours string containing ":" counts as open. This intentionally
 * over-scores rather than under-scores — missing hours data is treated as open to avoid
 * penalising the majority of POIs that Overture doesn't have hours for.
 * A full OSM hours parser (e.g. opening_hours.js) can replace this at V1.1.
 */
function isLikelyOpenDuringChargeWindow(hoursJson: string | null): boolean {
  if (!hoursJson) return true  // assume open when no data (avoids penalizing data gaps)
  return hoursJson.includes(":") && !hoursJson.toLowerCase().includes("closed")
}
