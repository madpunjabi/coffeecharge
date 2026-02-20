"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Search, X, MapPin } from "lucide-react"

interface GeocodingFeature {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
}

interface SearchBarProps {
  className?: string
  onSelectLocation?: (lat: number, lng: number, label: string) => void
}

export function SearchBar({ className, onSelectLocation }: SearchBarProps) {
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q) { setSuggestions([]); setIsOpen(false); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300)
  }

  const handleSelect = (feature: GeocodingFeature) => {
    setValue(feature.place_name)
    setSuggestions([])
    setIsOpen(false)
    const [lng, lat] = feature.center
    onSelectLocation?.(lat, lng, feature.place_name)
  }

  const handleClear = () => {
    setValue("")
    setSuggestions([])
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-0", className)}>
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Search destination…"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
        />
        {isLoading && (
          <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        )}
        {value && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(feature) }}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted active:bg-muted/80"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cc-charge-blue" aria-hidden="true" />
              <span className="min-w-0 text-sm text-foreground line-clamp-1">{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
