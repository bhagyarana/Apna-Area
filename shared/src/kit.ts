/**
 * Feature: Phase 5 Survival Kit Shared Schemas, Maps URL Builder & Checklist Rules (shared/src/kit.ts)
 * Purpose: Defines Zod contracts for POST /api/kit and POST /api/tts, deterministic Monday IST departure timestamps, Google Maps Directions URLs, and budget-tailored checklists.
 * Inputs: Verified office/origin coordinates, BudgetBand, and untrusted JSON payloads.
 * Outputs: Validated Survival Kit domain types and pure URL/timestamp/checklist helpers.
 * Deliberately excludes: Network fetches, model SDK calls, or unverified rupee price claims.
 */
import { z } from "zod";
import { SurvivalPhraseSchema } from "./live.js";
import { BudgetBandSchema, VerifiedPlaceSchema, type BudgetBand } from "./types.js";
import {
  MissionIdSchema,
  NeighbourhoodIdSchema,
  RecommendedNeighbourhoodSchema,
} from "./world.js";

export const KitTravelModeSchema = z.enum(["DRIVE", "TWO_WHEELER", "TRANSIT"]);
export type KitTravelMode = z.infer<typeof KitTravelModeSchema>;

export const NeighbourhoodCommuteSchema = z.object({
  neighbourhoodId: NeighbourhoodIdSchema,
  areaName: z.string().min(1),
  originPlaceName: z.string().min(1),
  originPlaceId: z.string().min(1).optional(),
  originLat: z.number(),
  originLng: z.number(),
  distanceKm: z.number().nonnegative(),
  morningDriveMin: z.number().int().positive().nullable(),
  eveningDriveMin: z.number().int().positive().nullable(),
  twoWheelerMin: z.number().int().positive().nullable(),
  transitMin: z.number().int().positive().nullable(),
  fitReason: z.string().min(1).max(180),
  oneLine: z.string().min(1).max(200),
  mapsDirectionsUri: z.string().url(),
  commuteSource: z.enum(["routes_api", "corridor_unavailable"]),
});
export type NeighbourhoodCommute = z.infer<typeof NeighbourhoodCommuteSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(120),
  detail: z.string().min(1).max(160),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const KitRequestSchema = z.object({
  officePlaceId: z.string().min(1),
  budgetBand: BudgetBandSchema,
  recommendedNeighbourhoods: z.array(RecommendedNeighbourhoodSchema).max(4).optional(),
  completedMissionIds: z.array(MissionIdSchema).default([]),
  learnedPhraseIds: z.array(z.string().min(1)).default([]),
});
export type KitRequest = z.infer<typeof KitRequestSchema>;

export const KitPayloadSchema = z.object({
  office: VerifiedPlaceSchema,
  mondayMorningIso: z.string().min(1),
  mondayEveningIso: z.string().min(1),
  neighbourhoods: z.array(NeighbourhoodCommuteSchema).min(1).max(4),
  phrases: z.array(SurvivalPhraseSchema),
  starterPhraseIds: z.array(z.string()),
  checklist: z.array(ChecklistItemSchema).length(6),
  summaryFallbackUsed: z.boolean(),
});
export type KitPayload = z.infer<typeof KitPayloadSchema>;

export const TtsRequestSchema = z.object({
  phraseId: z.string().min(1).max(64),
});
export type TtsRequest = z.infer<typeof TtsRequestSchema>;

export const TtsPayloadSchema = z.object({
  phraseId: z.string().min(1),
  audioWavBase64: z.string().min(1),
  mimeType: z.literal("audio/wav"),
  cached: z.boolean(),
});
export type TtsPayload = z.infer<typeof TtsPayloadSchema>;

export interface MondayIstWindow {
  dateKey: string;
  morningIso: string;
  eveningIso: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

/**
 * Computes the next future Monday 09:00 IST (03:30 UTC) and 18:30 IST (13:00 UTC) departure timestamps.
 * Guarantees both timestamps lie strictly in the future so Google Routes API TRAFFIC_AWARE calls never fail validation.
 *
 * @param nowMs - Current epoch milliseconds (defaults to Date.now()).
 * @returns ISO-8601 UTC timestamps and YYYY-MM-DD cache key for the upcoming Monday.
 */
export function computeNextMondayIstTimestamps(nowMs: number = Date.now()): MondayIstWindow {
  const istShifted = new Date(nowMs + IST_OFFSET_MS);
  const istDayOfWeek = istShifted.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let daysUntilMonday = (8 - istDayOfWeek) % 7;

  const baseIstMidnightUtcMs =
    Date.UTC(
      istShifted.getUTCFullYear(),
      istShifted.getUTCMonth(),
      istShifted.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - IST_OFFSET_MS;

  let morningUtcMs = baseIstMidnightUtcMs + daysUntilMonday * DAY_MS + 9 * 3_600_000;
  if (morningUtcMs <= nowMs + 5 * 60 * 1_000) {
    daysUntilMonday += 7;
    morningUtcMs = baseIstMidnightUtcMs + daysUntilMonday * DAY_MS + 9 * 3_600_000;
  }
  const eveningUtcMs = baseIstMidnightUtcMs + daysUntilMonday * DAY_MS + 18.5 * 3_600_000;

  const mondayIstDate = new Date(morningUtcMs + IST_OFFSET_MS);
  const yyyy = mondayIstDate.getUTCFullYear();
  const mm = String(mondayIstDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(mondayIstDate.getUTCDate()).padStart(2, "0");

  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    morningIso: new Date(morningUtcMs).toISOString(),
    eveningIso: new Date(eveningUtcMs).toISOString(),
  };
}

export interface DirectionsUrlParams {
  originLat: number;
  originLng: number;
  originName?: string;
  originPlaceId?: string;
  destinationLat: number;
  destinationLng: number;
  destinationName: string;
  destinationPlaceId: string;
  travelMode?: "driving" | "two-wheeler" | "transit";
}

/**
 * Builds an official Google Maps Cross-Platform Directions URL from a candidate neighbourhood anchor to the verified office.
 *
 * @param params - Verified origin and destination coordinates, names, and Place IDs.
 * @returns Escaped https://www.google.com/maps/dir/?api=1 URL string.
 */
export function buildGoogleMapsDirectionsUrl(params: DirectionsUrlParams): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "origin",
    params.originName
      ? `${params.originName}, Bengaluru`
      : `${params.originLat.toFixed(6)},${params.originLng.toFixed(6)}`,
  );
  if (params.originPlaceId) {
    url.searchParams.set("origin_place_id", params.originPlaceId);
  }
  url.searchParams.set("destination", `${params.destinationName}, Bengaluru`);
  url.searchParams.set("destination_place_id", params.destinationPlaceId);
  url.searchParams.set("travelmode", params.travelMode ?? "driving");
  return url.toString();
}

const SHARED_CHECKLIST_ITEMS: readonly ChecklistItem[] = [
  {
    id: "walk_rush_gate",
    label: "Walk the 09:00 office gate crossing once before Monday",
    detail: "Check which Outer Ring Road skywalk or service-lane entry reaches your campus block.",
  },
  {
    id: "transit_upi_pass",
    label: "Set up Namma BMTC and Namma Yatri on your phone",
    detail: "Keep UPI Autopay or small change ready for Vajra AC buses and metered autos.",
  },
  {
    id: "darshini_morning_spot",
    label: "Pick one go-to darshini within 500 metres of home",
    detail: "Fast breakfast counters move quickly when you order in short polite Kannada.",
  },
  {
    id: "monsoon_rain_layer",
    label: "Pack a compact umbrella and water-resistant backpack cover",
    detail: "Evening showers on the Bellandur and Silk Board stretch slow down service lanes.",
  },
];

const HOUSING_BY_BUDGET: Record<BudgetBand, readonly [ChecklistItem, ChecklistItem]> = {
  "15_20k": [
    {
      id: "pg_backup_water",
      label: "Verify power backup, RO water, and Wi-Fi speed on your floor",
      detail: "Test mobile signal inside the room and ask about inverter backup for work calls.",
    },
    {
      id: "pg_notice_terms",
      label: "Read the written notice period and gate access rules before paying",
      detail: "Confirm lock-in weeks, guest policy, and laundry days in writing.",
    },
  ],
  "20_30k": [
    {
      id: "flat_water_power",
      label: "Ask flatmates about tanker water frequency and BESCOM backup",
      detail: "Check whether the building has full DG backup or bedroom-only inverter lines.",
    },
    {
      id: "flat_written_split",
      label: "Confirm maintenance, cook, and notice terms in writing",
      detail: "Align on shared kitchen timings and society move-in registration before shifting.",
    },
  ],
  "30k_plus": [
    {
      id: "society_dg_water",
      label: "Confirm 100% DG power backup and water metering with the office",
      detail: "Ask the association desk about broadband fibre providers wired to your tower.",
    },
    {
      id: "society_move_slot",
      label: "Book the society service-lift slot and check peak exit gates",
      detail: "Large gated communities on ORR often open separate back gates during rush hour.",
    },
  ],
};

/**
 * Builds the 6-item interactive first-week checklist tailored to the player's home style preference.
 *
 * @param budgetBand - Selected BudgetBand preference.
 * @returns Array of 6 concrete ChecklistItems free of unverified price claims.
 */
export function buildFirstWeekChecklist(budgetBand: BudgetBand): ChecklistItem[] {
  const [housingOne, housingTwo] = HOUSING_BY_BUDGET[budgetBand];
  return [housingOne, housingTwo, ...SHARED_CHECKLIST_ITEMS];
}
