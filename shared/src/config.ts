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

/** Languages enabled in the current phase step (P3c: English, Hindi, and Kannada). */
export const ENABLED_LANGUAGES = ["en", "hi", "kn"] as const;

/** Network and upstream call timeouts in milliseconds. */
export const TIMEOUTS_MS = {
  healthCheck: 2_000,
  worldDirector: 32_000,
  worldDirectorFallback: 20_000,
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
  apiRequestsPerMinutePerIp: 180,
  worldRequestsPerMinutePerIp: 30,
  liveTokensPerMinutePerIp: 30,
  scoreRequestsPerMinutePerIp: 30,
  kitRequestsPerMinutePerIp: 30,
  ttsRequestsPerMinutePerIp: 30,
  maxLiveSessionSeconds: 90,
  ephemeralTokenUses: 3,
  ephemeralTokenExpireMinutes: 15,
  ephemeralNewSessionWindowMinutes: 2,
  candidateRadiusKm: 3.0,
  candidateFallbackRadiusKm: 5.0,
} as const;

/** Thresholds and step deltas for Gemini Decision 1 rubric routing. */
export const DECISION_THRESHOLDS = {
  minConfidence: 0.75,
  objectiveMetProbability: 0.6,
  safeDefaultRoute: "keep_level",
  rubricMaxScore: 3,
  stepUpShareDelta: 0.25,
  easeShareDelta: 0.2,
  maxLocalLanguageShare: 0.8,
} as const;

/** Default runtime feature flags exposed on GET /api/config. */
export const DEFAULT_FEATURE_FLAGS = {
  enableMapPicker: true,
  enableDirector: true,
  enableVoiceNpcs: true,
  enableAdaptiveScoring: true,
  enableSurvivalKit: true,
  enableAmbientMusic: true,
} as const;

/** Tunables for Phase 5 Survival Kit commutes, summaries, TTS cache, and Lyria ambience. */
export const KIT_CONFIG = {
  commuteCacheTtlMs: 6 * 60 * 60 * 1_000,
  commuteCacheMaxEntries: 40,
  ttsCacheMaxEntries: 30,
  ttsVoiceName: "Sulafat",
  ttsApiVersion: "v1beta",
  summaryThinkingLevel: "minimal",
  defaultNeighbourhoodCount: 3,
  ambientDefaultVolume: 0.18,
  ambientVoiceDuckedVolume: 0.04,
  ambientCrossfadeMs: 600,
} as const;

/** Audio and ephemeral token tunables for Gemini 3.8 Live voice NPCs. */
export const LIVE_VOICE_CONFIG = {
  ephemeralApiVersion: "v1alpha",
  inputSampleRateHz: 16_000,
  outputSampleRateHz: 24_000,
  drainTimeoutMs: 3_500,
  maleVoices: ["Puck", "Charon"] as const,
  femaleVoices: ["Aoede", "Kore"] as const,
} as const;

/** Tunables for the Phase 2 Week One Director and candidate selector. */
export const DIRECTOR_CONFIG = {
  thinkingLevel: "medium",
  fallbackThinkingLevel: "low",
  minPrimaryCandidates: 8,
  maxPromptCandidates: 15,
  lruMaxEntries: 50,
  lruTtlMs: 2 * 60 * 60 * 1_000,
  pinStaggerMs: 60,
} as const;

/** Eastern ORR neighbourhood anchors (ordered northeast to southwest along the corridor). */
export const ORR_NEIGHBOURHOOD_ANCHORS = [
  { id: "marathahalli", label: "Marathahalli", lat: 12.9569, lng: 77.7011 },
  { id: "kadubeesanahalli", label: "Kadubeesanahalli", lat: 12.9392, lng: 77.6953 },
  { id: "devarabisanahalli", label: "Devarabisanahalli", lat: 12.9315, lng: 77.6848 },
  { id: "bellandur", label: "Bellandur", lat: 12.926, lng: 77.6762 },
  { id: "sarjapur_junction", label: "Sarjapur Road Junction", lat: 12.9237, lng: 77.6675 },
  { id: "agara_hsr", label: "Agara & HSR Layout", lat: 12.9185, lng: 77.6412 },
  { id: "silk_board", label: "Silk Board", lat: 12.9177, lng: 77.6238 },
] as const;

/** Default Cloud Map ID fallback required when rendering AdvancedMarkerElement. */
export const DEFAULT_MAP_ID = "DEMO_MAP_ID";
