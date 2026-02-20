#!/usr/bin/env npx tsx
// scripts/cleanup-ca-stops.ts
// Deletes all CA stops from InstantDB so reseed-california.ts can start fresh.
// Loads all stops (no server-side filter to avoid pagination issues), filters
// client-side for state=CA, then deletes in batches.
// Run: npx tsx scripts/cleanup-ca-stops.ts

import { init } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

if (!process.env.NEXT_PUBLIC_INSTANT_APP_ID || !process.env.INSTANT_ADMIN_TOKEN) {
  console.error("Missing env vars: NEXT_PUBLIC_INSTANT_APP_ID, INSTANT_ADMIN_TOKEN")
  process.exit(1)
}

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

const BATCH_SIZE = 20
const BATCH_DELAY = 1000

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function transactWithRetry(batch: object[]) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transact(batch as any)
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt === 5) throw new Error(`Batch failed after 5 attempts: ${msg}`)
      const wait = 2000 * attempt
      console.warn(`  retry ${attempt}/5 (wait ${wait}ms): ${msg}`)
      await sleep(wait)
    }
  }
}

async function main() {
  console.log("Loading all stops from DB…")
  const result = await db.query({ stops: {} })
  const allStops = result.stops ?? []
  console.log(`  ${allStops.length} total stops in DB`)

  const caStops = allStops.filter(s => s.state === "CA")
  console.log(`  ${caStops.length} CA stops to delete\n`)

  if (caStops.length === 0) {
    console.log("Nothing to delete.")
    return
  }

  let deleted = 0
  const deleteTxns = caStops.map(s => db.tx.stops[s.id].delete())

  for (let i = 0; i < deleteTxns.length; i += BATCH_SIZE) {
    await transactWithRetry(deleteTxns.slice(i, i + BATCH_SIZE))
    deleted += Math.min(BATCH_SIZE, deleteTxns.length - i)
    process.stdout.write(`  Deleted ${deleted}/${caStops.length}\r`)
    await sleep(BATCH_DELAY)
  }

  console.log(`\n✅ Done! Deleted ${deleted} CA stops.`)
}

main().catch(err => { console.error(err); process.exit(1) })
