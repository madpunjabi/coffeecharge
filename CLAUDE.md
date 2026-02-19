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

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + **InstantDB** (client-side real-time DB, replaces Supabase mentioned in the PRD)

**Key files:**
- `lib/db.ts` — InstantDB client singleton (`import { db } from "@/lib/db"`)
- `instant.schema.ts` — Data model. Edit here then push with CLI. **Currently only has system entities (`$files`, `$streams`, `$users`) — domain entities (stops, amenities, check-ins, etc.) must be added before feature work begins.**
- `instant.perms.ts` — Row-level permissions. Edit here then push with CLI.
- `app/` — Next.js App Router pages and layouts
- `app/globals.css` — Tailwind v4 uses CSS-first config (`@import "tailwindcss"`); there is no `tailwind.config.js`.
- `docs/prd.md` — Full Product Requirements Document: scoring formulas, feature priorities (P0/P1/P2), and target metrics.

**Environment variables** (in `.env.local`, gitignored):
- `NEXT_PUBLIC_INSTANT_APP_ID` — client-side InstantDB app ID
- `INSTANT_ADMIN_TOKEN` — server-side admin token for Edge Functions / scripts

## External Data Sources (per PRD)

| Data | Source | Cost |
|---|---|---|
| Station registry | NREL Alternative Fuels API | Free |
| Real-time charger status | NEVI OCPI feeds | Free |
| Live stall availability | ChargePoint Developer API | Free (gated) |
| Fallback registry | Open Charge Map (OCM) | Free |
| Amenity discovery | Google Places API | Paid — **cache weekly** |
| Maps | Mapbox GL JS | Free ≤50k loads/month |

## Scoring Pipeline

- **Brew Score** — computed server-side via Next.js API route; reads Google Places API results and stores them in InstantDB, **cached weekly** per station. Never computed per-request to control API costs.
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

**UI patterns:**
- Bottom sheet navigation (Apple Maps style) — collapsed / half / full states
- Horizontally scrolling brand filter pills with logos (not text) at top of map
- Map occupies full screen with overlaid UI — no sidebar splits
- Touch targets minimum 44×44px
- Stop cards show: network logo, kW badge, stall count, ⚡ score, top 3 amenity logos + walk time, ☕ score, C&C Score, detour distance

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

(Plus additional agents in the directory — check `.claude/agents/` for the full list.)

## PWA Target

The app is architected as a Progressive Web App from day one: home screen install, GPS geolocation, push notifications (service worker), and offline caching. Next.js PWA config (`next-pwa`) handles this.
