/**
 * Feature: POST /api/live-token Route (server/src/routes/liveToken.ts)
 * Purpose: Validates mission + difficulty context, enforces 30/min per-IP rate limiting, and mints a server-locked ephemeral Gemini 3.8 Live token.
 * Inputs: POST JSON body matching LiveTokenRequestSchema.
 * Outputs: ApiResult<LiveTokenData> with Cache-Control: no-store.
 * Deliberately excludes: Storing audio/transcripts or exposing GEMINI_API_KEY.
 */
import type { FastifyInstance } from "fastify";
import {
  createApiError,
  createApiSuccess,
  createLogger,
  ENABLED_LANGUAGES,
  LiveTokenRequestSchema,
  SAFETY_LIMITS,
  type LanguageCode,
} from "@apna-area/shared";
import type { LoadedWorldData } from "./places.js";
import { loadSurvivalPhrases, selectPhraseForMission } from "../live/phrases.js";
import { createGenAiLiveTokenMinter, type LiveTokenMinter } from "../live/token.js";

export interface RegisterLiveTokenOptions {
  worldData: LoadedWorldData;
  geminiApiKey?: string;
  minter?: LiveTokenMinter;
  log?: ReturnType<typeof createLogger>;
}

/**
 * Registers POST /api/live-token on the Fastify instance with per-IP budget protection.
 *
 * @param app - Fastify server instance.
 * @param opts - World dataset, optional Gemini key or test minter, and logger.
 * @returns Promise resolving once the route is registered.
 */
export async function registerLiveTokenRoutes(
  app: FastifyInstance,
  opts: RegisterLiveTokenOptions,
): Promise<void> {
  const phrasesDataset = loadSurvivalPhrases();
  const enabledList: readonly LanguageCode[] = ENABLED_LANGUAGES;
  const minter: LiveTokenMinter | null =
    opts.minter ??
    (opts.geminiApiKey && opts.geminiApiKey.length > 0
      ? createGenAiLiveTokenMinter(opts.geminiApiKey, opts.log)
      : null);

  app.post(
    "/api/live-token",
    {
      config: {
        rateLimit: {
          max: SAFETY_LIMITS.liveTokensPerMinutePerIp,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      const parsed = LiveTokenRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(
            createApiError(
              "INVALID_LIVE_TOKEN_REQUEST",
              "Invalid mission details for live voice session, so reload your week and retry.",
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

      if (!minter) {
        return reply
          .status(503)
          .send(
            createApiError(
              "LIVE_NOT_CONFIGURED",
              "Live voice service is not configured on this server.",
              false,
              request.id,
            ),
          );
      }

      const hydratedReq =
        !parsed.data.targetPhrase && enabledList.includes("kn")
          ? {
              ...parsed.data,
              targetPhrase: selectPhraseForMission(
                phrasesDataset.phrases,
                parsed.data.mission.phraseSituation,
                parsed.data.mission.npcGender,
                parsed.data.mission.id,
              ),
            }
          : parsed.data;

      const result = await minter(hydratedReq, request.id);
      if (!result.ok) {
        return reply
          .status(503)
          .send(createApiError(result.code, result.message, result.retryable, request.id));
      }

      return createApiSuccess(result.data, request.id);
    },
  );
}
