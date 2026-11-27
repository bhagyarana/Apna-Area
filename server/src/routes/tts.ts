/**
 * Feature: POST /api/tts Route & Phrase Audio Pre-Warmer (server/src/routes/tts.ts)
 * Purpose: Registers POST /api/tts for verified Kannada survival phrase WAV synthesis and exposes non-blocking audio pre-warming.
 * Inputs: Validated TtsRequest JSON body, verified phrases list, optional TtsModelRunner, and PhraseTtsCache.
 * Outputs: Typed ApiResult<TtsPayload> and prewarmPhraseAudio hook.
 * Deliberately excludes: Synthesizing arbitrary untrusted user strings.
 */
import type { FastifyInstance } from "fastify";
import {
  createApiError,
  createApiSuccess,
  createLogger,
  SAFETY_LIMITS,
  TtsRequestSchema,
  type SurvivalPhrase,
} from "@apna-area/shared";
import {
  createGenAiTtsRunner,
  createPhraseTtsCache,
  synthesizeSurvivalPhrase,
  type PhraseTtsCache,
  type TtsModelRunner,
} from "../kit/tts.js";

export interface RegisterTtsRouteOptions {
  phrases: readonly SurvivalPhrase[];
  geminiApiKey?: string;
  ttsRunner?: TtsModelRunner;
  ttsCache?: PhraseTtsCache;
  log?: ReturnType<typeof createLogger>;
}

/**
 * Registers POST /api/tts on Fastify and returns the prewarmPhraseAudio hook.
 *
 * @param app - Fastify server instance.
 * @param opts - Curated phrases list, server Gemini API key, optional runner/cache, and logger.
 * @returns Pre-warm callback for Mission 1 target phrases.
 */
export async function registerTtsRoute(
  app: FastifyInstance,
  opts: RegisterTtsRouteOptions,
): Promise<(phraseId: string, requestId?: string) => void> {
  const ttsCache = opts.ttsCache ?? createPhraseTtsCache();
  const ttsRunner: TtsModelRunner | null =
    opts.ttsRunner ??
    (opts.geminiApiKey && opts.geminiApiKey.length > 0
      ? createGenAiTtsRunner(opts.geminiApiKey)
      : null);

  app.post(
    "/api/tts",
    {
      config: {
        rateLimit: {
          max: SAFETY_LIMITS.ttsRequestsPerMinutePerIp,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const parsed = TtsRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(
            createApiError(
              "INVALID_TTS_REQUEST",
              "Provide a valid survival phrase ID for audio replay.",
              false,
              request.id,
            ),
          );
      }

      const phrase = opts.phrases.find((p) => p.id === parsed.data.phraseId);
      if (!phrase) {
        return reply
          .status(404)
          .send(
            createApiError(
              "UNKNOWN_PHRASE_ID",
              "That survival phrase was not found in the verified phrasebook.",
              false,
              request.id,
            ),
          );
      }

      const result = await synthesizeSurvivalPhrase(phrase, {
        runner: ttsRunner,
        cache: ttsCache,
        requestId: request.id,
        log: opts.log,
      });

      if (!result.ok) {
        return reply
          .status(503)
          .send(createApiError(result.code, result.message, result.retryable, request.id));
      }

      return createApiSuccess(result.data, request.id);
    },
  );

  return (phraseId: string, requestId?: string) => {
    if (!ttsRunner) return;
    const phrase = opts.phrases.find((p) => p.id === phraseId);
    if (!phrase) return;
    void synthesizeSurvivalPhrase(phrase, {
      runner: ttsRunner,
      cache: ttsCache,
      requestId,
      log: opts.log,
    }).catch((err: unknown) => {
      opts.log?.warn("kit.prewarm_tts_failed", {
        requestId,
        meta: { error: err instanceof Error ? err.message : String(err) },
      });
    });
  };
}
