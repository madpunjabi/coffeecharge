#!/usr/bin/env bash
# scripts/seed-all-states.sh
# Seeds all US EV charging stations from NREL into InstantDB by calling
# the /api/seed-stations route one state + page at a time.
#
# Usage:
#   SEED_SECRET=<your_secret> BASE_URL=https://your-app.vercel.app bash scripts/seed-all-states.sh
#
# Required env vars:
#   SEED_SECRET  — matches SEED_SECRET set in Vercel environment variables
#   BASE_URL     — your deployed Vercel URL, no trailing slash

set -euo pipefail

STATES="AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC"

if [[ -z "${SEED_SECRET:-}" ]]; then
  echo "Error: SEED_SECRET env var is required" >&2
  exit 1
fi

if [[ -z "${BASE_URL:-}" ]]; then
  echo "Error: BASE_URL env var is required (e.g. https://your-app.vercel.app)" >&2
  exit 1
fi

TOTAL_INSERTED=0

for STATE in $STATES; do
  echo "→ Seeding $STATE…"
  OFFSET=0
  STATE_INSERTED=0

  while true; do
    RESULT=$(curl -s -X POST \
      "${BASE_URL}/api/seed-stations?state=${STATE}&offset=${OFFSET}" \
      -H "x-seed-secret: ${SEED_SECRET}")

    # Bail out on non-JSON (e.g. 401 Unauthorized, 500 error)
    if ! echo "$RESULT" | jq empty 2>/dev/null; then
      echo "  ERROR: unexpected response for $STATE offset=$OFFSET: $RESULT" >&2
      break
    fi

    INSERTED=$(echo "$RESULT" | jq '.inserted // 0')
    NEXT_OFFSET=$(echo "$RESULT" | jq '.nextOffset // 0')
    TOTAL=$(echo "$RESULT" | jq '.total // 0')

    STATE_INSERTED=$((STATE_INSERTED + INSERTED))
    OFFSET=$NEXT_OFFSET

    echo "  $STATE: $STATE_INSERTED / $TOTAL inserted"

    # Stop when we've fetched all pages
    if [[ "$OFFSET" -ge "$TOTAL" ]] || [[ "$INSERTED" -eq 0 ]]; then
      break
    fi

    sleep 1  # stay within NREL + InstantDB rate limits
  done

  TOTAL_INSERTED=$((TOTAL_INSERTED + STATE_INSERTED))
  echo "  ✓ $STATE done ($STATE_INSERTED stations)"
done

echo ""
echo "✅ All states seeded. Total inserted: $TOTAL_INSERTED"
