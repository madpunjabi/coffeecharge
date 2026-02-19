"use client"

import { cn } from "@/lib/utils"
import type { Station } from "@/lib/types"
import { AlertTriangle, Navigation } from "lucide-react"

interface FallbackStationProps {
  fallbackStation: Station | null
  className?: string
}

export function FallbackStation({ fallbackStation, className }: FallbackStationProps) {
  if (!fallbackStation) return null

  return (
    <div className={cn("rounded-xl border border-cc-caution-amber/30 bg-cc-caution-amber/5 p-3", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cc-caution-amber" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-cc-caution-amber">If this stop fails</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{fallbackStation.name}</p>
              <p className="text-xs text-muted-foreground">{fallbackStation.city}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3" aria-hidden="true" />
              Next best option
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
