"use client"

import { cn } from "@/lib/utils"
import type { Station } from "@/lib/types"
import { ScoreBadge } from "./score-badge"
import { ChargeScore } from "./charge-score"
import { BrewScore } from "./brew-score"
import { ReliabilityBadge } from "./reliability-badge"
import { AmenityList } from "./amenity-list"
import { Zap, MapPin, Clock, Navigation } from "lucide-react"

interface StopCardProps {
  station: Station
  isSelected?: boolean
  onSelect?: (station: Station) => void
  compact?: boolean
  className?: string
}

const networkColors: Record<string, string> = {
  "Tesla Supercharger": "bg-cc-alert-red/10 text-cc-alert-red",
  "Electrify America": "bg-cc-charge-blue/10 text-cc-charge-blue",
  "ChargePoint": "bg-cc-brew-green/10 text-cc-brew-green",
  "EVgo": "bg-cc-caution-amber/10 text-cc-caution-amber",
  "Blink": "bg-cc-warm-brown/10 text-cc-warm-brown",
}

export function StopCard({ station, isSelected = false, onSelect, compact = false, className }: StopCardProps) {
  const availableStalls = station.stalls.filter((s) => s.status === "available").length

  // Compact mode for horizontal card scroller
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(station)}
        className={cn(
          "w-full cursor-pointer rounded-xl border bg-card p-3 text-left transition-all active:scale-[0.98]",
          isSelected
            ? "border-cc-charge-blue/40 shadow-md shadow-cc-charge-blue/10 ring-1 ring-cc-charge-blue/20"
            : "border-border shadow-sm hover:shadow-md",
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("shrink-0 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider", networkColors[station.network] || "bg-muted text-muted-foreground")}>
                {station.network.split(" ")[0]}
              </span>
              <ReliabilityBadge level={station.reliability} />
            </div>
            <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
              {station.name}
            </h3>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Navigation className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              {station.distanceMiles} mi away
              {station.detourMiles > 0 && (
                <span className="text-cc-caution-amber">({'+' + station.detourMiles} mi detour)</span>
              )}
              {station.detourMiles === 0 && (
                <span className="text-cc-brew-green">(on route)</span>
              )}
            </p>
          </div>
          <ScoreBadge score={station.ccScore} size="sm" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
            <Zap className="h-3 w-3 text-cc-charge-blue" aria-hidden="true" />
            {station.maxPowerKw} kW
          </span>
          <span className="text-border">|</span>
          <span className={cn(
            "text-[11px] font-medium",
            availableStalls > 0 ? "text-cc-brew-green" : "text-cc-alert-red"
          )}>
            {availableStalls}/{station.stalls.length} open
          </span>
          <span className="text-border">|</span>
          <span className="text-[11px] text-muted-foreground">${station.pricePerKwh.toFixed(2)}/kWh</span>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(station)}
      className={cn(
        "w-full cursor-pointer rounded-2xl border bg-card p-4 text-left transition-all active:scale-[0.98]",
        isSelected
          ? "border-cc-charge-blue/40 shadow-lg shadow-cc-charge-blue/10 ring-1 ring-cc-charge-blue/20"
          : "border-border shadow-sm hover:shadow-md hover:border-border/80",
        className
      )}
    >
      {/* Top row: network + name + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", networkColors[station.network] || "bg-muted text-muted-foreground")}>
              {station.network.split(" ")[0]}
            </span>
            <ReliabilityBadge level={station.reliability} />
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-foreground">
            {station.name}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
              {station.distanceMiles} mi away
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              {station.city}
            </span>
            {station.detourMiles > 0 ? (
              <span className="text-cc-caution-amber">+{station.detourMiles} mi detour</span>
            ) : (
              <span className="rounded bg-cc-brew-green/10 px-1.5 py-px text-[10px] font-medium text-cc-brew-green">On route</span>
            )}
          </p>
        </div>
        <ScoreBadge score={station.ccScore} size="sm" />
      </div>

      {/* Middle row: charge + availability + brew */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <ChargeScore score={station.chargeScore.overall} size="sm" />
          <div className="h-4 w-px bg-border" />
          <BrewScore score={station.brewScore.overall} size="sm" />
        </div>
      </div>

      {/* Stall info + power */}
      <div className="mt-2.5 flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          <Zap className="h-3 w-3 text-cc-charge-blue" aria-hidden="true" />
          {station.maxPowerKw} kW
        </span>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          availableStalls > 0
            ? "bg-cc-brew-green/10 text-cc-brew-green"
            : "bg-cc-alert-red/10 text-cc-alert-red"
        )}>
          {availableStalls}/{station.stalls.length} available
        </span>
        <span className="text-xs text-muted-foreground">
          ${station.pricePerKwh.toFixed(2)}/kWh
        </span>
      </div>

      {/* Amenity pills */}
      <div className="mt-2.5">
        <AmenityList amenities={station.amenities} compact />
      </div>

      {/* Last verified */}
      <div className="mt-2.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Verified {station.lastVerified}
      </div>
    </button>
  )
}
