"use client"

import { cn } from "@/lib/utils"
import type { Stall } from "@/lib/types"

interface ChargerGridProps {
  stalls: Stall[]
  className?: string
}

const statusConfig: Record<string, { color: string; label: string }> = {
  available: { color: "bg-cc-brew-green", label: "Available" },
  occupied: { color: "bg-cc-charge-blue", label: "In Use" },
  broken: { color: "bg-cc-alert-red", label: "Out of Order" },
  unknown: { color: "bg-muted-foreground/30", label: "Unknown" },
}

export function ChargerGrid({ stalls, className }: ChargerGridProps) {
  const availableCount = stalls.filter((s) => s.status === "available").length

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Charger Availability</h4>
        <span className="text-sm font-medium text-cc-brew-green">
          {availableCount}/{stalls.length} open
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {stalls.map((stall) => {
          const config = statusConfig[stall.status]
          return (
            <div
              key={stall.id}
              className="group relative flex flex-col items-center"
              title={`${config.label} - ${stall.powerKw}kW ${stall.connector}`}
            >
              <div
                className={cn(
                  "flex h-10 w-8 items-center justify-center rounded-md transition-transform group-hover:scale-110",
                  config.color,
                  stall.status === "available" ? "opacity-100" : "opacity-60"
                )}
              >
                <svg viewBox="0 0 14 18" className="h-4 w-3 text-card" fill="currentColor" aria-hidden="true">
                  <path d="M8 1L1 10H6.5L5 17L13 7.5H7.5L8 1Z" />
                </svg>
              </div>
              <span className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                {stall.powerKw}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        {Object.entries(statusConfig).map(([key, val]) => {
          const count = stalls.filter((s) => s.status === key).length
          if (count === 0) return null
          return (
            <div key={key} className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", val.color)} />
              <span>{val.label} ({count})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
