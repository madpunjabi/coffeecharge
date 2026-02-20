# Target Amenity Seeding — Design Doc

**Date:** 2026-02-19

## Goal

Seed all US Target store locations as amenities in InstantDB so the Target filter pill in the app returns real results.

## Approach

Single script `scripts/seed-target.ts` — identical to `scripts/seed-starbucks.ts` with brand-specific field overrides.

## Data Source

**Overpass API** — Target Wikidata ID `Q1046951`:

```
[out:json][timeout:90];
node["brand:wikidata"="Q1046951"](24,-125,50,-66);
out body;
```

## Differences from seed-starbucks.ts

| Field | Value |
|---|---|
| Wikidata ID | Q1046951 |
| `brand` | "Target" |
| `category` | "retail" |
| `hasWifi` | false |
| `isIndoor` | true |
| `hasFreeRestroom` | true |

All other logic (spatial grid, 400m radius, parallel batches, idempotency, retry) is identical.

## No App Changes Required

The Target filter in `page.tsx` already checks `a.brand.toLowerCase().includes("target")`.
