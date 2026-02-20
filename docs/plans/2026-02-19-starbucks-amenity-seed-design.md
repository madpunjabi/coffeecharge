# Starbucks Amenity Seeding — Design Doc

**Date:** 2026-02-19

## Goal

Seed all US Starbucks locations as amenities in InstantDB so the Starbucks filter in the app returns real results. Run in parallel, no prerequisites (no DuckDB install required).

## Approach

Single script `scripts/seed-starbucks.ts` using the OSM Overpass API (free, no key, no install).

## Data Source

**Overpass API** — query by Starbucks Wikidata ID (`Q37158`) for precision:

```
[out:json][timeout:90];
node["brand:wikidata"="Q37158"](24,-125,50,-66);
out body;
```

Returns ~16k Starbucks nodes with lat/lng/name/tags across the US bounding box.

## Spatial Matching

- Fetch all stops from InstantDB (~70k) and build a spatial grid bucketed by 0.1° cells
- For each Starbucks, check only the 9 surrounding grid cells (~10–50 stops per lookup)
- Link Starbucks → stop if haversine distance ≤ 400m

## Parallelism

- Overpass fetch and InstantDB stops fetch run concurrently at startup
- InstantDB writes run 10 concurrent Promise batches at a time

## Output Schema

Amenity records identical to the Overture pipeline output:

| Field | Value |
|---|---|
| `name` | "Starbucks" |
| `brand` | "Starbucks" |
| `category` | "coffee" |
| `walkMeters` | haversine distance (metres) |
| `walkMinutes` | max(1, round(walkMeters / 80)) |
| `rating` | 0 (Geoapify enrichment later) |
| `hasWifi` | true |
| `isIndoor` | false |
| `hasFreeRestroom` | false |

Linked to stop via `db.tx.amenities[id].link({ stop: stopId })`.

## Idempotency

Pre-fetch all existing amenities once. Skip any stop that already has a Starbucks amenity linked (keyed by `stopId + brand`).

## No App Changes Required

The Starbucks filter in `page.tsx` already checks `station.amenities.some(a => a.brand.toLowerCase().includes("starbucks"))`. Once amenities are seeded, the filter works immediately.
