import { init } from "@instantdb/admin"
import schema from "../instant.schema"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
})

async function main() {
  console.log("Fetching stop counts from InstantDB…")
  const result = await db.query({ stops: { $: { limit: 200000 } } })
  const stops = result.stops

  const byState: Record<string, number> = {}
  for (const s of stops) {
    const st = (s.state as string) || "??"
    byState[st] = (byState[st] ?? 0) + 1
  }

  const sorted = Object.entries(byState).sort((a, b) => a[0].localeCompare(b[0]))
  console.log(`\nTotal stops in DB: ${stops.length}\n`)
  console.log("By state:")
  for (const [state, count] of sorted) {
    console.log(`  ${state.padEnd(4)} ${count.toLocaleString()}`)
  }

  const ALL_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
    "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
  ]
  const missing = ALL_STATES.filter(s => !byState[s])
  if (missing.length) {
    console.log(`\nNot yet seeded (${missing.length}): ${missing.join(" ")}`)
  } else {
    console.log("\n✅ All 51 states/DC seeded!")
  }
}

main().catch(err => { console.error(err); process.exit(1) })
