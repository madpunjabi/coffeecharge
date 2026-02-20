# Route Corridor Search — Design Doc

**Date:** 2026-02-20

## Goal

Allow users to enter a starting address and destination, then see charging stops along the route within a user-adjustable corridor width.

## UI

- Replace the single destination `SearchBar` with two stacked inputs: **From** and **To**, both with Mapbox geocoding autocomplete
- **From** field has a "Use my location" button that pre-fills with GPS coordinates
- The existing radius slider hides when route mode is active, replaced by a **corridor width slider** (1–25 miles, default 10)
- Clearing either field falls back to GPS radius mode

## Data Flow

1. Both origin + destination selected → call **Mapbox Directions API** (`/directions/v5/mapbox/driving/{origin};{destination}?geometries=geojson&access_token=...`)
2. Draw the route as a blue line on the Mapbox map; fit map bounds to the full route
3. Compute a bounding box around the entire route (padded by corridor width in degrees) → pass to `useStationQuery` as bounds
4. Client-side: for each stop, compute **minimum distance to the polyline** (point-to-segment haversine across each route segment) → keep stops within corridor width miles
5. Sort by detour distance ascending, then C&C Score as tiebreaker

## Components

- **`components/search/route-search.tsx`** — new component containing From + To inputs and corridor slider; replaces `SearchBar` + `RadiusSelector` when in route mode
- **`lib/geo/route-corridor.ts`** — `pointToSegmentDistanceMiles(point, segA, segB)` and `minDistanceToPolyline(point, polyline)` pure functions
- **`app/page.tsx`** — wire route state: `origin`, `destination`, `routeGeometry`, `corridorMiles`; pass `routeGeometry` to `MapboxMap` for rendering; swap radius filter for corridor filter when `routeGeometry` is set
- **`components/map/mapbox-map.tsx`** — accept optional `routeGeometry: GeoJSON.LineString` prop; add/remove a Mapbox `line` layer when it changes

## Error Handling

- Directions API failure → toast "Couldn't load route" + fall back to radius mode centered on destination
- Only one field filled → stay in radius mode, no Directions call
- GPS unavailable → From field stays empty/editable
- No stops in corridor → existing empty state ("No stops match your filters")

## Sort Order

Route mode: detour distance ascending, C&C Score as tiebreaker (per CLAUDE.md spec).
Radius mode: C&C Score descending (unchanged).

## API

Mapbox Directions API — already have `NEXT_PUBLIC_MAPBOX_TOKEN`. Free tier: 100k requests/month. One call per route search.
