/**
 * Feature: Phase 4 Pure Adaptive Scoring, XP & Difficulty Routing (shared/src/game/scoring.ts)
 * Purpose: Defines Zod schemas and deterministic pure functions for XP, 1..3 stars, confidence-gated difficulty routing, and player pace overrides.
 * Inputs: Calibrated Gemini Decision 1 rubric scores, current DifficultyState, and enabled LanguageCode list.
 * Outputs: Validated ScoreRequest/ScoreData contracts, tabular XP awards, star counts, next DifficultyState, and plain-English adaptation copy.
 * Deliberately excludes: Network requests, SDK clients, or mutable state.
 */
import { z } from "zod";
import { DECISION_THRESHOLDS, ENABLED_LANGUAGES } from "../config.js";
import { LiveToolSignalsSchema, SurvivalPhraseSchema, TranscriptTurnSchema } from "../live.js";
import {
  DifficultyStateSchema,
  LanguageCodeSchema,
  type DifficultyState,
  type LanguageCode,
} from "../types.js";
import { MissionSchema } from "../world.js";

/** Alphabetically sorted ChoiceQuestion option keys plus explicit "other". */
export const RouteChoiceSchema = z.enum(["ease_level", "keep_level", "other", "step_up"]);
export type RouteChoice = z.infer<typeof RouteChoiceSchema>;

export const EffectiveRouteSchema = z.enum(["ease_level", "keep_level", "step_up"]);
export type EffectiveRoute = z.infer<typeof EffectiveRouteSchema>;

export const DifficultyOverrideModeSchema = z.enum(["gentle", "step_up"]);
export type DifficultyOverrideMode = z.infer<typeof DifficultyOverrideModeSchema>;

export const RubricScoresSchema = z.object({
  objectiveProb: z.number().min(0).max(1),
  objectiveScore: z.number().min(0).max(DECISION_THRESHOLDS.rubricMaxScore),
  phraseScore: z.number().min(0).max(DECISION_THRESHOLDS.rubricMaxScore),
  toneScore: z.number().min(0).max(DECISION_THRESHOLDS.rubricMaxScore),
  routeChoice: RouteChoiceSchema,
  confidence: z.number().min(0).max(1),
});
export type RubricScores = z.infer<typeof RubricScoresSchema>;

export const ScoreRequestSchema = z.object({
  mission: MissionSchema,
  difficulty: DifficultyStateSchema,
  activeLanguage: LanguageCodeSchema,
  transcript: z.array(TranscriptTurnSchema).max(60),
  toolSignals: LiveToolSignalsSchema,
  targetPhrase: SurvivalPhraseSchema.optional(),
  usedTextFallback: z.boolean().default(false),
});
export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;

export const ScoreDataSchema = z.object({
  missionId: z.string().min(1),
  xpEarned: z.number().int().nonnegative(),
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  objectiveMet: z.boolean(),
  effectiveRoute: EffectiveRouteSchema,
  lowConfidenceFallback: z.boolean(),
  rubric: RubricScoresSchema,
  nextDifficulty: DifficultyStateSchema,
  adaptationSummary: z.string().min(1).max(200),
  modelUsed: z.string().min(1),
  fallbackUsed: z.boolean(),
  durationMs: z.number().nonnegative(),
});
export type ScoreData = z.infer<typeof ScoreDataSchema>;

function clampShare(value: number, hasLocalLanguage: boolean): number {
  if (!hasLocalLanguage) return 0;
  const bounded = Math.max(0, Math.min(DECISION_THRESHOLDS.maxLocalLanguageShare, value));
  return Math.round(bounded * 100) / 100;
}

/**
 * Resolves the safe routing decision, falling back to DECISION_THRESHOLDS.safeDefaultRoute ("keep_level")
 * whenever calibrated confidence is below 0.75 or the model selects "other".
 *
 * @param rubric - Calibrated rubric evaluation from Gemini Decision 1.
 * @returns Effective route and whether the low-confidence or "other" safety gate triggered.
 */
export function resolveEffectiveRoute(rubric: RubricScores): {
  effectiveRoute: EffectiveRoute;
  lowConfidenceFallback: boolean;
} {
  if (rubric.confidence < DECISION_THRESHOLDS.minConfidence || rubric.routeChoice === "other") {
    return { effectiveRoute: DECISION_THRESHOLDS.safeDefaultRoute, lowConfidenceFallback: true };
  }
  return { effectiveRoute: rubric.routeChoice, lowConfidenceFallback: false };
}

/**
 * Computes 1 to 3 stars from calibrated objective probability and 0..3 rubric scores.
 *
 * @param rubric - Calibrated rubric evaluation.
 * @returns Star rating (1, 2, or 3).
 */
export function starsFor(rubric: RubricScores): 1 | 2 | 3 {
  const maxTotal = DECISION_THRESHOLDS.rubricMaxScore * 3;
  const normalised = (rubric.objectiveScore + rubric.phraseScore + rubric.toneScore) / maxTotal;
  const objectiveMet = rubric.objectiveProb >= DECISION_THRESHOLDS.objectiveMetProbability;
  if (objectiveMet && normalised >= 0.72) return 3;
  if (objectiveMet || normalised >= 0.45) return 2;
  return 1;
}

/**
 * Computes crisp 10-point-rounded XP for a completed mission turn (120 to 320 XP).
 *
 * @param rubric - Calibrated rubric evaluation.
 * @returns Non-negative integer XP multiple of 10.
 */
export function xpFor(rubric: RubricScores): number {
  const baseXp = 120;
  const objectiveBonus = rubric.objectiveProb >= DECISION_THRESHOLDS.objectiveMetProbability ? 80 : 0;
  const maxTotal = DECISION_THRESHOLDS.rubricMaxScore * 3;
  const norm = Math.max(0, Math.min(1, (rubric.objectiveScore + rubric.phraseScore + rubric.toneScore) / maxTotal));
  return baseXp + objectiveBonus + Math.round((norm * 120) / 10) * 10;
}

/**
 * Computes Mission N+1 DifficultyState clamped by enabledLanguages and the 0.75 confidence threshold.
 *
 * @param current - DifficultyState used in Mission N.
 * @param rubric - Calibrated rubric evaluation for Mission N.
 * @param enabledLanguages - Active language list from shared/config.ts.
 * @returns Clamped DifficultyState for Mission N+1.
 */
export function nextDifficulty(
  current: DifficultyState,
  rubric: RubricScores,
  enabledLanguages: readonly LanguageCode[] = ENABLED_LANGUAGES,
): DifficultyState {
  const hasLocal = enabledLanguages.includes("kn") || enabledLanguages.includes("hi");
  const { effectiveRoute } = resolveEffectiveRoute(rubric);
  if (effectiveRoute === "step_up") {
    return {
      localLanguageShare: clampShare(current.localLanguageShare + DECISION_THRESHOLDS.stepUpShareDelta, hasLocal),
      hintLevel: current.hintLevel === 3 ? 2 : 1,
      paceSeconds: current.paceSeconds === 90 ? 75 : 60,
    };
  }
  if (effectiveRoute === "ease_level") {
    return {
      localLanguageShare: clampShare(current.localLanguageShare - DECISION_THRESHOLDS.easeShareDelta, hasLocal),
      hintLevel: current.hintLevel === 1 ? 2 : 3,
      paceSeconds: current.paceSeconds === 60 ? 75 : 90,
    };
  }
  return {
    localLanguageShare: clampShare(current.localLanguageShare, hasLocal),
    hintLevel: current.hintLevel,
    paceSeconds: current.paceSeconds,
  };
}

/**
 * Applies a 1-click player override ("gentle" or "step_up") relative to Mission N's difficulty.
 *
 * @param base - DifficultyState from Mission N before AI routing.
 * @param mode - Player-chosen override direction.
 * @param enabledLanguages - Active language list.
 * @returns Overridden DifficultyState for Mission N+1.
 */
export function applyDifficultyOverride(
  base: DifficultyState,
  mode: DifficultyOverrideMode,
  enabledLanguages: readonly LanguageCode[] = ENABLED_LANGUAGES,
): DifficultyState {
  const hasLocal = enabledLanguages.includes("kn") || enabledLanguages.includes("hi");
  if (mode === "gentle") {
    return {
      localLanguageShare: clampShare(base.localLanguageShare - DECISION_THRESHOLDS.easeShareDelta, hasLocal),
      hintLevel: base.hintLevel === 1 ? 2 : 3,
      paceSeconds: 90,
    };
  }
  return {
    localLanguageShare: clampShare(base.localLanguageShare + DECISION_THRESHOLDS.stepUpShareDelta, hasLocal),
    hintLevel: base.hintLevel === 3 ? 2 : 1,
    paceSeconds: base.paceSeconds === 90 ? 75 : 60,
  };
}

/**
 * Builds plain, friendly, em-dash-free copy explaining how Mission N+1 adapted or was overridden.
 *
 * @param effectiveRoute - Resolved routing decision.
 * @param lowConfidenceFallback - Whether confidence < 0.75 or "other" kept the pace steady.
 * @param enabledLanguages - Active language list.
 * @param overrideMode - Optional human override selection.
 * @returns Single clear feedback sentence for MissionResultCard.
 */
export function buildAdaptationSummary(
  effectiveRoute: EffectiveRoute,
  lowConfidenceFallback: boolean,
  enabledLanguages: readonly LanguageCode[] = ENABLED_LANGUAGES,
  overrideMode?: DifficultyOverrideMode | null,
): string {
  const hasKannada = enabledLanguages.includes("kn");
  if (overrideMode === "gentle") {
    return "Pace updated by you. Your next stop will use more English and offer an earlier hint.";
  }
  if (overrideMode === "step_up") {
    return hasKannada
      ? "Pace updated by you. Your next stop will lead with more Kannada and fewer hints."
      : "Pace updated by you. Your next stop will move at a brisker pace with fewer hints.";
  }
  if (effectiveRoute === "step_up") {
    return hasKannada
      ? "You nailed the greeting. Your next stop will lead with more Kannada and fewer hints."
      : "You nailed the stop. Your next stop will move at a brisker pace with fewer hints.";
  }
  if (effectiveRoute === "ease_level") {
    return "Good effort. Your next stop will use more English and offer an earlier hint.";
  }
  return lowConfidenceFallback
    ? "Short turn recorded. Keeping your current language mix and hint pace steady for the next stop."
    : "Solid turn. Keeping your current language mix and hint pace steady for the next stop.";
}
