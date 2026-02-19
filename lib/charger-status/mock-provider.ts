// lib/charger-status/mock-provider.ts
import type { ChargerStatusProvider, NormalizedStationStatus } from "./provider"

export class MockChargerStatusProvider implements ChargerStatusProvider {
  readonly providerName = "mock"
  readonly hasPerStallData = true

  coversStation(): boolean { return true }

  async fetchStatus(externalId: string): Promise<NormalizedStationStatus> {
    return {
      externalId,
      stalls: [
        { evseId: `${externalId}-1`, stallNumber: 1, status: "available", powerKw: 150, connector: "CCS", lastUpdatedAt: Date.now(), source: "mock" },
        { evseId: `${externalId}-2`, stallNumber: 2, status: "occupied", powerKw: 150, connector: "CCS", lastUpdatedAt: Date.now(), source: "mock" },
      ],
      fetchedAt: Date.now(),
      provider: "mock",
      hasPerStallData: true,
    }
  }
}
