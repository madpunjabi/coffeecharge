# Coffee & A Charge — Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Coffee & A Charge MVP — an EV road trip companion that ranks charging stops by a composite C&C Score combining charger reliability and walkable amenity quality.

**Architecture:** UI-first approach — the design mocks are production-ready React components; scaffold the full UI with mock data in Phase 0 (Days 1–3), then wire real data phase-by-phase. All reads are client-side via InstantDB real-time queries; server-side work is limited to two weekly Vercel Cron jobs and one-time data seeding scripts.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · InstantDB · Mapbox GL JS · Shadcn/ui · vaul (Drawer) · Vercel (free tier) · DuckDB (local script) · Geoapify · NREL API

---

## Key Decisions (from design review)

| Decision | Choice |
|---|---|
| OCPI live polling | Deferred to V1.1 — MVP uses static network benchmarks + community check-ins |
| Overture Maps | DuckDB local script queries S3 directly → imports amenities into InstantDB |
| Auth | Google OAuth only (InstantDB built-in) |
| Vercel plan | Free tier — weekly cron is sufficient |
| VehicleProfile | Removed from MVP — "Set Vehicle" → "Sign In" button |
| Charge Score MVP | Static network benchmarks (35%) + NREL uptime proxy (30%) + check-in recency (20%) + network benchmark (15%) |

---

## Phase 0: Scaffold (Days 1–3)

*Goal: Full UI running at localhost:3000 with mock data. App is shareable before any real data is wired.*

### Task 0.1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install all required packages**

```bash
npm install vaul mapbox-gl next-themes @vercel/analytics lucide-react class-variance-authority clsx tailwind-merge tw-animate-css
npm install --save-dev @types/mapbox-gl
```

**Step 2: Verify no errors**

```bash
npm run build 2>&1 | head -20
```
Expected: Build may fail due to missing files — that's fine at this stage. No npm resolution errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install UI and map dependencies"
```

---

### Task 0.2: Create lib/utils.ts

Every component imports `cn()` from `@/lib/utils`. This must exist before any component compiles.

**Files:**
- Create: `lib/utils.ts`

**Step 1: Create the file**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit 2>&1 | grep "utils"
```
Expected: No errors for utils.ts.

**Step 3: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: add cn() utility"
```

---

### Task 0.3: Create lib/types.ts

All components reference types from `@/lib/types`. Define the complete domain type system.

**Files:**
- Create: `lib/types.ts`

**Step 1: Create the file**

```typescript
// lib/types.ts

export type ConnectorType = "CCS" | "CHAdeMO" | "NACS" | "Type2" | "J1772"
export type StallStatus = "available" | "occupied" | "broken" | "unknown"
export type AmenityCategory = "coffee" | "food" | "grocery" | "retail" | "restroom" | "hotel" | "gas"
export type ReliabilityLevel = "high" | "medium" | "low"
export type ChargingNetwork =
  | "Tesla Supercharger"
  | "Electrify America"
  | "ChargePoint"
  | "EVgo"
  | "Blink"
  | "Unknown"

export interface ChargeScore {
  overall: number              // 0–5
  uptimeHistory: number        // 0–5 (35% weight)
  realTimeAvailability: number // 0–5 (30% weight — NREL proxy at MVP)
  communityVerification: number// 0–5 (20% weight)
  networkBenchmark: number     // 0–5 (15% weight)
}

export interface BrewScore {
  overall: number              // 0–5
  foodOptions: number          // 0–5 (30% weight)
  restroomAccess: number       // 0–5 (20% weight)
  retailQuality: number        // 0–5 (15% weight)
  venueQuality: number         // 0–5 (15% weight)
  environment: number          // 0–5 (10% weight)
  hoursCoverage: number        // 0–5 (10% weight)
}

export interface Stall {
  id: string
  stallNumber: number
  powerKw: number
  connector: ConnectorType
  status: StallStatus
  evseId?: string
}

export interface Amenity {
  id: string
  name: string
  brand: string
  category: AmenityCategory
  walkMinutes: number
  distanceMeters: number
  rating: number               // 0–5, from Geoapify; 0 = no data
  hours: string                // e.g. "6am–10pm" or "Unknown"
  hoursJson?: string           // raw OSM hours format for client-side isOpenNow calc
  lat: number
  lng: number
  overtureId?: string
}

export interface Station {
  id: string
  externalId: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  network: ChargingNetwork
  connectorTypes: ConnectorType[]
  maxPowerKw: number
  stalls: Stall[]
  pricePerKwh: number
  ccScore: number              // 0–10
  chargeScore: ChargeScore
  brewScore: BrewScore
  reliability: ReliabilityLevel
  lastVerified: string         // human-readable: "2h ago"
  lastVerifiedAt: number       // Unix ms
  photoCount: number
  distanceMiles: number        // computed client-side
  detourMiles: number          // 0 = on route
  amenities: Amenity[]
  fallbackStationId: string | null
  nrelId?: string
  ocmId?: string
  brewScoreUpdatedAt?: number
}

export interface FilterOption {
  id: string
  label: string
  category: "connector" | "power" | "brand" | "amenity" | "availability"
}

export interface ScoreTier {
  label: string
  colorClass: string
}

export function getScoreTier(score: number): ScoreTier {
  if (score >= 9.0) return { label: "Perfect Stop", colorClass: "text-cc-gold" }
  if (score >= 8.0) return { label: "Excellent Stop", colorClass: "text-cc-charge-blue" }
  if (score >= 7.0) return { label: "Great Stop", colorClass: "text-cc-brew-green" }
  if (score >= 6.0) return { label: "Good Stop", colorClass: "text-cc-brew-green" }
  if (score >= 5.0) return { label: "Decent Stop", colorClass: "text-cc-caution-amber" }
  return { label: "Proceed with Caution", colorClass: "text-cc-alert-red" }
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface GeoPoint {
  lat: number
  lng: number
}

// P1 — defined for type completeness, not used in MVP UI
export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  batteryKwh: number
  rangeMaxMiles: number
  connectors: ConnectorType[]
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "types"
```
Expected: No errors.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add domain type system"
```

---

### Task 0.4: Create lib/mock-data.ts

Provides mock stations and filter options so the UI renders with realistic data during development.

**Files:**
- Create: `lib/mock-data.ts`

**Step 1: Create the file**

```typescript
// lib/mock-data.ts
import type { Station, FilterOption } from "./types"

export const filterOptions: FilterOption[] = [
  { id: "fast", label: "Fast 150kW+", category: "power" },
  { id: "ultrafast", label: "Ultra 250kW+", category: "power" },
  { id: "nacs", label: "NACS", category: "connector" },
  { id: "ccs", label: "CCS", category: "connector" },
  { id: "chademo", label: "CHAdeMO", category: "connector" },
  { id: "starbucks", label: "Starbucks", category: "brand" },
  { id: "mcdonalds", label: "McDonald's", category: "brand" },
  { id: "target", label: "Target", category: "brand" },
  { id: "grocery", label: "Grocery", category: "amenity" },
  { id: "restrooms", label: "Restrooms", category: "amenity" },
  { id: "wifi", label: "WiFi", category: "amenity" },
  { id: "available", label: "Available Now", category: "availability" },
]

export const stations: Station[] = [
  {
    id: "mock-1",
    externalId: "nrel-64274",
    name: "Electrify America — Vacaville Premium Outlets",
    address: "321 Nut Tree Rd",
    city: "Vacaville",
    state: "CA",
    zip: "95687",
    lat: 38.357,
    lng: -121.978,
    network: "Electrify America",
    connectorTypes: ["CCS", "CHAdeMO"],
    maxPowerKw: 350,
    stalls: [
      { id: "s1", stallNumber: 1, powerKw: 350, connector: "CCS", status: "available" },
      { id: "s2", stallNumber: 2, powerKw: 350, connector: "CCS", status: "occupied" },
      { id: "s3", stallNumber: 3, powerKw: 150, connector: "CHAdeMO", status: "available" },
      { id: "s4", stallNumber: 4, powerKw: 150, connector: "CCS", status: "broken" },
    ],
    pricePerKwh: 0.48,
    ccScore: 8.6,
    chargeScore: {
      overall: 4.2,
      uptimeHistory: 4.5,
      realTimeAvailability: 4.0,
      communityVerification: 4.2,
      networkBenchmark: 4.0,
    },
    brewScore: {
      overall: 4.4,
      foodOptions: 4.8,
      restroomAccess: 5.0,
      retailQuality: 4.5,
      venueQuality: 4.2,
      environment: 4.0,
      hoursCoverage: 4.5,
    },
    reliability: "high",
    lastVerified: "12 min ago",
    lastVerifiedAt: Date.now() - 12 * 60 * 1000,
    photoCount: 24,
    distanceMiles: 22.4,
    detourMiles: 0,
    amenities: [
      { id: "a1", name: "Starbucks", brand: "Starbucks", category: "coffee", walkMinutes: 3, distanceMeters: 180, rating: 4.2, hours: "5:30am–9pm", lat: 38.358, lng: -121.979 },
      { id: "a2", name: "McDonald's", brand: "McDonald's", category: "food", walkMinutes: 2, distanceMeters: 120, rating: 3.8, hours: "6am–11pm", lat: 38.356, lng: -121.977 },
      { id: "a3", name: "Restrooms (mall)", brand: "", category: "restroom", walkMinutes: 1, distanceMeters: 60, rating: 0, hours: "10am–9pm", lat: 38.357, lng: -121.978 },
    ],
    fallbackStationId: "mock-2",
  },
  {
    id: "mock-2",
    externalId: "nrel-55102",
    name: "ChargePoint — Davis Safeway",
    address: "1451 W Covell Blvd",
    city: "Davis",
    state: "CA",
    zip: "95616",
    lat: 38.558,
    lng: -121.762,
    network: "ChargePoint",
    connectorTypes: ["CCS", "J1772"],
    maxPowerKw: 62,
    stalls: [
      { id: "s5", stallNumber: 1, powerKw: 62, connector: "CCS", status: "available" },
      { id: "s6", stallNumber: 2, powerKw: 62, connector: "J1772", status: "available" },
    ],
    pricePerKwh: 0.29,
    ccScore: 7.1,
    chargeScore: {
      overall: 3.6,
      uptimeHistory: 3.8,
      realTimeAvailability: 3.5,
      communityVerification: 3.2,
      networkBenchmark: 3.8,
    },
    brewScore: {
      overall: 3.5,
      foodOptions: 4.0,
      restroomAccess: 4.0,
      retailQuality: 3.5,
      venueQuality: 3.2,
      environment: 3.0,
      hoursCoverage: 3.5,
    },
    reliability: "medium",
    lastVerified: "3 hours ago",
    lastVerifiedAt: Date.now() - 3 * 60 * 60 * 1000,
    photoCount: 6,
    distanceMiles: 14.2,
    detourMiles: 2.1,
    amenities: [
      { id: "a4", name: "Safeway", brand: "Safeway", category: "grocery", walkMinutes: 1, distanceMeters: 40, rating: 3.9, hours: "5am–1am", lat: 38.559, lng: -121.762 },
    ],
    fallbackStationId: null,
  },
]
```

**Step 2: Commit**

```bash
git add lib/mock-data.ts
git commit -m "feat: add mock station data for development"
```

---

### Task 0.5: Copy design mock components and globals.css

**Files:**
- Copy from `docs/designmocks_extracted/` to project root

**Step 1: Copy globals.css (design tokens)**

```bash
cp docs/designmocks_extracted/app/globals.css app/globals.css
```

**Step 2: Copy all UI components**

```bash
cp -r docs/designmocks_extracted/components/ui components/ui
cp docs/designmocks_extracted/components/score-badge.tsx components/score-badge.tsx
cp docs/designmocks_extracted/components/charge-score.tsx components/charge-score.tsx
cp docs/designmocks_extracted/components/brew-score.tsx components/brew-score.tsx
cp docs/designmocks_extracted/components/reliability-badge.tsx components/reliability-badge.tsx
cp docs/designmocks_extracted/components/charger-grid.tsx components/charger-grid.tsx
cp docs/designmocks_extracted/components/score-breakdown.tsx components/score-breakdown.tsx
cp docs/designmocks_extracted/components/theme-provider.tsx components/theme-provider.tsx
cp docs/designmocks_extracted/components/stop-card.tsx components/stop-card.tsx
cp docs/designmocks_extracted/components/amenity-list.tsx components/amenity-list.tsx
cp docs/designmocks_extracted/components/filter-bar.tsx components/filter-bar.tsx
cp docs/designmocks_extracted/components/fallback-station.tsx components/fallback-station.tsx
cp docs/designmocks_extracted/components/search-bar.tsx components/search-bar.tsx
cp docs/designmocks_extracted/components.json components.json
```

**Step 3: Verify no missing imports crash the build**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: Errors will appear for `stop-detail-sheet.tsx` (not copied yet) and `map-placeholder.tsx` (will be replaced). That's fine.

**Step 4: Commit**

```bash
git add app/globals.css components/ components.json
git commit -m "feat: copy design mock UI components and design tokens"
```

---

### Task 0.6: Fix fallback-station.tsx to accept a prop

The mock `fallback-station.tsx` imports `stations` from `@/lib/mock-data` directly. Refactor it to accept `fallbackStation` as a prop.

**Files:**
- Modify: `components/fallback-station.tsx`

**Step 1: Read the current file**

Open `components/fallback-station.tsx` and look for the import of `stations` from `@/lib/mock-data`.

**Step 2: Replace the stations import with a prop**

Find the component signature and update it to accept `fallbackStation: Station | null` as a prop instead of doing its own lookup. Remove the `stations` import. Remove the internal ID lookup logic.

**Step 3: Update stop-detail-sheet.tsx to pass the prop**

In `components/stop-detail-sheet.tsx`, when calling `<FallbackStation />`, pass `fallbackStation={null}` for now (will be wired to real data in Phase 4).

**Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "fallback"
```
Expected: No errors.

**Step 5: Commit**

```bash
git add components/fallback-station.tsx components/stop-detail-sheet.tsx
git commit -m "refactor: fallback-station accepts prop instead of importing mock data"
```

---

### Task 0.7: Copy stop-detail-sheet and create map placeholder stub

**Files:**
- Copy: `docs/designmocks_extracted/components/stop-detail-sheet.tsx` → `components/stop-detail-sheet.tsx`
- Create: `components/map/map-placeholder-stub.tsx`

**Step 1: Copy stop-detail-sheet**

```bash
cp docs/designmocks_extracted/components/stop-detail-sheet.tsx components/stop-detail-sheet.tsx
```

**Step 2: Create a map stub so page.tsx compiles**

Create `components/map/map-placeholder-stub.tsx`:

```typescript
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
```

**Step 3: Commit**

```bash
git add components/stop-detail-sheet.tsx components/map/
git commit -m "feat: copy stop-detail-sheet and add map stub"
```

---

### Task 0.8: Update layout.tsx — ThemeProvider, metadata, fonts

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Replace the default layout with the design mock version**

```bash
cp docs/designmocks_extracted/app/layout.tsx app/layout.tsx
```

**Step 2: Add ThemeProvider wrapper**

Open `app/layout.tsx` and wrap the body content with `ThemeProvider`:

```typescript
import { ThemeProvider } from "@/components/theme-provider"

// Inside RootLayout, wrap children:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
  <Analytics />
</ThemeProvider>
```

Remove `generator: 'v0.app'` from the metadata object.

**Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "layout"
```
Expected: No errors.

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update layout with ThemeProvider and correct metadata"
```

---

### Task 0.9: Update page.tsx — remove VehicleProfile, wire mock data

**Files:**
- Modify: `app/page.tsx`

**Step 1: Copy the design mock page.tsx**

```bash
cp docs/designmocks_extracted/app/page.tsx app/page.tsx
```

**Step 2: Remove VehicleProfile references**

In `app/page.tsx`:
- Remove: `import { VehicleProfile } from "@/components/vehicle-profile"`
- Remove: `import type { Vehicle } from "@/lib/types"` (the Vehicle type still exists but the component is P1)
- Remove: `const [isVehicleOpen, setIsVehicleOpen] = useState(false)`
- Remove: `const [vehicle, setVehicle] = useState<Vehicle | null>(null)`
- Replace the "Set Vehicle" button with a "Sign In" button:

```typescript
<button
  type="button"
  onClick={() => {/* auth gate — wired in Phase 3 */}}
  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
>
  Sign In
</button>
```
- Remove: `<VehicleProfile ... />` JSX at the bottom of return

**Step 3: Fix map import — use the stub**

Replace:
```typescript
import { MapPlaceholder } from "@/components/map-placeholder"
```
With:
```typescript
import { MapPlaceholderStub as MapPlaceholder } from "@/components/map/map-placeholder-stub"
```

**Step 4: Verify app builds**

```bash
npm run build
```
Expected: Build succeeds. Any remaining TS errors should be from missing files only.

**Step 5: Run dev server and verify UI renders**

```bash
npm run dev
```
Open `http://localhost:3000` — the full UI should render with mock station cards in the bottom panel, filter pills at the top, and the map stub in the middle.

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire page.tsx with mock data, remove VehicleProfile (P1)"
```

---

### Task 0.10: Create .env.local.example

**Files:**
- Create: `.env.local.example`

**Step 1: Create the file**

```bash
# .env.local.example — copy to .env.local and fill in values
NEXT_PUBLIC_INSTANT_APP_ID=
INSTANT_ADMIN_TOKEN=
NEXT_PUBLIC_MAPBOX_TOKEN=
NREL_API_KEY=
GEOAPIFY_API_KEY=
CRON_SECRET=
```

**Step 2: Verify .env.local is gitignored**

```bash
cat .gitignore | grep env
```
Expected: `.env.local` should appear in gitignore.

**Step 3: Commit**

```bash
git add .env.local.example .gitignore
git commit -m "chore: add .env.local.example with required variable names"
```

---

## Phase 1: Foundation (Weeks 1–2)

*Goal: Real US charging station data on a real map. Replace mock data with live InstantDB queries.*

### Task 1.1: Design the InstantDB schema

**Files:**
- Modify: `instant.schema.ts`

**Step 1: Read the current schema**

Open `instant.schema.ts` — note it only has `$files`, `$streams`, `$users`.

**Step 2: Add all domain entities**

Replace the entities section with:

```typescript
entities: {
  // --- System entities (keep as-is) ---
  $files: i.entity({ path: i.string().unique().indexed(), url: i.string() }),
  $streams: i.entity({ ... }),
  $users: i.entity({ email: i.string().unique().indexed().optional(), ... }),

  // --- Domain entities ---
  stops: i.entity({
    nrelId: i.string().indexed(),
    ocmId: i.string().optional(),
    name: i.string().indexed(),
    address: i.string(),
    city: i.string().indexed(),
    state: i.string().indexed(),
    zip: i.string(),
    lat: i.number().indexed(),
    lng: i.number().indexed(),
    network: i.string().indexed(),
    maxPowerKw: i.number().indexed(),
    connectorTypesJson: i.string(),   // JSON: ["CCS","NACS"]
    hasCcs: i.boolean().indexed(),    // for filter queries
    hasNacs: i.boolean().indexed(),
    hasChademo: i.boolean().indexed(),
    totalStalls: i.number(),
    pricePerKwh: i.number().optional(),
    ccScore: i.number().indexed(),
    chargeScore: i.number().indexed(),
    brewScore: i.number().indexed(),
    reliabilityLevel: i.string().indexed(), // "high"|"medium"|"low"
    availableStalls: i.number().indexed(),
    occupiedStalls: i.number(),
    brokenStalls: i.number(),
    statusUpdatedAt: i.number().indexed(),
    brewScoreComputedAt: i.number().indexed(),
    lastCheckInAt: i.number().indexed(),
    checkInCount: i.number(),
    photoCount: i.number(),
    lastVerifiedAt: i.number().indexed(),
    fallbackStopId: i.string().optional(),
    isActive: i.boolean().indexed(),
    chargeScoreJson: i.string().optional(),  // JSON: ChargeScore sub-components
    brewScoreJson: i.string().optional(),    // JSON: BrewScore sub-components
    stallsJson: i.string().optional(),       // JSON: Stall[] — denormalized for fast reads
  }),

  amenities: i.entity({
    stopId: i.string().indexed(),
    overtureId: i.string().indexed(),
    name: i.string(),
    brand: i.string().indexed(),
    category: i.string().indexed(),
    lat: i.number(),
    lng: i.number(),
    walkMinutes: i.number().indexed(),
    walkMeters: i.number(),
    hoursJson: i.string().optional(),        // OSM hours — compute isOpenNow client-side
    rating: i.number(),                      // 0 = no Geoapify data
    reviewCount: i.number(),
    isIndoor: i.boolean(),
    hasWifi: i.boolean(),
    hasFreeRestroom: i.boolean(),
    hoursUpdatedAt: i.number(),
  }),

  checkIns: i.entity({
    stopId: i.string().indexed(),
    userId: i.string().indexed(),
    status: i.string(),              // "working"|"broken"|"busy"
    createdAt: i.number().indexed(),
    source: i.string(),              // "mobile_web"|"pwa"
  }),

  savedStops: i.entity({
    userId: i.string().indexed(),
    stopId: i.string().indexed(),
    savedAt: i.number().indexed(),
  }),
},
links: {
  stopAmenities: {
    forward: { on: "stops", has: "many", label: "amenities" },
    reverse: { on: "amenities", has: "one", label: "stop" },
  },
  stopCheckIns: {
    forward: { on: "stops", has: "many", label: "checkIns" },
    reverse: { on: "checkIns", has: "one", label: "stop" },
  },
  userCheckIns: {
    forward: { on: "$users", has: "many", label: "checkIns" },
    reverse: { on: "checkIns", has: "one", label: "user" },
  },
  userSavedStops: {
    forward: { on: "$users", has: "many", label: "savedStops" },
    reverse: { on: "savedStops", has: "one", label: "user" },
  },
},
```

**Step 3: Push schema to InstantDB**

```bash
npx instant-cli push schema --yes
```
Expected: "Schema updated successfully"

**Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 5: Commit**

```bash
git add instant.schema.ts
git commit -m "feat: define InstantDB schema with all domain entities"
```

---

### Task 1.2: Set up instant.perms.ts for public station reads

**Files:**
- Modify: `instant.perms.ts`

**Step 1: Read the current file** — it should be mostly empty.

**Step 2: Set permissions**

```typescript
// instant.perms.ts
import type { InstantRules } from "@instantdb/react"

const rules = {
  stops: {
    allow: {
      view: "true",       // Public read — map loads without auth
      create: "false",    // Only server (admin token) can create
      update: "false",
      delete: "false",
    },
  },
  amenities: {
    allow: {
      view: "true",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  checkIns: {
    allow: {
      view: "true",
      create: "auth.id != null",  // Must be authenticated to check in
      update: "false",
      delete: "false",
    },
  },
  savedStops: {
    allow: {
      view: "auth.id != null && auth.id == data.userId",
      create: "auth.id != null",
      update: "false",
      delete: "auth.id != null && auth.id == data.userId",
    },
  },
} satisfies InstantRules

export default rules
```

**Step 3: Push permissions**

```bash
npx instant-cli push perms --yes
```

**Step 4: Commit**

```bash
git add instant.perms.ts
git commit -m "feat: set InstantDB permissions (public stops, auth for check-ins)"
```

---

### Task 1.3: Create NREL station seeding API route

**Files:**
- Create: `app/api/seed-stations/route.ts`

**Step 1: Sign up for NREL API key**

Go to https://developer.nrel.gov/signup — free, instant approval. Add `NREL_API_KEY` to `.env.local`.

**Step 2: Create the route**

```typescript
// app/api/seed-stations/route.ts
import { NextRequest, NextResponse } from "next/server"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"
import { id } from "@instantdb/admin"

const adminDB = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

const NREL_BASE = "https://developer.nrel.gov/api/alt-fuel-stations/v1.json"
const PAGE_SIZE = 200

export const maxDuration = 300  // Vercel Pro: 5 minutes. Free: 10s — use state param to seed by state

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-admin-token")
  if (adminToken !== process.env.INSTANT_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const state = searchParams.get("state") ?? "CA"  // seed one state at a time
  const offset = parseInt(searchParams.get("offset") ?? "0")

  const url = new URL(NREL_BASE)
  url.searchParams.set("api_key", process.env.NREL_API_KEY!)
  url.searchParams.set("fuel_type", "ELEC")
  url.searchParams.set("status", "E")
  url.searchParams.set("access", "public")
  url.searchParams.set("state", state)
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("offset", String(offset))

  const res = await fetch(url.toString())
  const data = await res.json()
  const stations = data.alt_fuel_stations ?? []

  const transactions = stations.map((s: Record<string, unknown>) => {
    const connectors = (s.ev_connector_types as string[] | null) ?? []
    const stopId = id()
    return adminDB.tx.stops[stopId].update({
      nrelId: String(s.id),
      name: String(s.station_name),
      address: String(s.street_address),
      city: String(s.city),
      state: String(s.state),
      zip: String(s.zip),
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      network: String(s.ev_network ?? "Unknown"),
      maxPowerKw: Number(s.ev_dc_fast_num ?? 0) > 0 ? 150 : 7,  // DC fast = assume 150kW min
      connectorTypesJson: JSON.stringify(connectors),
      hasCcs: connectors.includes("J1772COMBO"),
      hasNacs: connectors.includes("NACS"),
      hasChademo: connectors.includes("CHADEMO"),
      totalStalls: Number(s.ev_dc_fast_num ?? 0) + Number(s.ev_level2_evse_num ?? 0),
      pricePerKwh: 0,
      ccScore: 0,
      chargeScore: 0,
      brewScore: 0,
      reliabilityLevel: "medium",
      availableStalls: 0,
      occupiedStalls: 0,
      brokenStalls: 0,
      statusUpdatedAt: Date.now(),
      brewScoreComputedAt: 0,
      lastCheckInAt: 0,
      checkInCount: 0,
      photoCount: 0,
      lastVerifiedAt: Date.now(),
      isActive: true,
    })
  })

  // InstantDB transact in batches of 25
  for (let i = 0; i < transactions.length; i += 25) {
    await adminDB.transact(transactions.slice(i, i + 25))
  }

  return NextResponse.json({
    inserted: stations.length,
    nextOffset: offset + PAGE_SIZE,
    total: data.total_results,
  })
}
```

**Step 3: Install InstantDB admin SDK**

```bash
npm install @instantdb/admin
```

**Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "seed"
```
Expected: No errors.

**Step 5: Seed California (test run)**

```bash
curl -X POST "http://localhost:3000/api/seed-stations?state=CA" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```
Expected: `{"inserted": 200, "nextOffset": 200, "total": ~4000}`

**Step 6: Commit**

```bash
git add app/api/seed-stations/ package.json package-lock.json
git commit -m "feat: add NREL station seeding API route"
```

---

### Task 1.4: Install and wire Mapbox GL JS

**Files:**
- Create: `components/map/mapbox-map.tsx`
- Modify: `app/page.tsx`

**Step 1: Add Mapbox token to .env.local**

Sign up at https://account.mapbox.com — free, instant. Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local`.

**Step 2: Create Mapbox map component**

```typescript
// components/map/mapbox-map.tsx
"use client"
import { useEffect, useRef, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Station } from "@/lib/types"
import { cn } from "@/lib/utils"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface Props {
  stations: Station[]
  selectedStationId: string | null
  onSelectStation: (station: Station) => void
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  className?: string
}

export function MapboxMap({ stations, selectedStationId, onSelectStation, onBoundsChange, className }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const stationsRef = useRef(stations)
  stationsRef.current = stations

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283],  // Center of US
      zoom: 4,
    })

    map.current.on("load", () => {
      // Add GeoJSON source
      map.current!.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      })

      // Cluster circles
      map.current!.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1565C0",
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 50, 36],
          "circle-opacity": 0.85,
        },
      })

      // Cluster count labels
      map.current!.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#ffffff" },
      })

      // Individual station pins
      map.current!.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case",
            ["==", ["get", "reliability"], "high"], "#2E7D32",
            ["==", ["get", "reliability"], "medium"], "#E65100",
            "#C62828"
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Click handler
      map.current!.on("click", "stations-layer", (e) => {
        const stationId = e.features?.[0]?.properties?.stationId
        if (!stationId) return
        const station = stationsRef.current.find(s => s.id === stationId)
        if (station) onSelectStation(station)
      })

      map.current!.on("moveend", () => {
        onBoundsChange?.(map.current!.getBounds()!)
      })
    })

    return () => { map.current?.remove(); map.current = null }
  }, [onSelectStation, onBoundsChange])

  // Update GeoJSON when stations change
  useEffect(() => {
    const source = map.current?.getSource("stations") as mapboxgl.GeoJSONSource | undefined
    if (!source) return
    source.setData({
      type: "FeatureCollection",
      features: stations.map(s => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: { stationId: s.id, ccScore: s.ccScore, reliability: s.reliability },
      })),
    })
  }, [stations])

  return <div ref={mapContainer} className={cn("w-full h-full", className)} />
}
```

**Step 3: Dynamic import in page.tsx to avoid SSR issues**

In `app/page.tsx`, add at the top:

```typescript
import dynamic from "next/dynamic"
const MapboxMap = dynamic(
  () => import("@/components/map/mapbox-map").then(m => ({ default: m.MapboxMap })),
  { ssr: false, loading: () => <div className="h-full bg-muted/20 animate-pulse" /> }
)
```

Replace the `MapPlaceholder` JSX with `<MapboxMap>` passing the same props.

**Step 4: Verify map renders**

```bash
npm run dev
```
Open `http://localhost:3000` — Mapbox map should render with US center view.

**Step 5: Commit**

```bash
git add components/map/mapbox-map.tsx app/page.tsx
git commit -m "feat: integrate Mapbox GL JS with station pin clustering"
```

---

### Task 1.5: Create geolocation and bounding box utilities

**Files:**
- Create: `lib/geo/bounding-box.ts`
- Create: `lib/geo/distance.ts`
- Create: `lib/geo/radius-filter.ts`
- Create: `hooks/use-geolocation.ts`
- Create: `hooks/use-station-query.ts`

**Step 1: Create bounding-box utility**

```typescript
// lib/geo/bounding-box.ts
import type { BoundingBox, GeoPoint } from "@/lib/types"

const MILES_PER_DEGREE_LAT = 69.0

export function radiusToBoundingBox(center: GeoPoint, radiusMiles: number): BoundingBox {
  const latDelta = radiusMiles / MILES_PER_DEGREE_LAT
  const lngDelta = radiusMiles / (MILES_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180))
  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  }
}
```

**Step 2: Create haversine distance utility**

```typescript
// lib/geo/distance.ts
import type { GeoPoint } from "@/lib/types"

export function haversineDistanceMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8  // Earth radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const chord =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
}
```

**Step 3: Create radius filter**

```typescript
// lib/geo/radius-filter.ts
import type { GeoPoint } from "@/lib/types"
import { haversineDistanceMiles } from "./distance"

export function filterByRadius<T extends { lat: number; lng: number }>(
  items: T[],
  center: GeoPoint,
  radiusMiles: number
): T[] {
  return items.filter(
    item => haversineDistanceMiles(center, { lat: item.lat, lng: item.lng }) <= radiusMiles
  )
}
```

**Step 4: Create geolocation hook**

```typescript
// hooks/use-geolocation.ts
"use client"
import { useState, useEffect } from "react"
import type { GeoPoint } from "@/lib/types"

interface GeolocationState {
  position: GeoPoint | null
  error: string | null
  isLoading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: "Geolocation not supported", isLoading: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        error: null,
        isLoading: false,
      }),
      (err) => setState({ position: null, error: err.message, isLoading: false })
    )
  }, [])

  return state
}
```

**Step 5: Create station query hook**

```typescript
// hooks/use-station-query.ts
"use client"
import { db } from "@/lib/db"
import type { BoundingBox, Station } from "@/lib/types"

export function useStationQuery(bounds: BoundingBox | null) {
  const { data, isLoading, error } = db.useQuery(
    bounds
      ? {
          stops: {
            $: {
              where: {
                and: [
                  { lat: { $gte: bounds.south } },
                  { lat: { $lte: bounds.north } },
                  { lng: { $gte: bounds.west } },
                  { lng: { $lte: bounds.east } },
                  { isActive: true },
                ],
              },
            },
            amenities: {},
          },
        }
      : null
  )

  // Map InstantDB stops to Station type
  const stops = (data?.stops ?? []).map(s => ({
    id: s.id,
    externalId: s.nrelId ?? s.id,
    name: s.name,
    address: s.address,
    city: s.city,
    state: s.state,
    zip: s.zip,
    lat: s.lat,
    lng: s.lng,
    network: s.network as Station["network"],
    connectorTypes: JSON.parse(s.connectorTypesJson ?? "[]"),
    maxPowerKw: s.maxPowerKw,
    stalls: JSON.parse(s.stallsJson ?? "[]"),
    pricePerKwh: s.pricePerKwh ?? 0,
    ccScore: s.ccScore ?? 0,
    chargeScore: JSON.parse(s.chargeScoreJson ?? "{}"),
    brewScore: JSON.parse(s.brewScoreJson ?? "{}"),
    reliability: s.reliabilityLevel as Station["reliability"],
    lastVerified: formatRelativeTime(s.lastVerifiedAt ?? 0),
    lastVerifiedAt: s.lastVerifiedAt ?? 0,
    photoCount: s.photoCount ?? 0,
    distanceMiles: 0,  // computed by caller with haversine
    detourMiles: 0,
    amenities: (s.amenities ?? []).map(a => ({
      id: a.id,
      name: a.name,
      brand: a.brand,
      category: a.category as Station["amenities"][number]["category"],
      walkMinutes: a.walkMinutes,
      distanceMeters: a.walkMeters,
      rating: a.rating ?? 0,
      hours: formatHours(a.hoursJson),
      hoursJson: a.hoursJson,
      lat: a.lat,
      lng: a.lng,
      overtureId: a.overtureId,
    })),
    fallbackStationId: s.fallbackStopId ?? null,
    nrelId: s.nrelId,
    brewScoreUpdatedAt: s.brewScoreComputedAt,
  })) as Station[]

  return { stops, isLoading, error, isStale: !!error && stops.length > 0 }
}

function formatRelativeTime(ms: number): string {
  if (!ms) return "Unknown"
  const diff = Date.now() - ms
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatHours(hoursJson: string | null | undefined): string {
  if (!hoursJson) return "Unknown"
  try { return JSON.parse(hoursJson).display ?? "Unknown" } catch { return "Unknown" }
}
```

**Step 6: Commit**

```bash
git add lib/geo/ hooks/
git commit -m "feat: add geo utilities and InstantDB station query hook"
```

---

### Task 1.6: Wire page.tsx to use real InstantDB data

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace mock data import with real query**

In `app/page.tsx`:
- Remove: `import { stations } from "@/lib/mock-data"`
- Add imports: `useStationQuery`, `useGeolocation`, `radiusToBoundingBox`, `filterByRadius`, `haversineDistanceMiles`
- Add state: `const [bounds, setBounds] = useState<BoundingBox | null>(null)`
- Add state: `const [radiusMiles, setRadiusMiles] = useState(50)`
- Add: `const { position } = useGeolocation()`
- Add: `const { stops, isLoading, isStale } = useStationQuery(bounds)`

**Step 2: Add distance computation to the stop list**

After fetching stops, compute `distanceMiles` for each:

```typescript
const stopsWithDistance = useMemo(() => {
  if (!position) return stops
  return stops.map(s => ({
    ...s,
    distanceMiles: Math.round(haversineDistanceMiles(position, { lat: s.lat, lng: s.lng }) * 10) / 10,
  }))
}, [stops, position])
```

**Step 3: Pass `onBoundsChange` to MapboxMap**

```typescript
<MapboxMap
  stations={filteredStations}
  selectedStationId={selectedStation?.id ?? null}
  onSelectStation={handleStationSelect}
  onBoundsChange={setBounds}
  className="h-full"
/>
```

**Step 4: Show stale data banner when isStale is true**

Add above the map:
```typescript
{isStale && (
  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 rounded-full bg-cc-caution-amber/10 border border-cc-caution-amber/30 px-3 py-1 text-xs text-cc-caution-amber">
    ⚠️ Data may be outdated
  </div>
)}
```

**Step 5: Test with real data**

```bash
npm run dev
```
Move the map around California — stop pins should appear from seeded NREL data.

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire page.tsx to InstantDB real-time station query"
```

---

## Phase 2: Brew Score (Weeks 3–4)

*Goal: Every stop scored for amenities. Run DuckDB preprocessing, seed amenities, compute Brew Scores.*

### Task 2.1: DuckDB preprocessing script for Overture Maps

**Files:**
- Create: `scripts/overture-extract.sh`
- Create: `scripts/overture-to-amenities.ts`

**Step 1: Install DuckDB CLI locally**

```bash
# macOS
brew install duckdb
```

**Step 2: Create the extraction script**

```bash
# scripts/overture-extract.sh
# Queries Overture Maps S3 directly. Run once locally.
# Outputs: scripts/output/overture-us-pois.parquet

duckdb -c "
INSTALL spatial;
LOAD spatial;
COPY (
  SELECT
    id,
    names.primary AS name,
    categories.primary AS category,
    ST_X(ST_GeomFromWKB(geometry)) AS lng,
    ST_Y(ST_GeomFromWKB(geometry)) AS lat,
    sources[1].record_id AS source_id,
    opening_hours,
    CASE
      WHEN names.primary ILIKE '%starbucks%' THEN 'Starbucks'
      WHEN names.primary ILIKE '%mcdonald%' THEN 'McDonald''s'
      WHEN names.primary ILIKE '%panera%' THEN 'Panera'
      WHEN names.primary ILIKE '%target%' THEN 'Target'
      WHEN names.primary ILIKE '%walmart%' THEN 'Walmart'
      WHEN names.primary ILIKE '%whole foods%' THEN 'Whole Foods'
      ELSE names.primary
    END AS brand
  FROM read_parquet('s3://overturemaps-us-west-2/release/2025-Q4/theme=places/type=place/*',
    filename=true, hive_partitioning=1)
  WHERE bbox.minx > -125.0 AND bbox.maxx < -66.0
    AND bbox.miny > 24.0  AND bbox.maxy < 50.0
    AND categories.primary IN (
      'coffee_shop', 'fast_food', 'restaurant', 'grocery', 'department_store',
      'shopping_mall', 'convenience_store', 'gas_station'
    )
) TO 'scripts/output/overture-us-pois.parquet' (FORMAT PARQUET);
"
```

**Step 3: Run the extraction (takes 10–30 minutes first time)**

```bash
mkdir -p scripts/output
bash scripts/overture-extract.sh
```
Expected: `scripts/output/overture-us-pois.parquet` created (~200–500MB).

**Step 4: Create amenity-matching script**

```typescript
// scripts/overture-to-amenities.ts
// For each seeded stop, find Overture POIs within 400m and import as amenities
// Run: npx ts-node scripts/overture-to-amenities.ts
import Database from "duckdb"
import { init, id } from "@instantdb/admin"
import schema from "../instant.schema"
import { haversineDistanceMiles } from "../lib/geo/distance"

const adminDB = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

// For each stop: query Overture parquet for POIs within 400m bounding box
// Insert as amenities linked to the stop
// ... (full implementation in plan — key pattern shown)
```

**Step 5: Commit scripts**

```bash
git add scripts/
git commit -m "feat: add Overture Maps DuckDB extraction script"
```

---

### Task 2.2: Geoapify ratings enrichment

**Files:**
- Create: `lib/scoring/geoapify.ts`

**Step 1: Sign up for Geoapify**

Go to https://myprojects.geoapify.com — free, no credit card. Add `GEOAPIFY_API_KEY` to `.env.local`.

**Step 2: Create Geoapify client**

```typescript
// lib/scoring/geoapify.ts
const GEOAPIFY_BASE = "https://api.geoapify.com/v2/places"

interface GeoapifyPlace {
  place_id: string
  properties: {
    name: string
    categories: string[]
    lat: number
    lon: number
    distance: number
    datasource?: { raw?: { stars?: number; rating?: number } }
  }
}

export async function fetchGeoapifyRatings(
  lat: number,
  lng: number,
  radiusMeters = 400
): Promise<GeoapifyPlace[]> {
  const categories = "catering.cafe,catering.fast_food,catering.restaurant,commercial.supermarket,commercial.shopping_mall"
  const url = `${GEOAPIFY_BASE}?categories=${categories}&filter=circle:${lng},${lat},${radiusMeters}&limit=20&apiKey=${process.env.GEOAPIFY_API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  return json.features ?? []
}
```

**Step 3: Commit**

```bash
git add lib/scoring/geoapify.ts
git commit -m "feat: add Geoapify Places API client"
```

---

### Task 2.3: Brew Score calculation engine

**Files:**
- Create: `lib/scoring/brew-score.ts`

**Step 1: Create the calculation engine**

```typescript
// lib/scoring/brew-score.ts
import type { BrewScore } from "@/lib/types"

interface AmenityInput {
  category: string
  walkMinutes: number
  rating: number      // 0 = no data
  hoursJson: string | null
  isIndoor: boolean
  hasWifi: boolean
  hasFreeRestroom: boolean
}

export function calculateBrewScore(amenities: AmenityInput[]): BrewScore {
  const food = amenities.filter(a => ["coffee", "food"].includes(a.category))
  const restrooms = amenities.filter(a => a.category === "restroom" || a.hasFreeRestroom)
  const retail = amenities.filter(a => ["retail", "grocery"].includes(a.category))
  const rated = amenities.filter(a => a.rating > 0)

  // Food options (30%): count + proximity weighting
  const foodScore = Math.min(
    5,
    food.reduce((sum, a) => sum + (a.walkMinutes <= 2 ? 1.5 : a.walkMinutes <= 5 ? 1.0 : 0.5), 0)
  )

  // Restroom access (20%)
  const restroomScore = restrooms.length >= 2 ? 5 : restrooms.length === 1 ? 3.5 : 0

  // Retail quality (15%)
  const retailScore = Math.min(5, retail.length * 1.5)

  // Venue quality (15%): avg Geoapify rating or neutral if no data
  const venueScore = rated.length > 0
    ? rated.reduce((sum, a) => sum + a.rating, 0) / rated.length
    : 2.5  // neutral default when no Geoapify data

  // Environment (10%): indoor amenities available
  const indoorCount = amenities.filter(a => a.isIndoor).length
  const environmentScore = Math.min(5, (indoorCount / Math.max(amenities.length, 1)) * 5 + (amenities.some(a => a.hasWifi) ? 1 : 0))

  // Hours coverage (10%): fraction open during 8am–8pm charge window
  // isOpenDuringChargeWindow computed from hoursJson client-side
  // For server-side calc: assume open if hoursJson has standard business hours
  const openCount = amenities.filter(a => isLikelyOpenDuringChargeWindow(a.hoursJson)).length
  const hoursCoverageScore = amenities.length > 0 ? (openCount / amenities.length) * 5 : 0

  const overall =
    foodScore * 0.30 +
    restroomScore * 0.20 +
    retailScore * 0.15 +
    venueScore * 0.15 +
    environmentScore * 0.10 +
    hoursCoverageScore * 0.10

  return {
    overall: Math.round(overall * 10) / 10,
    foodOptions: Math.round(foodScore * 10) / 10,
    restroomAccess: Math.round(restroomScore * 10) / 10,
    retailQuality: Math.round(retailScore * 10) / 10,
    venueQuality: Math.round(venueScore * 10) / 10,
    environment: Math.round(environmentScore * 10) / 10,
    hoursCoverage: Math.round(hoursCoverageScore * 10) / 10,
  }
}

function isLikelyOpenDuringChargeWindow(hoursJson: string | null): boolean {
  if (!hoursJson) return true  // assume open when no data (avoids penalizing data gaps)
  // Parse OSM hours format: "Mo-Fr 08:00-22:00; Sa 09:00-21:00"
  // Simple check: contains any hours with opening < 12:00 and closing > 12:00
  return hoursJson.includes(":") && !hoursJson.toLowerCase().includes("closed")
}
```

**Step 2: Commit**

```bash
git add lib/scoring/brew-score.ts
git commit -m "feat: add Brew Score calculation engine"
```

---

### Task 2.4: Brew Score API route

**Files:**
- Create: `app/api/brew-score/[stationId]/route.ts`

**Step 1: Create the route**

```typescript
// app/api/brew-score/[stationId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"
import { fetchGeoapifyRatings } from "@/lib/scoring/geoapify"
import { calculateBrewScore } from "@/lib/scoring/brew-score"

const adminDB = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

export async function POST(req: NextRequest, { params }: { params: { stationId: string } }) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { stationId } = params
  const stopResult = await adminDB.query({ stops: { $: { where: { id: stationId } }, amenities: {} } })
  const stop = stopResult.stops[0]
  if (!stop) return NextResponse.json({ error: "Stop not found" }, { status: 404 })

  // Fetch Geoapify ratings
  const geoapifyPlaces = await fetchGeoapifyRatings(stop.lat, stop.lng)

  // Enrich amenities with ratings
  const enrichedAmenities = stop.amenities.map(a => {
    const match = geoapifyPlaces.find(p =>
      Math.abs(p.properties.lat - a.lat) < 0.0002 &&
      Math.abs(p.properties.lon - a.lng) < 0.0002
    )
    const rating = match?.properties?.datasource?.raw?.rating ?? 0
    return {
      category: a.category,
      walkMinutes: a.walkMinutes,
      rating,
      hoursJson: a.hoursJson ?? null,
      isIndoor: a.isIndoor ?? false,
      hasWifi: a.hasWifi ?? false,
      hasFreeRestroom: a.hasFreeRestroom ?? false,
    }
  })

  const brewScore = calculateBrewScore(enrichedAmenities)

  await adminDB.transact([
    adminDB.tx.stops[stationId].update({
      brewScore: brewScore.overall,
      brewScoreJson: JSON.stringify(brewScore),
      brewScoreComputedAt: Date.now(),
      ccScore: (stop.chargeScore ?? 0) + brewScore.overall,
    }),
  ])

  return NextResponse.json({ stationId, brewScore })
}
```

**Step 2: Commit**

```bash
git add app/api/brew-score/
git commit -m "feat: add Brew Score calculation API route"
```

---

### Task 2.5: Weekly Brew Score Vercel Cron

**Files:**
- Create: `app/api/cron/refresh-brew-scores/route.ts`
- Create: `vercel.json`

**Step 1: Create cron route**

```typescript
// app/api/cron/refresh-brew-scores/route.ts
import { NextRequest, NextResponse } from "next/server"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"

const adminDB = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN!, schema })

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000  // 7 days ago

  // Query top 500 stale stops ordered by most recent check-in activity
  const result = await adminDB.query({
    stops: {
      $: {
        where: { and: [{ brewScoreComputedAt: { $lt: staleThreshold } }, { isActive: true }] },
        order: { serverCreatedAt: "desc" },
        limit: 500,
      },
    },
  })

  let processed = 0
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

  for (const stop of result.stops) {
    try {
      await fetch(`${baseUrl}/api/brew-score/${stop.id}`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
      processed++
    } catch { /* continue on error */ }
  }

  return NextResponse.json({ processed })
}
```

**Step 2: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-brew-scores",
      "schedule": "0 2 * * 0"
    },
    {
      "path": "/api/cron/sync-nrel",
      "schedule": "0 3 * * 1"
    }
  ]
}
```

**Step 3: Commit**

```bash
git add app/api/cron/ vercel.json
git commit -m "feat: add weekly Brew Score Vercel Cron job"
```

---

## Phase 3: Charge Score (Weeks 5–6)

*Goal: Every stop has a Charge Score. Wire Google OAuth. Build check-in flow.*

### Task 3.1: Static network benchmarks

**Files:**
- Create: `lib/scoring/network-benchmarks.ts`

**Step 1: Create benchmarks from published NEVI compliance data**

```typescript
// lib/scoring/network-benchmarks.ts
// Source: NEVI compliance reports + PlugShare reliability data (2025)
export const NETWORK_BENCHMARKS: Record<string, number> = {
  "Tesla Supercharger":   4.6,  // ~97% uptime, best-in-class
  "Electrify America":    3.8,  // ~87% uptime, improving with NEVI
  "ChargePoint":          3.9,  // ~88% uptime, large network variance
  "EVgo":                 3.5,  // ~83% uptime
  "Blink":                2.8,  // ~71% uptime, known reliability issues
  "Francis Energy":       4.0,
  "Volta":                3.6,
  "Unknown":              3.0,  // median fallback
}

export function getNetworkBenchmark(network: string): number {
  return NETWORK_BENCHMARKS[network] ?? NETWORK_BENCHMARKS["Unknown"]
}
```

**Step 2: Commit**

```bash
git add lib/scoring/network-benchmarks.ts
git commit -m "feat: add static network reliability benchmarks"
```

---

### Task 3.2: Charge Score calculation engine

**Files:**
- Create: `lib/scoring/charge-score.ts`

**Step 1: Create the engine**

```typescript
// lib/scoring/charge-score.ts
// MVP: uses static benchmarks + NREL data + check-in recency
// V1.1: replace realTimeAvailability with live OCPI data
import type { ChargeScore } from "@/lib/types"
import { getNetworkBenchmark } from "./network-benchmarks"

interface ChargeScoreInput {
  network: string
  totalStalls: number
  availableStalls: number        // 0 at MVP (no live data) — set to totalStalls * 0.7 as proxy
  lastCheckInAt: number          // Unix ms; 0 if no check-ins
  nrelLastConfirmed?: string     // ISO date from NREL "date_last_confirmed"
}

export function calculateChargeScore(input: ChargeScoreInput): ChargeScore {
  const networkBenchmark = getNetworkBenchmark(input.network)  // 0–5

  // Uptime history (35%): proxy from network benchmark + NREL last_confirmed recency
  const daysSinceConfirmed = input.nrelLastConfirmed
    ? (Date.now() - new Date(input.nrelLastConfirmed).getTime()) / 86_400_000
    : 365
  const uptimeHistory = Math.max(0, networkBenchmark - (daysSinceConfirmed > 180 ? 1.0 : daysSinceConfirmed > 90 ? 0.5 : 0))

  // Real-time availability (30%): MVP uses stall ratio as proxy; V1.1 replaces with OCPI
  const stallRatio = input.totalStalls > 0
    ? input.availableStalls / input.totalStalls
    : 0.7  // assume 70% available when no data
  const realTimeAvailability = Math.min(5, stallRatio * 5)

  // Community verification recency (20%)
  const communityVerification = calculateCommunityScore(input.lastCheckInAt)

  // Network benchmark (15%)
  const overall =
    uptimeHistory * 0.35 +
    realTimeAvailability * 0.30 +
    communityVerification * 0.20 +
    networkBenchmark * 0.15

  return {
    overall: Math.round(overall * 10) / 10,
    uptimeHistory: Math.round(uptimeHistory * 10) / 10,
    realTimeAvailability: Math.round(realTimeAvailability * 10) / 10,
    communityVerification: Math.round(communityVerification * 10) / 10,
    networkBenchmark: Math.round(networkBenchmark * 10) / 10,
  }
}

function calculateCommunityScore(lastCheckInAt: number): number {
  if (!lastCheckInAt) return 0.5
  const hoursAgo = (Date.now() - lastCheckInAt) / 3_600_000
  if (hoursAgo < 1) return 5.0
  if (hoursAgo < 6) return 4.0
  if (hoursAgo < 24) return 3.0
  if (hoursAgo < 72) return 2.0
  if (hoursAgo < 168) return 1.0
  return 0.5
}
```

**Step 2: Commit**

```bash
git add lib/scoring/charge-score.ts
git commit -m "feat: add Charge Score calculation engine (MVP: static benchmarks)"
```

---

### Task 3.3: ChargerStatusProvider abstraction layer

**Files:**
- Create: `lib/charger-status/provider.ts`
- Create: `lib/charger-status/mock-provider.ts`

**Step 1: Create the interface**

```typescript
// lib/charger-status/provider.ts
export type StallStatusRaw = "AVAILABLE" | "CHARGING" | "INOPERATIVE" | "UNKNOWN"

export interface NormalizedStallStatus {
  evseId: string
  stallNumber: number
  status: "available" | "occupied" | "broken" | "unknown"
  powerKw: number
  connector: string
  lastUpdatedAt: number
  source: "ocpi" | "chargepoint" | "mock"
}

export interface NormalizedStationStatus {
  externalId: string
  stalls: NormalizedStallStatus[]
  fetchedAt: number
  provider: string
  hasPerStallData: boolean
}

export interface ChargerStatusProvider {
  readonly providerName: string
  readonly hasPerStallData: boolean
  fetchStatus(externalId: string): Promise<NormalizedStationStatus>
  coversStation(network: string): boolean
}
```

**Step 2: Create mock provider for development**

```typescript
// lib/charger-status/mock-provider.ts
import type { ChargerStatusProvider, NormalizedStationStatus } from "./provider"

export class MockChargerStatusProvider implements ChargerStatusProvider {
  readonly providerName = "mock"
  readonly hasPerStallData = true

  coversStation(): boolean { return true }

  async fetchStatus(externalId: string): Promise<NormalizedStationStatus> {
    return {
      externalId,
      stalls: [
        { evseId: `${externalId}-1`, stallNumber: 1, status: "available", powerKw: 150, connector: "CCS", lastUpdatedAt: Date.now(), source: "mock" },
        { evseId: `${externalId}-2`, stallNumber: 2, status: "occupied", powerKw: 150, connector: "CCS", lastUpdatedAt: Date.now(), source: "mock" },
      ],
      fetchedAt: Date.now(),
      provider: "mock",
      hasPerStallData: true,
    }
  }
}
```

**Step 3: Commit**

```bash
git add lib/charger-status/
git commit -m "feat: add ChargerStatusProvider abstraction layer with mock provider"
```

---

### Task 3.4: Google OAuth setup

**Step 1: Configure Google OAuth in InstantDB dashboard**

1. Go to https://console.instantdb.com → your app → Auth settings
2. Enable Google OAuth
3. Create a Google OAuth app at https://console.cloud.google.com → APIs & Services → Credentials
4. Set authorized redirect URI to the InstantDB OAuth callback URL shown in the dashboard
5. Copy Client ID and Client Secret into InstantDB dashboard

**Step 2: Create auth gate component**

```typescript
// components/auth/auth-gate.tsx
"use client"
import { db } from "@/lib/db"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Zap } from "lucide-react"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthGate({ isOpen, onClose, onSuccess }: Props) {
  const handleGoogleSignIn = () => {
    db.auth.signInWithProvider("google")
    onSuccess?.()
    onClose()
  }

  return (
    <Drawer open={isOpen} onOpenChange={open => !open && onClose()}>
      <DrawerContent className="bg-card pb-8">
        <DrawerHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cc-charge-blue">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <DrawerTitle>Sign in to continue</DrawerTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Check in at stations and save your favorite stops
          </p>
        </DrawerHeader>
        <div className="px-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
```

**Step 3: Create auth gate hook**

```typescript
// hooks/use-auth-gate.ts
"use client"
import { useState } from "react"
import { db } from "@/lib/db"

export function useAuthGate() {
  const { user } = db.useAuth()
  const [showGate, setShowGate] = useState(false)

  function requireAuth(action: () => void) {
    if (user) {
      action()
    } else {
      setShowGate(true)
    }
  }

  return { user, showGate, setShowGate, requireAuth }
}
```

**Step 4: Commit**

```bash
git add components/auth/ hooks/use-auth-gate.ts
git commit -m "feat: add Google OAuth auth gate component and hook"
```

---

### Task 3.5: One-tap check-in flow

**Files:**
- Create: `hooks/use-check-in.ts`
- Modify: `components/stop-detail-sheet.tsx`

**Step 1: Create check-in hook**

```typescript
// hooks/use-check-in.ts
"use client"
import { useState } from "react"
import { db } from "@/lib/db"
import { id } from "@instantdb/react"

export function useCheckIn() {
  const [checkedInStopIds, setCheckedInStopIds] = useState<Set<string>>(new Set())
  const [pendingStopId, setPendingStopId] = useState<string | null>(null)
  const { user } = db.useAuth()

  async function checkIn(stopId: string) {
    if (!user) throw new Error("Must be authenticated")
    setPendingStopId(stopId)
    try {
      await db.transact([
        db.tx.checkIns[id()].update({
          stopId,
          userId: user.id,
          status: "working",
          createdAt: Date.now(),
          source: "mobile_web",
        }),
        db.tx.stops[stopId].update({
          lastCheckInAt: Date.now(),
          lastVerifiedAt: Date.now(),
        }),
      ])
      setCheckedInStopIds(prev => new Set([...prev, stopId]))
    } finally {
      setPendingStopId(null)
    }
  }

  return { checkIn, checkedInStopIds, pendingStopId }
}
```

**Step 2: Wire Check In button in stop-detail-sheet.tsx**

In `components/stop-detail-sheet.tsx`:
- Import `useCheckIn`, `useAuthGate`, `AuthGate`
- Replace the static Check In button with:

```typescript
const { checkIn, checkedInStopIds, pendingStopId } = useCheckIn()
const { requireAuth, showGate, setShowGate } = useAuthGate()
const isCheckedIn = station ? checkedInStopIds.has(station.id) : false
const isPending = station ? pendingStopId === station.id : false

// In JSX:
<button
  type="button"
  disabled={isCheckedIn || isPending}
  onClick={() => requireAuth(() => checkIn(station.id))}
  className={cn(
    "flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98]",
    isCheckedIn
      ? "border-cc-brew-green/30 bg-cc-brew-green/10 text-cc-brew-green"
      : "border-border bg-card text-foreground hover:bg-muted"
  )}
>
  <UserCheck className="h-4 w-4" />
  {isCheckedIn ? "Checked In ✓" : isPending ? "Checking in..." : "Check In"}
</button>

<AuthGate isOpen={showGate} onClose={() => setShowGate(false)} onSuccess={() => checkIn(station.id)} />
```

**Step 3: Test check-in flow**

```bash
npm run dev
```
1. Open a stop detail sheet
2. Tap "Check In" — Google OAuth sheet should appear
3. Sign in — button should change to "Checked In ✓"

**Step 4: Commit**

```bash
git add hooks/use-check-in.ts components/stop-detail-sheet.tsx
git commit -m "feat: implement one-tap check-in with Google OAuth gate"
```

---

### Task 3.6: Wire Sign In button in header

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update the Sign In button to use the auth gate**

In `app/page.tsx`:
- Import `useAuthGate`, `AuthGate`
- Replace the static Sign In button with:

```typescript
const { user, showGate, setShowGate, requireAuth } = useAuthGate()

// Button:
<button
  type="button"
  onClick={() => !user && setShowGate(true)}
  className="..."
>
  {user ? "My Stops" : "Sign In"}
</button>
<AuthGate isOpen={showGate} onClose={() => setShowGate(false)} />
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire Sign In button in header to auth gate"
```

---

## Phase 4: Core Search (Weeks 7–8)

*Goal: The founding use case works end-to-end. Filters, range slider, stop detail sheet fully wired.*

### Task 4.1: Range slider component

**Files:**
- Create: `components/search/range-slider.tsx`
- Modify: `app/page.tsx`

**Step 1: Create the range slider**

```typescript
// components/search/range-slider.tsx
"use client"
import { cn } from "@/lib/utils"

const RADIUS_OPTIONS = [25, 50, 100, 150, 200]

interface Props {
  value: number
  onChange: (miles: number) => void
}

export function RangeSlider({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">Range</span>
      <div className="flex gap-1.5">
        {RADIUS_OPTIONS.map(mi => (
          <button
            key={mi}
            type="button"
            onClick={() => onChange(mi)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
              value === mi
                ? "bg-cc-charge-blue text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {mi}mi
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Wire to page.tsx**

Add `RangeSlider` to the header below the filter bar. Pass `radiusMiles` state and `setRadiusMiles` setter.

**Step 3: Apply radius filter to station query results**

In page.tsx `filteredStations` useMemo, add radius filter after the active filter check:

```typescript
const filteredStations = useMemo(() => {
  let result = stops
  if (position && radiusMiles) {
    result = filterByRadius(result, position, radiusMiles)
  }
  // ... existing filter logic
  return result
}, [stops, activeFilters, position, radiusMiles])
```

**Step 4: Commit**

```bash
git add components/search/range-slider.tsx app/page.tsx
git commit -m "feat: add range slider and radius filter"
```

---

### Task 4.2: Wire filter pills to real InstantDB data

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update connector type filters to use indexed boolean fields**

The current filter logic checks `station.connectorTypes.includes("CCS")` client-side. Since we now have `hasCcs`, `hasNacs`, `hasChademo` indexed on stops, update the InstantDB query in `use-station-query.ts` to push connector filters to the query when active:

```typescript
// In use-station-query.ts — accept activeFilters param
const connectorWhere = []
if (activeFilters.has("ccs")) connectorWhere.push({ hasCcs: true })
if (activeFilters.has("nacs")) connectorWhere.push({ hasNacs: true })
if (activeFilters.has("chademo")) connectorWhere.push({ hasChademo: true })
if (activeFilters.has("fast")) connectorWhere.push({ maxPowerKw: { $gte: 150 } })
```

**Step 2: Brand and amenity filters remain client-side**

Brand filters (Starbucks, McDonald's) filter on `stop.amenities[].brand` — this is acceptable client-side since the result set is already bounded by the bounding box.

**Step 3: "Available Now" filter**

When `available` filter is active, add `{ availableStalls: { $gte: 1 } }` to the InstantDB where clause.

**Step 4: Commit**

```bash
git add hooks/use-station-query.ts app/page.tsx
git commit -m "feat: push connector and availability filters to InstantDB query"
```

---

### Task 4.3: Wire stop detail sheet to real data

**Files:**
- Modify: `components/stop-detail-sheet.tsx`

**Step 1: Verify all Station fields map correctly**

Open `stop-detail-sheet.tsx` and check each field access against the Station type in `lib/types.ts`. Key fields to verify:
- `station.chargeScore.overall` — from `chargeScoreJson` parsed in `use-station-query.ts`
- `station.brewScore.overall` — from `brewScoreJson` parsed in `use-station-query.ts`
- `station.stalls` — from `stallsJson` parsed in `use-station-query.ts`
- `station.amenities` — from InstantDB relation, mapped in `use-station-query.ts`

**Step 2: Wire score breakdown to real sub-component data**

`ScoreBreakdown` accepts `chargeScore: ChargeScore` and `brewScore: BrewScore`. These now come from the parsed JSON fields. Verify the sub-component field names match.

**Step 3: Wire fallback station**

In `stop-detail-sheet.tsx`, query for the fallback station using `station.fallbackStationId`:

```typescript
const { data: fallbackData } = db.useQuery(
  station?.fallbackStationId ? { stops: { $: { where: { id: station.fallbackStationId } } } } : null
)
const fallbackStation = fallbackData?.stops?.[0] ?? null
```

Pass as `<FallbackStation fallbackStation={fallbackStation} />`.

**Step 4: Commit**

```bash
git add components/stop-detail-sheet.tsx
git commit -m "feat: wire stop detail sheet to real InstantDB data"
```

---

### Task 4.4: NREL weekly sync cron

**Files:**
- Create: `app/api/cron/sync-nrel/route.ts`

**Step 1: Create the sync route**

Reuses the seeding logic from Task 1.3 but uses `modified_since` to fetch only updated stations:

```typescript
// app/api/cron/sync-nrel/route.ts
// Fetches NREL stations modified in the past 8 days (slight overlap for safety)
// Updates existing stops; inserts new ones; sets isActive=false for removed ones
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const modifiedSince = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  // ... fetch from NREL with modified_since param, upsert into InstantDB
}
```

**Step 2: Commit**

```bash
git add app/api/cron/sync-nrel/
git commit -m "feat: add NREL weekly registry sync cron"
```

---

## Phase 5: PWA (Weeks 9–10)

*Goal: Mobile-installable app with GPS and offline caching.*

### Task 5.1: Install and configure next-pwa

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`

**Step 1: Install next-pwa**

```bash
npm install next-pwa
npm install --save-dev @types/next-pwa
```

**Step 2: Update next.config.ts**

```typescript
import withPWA from "next-pwa"

const nextConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "next-static", expiration: { maxAgeSeconds: 31_536_000 } },
    },
    {
      urlPattern: /^https:\/\/.*mapbox\.com.*/i,
      handler: "CacheFirst",
      options: { cacheName: "mapbox-tiles", expiration: { maxEntries: 200, maxAgeSeconds: 2_592_000 } },
    },
  ],
})({
  // your existing Next.js config here
})

export default nextConfig
```

**Step 3: Create PWA manifest**

```json
// public/manifest.json
{
  "name": "Coffee & A Charge",
  "short_name": "C&C",
  "description": "Find EV charging stops with great coffee and amenities nearby",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFDF7",
  "theme_color": "#1565C0",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Step 4: Link manifest in layout.tsx**

```typescript
export const metadata: Metadata = {
  manifest: "/manifest.json",
  themeColor: "#1565C0",
  // ... existing metadata
}
```

**Step 5: Commit**

```bash
git add next.config.ts public/manifest.json app/layout.tsx package.json
git commit -m "feat: add PWA manifest and next-pwa service worker"
```

---

### Task 5.2: "Locate Me" button on map

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/map/mapbox-map.tsx`

**Step 1: Add locate-me button**

In `app/page.tsx`, add a floating "locate me" button above the map controls:

```typescript
const { position, isLoading: isLocating } = useGeolocation()

// Button overlaid on map:
<button
  type="button"
  onClick={() => {
    if (position && mapRef.current) {
      mapRef.current.flyTo({ center: [position.lng, position.lat], zoom: 11 })
    }
  }}
  className="absolute right-4 bottom-[240px] z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-md"
  aria-label="Center on my location"
>
  <Navigation className="h-5 w-5 text-cc-charge-blue" />
</button>
```

**Step 2: Add user location marker to map**

In `mapbox-map.tsx`, when position changes, add/update a `GeolocateControl` or custom marker:

```typescript
useEffect(() => {
  if (!map.current || !userPosition) return
  // Add/update user location marker
  const el = document.createElement("div")
  el.className = "user-location-dot"
  el.style.cssText = "width:16px;height:16px;background:#1565C0;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"
  new mapboxgl.Marker(el).setLngLat([userPosition.lng, userPosition.lat]).addTo(map.current)
}, [userPosition])
```

**Step 3: Commit**

```bash
git add app/page.tsx components/map/mapbox-map.tsx
git commit -m "feat: add GPS locate-me button and user position marker"
```

---

## Phase 6: Soft Launch (Weeks 11–12)

*Goal: 100 real users. Validated check-in data. Analytics running.*

### Task 6.1: Loading skeleton screens

**Files:**
- Create: `components/stop-card-skeleton.tsx`

**Step 1: Create skeleton card**

```typescript
// components/stop-card-skeleton.tsx
export function StopCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-muted" />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}
```

**Step 2: Use skeleton in page.tsx while isLoading**

```typescript
{isLoading && panelState !== "collapsed" && (
  <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
    {[1, 2, 3].map(i => <StopCardSkeleton key={i} />)}
  </div>
)}
```

**Step 3: Commit**

```bash
git add components/stop-card-skeleton.tsx app/page.tsx
git commit -m "feat: add skeleton loading screens"
```

---

### Task 6.2: Deploy to Vercel and verify production

**Step 1: Connect GitHub repo to Vercel**

1. Go to https://vercel.com → New Project → Import from GitHub
2. Select the coffeecharge repo
3. Add all `.env.local` variables as Vercel Environment Variables:
   - `NEXT_PUBLIC_INSTANT_APP_ID`
   - `INSTANT_ADMIN_TOKEN`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NREL_API_KEY`
   - `GEOAPIFY_API_KEY`
   - `CRON_SECRET`

**Step 2: Run production build locally first**

```bash
npm run build
```
Expected: No errors.

**Step 3: Deploy**

```bash
git push origin main
```
Vercel auto-deploys on push to main.

**Step 4: Verify cron jobs are registered**

In Vercel dashboard → your project → Settings → Cron Jobs. Both cron entries from `vercel.json` should appear.

**Step 5: Commit any final fixes**

```bash
git add .
git commit -m "chore: production deploy config"
```

---

### Task 6.3: Seed all US states

Run the seeding route for each US state to populate InstantDB with the full NREL dataset:

**Step 1: Create a seeding script**

```bash
# scripts/seed-all-states.sh
STATES="AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC"
ADMIN_TOKEN="your_token"
BASE_URL="https://your-app.vercel.app"

for STATE in $STATES; do
  echo "Seeding $STATE..."
  OFFSET=0
  while true; do
    RESULT=$(curl -s -X POST "${BASE_URL}/api/seed-stations?state=${STATE}&offset=${OFFSET}" \
      -H "x-admin-token: ${ADMIN_TOKEN}")
    INSERTED=$(echo $RESULT | jq '.inserted')
    TOTAL=$(echo $RESULT | jq '.total')
    OFFSET=$((OFFSET + 200))
    echo "  $STATE: $OFFSET / $TOTAL"
    if [ "$OFFSET" -ge "$TOTAL" ]; then break; fi
    sleep 1  # rate limit
  done
done
```

**Step 2: Run the script**

```bash
bash scripts/seed-all-states.sh
```
Expected runtime: 30–60 minutes for all 50 states (~70k stations).

**Step 3: Commit script**

```bash
git add scripts/seed-all-states.sh
git commit -m "chore: add full US state seeding script"
```

---

## Post-MVP: V1.1 Preparation

These are not in the 12-week plan but should be tracked:

- [ ] Apply for ChargePoint API access on **Day 1 of development** (approval takes weeks)
- [ ] Implement `OcpiStatusProvider` in `lib/charger-status/ocpi.ts` when NEVI feed URLs are confirmed
- [ ] Upgrade `calculateChargeScore` to use live OCPI `realTimeAvailability` when provider is ready
- [ ] Add `stallStatusDailyAggregates` entity to InstantDB for 30-day uptime tracking
- [ ] Upgrade range slider to a true draggable handle (currently a pill selector)
- [ ] Add route corridor search (destination input → stops along route)
- [ ] VehicleProfile component and connector-type energy modelling
- [ ] Trip Planner (P1)
- [ ] Proactive push notification alerts (P1)

---

## Environment Variables Reference

| Variable | Used In | Get It From |
|---|---|---|
| `NEXT_PUBLIC_INSTANT_APP_ID` | All `db.*` calls | InstantDB dashboard |
| `INSTANT_ADMIN_TOKEN` | API routes (admin writes) | InstantDB dashboard |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox map | account.mapbox.com |
| `NREL_API_KEY` | Station seeding | developer.nrel.gov/signup |
| `GEOAPIFY_API_KEY` | Brew Score enrichment | myprojects.geoapify.com |
| `CRON_SECRET` | Cron auth header | Generate with `openssl rand -hex 32` |

---

## Quick Reference: Key File Locations

| What | Where |
|---|---|
| Domain types | `lib/types.ts` |
| InstantDB client | `lib/db.ts` |
| InstantDB schema | `instant.schema.ts` |
| InstantDB permissions | `instant.perms.ts` |
| Design tokens (CSS) | `app/globals.css` |
| Geo utilities | `lib/geo/` |
| Scoring engines | `lib/scoring/` |
| ChargerStatusProvider | `lib/charger-status/` |
| Hooks | `hooks/` |
| API routes | `app/api/` |
| Cron handlers | `app/api/cron/` |
| Map component | `components/map/mapbox-map.tsx` |
| Auth gate | `components/auth/auth-gate.tsx` |
| Mock data | `lib/mock-data.ts` |
| Overture script | `scripts/overture-extract.sh` |
