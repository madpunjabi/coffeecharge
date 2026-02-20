# CA Reseed + Network Filter Pills — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reseed all California EV stations with normalized network names (upsert, no duplicates), then add Tesla Supercharger, Electrify America, and EVgo filter pills to the filter bar.

**Architecture:** Task 1 is a local script run — `reseed-california.ts` already has the upsert pattern. Task 2 is a 3-file UI change: add entries to `filterOptions`, add icons to `FilterBar`, add switch cases to `page.tsx`.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · InstantDB Admin SDK · NREL API

---

## Task 1: Run reseed-california.ts

**Files:**
- Run: `scripts/reseed-california.ts` (already exists — no edits needed)

**Step 1: Verify env vars are present**

```bash
grep -E "NEXT_PUBLIC_INSTANT_APP_ID|INSTANT_ADMIN_TOKEN|NREL_API_KEY" .env.local
```
Expected: All three lines present with values.

**Step 2: Run the reseed**

```bash
npx tsx scripts/reseed-california.ts
```
Expected: Script prints progress per page (`CA: 200/XXXX`, `CA: 400/XXXX`, …) and finishes with a summary like `Done. Updated: X  Created: Y  Total: Z`.

This takes ~20–40 minutes. Let it run to completion.

**Step 3: Verify in InstantDB**

After completion, confirm no duplicate `nrelId` values exist — the script loads existing records by `nrelId` before writing, so each NREL station maps to exactly one InstantDB stop.

---

## Task 2: Add network filter pills

**Files:**
- Modify: `lib/mock-data.ts` (filterOptions array)
- Modify: `components/filter-bar.tsx` (FilterIcon switch)
- Modify: `app/page.tsx` (filteredStations switch)

---

### Task 2.1: Add filter options to mock-data.ts

**Files:**
- Modify: `lib/mock-data.ts`

**Step 1: Add three network filter entries**

In `lib/mock-data.ts`, add after the `target` entry in `filterOptions`:

```typescript
{ id: "tesla", label: "Tesla", category: "network" },
{ id: "electrify-america", label: "Electrify America", category: "network" },
{ id: "evgo", label: "EVgo", category: "network" },
```

The full `filterOptions` array should look like:

```typescript
export const filterOptions: FilterOption[] = [
  { id: "fast", label: "Fast 150kW+", category: "power" },
  { id: "ultrafast", label: "Ultra 250kW+", category: "power" },
  { id: "nacs", label: "NACS", category: "connector" },
  { id: "ccs", label: "CCS", category: "connector" },
  { id: "chademo", label: "CHAdeMO", category: "connector" },
  { id: "starbucks", label: "Starbucks", category: "brand" },
  { id: "target", label: "Target", category: "brand" },
  { id: "tesla", label: "Tesla", category: "network" },
  { id: "electrify-america", label: "Electrify America", category: "network" },
  { id: "evgo", label: "EVgo", category: "network" },
  { id: "restrooms", label: "Restrooms", category: "amenity" },
  { id: "available", label: "Available Now", category: "availability" },
]
```

Note: `FilterOption.category` in `lib/types.ts` currently accepts `"connector" | "power" | "brand" | "amenity" | "availability"`. Add `"network"` to the union:

```typescript
export interface FilterOption {
  id: string
  label: string
  category: "connector" | "power" | "brand" | "amenity" | "availability" | "network"
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 3: Commit**

```bash
git add lib/mock-data.ts lib/types.ts
git commit -m "feat: add Tesla, Electrify America, EVgo to filterOptions"
```

---

### Task 2.2: Add icons to FilterBar

**Files:**
- Modify: `components/filter-bar.tsx`

**Step 1: Add icon cases for network filters**

In the `FilterIcon` switch in `components/filter-bar.tsx`, add cases for the three new filter IDs. Use the `Zap` icon (already imported):

```typescript
case "tesla":
case "electrify-america":
case "evgo":
  return <Zap className={iconClass} />
```

Add these cases before the `default` case.

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 3: Commit**

```bash
git add components/filter-bar.tsx
git commit -m "feat: add network filter icons to FilterBar"
```

---

### Task 2.3: Wire filter logic in page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add network filter cases to the filteredStations switch**

In `app/page.tsx`, find the `filteredStations` `useMemo` — specifically the `switch (filter)` block inside `result.filter(...)`. Add three new cases after the `target` case:

```typescript
case "tesla":
  if (!station.network.toLowerCase().includes("tesla")) return false
  break
case "electrify-america":
  if (!station.network.toLowerCase().includes("electrify america")) return false
  break
case "evgo":
  if (!station.network.toLowerCase().includes("evgo")) return false
  break
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 3: Verify in dev server (optional)**

```bash
npm run dev
```
Open localhost:3000. The filter bar should now show Tesla, Electrify America, and EVgo pills. Tapping one should filter the stop list to matching networks.

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire Tesla, Electrify America, EVgo network filters in page.tsx"
```

---

## Final Step: Push

```bash
git push origin main
```
