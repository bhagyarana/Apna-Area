/**
 * Feature: Cached Gemini 3.8 Flash TTS Phrase Replay Synthesizer (server/src/kit/tts.ts)
 * Purpose: Synthesizes self-contained 24 kHz audio/wav Kannada phrase clips via gemini-3.8-flash-tts (v1beta) and caches them in memory by phraseId.
 * Inputs: Validated SurvivalPhrase from data/phrases.json and server-only GEMINI_API_KEY.
 * Outputs: Typed { ok: true, data: TtsPayload } or { ok: false, code, message, retryable }.
 * Deliberately excludes: Synthesizing arbitrary untrusted user strings so quota cannot be abused as an open TTS relay.
 */
import { GoogleGenAI } from "@google/genai";
import {
  createLogger,
  KIT_CONFIG,
  MODEL_IDS,
  TIMEOUTS_MS,
  type SurvivalPhrase,
  type TtsPayload,
} from "@apna-area/shared";

export interface TtsModelOutput {
  audioWavBase64: string;
  mimeType: string;
}

export type TtsModelRunner = (phrase: SurvivalPhrase) => Promise<TtsModelOutput>;

export type SynthesizePhraseResult =
  | { ok: true; data: TtsPayload }
  | { ok: false; code: string; message: string; retryable: boolean };

export interface PhraseTtsCache {
  get: (phraseId: string) => string | undefined;
  set: (phraseId: string, wavBase64: string) => void;
  inflight: Map<string, Promise<TtsModelOutput>>;
}

const TTS_LEARNER_STYLE =
  "clear, warm Bengaluru local Kannada pronunciation at a steady learner pace";

/**
 * Creates a bounded in-memory LRU cache (max 30 phrases) with in-flight request coalescing.
 *
 * @returns PhraseTtsCache instance.
 */
export function createPhraseTtsCache(): PhraseTtsCache {
  const store = new Map<string, string>();
  return {
    get(phraseId: string): string | undefined {
      const hit = store.get(phraseId);
      if (!hit) return undefined;
      store.delete(phraseId);
      store.set(phraseId, hit);
      return hit;
    },
    set(phraseId: string, wavBase64: string): void {
      if (store.size >= KIT_CONFIG.ttsCacheMaxEntries && !store.has(phraseId)) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(phraseId, wavBase64);
    },
    inflight: new Map(),
  };
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|timeout|aborted|ECONNRESET)\b/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates the production v1beta Gemini 3.8 Flash TTS runner returning unary audio/wav clips.
 *
 * @param apiKey - Server-only GEMINI_API_KEY.
 * @returns TtsModelRunner bound to MODEL_IDS.ttsStudio.
 */
export function createGenAiTtsRunner(apiKey: string): TtsModelRunner {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: KIT_CONFIG.ttsApiVersion },
  });

  return async (phrase: SurvivalPhrase): Promise<TtsModelOutput> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`TTS synthesis timed out after ${TIMEOUTS_MS.ttsClip}ms`));
          }, TIMEOUTS_MS.ttsClip);
        });

        const callPromise = client.interactions.create({
          model: MODEL_IDS.ttsStudio,
          input: [
            {
              type: "user_input",
              content: [
                {
                  type: "text",
                  text: phrase.kannada,
                  annotations: [
                    {
                      type: "speech_metadata",
                      style: TTS_LEARNER_STYLE,
                    },
                  ],
                },
              ],
            },
          ],
          response_format: { type: "audio" },
          generation_config: {
            speech_config: [{ voice: KIT_CONFIG.ttsVoiceName }],
          },
          store: false,
        });

        const interaction = await Promise.race([callPromise, timeoutPromise]);
        const audioData = interaction.output_audio?.data;
        if (!audioData || audioData.length === 0) {
          throw new Error(`${MODEL_IDS.ttsStudio} returned empty output_audio.`);
        }

        return {
          audioWavBase64: audioData,
          mimeType: interaction.output_audio?.mime_type ?? "audio/wav",
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
    throw new Error("Exhausted Gemini TTS attempts.");
  };
}

/**
 * Synthesizes or serves a cached WAV clip for a curated Kannada SurvivalPhrase.
 *
 * @param phrase - Verified SurvivalPhrase from data/phrases.json.
 * @param opts - Runner, cache, requestId, and structured logger.
 * @returns Typed SynthesizePhraseResult without throwing.
 */
export async function synthesizeSurvivalPhrase(
  phrase: SurvivalPhrase,
  opts: {
    runner: TtsModelRunner | null;
    cache: PhraseTtsCache;
    requestId?: string;
    log?: ReturnType<typeof createLogger>;
  },
): Promise<SynthesizePhraseResult> {
  const cachedWav = opts.cache.get(phrase.id);
  if (cachedWav) {
    return {
      ok: true,
      data: {
        phraseId: phrase.id,
        audioWavBase64: cachedWav,
        mimeType: "audio/wav",
        cached: true,
      },
    };
  }

  if (!opts.runner) {
    return {
      ok: false,
      code: "TTS_NOT_CONFIGURED",
      message: "Audio replay is unavailable right now, so read the phonetic pronunciation guide below.",
      retryable: false,
    };
  }

  const log = opts.log ?? createLogger();
  const startedAt = performance.now();

  try {
    let pending = opts.cache.inflight.get(phrase.id);
    if (!pending) {
      pending = opts.runner(phrase);
      opts.cache.inflight.set(phrase.id, pending);
    }
    const generated = await pending;
    opts.cache.set(phrase.id, generated.audioWavBase64);

    log.logGeminiCall({
      requestId: opts.requestId,
      model: MODEL_IDS.ttsStudio,
      config: {
        apiVersion: KIT_CONFIG.ttsApiVersion,
        voice: KIT_CONFIG.ttsVoiceName,
        phraseId: phrase.id,
      },
      prompt: phrase.kannada,
      output: `[AUDIO_WAV_${generated.audioWavBase64.length}_B64_CHARS]`,
      durationMs: performance.now() - startedAt,
    });

    return {
      ok: true,
      data: {
        phraseId: phrase.id,
        audioWavBase64: generated.audioWavBase64,
        mimeType: "audio/wav",
        cached: false,
      },
    };
  } catch (err: unknown) {
    log.warn("kit.tts_failed", {
      requestId: opts.requestId,
      durationMs: performance.now() - startedAt,
      meta: {
        phraseId: phrase.id,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return {
      ok: false,
      code: "TTS_UPSTREAM_FAILED",
      message: "Could not load spoken audio right now, so use the phonetic syllables below and retry.",
      retryable: true,
    };
  } finally {
    opts.cache.inflight.delete(phrase.id);
  }
}
