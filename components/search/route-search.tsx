"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, MapPin, Navigation, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface GeocodingFeature {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
}

interface LocationValue {
  label: string
  lat: number
  lng: number
}

interface RouteSearchProps {
  userPosition?: { lat: number; lng: number } | null
  onRouteChange: (
    origin: LocationValue | null,
    destination: LocationValue | null
  ) => void
  corridorMiles: number
  onCorridorChange: (miles: number) => void
}

const CORRIDOR_OPTIONS = [5, 10, 15, 25]

function useGeocodeInput(onSelect: (loc: LocationValue | null) => void) {
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return }
    setIsLoading(true)
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=us&types=place,address,poi,neighborhood,locality&limit=5`
      const res = await fetch(url)
      const data = await res.json()
      setSuggestions(data.features ?? [])
      setIsOpen(true)
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setValue(q)
    if (!q) { setSuggestions([]); setIsOpen(false); onSelect(null); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300)
  }

  const handleSelect = (feature: GeocodingFeature) => {
    setValue(feature.place_name)
    setSuggestions([])
    setIsOpen(false)
    const [lng, lat] = feature.center
    onSelect({ label: feature.place_name, lat, lng })
  }

  const handleClear = () => {
    setValue("")
    setSuggestions([])
    setIsOpen(false)
    onSelect(null)
  }

  const setValueExternal = (label: string) => setValue(label)

  return { value, suggestions, isOpen, isLoading, handleChange, handleSelect, handleClear, setIsOpen, setValueExternal }
}

export function RouteSearch({ userPosition, onRouteChange, corridorMiles, onCorridorChange }: RouteSearchProps) {
  const [origin, setOrigin] = useState<LocationValue | null>(null)
  const [destination, setDestination] = useState<LocationValue | null>(null)

  const fromInput = useGeocodeInput((loc) => {
    setOrigin(loc)
    onRouteChange(loc, destination)
  })

  const toInput = useGeocodeInput((loc) => {
    setDestination(loc)
    onRouteChange(origin, loc)
  })

  // Click-outside handler shared by both dropdowns
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        fromInput.setIsOpen(false)
        toInput.setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [fromInput, toInput])

  const handleUseMyLocation = () => {
    if (!userPosition) return
    const label = "My Location"
    fromInput.setValueExternal(label)
    const loc = { label, lat: userPosition.lat, lng: userPosition.lng }
    setOrigin(loc)
    onRouteChange(loc, destination)
  }

  const hasRoute = origin !== null && destination !== null

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      {/* From field */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-cc-charge-blue w-6">From</span>
          <input
            type="text"
            value={fromInput.value}
            onChange={fromInput.handleChange}
            onFocus={() => fromInput.suggestions.length > 0 && fromInput.setIsOpen(true)}
            placeholder="Starting address…"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoComplete="off"
          />
          {fromInput.isLoading && (
            <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          )}
          {fromInput.value && !fromInput.isLoading ? (
            <button type="button" onClick={fromInput.handleClear} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : userPosition && !fromInput.value ? (
            <button type="button" onClick={handleUseMyLocation} className="shrink-0 text-cc-charge-blue hover:text-cc-charge-blue/80" aria-label="Use my location">
              <Navigation className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {fromInput.isOpen && fromInput.suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {fromInput.suggestions.map((f) => (
              <button key={f.id} type="button" onMouseDown={(e) => { e.preventDefault(); fromInput.handleSelect(f) }}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cc-charge-blue" />
                <span className="min-w-0 text-sm text-foreground line-clamp-1">{f.place_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Arrow between inputs */}
      <div className="flex justify-center">
        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* To field */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-cc-caution-amber w-6">To</span>
          <input
            type="text"
            value={toInput.value}
            onChange={toInput.handleChange}
            onFocus={() => toInput.suggestions.length > 0 && toInput.setIsOpen(true)}
            placeholder="Destination…"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoComplete="off"
          />
          {toInput.isLoading && (
            <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          )}
          {toInput.value && !toInput.isLoading && (
            <button type="button" onClick={toInput.handleClear} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {toInput.isOpen && toInput.suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {toInput.suggestions.map((f) => (
              <button key={f.id} type="button" onMouseDown={(e) => { e.preventDefault(); toInput.handleSelect(f) }}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cc-charge-blue" />
                <span className="min-w-0 text-sm text-foreground line-clamp-1">{f.place_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Corridor width pills — only when route is set */}
      {hasRoute && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground shrink-0">Corridor</span>
          <div className="flex gap-1.5">
            {CORRIDOR_OPTIONS.map(mi => (
              <button
                key={mi}
                type="button"
                onClick={() => onCorridorChange(mi)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                  corridorMiles === mi
                    ? "bg-cc-charge-blue text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {mi}mi
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
