// components/map/map-placeholder-stub.tsx
// Temporary stub — replaced with real Mapbox map in Phase 1, Task 1.4
"use client"
import type { Station } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  stations: Station[]
  selectedStationId: string | null
  onSelectStation: (station: Station) => void
  className?: string
}

export function MapPlaceholderStub({ stations, selectedStationId, onSelectStation, className }: Props) {
  return (
    <div className={cn("flex items-center justify-center bg-muted/20", className)}>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Map loads here</p>
        <p className="mt-1 text-xs text-muted-foreground">{stations.length} stations</p>
      </div>
    </div>
  )
}
