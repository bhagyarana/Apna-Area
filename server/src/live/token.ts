/**
 * Feature: Ephemeral AuthToken Minter for Gemini 3.8 Live (server/src/live/token.ts)
 * Purpose: Mints short-lived ephemeral tokens locked via liveConnectConstraints to gemini-3.8-live, NPC persona, transcriptions, and NON_BLOCKING tools.
 * Inputs: Validated LiveTokenRequest and server-only GEMINI_API_KEY.
 * Outputs: Typed { ok: true, data: LiveTokenData } or { ok: false, code, message, retryable }.
 * Deliberately excludes: Exposing GEMINI_API_KEY, passing thinkingConfig, or setting proactive_audio: false.
 */
import { GoogleGenAI, Modality } from "@google/genai";
import {
  createLogger,
  ENABLED_LANGUAGES,
  LIVE_VOICE_CONFIG,
  MODEL_IDS,
  SAFETY_LIMITS,
  TIMEOUTS_MS,
  type LanguageCode,
  type LiveTokenData,
  type LiveTokenRequest,
} from "@apna-area/shared";
import { buildNpcSystemInstruction, selectVoiceForNpc } from "./persona.js";
import { buildServerLiveTools } from "./tools.js";

export type MintLiveTokenResult =
  | { ok: true; data: LiveTokenData }
  | { ok: false; code: string; message: string; retryable: boolean };

export type LiveTokenMinter = (
  req: LiveTokenRequest,
  requestId?: string,
) => Promise<MintLiveTokenResult>;

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|timeout|ECONNRESET)\b/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a production ephemeral token minter using @google/genai authTokens.create with timeout and 1 retry.
 *
 * @param apiKey - Server-only GEMINI_API_KEY.
 * @param log - Structured logger instance.
 * @returns LiveTokenMinter function.
 */
export function createGenAiLiveTokenMinter(
  apiKey: string,
  log = createLogger(),
): LiveTokenMinter {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: LIVE_VOICE_CONFIG.ephemeralApiVersion },
  });

  return async (req: LiveTokenRequest, requestId?: string): Promise<MintLiveTokenResult> => {
    const enabledLanguages: readonly LanguageCode[] = ENABLED_LANGUAGES;
    const includePhraseTool = Boolean(req.targetPhrase && enabledLanguages.includes("kn"));
    const systemInstruction = buildNpcSystemInstruction(req, enabledLanguages);
    const voiceName = selectVoiceForNpc(req.mission.npcRole, req.mission.npcGender);
    const tools = buildServerLiveTools(includePhraseTool);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const startedAt = performance.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const expireTime = new Date(
          Date.now() + SAFETY_LIMITS.ephemeralTokenExpireMinutes * 60_000,
        ).toISOString();
        const newSessionExpireTime = new Date(
          Date.now() + SAFETY_LIMITS.ephemeralNewSessionWindowMinutes * 60_000,
        ).toISOString();

        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`authTokens.create timed out after ${TIMEOUTS_MS.liveToken}ms`));
          }, TIMEOUTS_MS.liveToken);
        });

        const mintPromise = client.authTokens.create({
          config: {
            uses: SAFETY_LIMITS.ephemeralTokenUses,
            expireTime,
            newSessionExpireTime,
            liveConnectConstraints: {
              model: MODEL_IDS.liveVoice,
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
                },
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                sessionResumption: {},
                tools,
              },
            },
          },
        });

        const minted = await Promise.race([mintPromise, timeoutPromise]);
        if (!minted.name) {
          throw new Error("authTokens.create returned an empty token name.");
        }

        log.logGeminiCall({
          requestId,
          model: MODEL_IDS.liveVoice,
          config: {
            surface: "authTokens.create",
            apiVersion: LIVE_VOICE_CONFIG.ephemeralApiVersion,
            uses: SAFETY_LIMITS.ephemeralTokenUses,
            voiceName,
          },
          prompt: systemInstruction,
          output: "[EPHEMERAL_TOKEN_MINTED]",
          durationMs: performance.now() - startedAt,
        });

        return {
          ok: true,
          data: {
            token: minted.name,
            expireTime,
            model: MODEL_IDS.liveVoice,
            apiVersion: LIVE_VOICE_CONFIG.ephemeralApiVersion,
            maxDurationSeconds: Math.min(SAFETY_LIMITS.maxLiveSessionSeconds, req.difficulty.paceSeconds),
            voiceName,
            includePhraseTool,
            ...(req.targetPhrase && includePhraseTool ? { phrase: req.targetPhrase } : {}),
          },
        };
      } catch (err: unknown) {
        if (attempt === 0 && isTransientError(err)) {
          const jitter = Math.floor(Math.random() * TIMEOUTS_MS.retryMaxJitter);
          await sleep(TIMEOUTS_MS.retryBaseBackoff + jitter);
          continue;
        }
        log.error("live_token.mint_failed", {
          requestId,
          durationMs: performance.now() - startedAt,
          meta: { error: err instanceof Error ? err.message : String(err) },
        });
        return {
          ok: false,
          code: "LIVE_TOKEN_UNAVAILABLE",
          message: "Could not start the live voice connection right now, so tap Retry in a moment.",
          retryable: true,
        };
      } finally {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      }
    }

    return {
      ok: false,
      code: "LIVE_TOKEN_UNAVAILABLE",
      message: "Could not start the live voice connection right now, so tap Retry in a moment.",
      retryable: true,
    };
  };
}
