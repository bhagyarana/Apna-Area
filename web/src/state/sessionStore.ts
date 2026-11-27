/**
 * Feature: Browser Session & Preference Persistence
 * Purpose: Reads and writes validated player office and preference state in localStorage with structured warning logs on storage errors.
 * Inputs: Validated office placeId, LanguageComfort, BudgetBand, and tour completion flag.
 * Outputs: Typed PlayerPreferences object with safe defaults.
 * Deliberately excludes: Storing transcripts, voice audio, or any sensitive tokens.
 */
import { z } from "zod";
import {
  BudgetBandSchema,
  LanguageComfortSchema,
  logger,
  type BudgetBand,
  type LanguageComfort,
} from "@apna-area/shared";

const STORAGE_KEY = "apna_area_prefs_v1";

const StoredPrefsSchema = z.object({
  selectedOfficeId: z.string().nullable().default(null),
  languageComfort: LanguageComfortSchema.default("en"),
  budgetBand: BudgetBandSchema.default("20_30k"),
  tourCompleted: z.boolean().default(false),
  learnedPhraseIds: z.array(z.string()).default([]),
});

export type PlayerPreferences = z.infer<typeof StoredPrefsSchema>;

const DEFAULT_PREFS: PlayerPreferences = {
  selectedOfficeId: null,
  languageComfort: "en",
  budgetBand: "20_30k",
  tourCompleted: false,
  learnedPhraseIds: [],
};

/**
 * Loads saved player preferences from localStorage, falling back to safe defaults on corrupt or unavailable storage.
 *
 * @returns Validated PlayerPreferences state.
 */
export function loadPlayerPreferences(): PlayerPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = StoredPrefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFS;
  } catch (err: unknown) {
    logger.warn("prefs.load_failed", {
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return DEFAULT_PREFS;
  }
}

/**
 * Persists updated player preferences to localStorage.
 *
 * @param next - Partial update merged onto current preferences.
 * @returns Updated PlayerPreferences object.
 */
export function savePlayerPreferences(next: Partial<PlayerPreferences>): PlayerPreferences {
  const merged: PlayerPreferences = {
    ...loadPlayerPreferences(),
    ...next,
  };
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
  if (current.learnedPhraseIds.includes(phraseId)) {
    return current;
  }
  return savePlayerPreferences({
    learnedPhraseIds: [...current.learnedPhraseIds, phraseId],
  });
}

export type { BudgetBand, LanguageComfort };
