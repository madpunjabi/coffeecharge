// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // --- System entities (keep as-is) ---
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),

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
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade",
      },
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
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
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
