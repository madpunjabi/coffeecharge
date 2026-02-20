# Route Corridor Search — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users enter a starting address and destination and see charging stops within a user-adjustable corridor along the route.

**Architecture:** Mapbox Directions API returns the route GeoJSON; a new `lib/geo/route-corridor.ts` computes minimum point-to-polyline distance for each stop; `app/page.tsx` switches from radius mode to corridor mode when both origin and destination are set. A new `RouteSearch` component replaces the existing `SearchBar` + `RadiusSelector` in the header.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Mapbox GL JS · Mapbox Directions API · Tailwind v4

---

## Task 1: Add route-corridor geo utilities

**Files:**
- Create: `lib/geo/route-corridor.ts`

**Step 1: Create the file**

```typescript
// lib/geo/route-corridor.ts
// Pure geo functions for route corridor filtering.
// Coordinates from Mapbox are [lng, lat] (GeoJSON order).

import type { BoundingBox, GeoPoint } from "@/lib/types"
import { haversineDistanceMiles } from "./distance"

/**
 * Minimum distance (miles) from point p to line segment a→b.
 * Projects p onto the segment, clamps to [0,1], returns haversine distance.
 */
function pointToSegmentDistanceMiles(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return haversineDistanceMiles(p, a)
  const t = Math.max(0, Math.min(1,
    ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq
  ))
  return haversineDistanceMiles(p, { lat: a.lat + t * dy, lng: a.lng + t * dx })
}

/**
 * Minimum distance (miles) from point p to any segment in a GeoJSON polyline.
 * coords is an array of [lng, lat] pairs (Mapbox GeoJSON order).
 */
export function minDistanceToPolyline(p: GeoPoint, coords: [number, number][]): number {
  let minDist = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const a: GeoPoint = { lat: coords[i][1], lng: coords[i][0] }
    const b: GeoPoint = { lat: coords[i + 1][1], lng: coords[i + 1][0] }
    const d = pointToSegmentDistanceMiles(p, a, b)
    if (d < minDist) minDist = d
  }
  return minDist
}

/**
 * Bounding box that covers all route coordinates, padded by paddingMiles on each side.
 */
export function routeBoundingBox(coords: [number, number][], paddingMiles: number): BoundingBox {
  const lats = coords.map(c => c[1])
  const lngs = coords.map(c => c[0])
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const padLat = paddingMiles / 69                                           // ~69 miles per degree lat
  const padLng = paddingMiles / (69 * Math.cos((centerLat * Math.PI) / 180)) // shrinks toward poles
  return {
    north: Math.max(...lats) + padLat,
    south: Math.min(...lats) - padLat,
    east:  Math.max(...lngs) + padLng,
    west:  Math.min(...lngs) - padLng,
  }
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 3: Commit**

```bash
git add lib/geo/route-corridor.ts
git commit -m "feat: add route corridor geo utilities (point-to-polyline distance, bounding box)"
```

---

## Task 2: Add route line layer to MapboxMap

**Files:**
- Modify: `components/map/mapbox-map.tsx`

**Step 1: Add `routeGeometry` prop to the Props interface**

Add to the `Props` interface (after `flyToRef`):
```typescript
routeGeometry?: GeoJSON.LineString | null
```

Add to the function signature destructuring:
```typescript
export function MapboxMap({ stations, selectedStationId, onSelectStation, onBoundsChange, userPosition, flyToRef, routeGeometry, className }: Props) {
```

**Step 2: Add route source and layer in the map `load` handler**

Inside the `map.current.on("load", () => { ... })` callback, after the existing `addLayer` calls, add:

```typescript
// Route line source (empty initially)
map.current!.addSource("route", {
  type: "geojson",
  data: { type: "FeatureCollection", features: [] },
})

// Route line layer — drawn below station pins
map.current!.addLayer({
  id: "route-line",
  type: "line",
  source: "route",
  layout: { "line-join": "round", "line-cap": "round" },
  paint: {
    "line-color": "#1565C0",
    "line-width": 4,
    "line-opacity": 0.7,
  },
}, "stations-layer") // insert below station layer so pins appear on top
```

**Step 3: Add useEffect to update route when routeGeometry changes**

After the existing `useEffect` blocks (after the stations update effect), add:

```typescript
// Update route line when routeGeometry changes
useEffect(() => {
  const source = map.current?.getSource("route") as mapboxgl.GeoJSONSource | undefined
  if (!source) return
  if (routeGeometry) {
    source.setData({ type: "Feature", geometry: routeGeometry, properties: {} })
    // Fit map to route bounds
    const coords = routeGeometry.coordinates as [number, number][]
    const bounds = coords.reduce(
      (b, c) => b.extend(c as [number, number]),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    )
    map.current?.fitBounds(bounds, { padding: 60, duration: 800 })
  } else {
    source.setData({ type: "FeatureCollection", features: [] })
  }
}, [routeGeometry])
```

**Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 5: Commit**

```bash
git add components/map/mapbox-map.tsx
git commit -m "feat: add route line layer to MapboxMap"
```

---

## Task 3: Create RouteSearch component

**Files:**
- Create: `components/search/route-search.tsx`

This component replaces both `SearchBar` and `RadiusSelector` in the header. It contains:
- **From** field with geocoding autocomplete + "Use my location" button
- **To** field with geocoding autocomplete
- **Corridor width pills** (shown only when both fields are filled)

```typescript
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, X, MapPin, Navigation, ArrowDown } from "lucide-react"
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
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 3: Commit**

```bash
git add components/search/route-search.tsx
git commit -m "feat: add RouteSearch component with From/To geocoding and corridor slider"
```

---

## Task 4: Wire route mode into page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add imports**

Replace the `SearchBar` and `RadiusSelector` imports and add new ones:

```typescript
import { RouteSearch } from "@/components/search/route-search"
import { minDistanceToPolyline, routeBoundingBox } from "@/lib/geo/route-corridor"
```

Remove: `import { SearchBar } from "@/components/search-bar"` and `import { RadiusSelector } from "@/components/search/radius-selector"`

**Step 2: Add route state**

After the existing `useState` declarations, add:

```typescript
interface LocationValue { label: string; lat: number; lng: number }
const [origin, setOrigin] = useState<LocationValue | null>(null)
const [destination, setDestination] = useState<LocationValue | null>(null)
const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null)
const [corridorMiles, setCorridorMiles] = useState(10)
const [routeError, setRouteError] = useState(false)
```

**Step 3: Add Directions API fetch effect**

After the existing `useCallback` and before the `filteredStations` useMemo, add:

```typescript
// Fetch route geometry when both origin and destination are set
useEffect(() => {
  if (!origin || !destination) {
    setRouteGeometry(null)
    setRouteBounds(null)
    return
  }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${token}`
  setRouteError(false)
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const geometry = data.routes?.[0]?.geometry as GeoJSON.LineString | undefined
      if (!geometry) { setRouteError(true); return }
      setRouteGeometry(geometry)
    })
    .catch(() => setRouteError(true))
}, [origin, destination])
```

Also add a `routeBounds` state and update it when routeGeometry changes:

```typescript
const [routeBounds, setRouteBounds] = useState<BoundingBox | null>(null)

// Derive route bounding box for InstantDB query when routeGeometry updates
useEffect(() => {
  if (!routeGeometry) { setRouteBounds(null); return }
  const coords = routeGeometry.coordinates as [number, number][]
  setRouteBounds(routeBoundingBox(coords, corridorMiles))
}, [routeGeometry, corridorMiles])
```

**Step 4: Update the InstantDB query bounds**

Change the `useStationQuery` call to use route bounds when available:

```typescript
const queryBounds = routeBounds ?? bounds
const { stops, isLoading, isStale } = useStationQuery(queryBounds, activeFilters)
```

**Step 5: Update filteredStations to apply corridor filter in route mode**

Replace the existing `filteredStations` useMemo:

```typescript
const filteredStations = useMemo(() => {
  let result = stopsWithDistance

  if (routeGeometry) {
    // Route mode: filter by minimum distance to polyline
    const coords = routeGeometry.coordinates as [number, number][]
    result = result.filter(s => minDistanceToPolyline({ lat: s.lat, lng: s.lng }, coords) <= corridorMiles)
  } else if (position && radiusMiles) {
    // Radius mode: filter by GPS radius
    result = filterByRadius(result, position, radiusMiles)
  }

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
}, [activeFilters, stopsWithDistance, position, radiusMiles, routeGeometry, corridorMiles])
```

**Step 6: Update sortedStations to sort by detour in route mode**

```typescript
const sortedStations = useMemo(() => {
  if (routeGeometry) {
    const coords = routeGeometry.coordinates as [number, number][]
    return [...filteredStations].sort((a, b) => {
      const distA = minDistanceToPolyline({ lat: a.lat, lng: a.lng }, coords)
      const distB = minDistanceToPolyline({ lat: b.lat, lng: b.lng }, coords)
      if (Math.abs(distA - distB) > 0.1) return distA - distB
      return b.ccScore - a.ccScore
    })
  }
  return [...filteredStations].sort((a, b) => b.ccScore - a.ccScore)
}, [filteredStations, routeGeometry])
```

**Step 7: Replace SearchBar + RadiusSelector in the JSX**

Replace this block in the header:
```tsx
{/* Search bar */}
<div className="px-4 pb-2 pt-1">
  <SearchBar
    onSelectLocation={(lat, lng) => {
      flyToRef.current?.(lat, lng)
      setViewMode("map")
    }}
  />
</div>

{/* Filter pills */}
<FilterBar activeFilters={activeFilters} onToggle={handleFilterToggle} />

{/* Range slider */}
<RadiusSelector value={radiusMiles} onChange={setRadiusMiles} />
```

With:
```tsx
{/* Route search */}
<div className="px-4 pb-2 pt-1">
  <RouteSearch
    userPosition={position}
    onRouteChange={(orig, dest) => {
      setOrigin(orig)
      setDestination(dest)
      setViewMode("map")
    }}
    corridorMiles={corridorMiles}
    onCorridorChange={setCorridorMiles}
  />
</div>

{/* Filter pills */}
<FilterBar activeFilters={activeFilters} onToggle={handleFilterToggle} />

{/* Radius slider — only in GPS mode */}
{!routeGeometry && <RadiusSelector value={radiusMiles} onChange={setRadiusMiles} />}
```

Re-add the `RadiusSelector` import since it's still used in GPS mode:
```typescript
import { RadiusSelector } from "@/components/search/radius-selector"
```

**Step 8: Pass routeGeometry to MapboxMap**

```tsx
<MapPlaceholder
  stations={filteredStations}
  selectedStationId={selectedStation?.id ?? null}
  onSelectStation={handleStationSelect}
  onBoundsChange={handleBoundsChange}
  userPosition={position}
  flyToRef={flyToRef}
  routeGeometry={routeGeometry}
  className="h-full"
/>
```

**Step 9: Add route error toast**

After the `isStale` banner in the JSX, add:
```tsx
{routeError && (
  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 rounded-full bg-cc-caution-amber/10 border border-cc-caution-amber/30 px-3 py-1 text-xs text-cc-caution-amber">
    Couldn't load route — showing stops near destination
  </div>
)}
```

**Step 10: Type-check and build**

```bash
npx tsc --noEmit 2>&1
npm run build 2>&1 | tail -15
```
Expected: No errors.

**Step 11: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire route corridor search into page — From/To inputs, Directions API, corridor filter"
```
