/**
 * Feature: Phase 4 Pure Adaptive Scoring & Routing Unit Tests (T4.1)
 * Purpose: Exercises 100% of branches across xpFor, starsFor, resolveEffectiveRoute, nextDifficulty, applyDifficultyOverride, and buildAdaptationSummary.
 * Inputs: Synthetic calibrated RubricScores, DifficultyState transitions, and language clamping combinations.
 * Outputs: Deterministic Vitest assertions with zero network calls.
 * Deliberately excludes: Live Gemini Decision 1 API calls (tested in server/src/__tests__/score.test.ts).
 */
import { describe, expect, it } from "vitest";
import {
  applyDifficultyOverride,
  buildAdaptationSummary,
  DEFAULT_FEATURE_FLAGS,
  nextDifficulty,
  resolveEffectiveRoute,
  RouteChoiceSchema,
  ScoreDataSchema,
  starsFor,
  xpFor,
  type DifficultyState,
  type RubricScores,
} from "../index.js";

const BASE_DIFFICULTY: DifficultyState = {
  localLanguageShare: 0.25,
  hintLevel: 2,
  paceSeconds: 75,
};

function makeRubric(overrides: Partial<RubricScores>): RubricScores {
  return {
    objectiveProb: 0.85,
    objectiveScore: 2.4,
    phraseScore: 2.2,
    toneScore: 2.4,
    routeChoice: "step_up",
    confidence: 0.9,
    ...overrides,
  };
}

describe("shared/game/scoring (T4.1)", () => {
  it("enables enableAdaptiveScoring in DEFAULT_FEATURE_FLAGS and sorts choice keys alphabetically with other", () => {
    expect(DEFAULT_FEATURE_FLAGS.enableAdaptiveScoring).toBe(true);
    const options = RouteChoiceSchema.options;
    expect(options).toEqual(["ease_level", "keep_level", "other", "step_up"]);
    expect([...options].sort()).toEqual(options);
  });

  it("computes starsFor and xpFor across 3-star, 2-star, and 1-star branches", () => {
    const strong = makeRubric({ objectiveProb: 0.96, objectiveScore: 2.9, phraseScore: 2.7, toneScore: 2.8 });
    expect(starsFor(strong)).toBe(3);
    expect(xpFor(strong)).toBe(310);

    const metMedium = makeRubric({ objectiveProb: 0.72, objectiveScore: 1.8, phraseScore: 1.1, toneScore: 1.9 });
    expect(starsFor(metMedium)).toBe(2);
    expect(xpFor(metMedium)).toBe(260);

    const unmetDecentPhrase = makeRubric({
      objectiveProb: 0.45,
      objectiveScore: 1.2,
      phraseScore: 1.6,
      toneScore: 1.6,
      routeChoice: "ease_level",
    });
    expect(starsFor(unmetDecentPhrase)).toBe(2);
    expect(xpFor(unmetDecentPhrase)).toBe(180);

    const weak = makeRubric({
      objectiveProb: 0.2,
      objectiveScore: 0.6,
      phraseScore: 0.2,
      toneScore: 0.8,
      routeChoice: "ease_level",
    });
    expect(starsFor(weak)).toBe(1);
    expect(xpFor(weak)).toBe(140);
  });

  it("steps up localLanguageShare, lowers hintLevel, and quickens pace on strong confident attempts", () => {
    const strongRubric = makeRubric({ routeChoice: "step_up", confidence: 0.89 });

    expect(
      nextDifficulty({ localLanguageShare: 0, hintLevel: 3, paceSeconds: 90 }, strongRubric, ["en", "hi", "kn"]),
    ).toEqual({ localLanguageShare: 0.25, hintLevel: 2, paceSeconds: 75 });

    expect(
      nextDifficulty({ localLanguageShare: 0.7, hintLevel: 2, paceSeconds: 75 }, strongRubric, ["en", "hi", "kn"]),
    ).toEqual({ localLanguageShare: 0.8, hintLevel: 1, paceSeconds: 60 });

    expect(nextDifficulty(BASE_DIFFICULTY, strongRubric, ["en"])).toEqual({
      localLanguageShare: 0,
      hintLevel: 1,
      paceSeconds: 60,
    });
  });

  it("eases pace, lowers localLanguageShare, and offers earlier hints on weak attempts", () => {
    const weakRubric = makeRubric({
      objectiveProb: 0.32,
      objectiveScore: 0.9,
      phraseScore: 0.4,
      toneScore: 1.4,
      routeChoice: "ease_level",
      confidence: 0.83,
    });

    expect(
      nextDifficulty({ localLanguageShare: 0.35, hintLevel: 1, paceSeconds: 60 }, weakRubric, ["en", "hi", "kn"]),
    ).toEqual({ localLanguageShare: 0.15, hintLevel: 2, paceSeconds: 75 });

    expect(
      nextDifficulty({ localLanguageShare: 0.1, hintLevel: 2, paceSeconds: 75 }, weakRubric, ["en", "hi", "kn"]),
    ).toEqual({ localLanguageShare: 0, hintLevel: 3, paceSeconds: 90 });
  });

  it("falls back to safeDefaultRoute (keep_level) when confidence < 0.75 or routeChoice is other", () => {
    const lowConfStepUp = makeRubric({ routeChoice: "step_up", confidence: 0.74 });
    expect(resolveEffectiveRoute(lowConfStepUp)).toEqual({
      effectiveRoute: "keep_level",
      lowConfidenceFallback: true,
    });
    expect(nextDifficulty(BASE_DIFFICULTY, lowConfStepUp, ["en", "hi", "kn"])).toEqual(BASE_DIFFICULTY);

    const otherChoice = makeRubric({ routeChoice: "other", confidence: 0.92 });
    expect(resolveEffectiveRoute(otherChoice)).toEqual({
      effectiveRoute: "keep_level",
      lowConfidenceFallback: true,
    });
    expect(nextDifficulty(BASE_DIFFICULTY, otherChoice, ["en", "hi", "kn"])).toEqual(BASE_DIFFICULTY);

    const confidentKeep = makeRubric({ routeChoice: "keep_level", confidence: 0.92 });
    expect(resolveEffectiveRoute(confidentKeep)).toEqual({
      effectiveRoute: "keep_level",
      lowConfidenceFallback: false,
    });
    expect(nextDifficulty(BASE_DIFFICULTY, confidentKeep, ["en"])).toEqual({
      localLanguageShare: 0,
      hintLevel: 2,
      paceSeconds: 75,
    });
  });

  it("supports 1-click player overrides and produces em-dash-free adaptation summaries", () => {
    expect(
      applyDifficultyOverride({ localLanguageShare: 0.5, hintLevel: 1, paceSeconds: 60 }, "gentle", ["en", "hi", "kn"]),
    ).toEqual({ localLanguageShare: 0.3, hintLevel: 2, paceSeconds: 90 });

    expect(applyDifficultyOverride(BASE_DIFFICULTY, "gentle", ["en"])).toEqual({
      localLanguageShare: 0,
      hintLevel: 3,
      paceSeconds: 90,
    });

    const stepUpFrom90 = applyDifficultyOverride(
      { localLanguageShare: 0, hintLevel: 3, paceSeconds: 90 },
      "step_up",
      ["en", "hi", "kn"],
    );
    expect(stepUpFrom90).toEqual({ localLanguageShare: 0.25, hintLevel: 2, paceSeconds: 75 });
    expect(applyDifficultyOverride(BASE_DIFFICULTY, "step_up", ["en", "hi"])).toEqual({
      localLanguageShare: 0.5,
      hintLevel: 1,
      paceSeconds: 60,
    });

    const summaries = [
      buildAdaptationSummary("step_up", false, ["en", "hi", "kn"]),
      buildAdaptationSummary("step_up", false, ["en", "hi"]),
      buildAdaptationSummary("ease_level", false, ["en", "hi", "kn"]),
      buildAdaptationSummary("keep_level", true, ["en", "hi", "kn"]),
      buildAdaptationSummary("keep_level", false, ["en", "hi", "kn"]),
      buildAdaptationSummary("keep_level", false, ["en", "hi", "kn"], "gentle"),
      buildAdaptationSummary("keep_level", false, ["en", "hi", "kn"], "step_up"),
      buildAdaptationSummary("keep_level", false, ["en"], "step_up"),
    ];
    for (const copy of summaries) {
      expect(copy.length).toBeGreaterThan(20);
      expect(copy).not.toContain("\u2014");
    }

    const validScore = ScoreDataSchema.safeParse({
      missionId: "m1",
      xpEarned: 310,
      stars: 3,
      objectiveMet: true,
      effectiveRoute: "step_up",
      lowConfidenceFallback: false,
      rubric: makeRubric({ confidence: 0.91 }),
      nextDifficulty: stepUpFrom90,
      adaptationSummary: summaries[0],
      modelUsed: "gemini-decision-1",
      fallbackUsed: false,
      durationMs: 210,
    });
    expect(validScore.success).toBe(true);
  });
});
