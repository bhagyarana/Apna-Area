/**
 * Feature: Shared Domain Schemas & API Contracts
 * Purpose: Defines Zod runtime validators and inferred TypeScript types shared across Fastify routes and React UI.
 * Inputs: Untrusted JSON payloads from HTTP requests, localStorage, or model responses.
 * Outputs: Strictly typed domain objects and typed { ok, data | error } envelopes.
 * Deliberately excludes: Network transport clients or framework-specific hooks.
 */
import { z } from "zod";

export const LanguageCodeSchema = z.enum(["en", "hi", "kn"]);
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

export const LanguageComfortSchema = z.enum(["en", "hi", "en_hi"]);
export type LanguageComfort = z.infer<typeof LanguageComfortSchema>;

export const BudgetBandSchema = z.enum(["15_20k", "20_30k", "30k_plus"]);
export type BudgetBand = z.infer<typeof BudgetBandSchema>;

export const PhraseSituationSchema = z.enum([
  "greeting",
  "darshini_order",
  "auto_meter",
  "directions",
  "renting",
  "thanks",
  "polite_refusal",
]);
export type PhraseSituation = z.infer<typeof PhraseSituationSchema>;

export const NpcRoleSchema = z.enum([
  "auto_driver",
  "darshini_owner",
  "pg_owner",
  "transit_helper",
  "office_buddy",
]);
export type NpcRole = z.infer<typeof NpcRoleSchema>;

export const MissionMoodSchema = z.enum(["calm", "morning", "rush", "evening"]);
export type MissionMood = z.infer<typeof MissionMoodSchema>;

export const PlaceCategorySchema = z.enum([
  "tech_park",
  "darshini",
  "pg_coliving",
  "transit_stop",
  "lake_park",
  "cafe_daily",
]);
export type PlaceCategory = z.infer<typeof PlaceCategorySchema>;

export const BoundingBoxSchema = z.object({
  south: z.number(),
  west: z.number(),
  north: z.number(),
  east: z.number(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const VerifiedPlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: PlaceCategorySchema,
  neighbourhood: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  shortAddress: z.string(),
  googleMapsUri: z.string().url(),
  primaryType: z.string().optional(),
});
export type VerifiedPlace = z.infer<typeof VerifiedPlaceSchema>;

export const VerifiedPlacesDatasetSchema = z.object({
  verifiedAt: z.string(),
  bbox: BoundingBoxSchema,
  totalCount: z.number().int().nonnegative(),
  places: z.array(VerifiedPlaceSchema),
});
export type VerifiedPlacesDataset = z.infer<typeof VerifiedPlacesDatasetSchema>;

export const GeoJSONLineStringFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({
    generatedAt: z.string(),
    distanceMeters: z.number().nonnegative(),
    source: z.string(),
  }),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
});
export type GeoJSONLineStringFeature = z.infer<typeof GeoJSONLineStringFeatureSchema>;

export const PlacesPayloadSchema = z.object({
  places: z.array(VerifiedPlaceSchema),
  corridor: GeoJSONLineStringFeatureSchema,
  verifiedAt: z.string(),
});
export type PlacesPayload = z.infer<typeof PlacesPayloadSchema>;

export const FeatureFlagsSchema = z.object({
  enableMapPicker: z.boolean(),
  enableDirector: z.boolean(),
  enableVoiceNpcs: z.boolean(),
  enableAdaptiveScoring: z.boolean(),
  enableSurvivalKit: z.boolean(),
  enableAmbientMusic: z.boolean(),
  enable3dDusk: z.boolean().default(true),
});
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const HealthDataSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  commit: z.string(),
  builtAt: z.string(),
  upstreams: z.object({
    placesLoaded: z.number().int().nonnegative(),
    geminiConfigured: z.boolean(),
    mapsConfigured: z.boolean(),
    mapsServerConfigured: z.boolean().optional(),
    phrasesLoaded: z.number().int().nonnegative().optional(),
    fallbackPlansLoaded: z.number().int().nonnegative().optional(),
  }),
});
export type HealthData = z.infer<typeof HealthDataSchema>;

export const PublicConfigDataSchema = z.object({
  mapsBrowserKey: z.string(),
  mapId: z.string(),
  enabledLanguages: z.array(LanguageCodeSchema).min(1),
  orrBbox: BoundingBoxSchema,
  featureFlags: FeatureFlagsSchema,
});
export type PublicConfigData = z.infer<typeof PublicConfigDataSchema>;

export const DifficultyStateSchema = z.object({
  localLanguageShare: z.number().min(0).max(0.8),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  paceSeconds: z.union([z.literal(60), z.literal(75), z.literal(90)]),
});
export type DifficultyState = z.infer<typeof DifficultyStateSchema>;

export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorDetail;
  requestId: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/**
 * Wraps a validated payload into a standard API success envelope.
 *
 * @param data - Validated response payload.
 * @param requestId - Correlation ID for the HTTP request.
 * @returns Typed ApiSuccess envelope.
 */
export function createApiSuccess<T>(data: T, requestId: string): ApiSuccess<T> {
  return { ok: true, data, requestId };
}

/**
 * Wraps error metadata into a standard API failure envelope without throwing.
 *
 * @param code - Machine-readable error code (for example, "RATE_LIMITED").
 * @param message - Plain, single-sentence user-facing message (no em dashes).
 * @param retryable - Whether retrying the same request can succeed.
 * @param requestId - Correlation ID for the HTTP request.
 * @returns Typed ApiFailure envelope.
 */
export function createApiError(
  code: string,
  message: string,
  retryable: boolean,
  requestId: string,
): ApiFailure {
  return {
    ok: false,
    error: { code, message, retryable },
    requestId,
  };
}
