// Docs: https://www.instantdb.com/docs/permissions

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
