/**
 * Feature: Gemini Decision 1 Mission Scorer & Runner (server/src/score/decide.ts)
 * Purpose: Evaluates completed NPC missions via v1beta client.decisions.create in <1s with retry, heuristic fallback, and redacted logging.
 * Inputs: Validated ScoreRequest, optional v1beta DecisionModelRunner, enabled languages, and structured logger.
 * Outputs: Validated ScoreData payload with calibrated rubric probabilities, XP, stars, and clamped Mission N+1 DifficultyState.
 * Deliberately excludes: Logging raw player transcripts or throwing unhandled upstream errors.
 */
import { GoogleGenAI } from "@google/genai";
import {
  buildAdaptationSummary,
  createLogger,
  DECISION_THRESHOLDS,
  ENABLED_LANGUAGES,
  MODEL_IDS,
  nextDifficulty,
  resolveEffectiveRoute,
  RouteChoiceSchema,
  starsFor,
  TIMEOUTS_MS,
  xpFor,
  type LanguageCode,
  type RubricScores,
  type ScoreData,
  type ScoreRequest,
} from "@apna-area/shared";
import {
  buildDecisionInputText,
  computeHeuristicRubric,
  MISSION_DECISION_QUESTIONS,
} from "./questions.js";

export { buildDecisionInputText, computeHeuristicRubric, MISSION_DECISION_QUESTIONS };

export interface RawDecisionAnswer {
  type: "noul" | "score" | "choice";
  confidence: number;
  noul?: number;
  score?: number;
  choice?: string;
  probabilities?: Record<string, number>;
}

export interface DecisionRunnerOutput {
  answers?: Record<string, RawDecisionAnswer>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export type DecisionModelRunner = (inputText: string) => Promise<DecisionRunnerOutput>;

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|timeout|aborted|ECONNRESET)\b/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates the production v1beta Gemini Decision 1 runner with 4s timeout and 1 jittered retry on 429/503.
 *
 * @param apiKey - Server-only GEMINI_API_KEY.
 * @returns DecisionModelRunner bound to MODEL_IDS.decisions.
 */
export function createGenAiDecisionRunner(apiKey: string): DecisionModelRunner {
  const client = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });

  return async (inputText: string): Promise<DecisionRunnerOutput> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`decisions.create timed out after ${TIMEOUTS_MS.decisionsScore}ms`));
          }, TIMEOUTS_MS.decisionsScore);
        });
        const callPromise = client.decisions.create({
          model: MODEL_IDS.decisions,
          input: inputText,
          questions: MISSION_DECISION_QUESTIONS,
        });
        const res = await Promise.race([callPromise, timeoutPromise]);
        return {
          answers: res.answers as Record<string, RawDecisionAnswer> | undefined,
          usage: {
            inputTokens: res.usage?.total_input_tokens,
            outputTokens: res.usage?.total_output_tokens,
            totalTokens: res.usage?.total_tokens,
          },
        };
      } catch (err: unknown) {
        if (attempt === 0 && isTransientError(err)) {
          const jitter = Math.floor(Math.random() * TIMEOUTS_MS.retryMaxJitter);
          await sleep(TIMEOUTS_MS.retryBaseBackoff + jitter);
          continue;
        }
        throw err;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }
    throw new Error("Exhausted Gemini Decision 1 attempts.");
  };
}

function parseDecisionAnswers(
  answers: Record<string, RawDecisionAnswer> | undefined,
  req: ScoreRequest,
): RubricScores | null {
  if (!answers) return null;
  const objNoul = answers.objective_met;
  const objScore = answers.objective_score;
  const phrScore = answers.phrase_score;
  const tonScore = answers.tone_score;
  const routeAns = answers.next_route;
  if (
    objNoul?.type !== "noul" ||
    objScore?.type !== "score" ||
    phrScore?.type !== "score" ||
    tonScore?.type !== "score" ||
    routeAns?.type !== "choice"
  ) {
    return null;
  }
  const parsedChoice = RouteChoiceSchema.safeParse(routeAns.choice);
  const rawProb = Math.max(0, Math.min(1, objNoul.noul ?? 0));
  const boostedProb = req.toolSignals.objectiveCompleted ? Math.max(rawProb, 0.75) : rawProb;
  const boostPhrase =
    req.toolSignals.phraseQuality === "clear"
      ? Math.max(phrScore.score ?? 0, 2.4)
      : (phrScore.score ?? 0);

  return {
    objectiveProb: Math.round(boostedProb * 100) / 100,
    objectiveScore: Math.round(Math.max(0, Math.min(3, objScore.score ?? 0)) * 100) / 100,
    phraseScore: Math.round(Math.max(0, Math.min(3, boostPhrase)) * 100) / 100,
    toneScore: Math.round(Math.max(0, Math.min(3, tonScore.score ?? 0)) * 100) / 100,
    routeChoice: parsedChoice.success ? parsedChoice.data : "other",
    confidence: Math.floor(Math.max(0, Math.min(1, routeAns.confidence ?? 0)) * 1000) / 1000,
  };
}

/**
 * Scores a completed mission via Gemini Decision 1 (with deterministic fallback) and routes Mission N+1 difficulty.
 *
 * @param req - Validated ScoreRequest.
 * @param opts - Optional runner, enabled languages, requestId, and structured logger.
 * @returns Validated ScoreData envelope payload.
 */
export async function scoreMissionAttempt(
  req: ScoreRequest,
  opts: {
    runner?: DecisionModelRunner | null;
    enabledLanguages?: readonly LanguageCode[];
    requestId?: string;
    log?: ReturnType<typeof createLogger>;
  } = {},
): Promise<ScoreData> {
  const startedAt = performance.now();
  const log = opts.log ?? createLogger();
  const enabledLanguages = opts.enabledLanguages ?? ENABLED_LANGUAGES;
  const redactedSummary = JSON.stringify({
    missionId: req.mission.id,
    npcRole: req.mission.npcRole,
    turnCount: req.transcript.length,
    hintsGiven: req.toolSignals.hintsGiven,
    objectiveCompleted: req.toolSignals.objectiveCompleted,
    phraseQuality: req.toolSignals.phraseQuality ?? "none",
    usedTextFallback: req.usedTextFallback,
  });

  let rubric: RubricScores | null = null;
  let modelUsed: string = MODEL_IDS.decisions;
  let fallbackUsed = false;

  if (opts.runner) {
    const callStart = performance.now();
    try {
      const rawOut = await opts.runner(buildDecisionInputText(req));
      rubric = parseDecisionAnswers(rawOut.answers, req);
      log.logGeminiCall({
        requestId: opts.requestId,
        model: MODEL_IDS.decisions,
        config: { apiVersion: "v1beta", questions: Object.keys(MISSION_DECISION_QUESTIONS) },
        prompt: redactedSummary,
        output: JSON.stringify(rubric ?? { malformed: true }),
        durationMs: performance.now() - callStart,
        usage: rawOut.usage,
      });
    } catch (err: unknown) {
      log.warn("score.decision_fallback", {
        requestId: opts.requestId,
        durationMs: performance.now() - callStart,
        meta: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  if (!rubric) {
    rubric = computeHeuristicRubric(req);
    modelUsed = "heuristic-fallback";
    fallbackUsed = true;
  }

  const { effectiveRoute, lowConfidenceFallback } = resolveEffectiveRoute(rubric);
  const resolvedNext = nextDifficulty(req.difficulty, rubric, enabledLanguages);

  return {
    missionId: req.mission.id,
    xpEarned: xpFor(rubric),
    stars: starsFor(rubric),
    objectiveMet:
      req.toolSignals.objectiveCompleted ||
      rubric.objectiveProb >= DECISION_THRESHOLDS.objectiveMetProbability,
    effectiveRoute,
    lowConfidenceFallback,
    rubric,
    nextDifficulty: resolvedNext,
    adaptationSummary: buildAdaptationSummary(effectiveRoute, lowConfidenceFallback, enabledLanguages),
    modelUsed,
    fallbackUsed,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
