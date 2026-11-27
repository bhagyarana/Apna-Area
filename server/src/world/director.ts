/**
 * Feature: Gemini 4 Neon Week One Director & Fallback Ladder (server/src/world/director.ts)
 * Purpose: Orchestrates candidate selection, Gemini 4 Neon structured planning, verifier retry, Hydrogen fallback, and labelled replay fallback.
 * Inputs: WorldRequest, frozen VerifiedPlace dataset, LRU cache, optional fallback plans, and progress callback.
 * Outputs: Typed { ok: true, data: WorldPlanPayload } or { ok: false, code, message, retryable }.
 * Deliberately excludes: Unverified place IDs or silent fallback mocks.
 */
import {
  createLogger,
  DIRECTOR_CONFIG,
  MODEL_IDS,
  TIMEOUTS_MS,
  type VerifiedPlace,
  type WeekPlan,
  type WorldPlanPayload,
  type WorldProgressEvent,
  type WorldRequest,
} from "@apna-area/shared";
import { makeWorldCacheKey, type WorldPlanCache } from "./cache.js";
import { selectCandidatePlaces } from "./candidates.js";
import { buildDirectorPrompt, DIRECTOR_SYSTEM_INSTRUCTION, stripEmDashesDeep } from "./prompt.js";
import type { ModelInteractionRunner } from "./runner.js";
import { buildWeekPlanJsonSchema } from "./schema.js";
import { verifyWeekPlan } from "./verify.js";

export type { DirectorModelCallOutput, DirectorModelCallParams, ModelInteractionRunner } from "./runner.js";
export { createGenAiInteractionRunner } from "./runner.js";

export type GenerateWorldResult =
  | { ok: true; data: WorldPlanPayload }
  | { ok: false; code: string; message: string; retryable: boolean };

export interface DirectorDependencies {
  places: readonly VerifiedPlace[];
  cache: WorldPlanCache;
  runner: ModelInteractionRunner | null;
  fallbackPlans?: Readonly<Record<string, WeekPlan>>;
  log?: ReturnType<typeof createLogger>;
  requestId?: string;
  onProgress?: (event: Extract<WorldProgressEvent, { type: "progress" }>) => void;
}

/**
 * Generates and verifies a 5-mission WeekPlan for the selected ORR office.
 *
 * @param req - Validated WorldRequest.
 * @param deps - Places dataset, cache, Gemini runner, fallback plans, and logger.
 * @returns Typed GenerateWorldResult.
 */
export async function generateWeekPlan(
  req: WorldRequest,
  deps: DirectorDependencies,
): Promise<GenerateWorldResult> {
  const startedAt = performance.now();
  const log = deps.log ?? createLogger();
  const emitProgress = deps.onProgress ?? (() => {});

  emitProgress({
    type: "progress",
    step: "scanning",
    detail: "Scanning verified Outer Ring Road places near your office",
  });

  const selection = selectCandidatePlaces(req.officePlaceId, deps.places);
  if (!selection.ok) {
    return {
      ok: false,
      code: "INVALID_OFFICE",
      message: selection.error,
      retryable: false,
    };
  }

  const { office, candidates } = selection.data;
  emitProgress({
    type: "progress",
    step: "candidates_found",
    detail: `Found ${candidates.length} verified places near ${office.name}`,
    count: candidates.length,
  });

  const cacheKey = makeWorldCacheKey(req);
  const cached = deps.cache.get(cacheKey);
  if (cached) {
    emitProgress({
      type: "progress",
      step: "verified",
      detail: "Verified 5 of 5 mission stops",
      count: 5,
    });
    return {
      ok: true,
      data: {
        ...cached,
        durationMs: Math.round(performance.now() - startedAt),
      },
    };
  }

  emitProgress({
    type: "progress",
    step: "planning",
    detail: "Writing your week on the Outer Ring Road",
  });

  const schema = buildWeekPlanJsonSchema(
    office.id,
    candidates.map((c) => c.id),
  );

  const tryModel = async (
    model: string,
    verifierErrors?: readonly string[],
  ): Promise<
    | { ok: true; plan: WeekPlan }
    | { ok: false; kind: "verification" | "upstream"; errors: string[] }
  > => {
    if (!deps.runner) {
      return { ok: false, kind: "upstream", errors: ["GEMINI_API_KEY is not configured on the server."] };
    }
    const prompt = buildDirectorPrompt(office, candidates, req, verifierErrors);
    const callStart = performance.now();
    try {
      const isFallbackModel = model === MODEL_IDS.fastWorkhorse;
      const thinkingLevel = isFallbackModel
        ? DIRECTOR_CONFIG.fallbackThinkingLevel
        : DIRECTOR_CONFIG.thinkingLevel;
      const out = await deps.runner({
        model,
        systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
        prompt,
        schema,
        thinkingLevel,
        timeoutMs: isFallbackModel ? TIMEOUTS_MS.worldDirectorFallback : TIMEOUTS_MS.worldDirector,
        maxAttempts: isFallbackModel ? 1 : 2,
      });
      const callMs = performance.now() - callStart;
      log.logGeminiCall({
        requestId: deps.requestId,
        model,
        config: { thinking_level: thinkingLevel, store: false },
        prompt,
        output: out.outputText,
        durationMs: callMs,
        usage: out.usage,
      });

      const parsedJson = stripEmDashesDeep(JSON.parse(out.outputText) as unknown);
      const verified = verifyWeekPlan(parsedJson, office, candidates);
      if (!verified.ok) {
        log.warn("director.verification_failed", {
          requestId: deps.requestId,
          meta: { model, errors: verified.errors },
        });
        return { ok: false, kind: "verification", errors: verified.errors };
      }
      return { ok: true, plan: verified.data };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error("director.model_failed", {
        requestId: deps.requestId,
        durationMs: performance.now() - callStart,
        meta: { model, error: errMsg },
      });
      return { ok: false, kind: "upstream", errors: [errMsg] };
    }
  };

  let chosenPlan: WeekPlan | null = null;
  let modelUsed: string = MODEL_IDS.frontierFast;

  const firstAttempt = await tryModel(MODEL_IDS.frontierFast);
  if (firstAttempt.ok) {
    chosenPlan = firstAttempt.plan;
  } else {
    let fallbackErrors = firstAttempt.errors;
    if (firstAttempt.kind === "verification") {
      const retryAttempt = await tryModel(MODEL_IDS.frontierFast, firstAttempt.errors);
      if (retryAttempt.ok) {
        chosenPlan = retryAttempt.plan;
      } else {
        fallbackErrors = retryAttempt.errors;
      }
    }
    if (!chosenPlan) {
      modelUsed = MODEL_IDS.fastWorkhorse;
      const fallbackModelAttempt = await tryModel(
        MODEL_IDS.fastWorkhorse,
        firstAttempt.kind === "verification" ? fallbackErrors : undefined,
      );
      if (fallbackModelAttempt.ok) {
        chosenPlan = fallbackModelAttempt.plan;
      }
    }
  }

  if (chosenPlan) {
    emitProgress({
      type: "progress",
      step: "verified",
      detail: "Verified 5 of 5 mission stops",
      count: 5,
    });
    const payload: WorldPlanPayload = {
      plan: chosenPlan,
      replayed: false,
      modelUsed,
      durationMs: Math.round(performance.now() - startedAt),
    };
    deps.cache.set(cacheKey, payload);
    return { ok: true, data: payload };
  }

  const replayCandidate = deps.fallbackPlans?.[office.id];
  if (replayCandidate) {
    const nonOfficePlaces = deps.places.filter((p) => p.category !== "tech_park");
    const verifiedReplay = verifyWeekPlan(replayCandidate, office, nonOfficePlaces);
    if (verifiedReplay.ok) {
      emitProgress({
        type: "progress",
        step: "verified",
        detail: "Verified 5 of 5 mission stops",
        count: 5,
      });
      return {
        ok: true,
        data: {
          plan: verifiedReplay.data,
          replayed: true,
          modelUsed: "fallback-replay",
          durationMs: Math.round(performance.now() - startedAt),
        },
      };
    }
  }

  return {
    ok: false,
    code: "DIRECTOR_UNAVAILABLE",
    message: "Could not build your Week One plan right now, so please tap Retry in a moment.",
    retryable: true,
  };
}
