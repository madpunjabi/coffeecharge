"use client"

import type { Station } from "@/lib/types"
import { ScoreBadge } from "./score-badge"
import { ChargeScore } from "./charge-score"
import { BrewScore } from "./brew-score"
import { ReliabilityBadge } from "./reliability-badge"
import { ChargerGrid } from "./charger-grid"
import { AmenityList } from "./amenity-list"
import { ScoreBreakdown } from "./score-breakdown"
import { FallbackStation } from "./fallback-station"
import { AuthGate } from "./auth/auth-gate"
import { db } from "@/lib/db"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { MapPin, Zap, Navigation, Bookmark, UserCheck, Camera, X, Route } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCheckIn } from "@/hooks/use-check-in"
import { useAuthGate } from "@/hooks/use-auth-gate"

interface StopDetailSheetProps {
  station: Station | null
  isOpen: boolean
  onClose: () => void
}

const networkLabels: Record<string, string> = {
  "Tesla Supercharger": "Tesla",
  "Electrify America": "EA",
  "ChargePoint": "ChargePoint",
  "EVgo": "EVgo",
  "Blink": "Blink",
}

export function StopDetailSheet({ station, isOpen, onClose }: StopDetailSheetProps) {
  const { checkIn, checkedInStopIds, pendingStopId } = useCheckIn()
  const { requireAuth, showGate, setShowGate } = useAuthGate()

  const { data: fallbackData } = db.useQuery(
    station?.fallbackStationId
      ? { stops: { $: { where: { id: station.fallbackStationId } } } }
      : null
  )
  const fallbackStation = (fallbackData?.stops?.[0] ?? null) as Station | null

  if (!station) return null

  const availableStalls = station.stalls.filter((s) => s.status === "available").length
  const isCheckedIn = checkedInStopIds.has(station.id)
  const isPending = pendingStopId === station.id

  return (
    <>
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] bg-card">
        <div className="overflow-y-auto">
          {/* Header */}
          <DrawerHeader className="relative pb-2">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
              aria-label="Close detail view"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <ScoreBadge score={station.ccScore} size="lg" />
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-lg font-bold text-foreground">
                  {station.name}
                </DrawerTitle>
                <DrawerDescription className="mt-0.5">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {station.address}, {station.city}
                  </span>
                </DrawerDescription>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {networkLabels[station.network]}
                  </span>
                  <ReliabilityBadge level={station.reliability} />
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-6">
            {/* Distance & detour banner */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-cc-charge-blue" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">{station.distanceMiles} mi</span>
                <span className="text-xs text-muted-foreground">away</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Route className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {station.detourMiles > 0 ? (
                  <span className="text-sm font-medium text-cc-caution-amber">+{station.detourMiles} mi detour</span>
                ) : (
                  <span className="text-sm font-medium text-cc-brew-green">On your route</span>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <Zap className="h-4 w-4 text-cc-charge-blue" aria-hidden="true" />
                <span className="text-sm font-bold text-foreground">{station.maxPowerKw} kW</span>
                <span className="text-[10px] text-muted-foreground">Max Power</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-cc-brew-green">{availableStalls}/{station.stalls.length}</span>
                <span className="text-[10px] text-muted-foreground">Available</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-foreground">${station.pricePerKwh.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground">per kWh</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-xs font-medium text-foreground">{station.connectorTypes.join(", ")}</span>
                <span className="text-[10px] text-muted-foreground">Plugs</span>
              </div>
            </div>

            {/* Scores section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Score Breakdown</h3>
              <div className="flex items-center gap-4">
                <ChargeScore score={station.chargeScore.overall} />
                <BrewScore score={station.brewScore.overall} />
              </div>
              <ScoreBreakdown type="charge" chargeScore={station.chargeScore} />
              <ScoreBreakdown type="brew" brewScore={station.brewScore} />
            </div>

            {/* Charger availability grid */}
            <ChargerGrid stalls={station.stalls} />

            {/* Amenities */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Nearby Amenities
                <span className="ml-1 text-xs font-normal text-muted-foreground">({station.amenities.length})</span>
              </h3>
              <AmenityList amenities={station.amenities} />
            </div>

            {/* Community section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Community</h3>
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <Camera className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{station.photoCount} photos</p>
                  <p className="text-xs text-muted-foreground">Last verified {station.lastVerified}</p>
                </div>
                <span className="rounded-full bg-cc-charge-blue/10 px-2.5 py-1 text-xs font-medium text-cc-charge-blue">
                  View all
                </span>
              </div>
            </div>

            {/* Fallback station */}
            <FallbackStation fallbackStation={fallbackStation} />

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cc-charge-blue py-3.5 text-sm font-semibold text-white transition-colors hover:bg-cc-charge-blue/90 active:scale-[0.98]"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Navigate
              </button>
              <button
                type="button"
                disabled={isCheckedIn || isPending}
                onClick={() => requireAuth(() => checkIn(station.id))}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98]",
                  isCheckedIn
                    ? "border-cc-brew-green/30 bg-cc-brew-green/10 text-cc-brew-green"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {isCheckedIn ? "Checked In ✓" : isPending ? "Checking in..." : "Check In"}
              </button>
              <button
                type="button"
                className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-3.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.98]"
                aria-label="Save station"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
    <AuthGate
      isOpen={showGate}
      onClose={() => setShowGate(false)}
      onSuccess={() => checkIn(station.id)}
    />
    </>
  )
}
