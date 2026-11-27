/**
 * Feature: POST /api/score Route (server/src/routes/score.ts)
 * Purpose: Validates completed mission scoring payloads, enforces verified placeId and 30/min per-IP rate limits, and returns calibrated ScoreData.
 * Inputs: POST JSON body matching ScoreRequestSchema.
 * Outputs: ApiResult<ScoreData> with Cache-Control: no-store and zero transcript retention.
 * Deliberately excludes: Storing transcripts/audio or exposing GEMINI_API_KEY.
 */
import type { FastifyInstance } from "fastify";
import {
  createApiError,
  createApiSuccess,
  createLogger,
  ENABLED_LANGUAGES,
  SAFETY_LIMITS,
  ScoreRequestSchema,
  type LanguageCode,
} from "@apna-area/shared";
import type { LoadedWorldData } from "./places.js";
import {
  createGenAiDecisionRunner,
  scoreMissionAttempt,
  type DecisionModelRunner,
} from "../score/decide.js";

export interface RegisterScoreOptions {
  worldData: LoadedWorldData;
  geminiApiKey?: string;
  runner?: DecisionModelRunner;
  enabledLanguages?: readonly LanguageCode[];
  log?: ReturnType<typeof createLogger>;
}

/**
 * Registers POST /api/score on the Fastify instance with per-IP budget protection.
 *
 * @param app - Fastify server instance.
 * @param opts - Verified world dataset, optional Gemini API key or injected runner, and logger.
 * @returns Promise resolving once the route is registered.
 */
export async function registerScoreRoutes(
  app: FastifyInstance,
  opts: RegisterScoreOptions,
): Promise<void> {
  const runner: DecisionModelRunner | null =
    opts.runner ??
    (opts.geminiApiKey && opts.geminiApiKey.length > 0
      ? createGenAiDecisionRunner(opts.geminiApiKey)
      : null);

  app.post(
    "/api/score",
    {
      config: {
        rateLimit: {
          max: SAFETY_LIMITS.scoreRequestsPerMinutePerIp,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      const parsed = ScoreRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(
            createApiError(
              "INVALID_SCORE_REQUEST",
              "Invalid mission score payload, so complete the stop and try again.",
              false,
              request.id,
            ),
          );
      }

      const verifiedPlace = opts.worldData.dataset.places.find(
        (p) => p.id === parsed.data.mission.placeId,
      );
      if (!verifiedPlace) {
        return reply
          .status(400)
          .send(
            createApiError(
              "UNVERIFIED_MISSION_PLACE",
              "Mission stop is not in the verified Outer Ring Road dataset.",
              false,
              request.id,
            ),
          );
      }

      const data = await scoreMissionAttempt(parsed.data, {
        runner,
        enabledLanguages: opts.enabledLanguages ?? ENABLED_LANGUAGES,
        requestId: request.id,
        log: opts.log,
      });

      return createApiSuccess(data, request.id);
    },
  );
}
