"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import type { Station, BoundingBox } from "@/lib/types"
import dynamic from "next/dynamic"
import { useStationQuery } from "@/hooks/use-station-query"
import { useGeolocation } from "@/hooks/use-geolocation"
import { haversineDistanceMiles } from "@/lib/geo/distance"

const MapPlaceholder = dynamic(
  () => import("@/components/map/mapbox-map").then(m => ({ default: m.MapboxMap })),
  { ssr: false, loading: () => <div className="h-full bg-muted/20 animate-pulse" /> }
)
import { FilterBar } from "@/components/filter-bar"
import { StopCard } from "@/components/stop-card"
import { StopDetailSheet } from "@/components/stop-detail-sheet"
import { SearchBar } from "@/components/search-bar"
import { AuthGate } from "@/components/auth/auth-gate"
import { RadiusSelector } from "@/components/search/radius-selector"
import { MapErrorBoundary } from "@/components/map/map-error-boundary"
import { Zap, Coffee, SlidersHorizontal, ChevronUp, ChevronDown, List, Map as MapIcon, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { filterByRadius } from "@/lib/geo/radius-filter"

type ViewMode = "map" | "list"
type PanelState = "collapsed" | "peek" | "expanded"

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [detailStation, setDetailStation] = useState<Station | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [panelState, setPanelState] = useState<PanelState>("peek")
  const [bounds, setBounds] = useState<BoundingBox | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(50)
  const listRef = useRef<HTMLDivElement>(null)
  const flyToRef = useRef<((lat: number, lng: number) => void) | null>(null)

  const { position } = useGeolocation()
  const { stops, isLoading, isStale } = useStationQuery(bounds, activeFilters)
  const { user, showGate, setShowGate } = useAuthGate()

  const stopsWithDistance = useMemo(() => {
    if (!position) return stops
    return stops.map(s => ({
      ...s,
      distanceMiles: Math.round(haversineDistanceMiles(position, { lat: s.lat, lng: s.lng }) * 10) / 10,
    }))
  }, [stops, position])

  const handleFilterToggle = useCallback((filterId: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(filterId)) {
        next.delete(filterId)
      } else {
        next.add(filterId)
      }
      return next
    })
  }, [])

  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station)
    setPanelState("peek")
  }, [])

  const handleCardTap = useCallback((station: Station) => {
    setDetailStation(station)
    setIsDetailOpen(true)
    setSelectedStation(station)
  }, [])

  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false)
  }, [])

  const handleBoundsChange = useCallback((b: { getNorth: () => number; getSouth: () => number; getEast: () => number; getWest: () => number }) => {
    setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
  }, [])

  const cyclePanelState = useCallback(() => {
    setPanelState((prev) => {
      if (prev === "collapsed") return "peek"
      if (prev === "peek") return "expanded"
      return "collapsed"
    })
  }, [])

  // Filter stations — indexed filters (ccs/nacs/chademo/fast/available) handled by DB query
  // Client-side: radius, ultrafast power, and brand/amenity filters
  const filteredStations = useMemo(() => {
    let result = stopsWithDistance

    // Radius filter from GPS position
    if (position && radiusMiles) {
      result = filterByRadius(result, position, radiusMiles)
    }

    // Client-side only filters
    if (activeFilters.size === 0) return result

    return result.filter((station) => {
      for (const filter of activeFilters) {
        switch (filter) {
          case "ultrafast":
            if (station.maxPowerKw < 250) return false
            break
          case "starbucks":
            if (!station.amenities.some((a) => a.brand.toLowerCase().includes("starbucks"))) return false
            break
          case "mcdonalds":
            if (!station.amenities.some((a) => a.brand.toLowerCase().includes("mcdonald"))) return false
            break
          case "target":
            if (!station.amenities.some((a) => a.brand.toLowerCase().includes("target"))) return false
            break
          case "grocery":
            if (!station.amenities.some((a) => a.category === "grocery")) return false
            break
          default:
            break
        }
      }
      return true
    })
  }, [activeFilters, stopsWithDistance, position, radiusMiles])

  const sortedStations = useMemo(
    () => [...filteredStations].sort((a, b) => b.ccScore - a.ccScore),
    [filteredStations]
  )

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="relative z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* Top bar with logo + vehicle button */}
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cc-charge-blue">
              <Zap className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">
                Coffee & A Charge
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Find your perfect stop
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => !user && setShowGate(true)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
            >
              {user ? "My Stops" : "Sign In"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2 pt-1">
          <SearchBar />
        </div>

        {/* Filter pills */}
        <FilterBar activeFilters={activeFilters} onToggle={handleFilterToggle} />

        {/* Range slider */}
        <RadiusSelector value={radiusMiles} onChange={setRadiusMiles} />
      </header>

      {/* View mode toggle + locate-me - floating */}
      <div className="absolute right-4 top-[140px] z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setViewMode("map")}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border shadow-md transition-all active:scale-95",
            viewMode === "map"
              ? "border-cc-charge-blue bg-cc-charge-blue text-white"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
          aria-label="Map view"
        >
          <MapIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border shadow-md transition-all active:scale-95",
            viewMode === "list"
              ? "border-cc-charge-blue bg-cc-charge-blue text-white"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </button>
        {position && (
          <button
            type="button"
            onClick={() => flyToRef.current?.(position.lat, position.lng)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-cc-charge-blue shadow-md transition-all hover:bg-muted active:scale-95"
            aria-label="Center on my location"
          >
            <Navigation className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="relative flex-1 overflow-hidden">
        {/* MAP VIEW */}
        {viewMode === "map" && (
          <>
            <MapErrorBoundary>
              <MapPlaceholder
                stations={filteredStations}
                selectedStationId={selectedStation?.id ?? null}
                onSelectStation={handleStationSelect}
                onBoundsChange={handleBoundsChange}
                userPosition={position}
                flyToRef={flyToRef}
                className="h-full"
              />
            </MapErrorBoundary>

            {isStale && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 rounded-full bg-cc-caution-amber/10 border border-cc-caution-amber/30 px-3 py-1 text-xs text-cc-caution-amber">
                ⚠️ Data may be outdated
              </div>
            )}

            {/* Floating indicators on map */}
            <div className="absolute left-4 top-3 z-10 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
              <Coffee className="h-3 w-3 text-cc-warm-brown" aria-hidden="true" />
              <span className="text-[10px] font-medium text-foreground">{filteredStations.length} stops</span>
            </div>

            {activeFilters.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilters(new Set())}
                className="absolute left-4 top-10 z-10 flex items-center gap-1 rounded-full bg-cc-charge-blue px-2.5 py-1 text-[10px] font-medium text-white shadow-sm transition-colors hover:bg-cc-charge-blue/90 active:scale-95"
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                Clear filters
              </button>
            )}

            {/* Bottom sliding panel */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl transition-all duration-300 ease-out",
                panelState === "collapsed" && "max-h-[44px]",
                panelState === "peek" && "max-h-[220px]",
                panelState === "expanded" && "max-h-[65vh]"
              )}
            >
              {/* Drag handle */}
              <button
                type="button"
                onClick={cyclePanelState}
                className="flex w-full flex-col items-center py-2"
                aria-label={panelState === "expanded" ? "Collapse panel" : "Expand panel"}
              >
                <div className="h-1 w-10 rounded-full bg-border" />
                <div className="flex w-full items-center justify-between px-4 pt-1">
                  <h2 className="text-xs font-semibold text-foreground">
                    {sortedStations.length} stops along your route
                  </h2>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-[10px]">C&C Score</span>
                    {panelState === "expanded" ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              </button>

              {/* Horizontal card scroller (peek mode) */}
              {panelState === "peek" && (
                <div
                  className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {isLoading && [1, 2, 3].map(i => (
                    <div key={i} className="h-[160px] w-[280px] shrink-0 rounded-xl bg-muted animate-pulse" />
                  ))}
                  {!isLoading && sortedStations.map((station) => (
                    <div key={station.id} className="w-[280px] shrink-0">
                      <StopCard
                        station={station}
                        isSelected={selectedStation?.id === station.id}
                        onSelect={handleCardTap}
                        compact
                      />
                    </div>
                  ))}
                  {!isLoading && sortedStations.length === 0 && (
                    <div className="flex w-full flex-col items-center justify-center py-4 text-center">
                      <SlidersHorizontal className="mb-2 h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
                      <p className="text-xs font-medium text-muted-foreground">No stops match your filters</p>
                      <button
                        type="button"
                        onClick={() => setActiveFilters(new Set())}
                        className="mt-1.5 text-xs font-medium text-cc-charge-blue hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Vertical card list (expanded mode) */}
              {panelState === "expanded" && (
                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
                  <div className="flex flex-col gap-3">
                    {sortedStations.map((station) => (
                      <StopCard
                        key={station.id}
                        station={station}
                        isSelected={selectedStation?.id === station.id}
                        onSelect={handleCardTap}
                      />
                    ))}
                    {sortedStations.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <SlidersHorizontal className="mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                        <p className="text-sm font-medium text-muted-foreground">No stops match your filters</p>
                        <button
                          type="button"
                          onClick={() => setActiveFilters(new Set())}
                          className="mt-2 text-xs font-medium text-cc-charge-blue hover:underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* LIST VIEW */}
        {viewMode === "list" && (
          <div ref={listRef} className="h-full overflow-y-auto bg-muted/30 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {sortedStations.length} stops found
              </h2>
              {activeFilters.size > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilters(new Set())}
                  className="flex items-center gap-1 text-xs font-medium text-cc-charge-blue hover:underline"
                >
                  <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {sortedStations.map((station) => (
                <StopCard
                  key={station.id}
                  station={station}
                  isSelected={selectedStation?.id === station.id}
                  onSelect={handleCardTap}
                />
              ))}
              {sortedStations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <SlidersHorizontal className="mb-3 h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted-foreground">No stops match your filters</p>
                  <button
                    type="button"
                    onClick={() => setActiveFilters(new Set())}
                    className="mt-2 text-xs font-medium text-cc-charge-blue hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <StopDetailSheet
        station={detailStation}
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
      />

      {/* Auth gate */}
      <AuthGate isOpen={showGate} onClose={() => setShowGate(false)} />

    </main>
  )
}
