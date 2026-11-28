/**
 * Feature: Browser Session, 3D Hardware Gate & Adaptive Progress Persistence (web/src/state/sessionStore.ts)
 * Purpose: Reads and writes validated player office, comfort, 3D dusk mode, XP, star, and difficulty state in localStorage with safe fallbacks.
 * Inputs: Validated office placeId, LanguageComfort, BudgetBand, map3dEnabled, learned phrase IDs, XP, stars, and DifficultyState.
 * Outputs: Typed PlayerPreferences object with hardware-probed 3D defaults.
 * Deliberately excludes: Storing transcripts, voice audio, or any sensitive tokens.
 */
import { z } from "zod";
import {
  BudgetBandSchema,
  DifficultyStateSchema,
  LanguageComfortSchema,
  logger,
  MAP_3D_CONFIG,
  type BudgetBand,
  type DifficultyState,
  type LanguageComfort,
} from "@apna-area/shared";

const STORAGE_KEY = "apna_area_prefs_v1";
const SOFTWARE_RENDERER_RE = /swiftshader|llvmpipe|softpipe|basic render driver|software/i;

export const DEFAULT_DIFFICULTY: DifficultyState = {
  localLanguageShare: 0.2,
  hintLevel: 2,
  paceSeconds: 90,
};

const StarRatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const StoredPrefsSchema = z.object({
  selectedOfficeId: z.string().nullable().default(null),
  languageComfort: LanguageComfortSchema.default("en"),
  budgetBand: BudgetBandSchema.default("20_30k"),
  tourCompleted: z.boolean().default(false),
  learnedPhraseIds: z.array(z.string()).default([]),
  checkedChecklistIds: z.array(z.string()).default([]),
  musicMuted: z.boolean().default(false),
  map3dEnabled: z.boolean().optional(),
  totalXp: z.number().int().nonnegative().default(0),
  missionStars: z.record(z.string(), StarRatingSchema).default({}),
  difficulty: DifficultyStateSchema.default(DEFAULT_DIFFICULTY),
});

export type PlayerPreferences = Omit<z.infer<typeof StoredPrefsSchema>, "map3dEnabled"> & {
  map3dEnabled: boolean;
};

let cachedHardware3dSupport: boolean | null = null;

/**
 * Checks whether a WebGL renderer label indicates a CPU/software rasterizer.
 *
 * @param rendererName - Unmasked or standard WebGL RENDERER string.
 * @returns True when the renderer is SwiftShader, llvmpipe, softpipe, or software fallback.
 */
export function isSoftwareRendererName(rendererName: string): boolean {
  return SOFTWARE_RENDERER_RE.test(rendererName);
}

/**
 * Probes whether the current browser viewport has hardware-accelerated desktop WebGL2 without reduced-motion preference.
 *
 * @returns True when desktop width, non-reduced motion, and hardware WebGL2 are all available.
 */
export function detectHardware3dSupport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  if (window.innerWidth < MAP_3D_CONFIG.minDesktopWidthPx) {
    return false;
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    return false;
  }
  const forceHwProbe = Boolean(
    (window as Window & { __APNA_FORCE_HW_3D__?: boolean }).__APNA_FORCE_HW_3D__,
  );
  if (
    !forceHwProbe &&
    (window.navigator.webdriver || /HeadlessChrome/i.test(window.navigator.userAgent))
  ) {
    return false;
  }
  if (!forceHwProbe && cachedHardware3dSupport !== null) {
    return cachedHardware3dSupport;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" });
    if (!gl) {
      cachedHardware3dSupport = false;
      return false;
    }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const unmasked = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "") : "";
    const standard = String(gl.getParameter(gl.RENDERER) ?? "");
    const combined = `${unmasked} ${standard}`.trim();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    cachedHardware3dSupport = combined.length > 0 && !isSoftwareRendererName(combined);
    return cachedHardware3dSupport;
  } catch (err: unknown) {
    logger.warn("prefs.webgl_probe_failed", {
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    cachedHardware3dSupport = false;
    return false;
  }
}

function buildDefaultPrefs(): PlayerPreferences {
  return {
    selectedOfficeId: null,
    languageComfort: "en",
    budgetBand: "20_30k",
    tourCompleted: false,
    learnedPhraseIds: [],
    checkedChecklistIds: [],
    musicMuted: false,
    map3dEnabled: detectHardware3dSupport(),
    totalXp: 0,
    missionStars: {},
    difficulty: DEFAULT_DIFFICULTY,
  };
}

/**
 * Loads saved player preferences from localStorage, falling back to safe defaults on corrupt or unavailable storage.
 *
 * @returns Validated PlayerPreferences state.
 */
export function loadPlayerPreferences(): PlayerPreferences {
  const defaults = buildDefaultPrefs();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = StoredPrefsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return defaults;
    return {
      ...parsed.data,
      map3dEnabled:
        typeof parsed.data.map3dEnabled === "boolean"
          ? parsed.data.map3dEnabled
          : defaults.map3dEnabled,
    };
  } catch (err: unknown) {
    logger.warn("prefs.load_failed", {
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return defaults;
  }
}

/**
 * Persists updated player preferences to localStorage.
 *
 * @param next - Partial update merged onto current preferences.
 * @returns Updated PlayerPreferences object.
 */
export function savePlayerPreferences(next: Partial<PlayerPreferences>): PlayerPreferences {
  const merged: PlayerPreferences = { ...loadPlayerPreferences(), ...next };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err: unknown) {
    logger.warn("prefs.save_failed", {
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
  }
  return merged;
}

/**
 * Adds a mastered Kannada survival phrase ID to persisted player preferences if not already recorded.
 *
 * @param phraseId - Mastered phrase identifier from data/phrases.json.
 * @returns Updated PlayerPreferences object.
 */
export function recordLearnedPhraseId(phraseId: string): PlayerPreferences {
  const current = loadPlayerPreferences();
  if (current.learnedPhraseIds.includes(phraseId)) return current;
  return savePlayerPreferences({
    learnedPhraseIds: [...current.learnedPhraseIds, phraseId],
  });
}

/**
 * Toggles a Survival Kit checklist item ID in persisted player preferences.
 *
 * @param itemId - Checklist item identifier.
 * @returns Updated PlayerPreferences object.
 */
export function toggleChecklistItem(itemId: string): PlayerPreferences {
  const current = loadPlayerPreferences();
  const nextIds = current.checkedChecklistIds.includes(itemId)
    ? current.checkedChecklistIds.filter((id) => id !== itemId)
    : [...current.checkedChecklistIds, itemId];
  return savePlayerPreferences({ checkedChecklistIds: nextIds });
}

export type { BudgetBand, LanguageComfort };
