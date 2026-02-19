// lib/scoring/network-benchmarks.ts
// Source: NEVI compliance reports + PlugShare reliability data (2025)
export const NETWORK_BENCHMARKS: Record<string, number> = {
  "Tesla Supercharger":   4.6,  // ~97% uptime, best-in-class
  "Electrify America":    3.8,  // ~87% uptime, improving with NEVI
  "ChargePoint":          3.9,  // ~88% uptime, large network variance
  "EVgo":                 3.5,  // ~83% uptime
  "Blink":                2.8,  // ~71% uptime, known reliability issues
  "Francis Energy":       4.0,
  "Volta":                3.6,
  "Unknown":              3.0,  // median fallback
}

export function getNetworkBenchmark(network: string): number {
  return NETWORK_BENCHMARKS[network] ?? NETWORK_BENCHMARKS["Unknown"]
}
