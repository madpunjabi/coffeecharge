// lib/charger-status/provider.ts
export type StallStatusRaw = "AVAILABLE" | "CHARGING" | "INOPERATIVE" | "UNKNOWN"

export interface NormalizedStallStatus {
  evseId: string
  stallNumber: number
  status: "available" | "occupied" | "broken" | "unknown"
  powerKw: number
  connector: string
  lastUpdatedAt: number
  source: "ocpi" | "chargepoint" | "mock"
}

export interface NormalizedStationStatus {
  externalId: string
  stalls: NormalizedStallStatus[]
  fetchedAt: number
  provider: string
  hasPerStallData: boolean
}

export interface ChargerStatusProvider {
  readonly providerName: string
  readonly hasPerStallData: boolean
  fetchStatus(externalId: string): Promise<NormalizedStationStatus>
  coversStation(network: string): boolean
}
