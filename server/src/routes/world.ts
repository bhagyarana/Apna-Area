/**
 * Feature: POST /api/world SSE & JSON Route (server/src/routes/world.ts)
 * Purpose: Streams live Director progress chips over Server-Sent Events (or returns a JSON envelope fallback) for a verified ORR office.
 * Inputs: POST body validated against WorldRequestSchema and Accept header ("text/event-stream" or "application/json").
 * Outputs: SSE stream of progress/complete/error events, or ApiResult<WorldPlanPayload>.
 * Deliberately excludes: Exposing GEMINI_API_KEY or returning unverified WeekPlans.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import {
  createApiError,
  createApiSuccess,
  createLogger,
  FallbackPlansMapSchema,
  WorldRequestSchema,
  type WeekPlan,
  type WorldProgressEvent,
} from "@apna-area/shared";
import type { LoadedWorldData } from "./places.js";
import { createWorldPlanCache, type WorldPlanCache } from "../world/cache.js";
import {
  createGenAiInteractionRunner,
  generateWeekPlan,
  type ModelInteractionRunner,
} from "../world/director.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultFallbackPath = path.resolve(currentDir, "../../../data/orr/fallback-plans.json");

/**
 * Loads committed real fallback WeekPlans from data/orr/fallback-plans.json if present.
 *
 * @param filePath - Path to fallback-plans.json.
 * @returns Frozen dictionary mapping officePlaceId to verified WeekPlan.
 */
export function loadFallbackWeekPlans(
  filePath: string = defaultFallbackPath,
): Readonly<Record<string, WeekPlan>> {
  if (!existsSync(filePath)) {
    return {};
  }
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
  return FallbackPlansMapSchema.parse(raw);
}

function writeSseEvent(
  stream: NodeJS.WritableStream,
  event: WorldProgressEvent,
): void {
  stream.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export interface RegisterWorldRouteOptions {
  worldData: LoadedWorldData;
  geminiApiKey?: string;
  runner?: ModelInteractionRunner;
  fallbackPlans?: Readonly<Record<string, WeekPlan>>;
  cache?: WorldPlanCache;
  log?: ReturnType<typeof createLogger>;
}

/**
 * Registers POST /api/world on the Fastify instance with SSE and JSON content negotiation.
 *
 * @param app - Fastify server instance.
 * @param opts - World dataset, optional Gemini key/runner, cache, and fallback plans.
 * @returns Promise resolving once the route is registered.
 */
export async function registerWorldRoutes(
  app: FastifyInstance,
  opts: RegisterWorldRouteOptions,
): Promise<void> {
  const cache = opts.cache ?? createWorldPlanCache();
  const fallbackPlans = opts.fallbackPlans ?? loadFallbackWeekPlans();
  const runner: ModelInteractionRunner | null =
    opts.runner ??
    (opts.geminiApiKey && opts.geminiApiKey.length > 0
      ? createGenAiInteractionRunner(opts.geminiApiKey)
      : null);

  app.post("/api/world", async (request, reply) => {
    const parsedReq = WorldRequestSchema.safeParse(request.body);
    if (!parsedReq.success) {
      return reply
        .status(400)
        .send(
          createApiError(
            "INVALID_WORLD_REQUEST",
            "Choose a valid Outer Ring Road office and preferences before building your week.",
            false,
            request.id,
          ),
        );
    }

    const wantsSse = String(request.headers.accept ?? "").includes("text/event-stream");

    if (wantsSse) {
      const sseStart = performance.now();
      reply.hijack();
      const raw = reply.raw;
      raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "x-request-id": request.id,
      });

      const result = await generateWeekPlan(parsedReq.data, {
        places: opts.worldData.dataset.places,
        cache,
        runner,
        fallbackPlans,
        log: opts.log,
        requestId: request.id,
        onProgress: (ev) => {
          if (!raw.writableEnded) {
            writeSseEvent(raw, ev);
          }
        },
      });

      opts.log?.info("http.sse_world", {
        requestId: request.id,
        durationMs: performance.now() - sseStart,
        meta: {
          officePlaceId: parsedReq.data.officePlaceId,
          languageComfort: parsedReq.data.languageComfort,
          budgetBand: parsedReq.data.budgetBand,
          ok: result.ok,
        },
      });

      if (!raw.writableEnded) {
        if (result.ok) {
          writeSseEvent(raw, {
            type: "complete",
            plan: result.data.plan,
            replayed: result.data.replayed,
            modelUsed: result.data.modelUsed,
            durationMs: result.data.durationMs,
          });
        } else {
          writeSseEvent(raw, {
            type: "error",
            code: result.code,
            message: result.message,
            retryable: result.retryable,
          });
        }
        raw.end();
      }
      return;
    }

    const result = await generateWeekPlan(parsedReq.data, {
      places: opts.worldData.dataset.places,
      cache,
      runner,
      fallbackPlans,
      log: opts.log,
      requestId: request.id,
    });

    if (!result.ok) {
      const status = result.code === "INVALID_OFFICE" ? 400 : 503;
      return reply
        .status(status)
        .send(createApiError(result.code, result.message, result.retryable, request.id));
    }

    return createApiSuccess(result.data, request.id);
  });
}
