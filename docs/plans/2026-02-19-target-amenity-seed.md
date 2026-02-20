# Target Amenity Seed — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Seed all US Target store locations as amenities in InstantDB so the Target filter pill returns real results.

**Architecture:** Single script `scripts/seed-target.ts`, cloned from `scripts/seed-starbucks.ts` with 6 field changes. Fetches Target locations from OSM Overpass API (Wikidata ID Q1046951), matches each to charging stops within 400m using a 0.1° spatial grid, writes amenities in 10 concurrent batches of 25.

**Tech Stack:** Node.js (tsx) · @instantdb/admin · Overpass API · dotenv

---

## Task 1: Create scripts/seed-target.ts

**Files:**
- Create: `scripts/seed-target.ts`
- Reference: `scripts/seed-starbucks.ts` (copy this file, then apply changes below)

**Step 1: Copy seed-starbucks.ts to seed-target.ts**

```bash
cp scripts/seed-starbucks.ts scripts/seed-target.ts
```

**Step 2: Apply these 6 changes to seed-target.ts**

1. Update the file header comment:
```typescript
// scripts/seed-target.ts
// Fetches all US Target stores from OSM Overpass API and seeds them as amenities
// linked to any charging stop within 400m.
// Run: npx tsx scripts/seed-target.ts
```

2. Update the Overpass query (Wikidata ID Q1046951):
```typescript
const OVERPASS_QUERY = `[out:json][timeout:90];
node["brand:wikidata"="Q1046951"](24,-125,50,-66);
out body;`
```

3. Update the idempotency check brand filter (in `fetchExistingTargetStopIds` — rename the function):
```typescript
async function fetchExistingTargetStopIds(db: ReturnType<typeof init<typeof schema>>): Promise<Set<string>> {
  const result = await db.query({ amenities: {} })
  const seeded = new Set<string>()
  for (const a of result.amenities ?? []) {
    const brand = (a.brand ?? "") as string
    if (brand.toLowerCase().includes("target")) {
      seeded.add(a.stopId as string)
    }
  }
  return seeded
}
```

4. Update the amenity fields in the `update` call:
```typescript
name: node.tags["name"] ?? "Target",
brand: "Target",
category: "retail",
// ...
isIndoor: true,
hasWifi: false,
hasFreeRestroom: true,
```

5. Update the `alreadySeeded` call site to use the renamed function:
```typescript
const alreadySeeded = await fetchExistingTargetStopIds(db)
console.log(`  ${alreadySeeded.size} stops already have a Target linked`)
```

6. Update all console log strings to say "Target" instead of "Starbucks":
```typescript
console.log(`  ${nodes.length} Target stores from Overpass`)
// etc.
console.log(`\n✅ Done! ${matchedPairs} Target amenities seeded.`)
```

**Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 4: Commit**

```bash
git add scripts/seed-target.ts
git commit -m "feat: add Target amenity seeding script via Overpass API"
```

---

## Task 2: Dry-run and seed

**Step 1: Verify Overpass returns Target data**

```bash
curl -s -X POST "https://overpass-api.de/api/interpreter" \
  --data 'data=[out:json][timeout=30];node["brand:wikidata"="Q1046951"](37.7,-122.5,37.8,-122.4);out body;' | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log('nodes:', j.elements.length); if(j.elements[0]) console.log('sample:', JSON.stringify(j.elements[0], null, 2));"
```
Expected: 0–3 nodes (Target stores near SF), each with `lat`, `lon`, `tags.name`.

**Step 2: Add early exit and dry-run**

Add `process.exit(0)` after the "N Target–stop pairs to seed" log, then run:

```bash
npx tsx scripts/seed-target.ts
```

Expected output:
```
Fetching Target locations + stops in parallel…
  ~1900 Target stores from Overpass
  ~70000 stops from InstantDB
Checking existing Target amenities for idempotency…
  0 stops already have a Target linked
N Target–stop pairs to seed
```
Verify N > 0 before proceeding.

**Step 3: Remove early exit and run for real**

```bash
npx tsx scripts/seed-target.ts
```
Expected: Completes in 1–3 minutes, prints `✅ Done!`.

**Step 4: Commit**

```bash
git add scripts/seed-target.ts
git commit -m "chore: seed Target amenities (N pairs)"
```
