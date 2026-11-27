/**
 * Feature: Gemini v1 Interactions API Runner for Director (server/src/world/runner.ts)
 * Purpose: Wraps @google/genai stable v1 client.interactions.create with timeout and 1 jittered retry on 429/503.
 * Inputs: Model ID, system instruction, prompt, JSON schema, thinking level, and timeout milliseconds.
 * Outputs: Output JSON text and token usage metrics.
 * Deliberately excludes: Legacy generateContent calls or custom temperature/top_p/top_k parameters.
 */
import { GoogleGenAI } from "@google/genai";
import { TIMEOUTS_MS } from "@apna-area/shared";

export interface DirectorModelCallParams {
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
  thinkingLevel: "low" | "medium" | "high" | "xhigh";
  timeoutMs: number;
}

export interface DirectorModelCallOutput {
  outputText: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export type ModelInteractionRunner = (
  params: DirectorModelCallParams,
) => Promise<DirectorModelCallOutput>;

function isTransientUpstreamError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|timeout|aborted|ECONNRESET)\b/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates the production v1 GoogleGenAI runner with timeout and 1 jittered retry on 429/503.
 *
 * @param apiKey - Server-only GEMINI_API_KEY.
 * @returns ModelInteractionRunner invoking client.interactions.create on stable v1.
 */
export function createGenAiInteractionRunner(apiKey: string): ModelInteractionRunner {
  const client = new GoogleGenAI({ apiKey });

  return async (params: DirectorModelCallParams): Promise<DirectorModelCallOutput> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Director Gemini call timed out after ${params.timeoutMs}ms`));
          }, params.timeoutMs);
        });

        const callPromise = client.interactions.create({
          model: params.model,
          system_instruction: params.systemInstruction,
          input: params.prompt,
          generation_config: {
            thinking_level: params.thinkingLevel,
          },
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: params.schema,
          },
          store: false,
        });

        const interaction = await Promise.race([callPromise, timeoutPromise]);
        return {
          outputText: interaction.output_text ?? "",
          usage: {
            inputTokens: interaction.usage?.total_input_tokens,
            outputTokens: interaction.usage?.total_output_tokens,
            totalTokens: interaction.usage?.total_tokens,
          },
        };
      } catch (err: unknown) {
        if (attempt === 0 && isTransientUpstreamError(err)) {
          const jitter = Math.floor(Math.random() * TIMEOUTS_MS.retryMaxJitter);
          await sleep(TIMEOUTS_MS.retryBaseBackoff + jitter);
          continue;
        }
        throw err;
      } finally {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      }
    }
    throw new Error("Exhausted Director interaction attempts.");
  };
}
