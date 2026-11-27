/**
 * Feature: Centralised Runtime Configuration
 * Purpose: Single source of truth for verified Gemini model IDs, ORR map bounds, feature flags, timeouts, and safety caps.
 * Inputs: Compile-time constants only (runtime secrets stay in server env vars).
 * Outputs: Typed readonly constants imported by both server and web packages.
 * Deliberately excludes: API keys, user state, or environment variable reads so browser bundles stay secret-free.
 */

/** Verified Gemini & Lyria model identifiers from .agents/rules/gemini-models.md. */
export const MODEL_IDS = {
  frontierDeep: "gemini-4-carbon",
  frontierFast: "gemini-4-neon",
  fastWorkhorse: "gemini-4-hydrogen",
  textFastLite: "gemini-3.5-flash-lite",
  decisions: "gemini-decision-1", // v1beta client
  liveVoice: "gemini-3.8-live",
  ttsStudio: "gemini-3.8-flash-tts",
  imageDefault: "gemini-nano-banana-2.1",
  musicLoop: "lyria-3-clip-preview",
  musicSong: "lyria-3.5",
} as const;

/** Eastern Outer Ring Road bounding box (Silk Board / HSR edge to Marathahalli). */
export const ORR_BBOX = {
  south: 12.905,
  west: 77.61,
  north: 12.975,
  east: 77.715,
} as const;

/** Default map camera centre (Bellandur / Devarabisanahalli ORR midpoint). */
export const ORR_DEFAULT_CENTER = {
  lat: 12.9315,
  lng: 77.6848,
} as const;

/** Languages enabled in the current phase step (P0..P3a: English only; P3b adds hi; P3c adds kn). */
export const ENABLED_LANGUAGES = ["en"] as const;

/** Network and upstream call timeouts in milliseconds. */
export const TIMEOUTS_MS = {
  healthCheck: 2_000,
  worldDirector: 14_000,
  liveToken: 6_000,
  decisionsScore: 4_000,
  routesMatrix: 7_000,
  kitSummary: 5_000,
  ttsClip: 8_000,
  retryBaseBackoff: 250,
  retryMaxJitter: 200,
} as const;

/** Per-IP API rate limits and Live session duration caps for budget protection. */
export const SAFETY_LIMITS = {
  apiRequestsPerMinutePerIp: 60,
  liveTokensPerMinutePerIp: 30,
  maxLiveSessionSeconds: 90,
  ephemeralTokenUses: 3,
  ephemeralTokenExpireMinutes: 15,
  ephemeralNewSessionWindowMinutes: 2,
  candidateRadiusKm: 3.0,
  candidateFallbackRadiusKm: 5.0,
} as const;

/** Thresholds for Gemini Decision 1 rubric routing. */
export const DECISION_THRESHOLDS = {
  minConfidence: 0.75,
  objectiveMetProbability: 0.6,
  safeDefaultRoute: "keep_level",
} as const;

/** Default runtime feature flags exposed on GET /api/config. */
export const DEFAULT_FEATURE_FLAGS = {
  enableMapPicker: false,
  enableDirector: false,
  enableVoiceNpcs: false,
  enableAdaptiveScoring: false,
  enableSurvivalKit: false,
  enableAmbientMusic: false,
} as const;

/** Default Cloud Map ID fallback required when rendering AdvancedMarkerElement. */
export const DEFAULT_MAP_ID = "DEMO_MAP_ID";
