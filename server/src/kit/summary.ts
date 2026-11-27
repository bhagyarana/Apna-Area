/**
 * Feature: Factual Flash-Lite Neighbourhood One-Liners & Verifier (server/src/kit/summary.ts)
 * Purpose: Writes one honest, price-free commute sentence per candidate ORR neighbourhood using gemini-3.5-flash-lite with a deterministic fallback.
 * Inputs: RawNeighbourhoodCommute records from Routes API and verified office name.
 * Outputs: Hydrated NeighbourhoodCommute records with verified oneLine blurbs and fallback telemetry.
 * Deliberately excludes: Invented rents, rupee figures, hype words, or em dashes.
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  createLogger,
  KIT_CONFIG,
  MODEL_IDS,
  NeighbourhoodIdSchema,
  TIMEOUTS_MS,
  type NeighbourhoodCommute,
  type NeighbourhoodId,
} from "@apna-area/shared";
import type { RawNeighbourhoodCommute } from "./commute.js";

export interface SummaryModelOutput {
  outputText: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

export type KitSummaryRunner = (prompt: string, schema: Record<string, unknown>) => Promise<SummaryModelOutput>;

const SummaryResponseSchema = z.object({
  summaries: z.array(
    z.object({
      neighbourhoodId: NeighbourhoodIdSchema,
      oneLine: z.string().min(1).max(195),
    }),
  ),
});

const FORBIDDEN_CLAIM_REGEX =
  /(\u2014|\u2013|!|₹|\$|\brs\.?\b|\binr\b|\blakhs?\b|\brupees?\b|\bdeposits?\b|\brents?\b|\bfares?\b|\bcosts?\b|\bprices?\b|\b\d+\s*k\b|\bminutes?\b|\b\d+\s*min\b|\bkilometres?\b|\bkilometers?\b)/i;

const SUMMARY_SYSTEM_INSTRUCTION = [
  "You write crisp one-line spatial corridor notes (8 to 13 words) for newcomers choosing where to live near Bengaluru's Outer Ring Road.",
  "1. Describe the practical corridor access or lane character implied by fitReason and originPlaceName. Do NOT repeat or spell out minute or kilometre numbers already shown in the bars above.",
  "2. Never mention rent, rupees, deposits, fares, or costs. Warm sentence case, zero exclamation marks, zero em dashes.",
].join("\n");

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|timeout|aborted|ECONNRESET)\b/i.test(msg);
}

/**
 * Verifies that a model-generated neighbourhood summary line contains zero price claims, hype punctuation, or em dashes.
 *
 * @param line - Candidate summary string.
 * @returns True when safe to ship to the UI.
 */
export function verifyAreaSummaryLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= 12 && trimmed.length <= 195 && !FORBIDDEN_CLAIM_REGEX.test(trimmed);
}

/**
 * Builds a deterministic, factual one-sentence summary strictly from verified Routes API numbers.
 *
 * @param item - Raw neighbourhood commute record.
 * @param officeName - Verified office name.
 * @returns Honest single-sentence blurb free of price claims or em dashes.
 */
export function buildDeterministicAreaOneLine(
  item: RawNeighbourhoodCommute,
  officeName: string,
): string {
  const cleanedReason = item.fitReason.trim().replace(/[\u2014\u2013!]/g, ",");
  if (cleanedReason.length >= 14 && cleanedReason.length <= 120) {
    return cleanedReason.endsWith(".") ? cleanedReason : `${cleanedReason}.`;
  }
  return `Direct Outer Ring Road service-lane link toward ${officeName}.`;
}

/**
 * Creates the production v1 Gemini 3.5 Flash-Lite runner for Survival Kit area summaries.
 *
 * @param apiKey - Server-only GEMINI_API_KEY.
 * @returns KitSummaryRunner bound to MODEL_IDS.textFastLite.
 */
export function createGenAiKitSummaryRunner(apiKey: string): KitSummaryRunner {
  const client = new GoogleGenAI({ apiKey });

  return async (prompt: string, schema: Record<string, unknown>): Promise<SummaryModelOutput> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Kit summary call timed out after ${TIMEOUTS_MS.kitSummary}ms`));
          }, TIMEOUTS_MS.kitSummary);
        });
        const callPromise = client.interactions.create({
          model: MODEL_IDS.textFastLite,
          system_instruction: SUMMARY_SYSTEM_INSTRUCTION,
          input: prompt,
          generation_config: { thinking_level: KIT_CONFIG.summaryThinkingLevel },
          response_format: { type: "text", mime_type: "application/json", schema },
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
        if (attempt === 0 && isTransientError(err)) {
          const jitter = Math.floor(Math.random() * TIMEOUTS_MS.retryMaxJitter);
          await new Promise((r) => setTimeout(r, TIMEOUTS_MS.retryBaseBackoff + jitter));
          continue;
        }
        throw err;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }
    throw new Error("Exhausted Flash-Lite summary attempts.");
  };
}

/**
 * Hydrates RawNeighbourhoodCommute records with verified Flash-Lite one-liners (or deterministic Routes API fallbacks).
 *
 * @param rawItems - Commute records from computeOfficeCommutes.
 * @param officeName - Verified office name.
 * @param opts - Optional runner, requestId, and structured logger.
 * @returns Hydrated NeighbourhoodCommute array and summaryFallbackUsed boolean.
 */
export async function populateNeighbourhoodSummaries(
  rawItems: readonly RawNeighbourhoodCommute[],
  officeName: string,
  opts: {
    runner?: KitSummaryRunner | null;
    requestId?: string;
    log?: ReturnType<typeof createLogger>;
  } = {},
): Promise<{ neighbourhoods: NeighbourhoodCommute[]; summaryFallbackUsed: boolean }> {
  const log = opts.log ?? createLogger();
  const byId = new Map<NeighbourhoodId, string>();
  let summaryFallbackUsed = false;

  if (opts.runner && rawItems.some((r) => r.commuteSource === "routes_api")) {
    const prompt = JSON.stringify({
      officeName,
      areas: rawItems.map((r) => ({
        neighbourhoodId: r.neighbourhoodId,
        areaName: r.areaName,
        originPlaceName: r.originPlaceName,
        fitReason: r.fitReason,
        fastestMode:
          r.twoWheelerMin !== null &&
          (r.morningDriveMin === null || r.twoWheelerMin < r.morningDriveMin)
            ? "two_wheeler"
            : "car_or_bus",
      })),
    });
    const schema: Record<string, unknown> = {
      type: "object",
      required: ["summaries"],
      additionalProperties: false,
      properties: {
        summaries: {
          type: "array",
          items: {
            type: "object",
            required: ["neighbourhoodId", "oneLine"],
            additionalProperties: false,
            properties: {
              neighbourhoodId: { type: "string", enum: rawItems.map((r) => r.neighbourhoodId) },
              oneLine: { type: "string" },
            },
          },
        },
      },
    };

    const t0 = performance.now();
    try {
      const out = await opts.runner(prompt, schema);
      log.logGeminiCall({
        requestId: opts.requestId,
        model: MODEL_IDS.textFastLite,
        config: { thinking_level: KIT_CONFIG.summaryThinkingLevel, store: false },
        prompt,
        output: out.outputText,
        durationMs: performance.now() - t0,
        usage: out.usage,
      });
      const parsed = SummaryResponseSchema.safeParse(JSON.parse(out.outputText));
      if (parsed.success) {
        for (const entry of parsed.data.summaries) {
          if (verifyAreaSummaryLine(entry.oneLine)) byId.set(entry.neighbourhoodId, entry.oneLine.trim());
        }
      }
    } catch (err: unknown) {
      log.warn("kit.summary_fallback", {
        requestId: opts.requestId,
        durationMs: performance.now() - t0,
        meta: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  const neighbourhoods: NeighbourhoodCommute[] = rawItems.map((item) => {
    const modelLine = byId.get(item.neighbourhoodId);
    if (!modelLine) summaryFallbackUsed = true;
    return { ...item, oneLine: modelLine ?? buildDeterministicAreaOneLine(item, officeName) };
  });

  return { neighbourhoods, summaryFallbackUsed };
}
