export type ConnectorType = "CCS" | "CHAdeMO" | "NACS" | "Type2" | "J1772"
export type StallStatus = "available" | "occupied" | "broken" | "unknown"
export type AmenityCategory = "coffee" | "food" | "grocery" | "retail" | "restroom" | "hotel" | "gas"
export type ReliabilityLevel = "high" | "medium" | "low"
export type ChargingNetwork =
  | "Tesla Supercharger"
  | "Electrify America"
  | "ChargePoint"
  | "EVgo"
  | "Blink"
  | "Unknown"

export interface ChargeScore {
  overall: number              // 0–5
  uptimeHistory: number        // 0–5 (35% weight)
  realTimeAvailability: number // 0–5 (30% weight — NREL proxy at MVP)
  communityVerification: number// 0–5 (20% weight)
  networkBenchmark: number     // 0–5 (15% weight)
}

export interface BrewScore {
  overall: number              // 0–5
  foodOptions: number          // 0–5 (30% weight)
  restroomAccess: number       // 0–5 (20% weight)
  retailQuality: number        // 0–5 (15% weight)
  venueQuality: number         // 0–5 (15% weight)
  environment: number          // 0–5 (10% weight)
  hoursCoverage: number        // 0–5 (10% weight)
}

export interface Stall {
  id: string
  stallNumber: number
  powerKw: number
  connector: ConnectorType
  status: StallStatus
  evseId?: string
}

export interface Amenity {
  id: string
  name: string
  brand: string
  category: AmenityCategory
  walkMinutes: number
  distanceMeters: number
  rating: number               // 0–5, from Geoapify; 0 = no data
  hours: string                // e.g. "6am–10pm" or "Unknown"
  hoursJson?: string           // raw OSM hours format for client-side isOpenNow calc
  isOpenNow?: boolean          // computed client-side from hoursJson
  lat: number
  lng: number
  overtureId?: string
}

export interface Station {
  id: string
  externalId: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  network: ChargingNetwork
  connectorTypes: ConnectorType[]
  maxPowerKw: number
  stalls: Stall[]
  pricePerKwh: number
  ccScore: number              // 0–10
  chargeScore: ChargeScore
  brewScore: BrewScore
  reliability: ReliabilityLevel
  lastVerified: string         // human-readable: "2h ago"
  lastVerifiedAt: number       // Unix ms
  photoCount: number
  distanceMiles: number        // computed client-side
  detourMiles: number          // 0 = on route
  amenities: Amenity[]
  fallbackStationId: string | null
  nrelId?: string
  ocmId?: string
  brewScoreUpdatedAt?: number
}

export interface FilterOption {
  id: string
  label: string
  category: "connector" | "power" | "brand" | "amenity" | "availability" | "network"
}

export interface ScoreTier {
  label: string
  colorClass: string
  color: string  // CSS variable key, e.g. "cc-gold"
}

export function getScoreTier(score: number): ScoreTier {
  if (score >= 9.0) return { label: "Perfect Stop", colorClass: "text-cc-gold", color: "cc-gold" }
  if (score >= 8.0) return { label: "Excellent Stop", colorClass: "text-cc-charge-blue", color: "cc-charge-blue" }
  if (score >= 7.0) return { label: "Great Stop", colorClass: "text-cc-brew-green", color: "cc-brew-green" }
  if (score >= 6.0) return { label: "Good Stop", colorClass: "text-cc-brew-green", color: "cc-brew-green" }
  if (score >= 5.0) return { label: "Decent Stop", colorClass: "text-cc-caution-amber", color: "cc-caution-amber" }
  return { label: "Proceed with Caution", colorClass: "text-cc-alert-red", color: "cc-alert-red" }
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface GeoPoint {
  lat: number
  lng: number
}

// P1 — defined for type completeness, not used in MVP UI
export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  batteryKwh: number
  rangeMaxMiles: number
  connectors: ConnectorType[]
}
