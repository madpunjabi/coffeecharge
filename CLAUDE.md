# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check without emitting
```

**InstantDB schema/permissions:**
```bash
npx instant-cli push schema --yes   # Push schema changes to prod
npx instant-cli push perms --yes    # Push permission changes to prod
npx instant-cli pull --yes          # Pull schema + perms from prod
```

## What This App Is

**Coffee & A Charge** — an EV road trip companion that finds charging stops ranked by two proprietary scores combined into a headline **C&C Score (out of 10)**:

- **⚡ Charge Confidence Score (out of 5):** Real-time charger reliability based on NEVI/OCPI live status, ChargePoint API, 30-day uptime history, and community check-ins.
- **☕ Brew Score (out of 5):** Walk-score equivalent for charging stops — quality/quantity of walkable amenities (food, restrooms, retail) within 400m, cross-referenced with typical charge duration.

The founding use case: *"I need to charge within the next 50 miles and my passenger wants a Starbucks — show me the best stop in under 30 seconds."*

## Current State (as of Phase 4)

Phases 0–4 are complete. The app is a working MVP shell with real data wiring. All dependencies are installed, the schema is fully defined and pushed, and the main UI is implemented.

**What's built:**
- Full main page (`app/page.tsx`) — map + bottom sheet layout, filter bar, range slider, list/map toggle, auth gate
- Complete component library: `stop-card`, `stop-detail-sheet`, `filter-bar`, all score components, `mapbox-map`, `auth-gate`, `range-slider`, etc.
- `lib/types.ts` — all domain types (`Station`, `Amenity`, `ChargeScore`, `BrewScore`, `Stall`, `BoundingBox`, etc.)
- `lib/mock-data.ts` — mock stations for offline/dev use
- `lib/scoring/` — `charge-score.ts`, `brew-score.ts`, `network-benchmarks.ts`, `geoapify.ts`
- `lib/charger-status/` — `provider.ts` (interface), `mock-provider.ts`
- `lib/geo/` — `distance.ts` (haversine), `radius-filter.ts`, `bounding-box.ts`
- `hooks/` — `use-station-query.ts`, `use-auth-gate.ts`, `use-check-in.ts`, `use-geolocation.ts`
- `instant.schema.ts` — full schema: `stops`, `amenities`, `checkIns`, `savedStops`
- `instant.perms.ts` — permissions defined (public read on stops/amenities; auth required for check-ins/saved stops)
- API routes: `POST /api/brew-score/[stationId]`, `GET /api/cron/refresh-brew-scores`, `GET /api/cron/sync-nrel`, `POST /api/seed-stations`
- Vercel cron: brew-score refresh Sundays 2am UTC, NREL sync Mondays 3am UTC

**What's still needed (P1+):**
- Live OCPI status polling (currently mocked with stall ratio proxy)
- Overture Maps DuckDB ingestion script (`scripts/overture-to-amenities.ts` is scaffolded; `scripts/overture-extract.sh` is drafted)
- Route corridor support (P1 trip planner — currently GPS radius only)
- Promoted content (deferred to P1)
- PWA service worker / offline caching

**Implementation plan:** `docs/plans/2026-02-19-coffee-and-a-charge-mvp.md` — use `superpowers:executing-plans` to work through remaining tasks.

**Reference components:** `docs/designmocks_extracted/` is the source-of-truth for UI. If a component needs to be modified or rebuilt, check here first.

## Architecture

**Stack:** Next.js 16.1.6 (App Router) + React 19 + TypeScript + Tailwind v4 + **InstantDB** (client-side real-time DB)

**Key files:**
- `lib/db.ts` — InstantDB client singleton to create (`import { db } from "@/lib/db"`)
- `lib/utils.ts` — `cn()` utility (clsx + tailwind-merge); every component imports this
- `instant.schema.ts` — Data model. Edit here then push with CLI. Full schema is implemented.
- `instant.perms.ts` — Row-level permissions. Edit here then push with CLI. Permissions are defined.
- `app/` — Next.js App Router pages and layouts
- `app/globals.css` — Tailwind v4 uses CSS-first config (`@import "tailwindcss"` + `@import "tw-animate-css"`); there is no `tailwind.config.js`. Also needs `@custom-variant dark (&:is(.dark *))` for shadcn dark mode.
- `components.json` — shadcn/ui config (new-york style, CSS variables, lucide icons, aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/hooks`)
- `docs/prd.md` — Full Product Requirements Document: scoring formulas, feature priorities (P0/P1/P2), and target metrics.
- `docs/designmocks_extracted/` — Reference implementation (components + styles). **Source of truth for UI.**
- `docs/plans/2026-02-19-coffee-and-a-charge-mvp.md` — Phased implementation plan.

**Actual directory structure:**
```
app/
  page.tsx              # Map + bottom sheet layout (fully implemented)
  layout.tsx            # Root layout with ThemeProvider + Vercel Analytics
  globals.css           # Brand tokens + Tailwind v4
  api/
    brew-score/[stationId]/route.ts   # On-demand brew-score compute
    cron/refresh-brew-scores/route.ts # Weekly cron (Sunday 2am UTC)
    cron/sync-nrel/route.ts           # Weekly NREL sync (Monday 3am UTC)
    seed-stations/route.ts            # Dev seed endpoint
components/
  ui/                   # shadcn/ui primitives (new-york style)
  map/                  # mapbox-map.tsx, map-placeholder-stub.tsx
  auth/                 # auth-gate.tsx
  search/               # range-slider.tsx
  stop-card.tsx, stop-detail-sheet.tsx, filter-bar.tsx
  charge-score.tsx, brew-score.tsx, score-badge.tsx, score-breakdown.tsx
  reliability-badge.tsx, fallback-station.tsx, amenity-list.tsx, charger-grid.tsx
  search-bar.tsx, theme-provider.tsx
lib/
  db.ts                 # InstantDB singleton (init with schema)
  utils.ts              # cn() utility
  types.ts              # All domain types + getScoreTier()
  mock-data.ts          # Mock stations + filterOptions for dev
  scoring/              # charge-score.ts, brew-score.ts, network-benchmarks.ts, geoapify.ts
  charger-status/       # provider.ts (interface), mock-provider.ts
  geo/                  # distance.ts (haversine), radius-filter.ts, bounding-box.ts
hooks/
  use-station-query.ts  # InstantDB query + Station type mapping
  use-auth-gate.ts      # Auth state + gate visibility
  use-check-in.ts       # One-tap check-in write
  use-geolocation.ts    # GPS position
scripts/
  overture-extract.sh       # DuckDB S3 → parquet extract (drafted)
  overture-to-amenities.ts  # Parquet → InstantDB import (scaffolded)
  output/                   # Script output files
```

**Environment variables** (in `.env.local`, gitignored):
- `NEXT_PUBLIC_INSTANT_APP_ID` — client-side InstantDB app ID
- `INSTANT_ADMIN_TOKEN` — server-side admin token for Edge Functions / scripts

## Engineering Decisions (MVP)

These decisions were finalized during the design review and **override** the original PRD where they conflict:

| Decision | Choice |
|---|---|
| OCPI live polling | Deferred to V1.1 — MVP uses static network benchmarks + community check-ins |
| Overture Maps ingestion | DuckDB local script queries S3 directly → imports amenities into InstantDB (not an API call per request) |
| Auth | Google OAuth only via InstantDB built-in auth |
| Deployment | Vercel free tier — weekly Vercel Cron for Brew Score; no always-on server |
| Vehicle profile | Removed from MVP — "Set Vehicle" button becomes "Sign In" |
| Charge Score formula | Static network benchmarks (35%) + NREL uptime proxy (30%) + check-in recency (20%) + network benchmark (15%) |
| UI approach | UI-first: scaffold with mock data first (Phase 0), wire real data phase-by-phase |

## External Data Sources (per PRD)

| Data | Source | Cost |
|---|---|---|
| Station registry | NREL Alternative Fuels API | Free |
| Real-time charger status | NEVI OCPI feeds | Free |
| Live stall availability | ChargePoint Developer API | Free (gated) |
| Fallback registry | Open Charge Map (OCM) | Free |
| Amenity locations + hours | Overture Maps | Free |
| Amenity ratings enrichment | Geoapify Places API | Free ≤3k credits/day |
| Maps | Mapbox GL JS | Free ≤50k loads/month |

> **Note:** Google Places API has been removed. Overture Maps handles brand POI locations and hours for free. Geoapify handles ratings enrichment only.

## Scoring Pipeline

- **Brew Score** — computed server-side via Next.js API route; reads Overture Maps (locations + hours) and Geoapify (ratings enrichment) data and stores results in InstantDB, **cached weekly** per station. Never computed per-request to control API costs.
- **Charge Confidence Score** — computed in real-time from NEVI OCPI feeds + ChargePoint API + community check-in data. No caching; freshness is the point.
- **C&C Score** — sum of the two scores above (max 10), computed at query time.

## Design Constraints

**Mobile-first, always.** Every screen must work at 390px width first. Desktop scales up from mobile.

**Color system:**
| Name | Hex | Usage |
|---|---|---|
| Charge Blue | `#1565C0` | Primary brand, CTAs, Charge Confidence Score |
| Brew Green | `#2E7D32` | Brew Score, success states, charger available |
| Caution Amber | `#E65100` | Busy chargers, reliability warnings |
| Alert Red | `#C62828` | Broken charger, critical failures |
| Warm Cream | `#FFF8E1` | Card backgrounds |
| Deep Charcoal | `#212121` | Primary text |

**Typeface:** Geist (sans-serif), Geist Mono — registered in `@theme inline` in `globals.css`.

**Dark mode:** Fully defined and in scope for MVP. Dark palette uses warm charcoal backgrounds (`#1A1410`) and a lighter Charge Blue (`#42A5F5`) swap. Full token set is in `docs/designmocks_extracted/app/globals.css`.

**Component library:** Shadcn/ui + Radix UI primitives. Drawer (vaul) for the stop detail sheet. Do not introduce other component libraries.

**UI patterns:**
- Bottom sheet navigation (Apple Maps style) — three states:
  - **Collapsed:** 44px handle bar only
  - **Peek:** 220px — horizontally scrolling stop card strip
  - **Expanded:** 65vh — vertically scrolling full stop card list
- Horizontally scrolling brand filter pills at top of map — **text labels with icons** (not logo images); active state = Charge Blue fill + white text
- Map occupies full screen with overlaid UI — no sidebar splits
- Touch targets minimum 44×44px
- Stop cards show: network badge, reliability badge, station name, distance + detour, C&C Score (top-right), ⚡ Charge Score + ☕ Brew Score, kW badge, stall availability (X/Y, color-coded), price/kWh, amenity pills, "Last verified" timestamp
- **Score tier label** (e.g. "Excellent", "Great") shown on the stop card below the numeric C&C Score badge, not just in the detail sheet
- **Auth flow:** Soft gate — map and stop cards are visible immediately on app open; sign-up is prompted before full access (check-in, saving stops). Auth handled by InstantDB built-in auth.
- **Range slider:** Single-handle radius slider from current GPS location (MVP). Route corridor deferred to P1 trip planner.
- **Sort order:** No destination set → radius from GPS, sorted by C&C Score. Destination entered → sorted by lowest detour distance first, then C&C Score as tiebreaker.
- **Check-in flow:** One-tap from stop detail sheet → logs "working" status instantly → toast confirmation ("Thanks! Charger marked as working.") → button changes to "Checked In ✓". No form or multi-step flow.
- **Fallback station:** Shown in stop detail sheet as an amber callout ("If this stop fails →"). Selected as the nearest station by distance to the current stop.
- **Loading states:** Skeleton screens while data loads. On data failure, show last cached values with a "⚠️ Data may be outdated" banner — never hide content entirely.
- **Promoted content:** Deferred to P1. All MVP results are organic only.
- **Empty state (no filter results):** Icon + "No stops match your filters" + "Clear all filters" link.

## Data Flow

**Station query pipeline** (`app/page.tsx` → `hooks/use-station-query.ts` → InstantDB):
1. `useGeolocation` provides GPS `position`
2. `MapboxMap` emits `onBoundsChange` → `BoundingBox` state in page
3. `useStationQuery(bounds, activeFilters)` builds an InstantDB `where` clause using indexed fields (lat/lng range, `isActive`, `hasCcs`, `hasNacs`, `hasChademo`, `maxPowerKw`, `availableStalls`) and fetches `stops { amenities {} }`
4. Result is mapped from InstantDB shape → `Station[]` type (JSON fields parsed, relative time formatted)
5. Page applies client-side filters: radius (`filterByRadius` using haversine), ultra-fast power (250kW+), and brand/amenity filters
6. Sorted by `ccScore` descending

**Filter split — DB vs client-side:**
- **DB-pushed (indexed):** connector type (ccs/nacs/chademo), fast (150kW+), available now, bounding box
- **Client-side only:** ultrafast (250kW+), brand pills (Starbucks/McDonald's/Target), grocery/amenity category, radius from GPS

**Cron jobs** (`vercel.json` → `app/api/cron/`):
- `sync-nrel` — weekly NREL API pull → upserts stops in InstantDB; computes charge scores
- `refresh-brew-scores` — weekly Overture + Geoapify computation → updates `brewScore` + `brewScoreComputedAt` per stop

## InstantDB Usage Patterns

```tsx
// Always use schema for type safety
import { db } from "@/lib/db";

// Read data
const { data, isLoading } = db.useQuery({ stops: { amenities: {} } });

// Write data
import { id } from "@instantdb/react";
db.transact(db.tx.stops[id()].update({ ... }));

// Auth
const { isLoading, user, error } = db.useAuth();

// Type entities
import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
type Stop = InstaQLEntity<AppSchema, "stops">;
```

**Schema rules:** Any field used in `where` filters or `order` must be `.indexed()` in `instant.schema.ts`. Pagination (`limit`, `offset`) only works on top-level namespaces, not nested relations.

## Specialized Agents

`.claude/agents/` contains 8 specialized agents for domain-specific guidance. Invoke them via the Skill tool or by name when working in their area:

- `frontend-developer` — React/Next.js UI components, state management, performance
- `mobile-ux-optimizer` — Mobile-first UX, touch targets, bottom sheet patterns
- `data-engineer` — ETL pipelines, data sources, caching strategies
- `solution-architect` — Technical architecture, technology selection, system design
- `ui-designer` — UI component design, design systems, visual aesthetics
- `full-stack-architect` — Full system architecture spanning backend, APIs, and frontend
- `planning-prd-agent` — PRDs, requirements documents, feature breakdowns, task decomposition
- `unit-test-generator` — Unit test creation and coverage improvement

## PWA Target

The app is architected as a Progressive Web App from day one: home screen install, GPS geolocation, push notifications (service worker), and offline caching. Next.js PWA config (`next-pwa`) handles this.
