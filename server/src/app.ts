/**
 * Feature: Fastify Application Factory
 * Purpose: Wires proxy trust, per-IP rate limiting, Cloud Logging request telemetry, API routes, and SPA static serving.
 * Inputs: Optional ServerOptions for build metadata, keys, rate limits, and web dist path.
 * Outputs: Configured FastifyInstance ready for listen() or app.inject() contract tests.
 * Deliberately excludes: Process signal binding or direct environment mutation so tests remain hermetic.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import {
  createApiError,
  createLogger,
  SAFETY_LIMITS,
  type FeatureFlags,
  type LogSink,
  type WeekPlan,
} from "@apna-area/shared";
import { registerHealthRoutes } from "./routes/health.js";
import { registerConfigRoutes } from "./routes/config.js";
import { loadVerifiedWorldData, registerPlacesRoutes, type LoadedWorldData } from "./routes/places.js";
import { registerWorldRoutes } from "./routes/world.js";
import { registerLiveTokenRoutes } from "./routes/liveToken.js";
import { registerScoreRoutes } from "./routes/score.js";
import { registerKitRoutes } from "./routes/kit.js";
import type { ModelInteractionRunner } from "./world/director.js";
import type { LiveTokenMinter } from "./live/token.js";
import type { DecisionModelRunner } from "./score/decide.js";
import type { RouteMatrixFetcher } from "./kit/commute.js";
import type { KitSummaryRunner } from "./kit/summary.js";
import type { TtsModelRunner } from "./kit/tts.js";

export interface ServerOptions {
  version?: string;
  commit?: string;
  builtAt?: string;
  placesLoaded?: number;
  worldData?: LoadedWorldData;
  geminiApiKey?: string;
  mapsBrowserKey?: string;
  mapsServerKey?: string;
  mapId?: string;
  featureFlags?: Partial<FeatureFlags>;
  worldRunner?: ModelInteractionRunner;
  liveTokenMinter?: LiveTokenMinter;
  decisionRunner?: DecisionModelRunner;
  routeMatrixFetcher?: RouteMatrixFetcher;
  kitSummaryRunner?: KitSummaryRunner;
  ttsRunner?: TtsModelRunner;
  fallbackPlans?: Readonly<Record<string, WeekPlan>>;
  rateLimitMax?: number;
  webDistPath?: string;
  logSink?: LogSink;
}

declare module "fastify" {
  interface FastifyRequest {
    startTimeNs?: bigint;
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultWebDist = path.resolve(currentDir, "../../web/dist");

/**
 * Builds and configures the Fastify server instance.
 *
 * @param options - Runtime configuration overrides (defaults read cleanly in main.ts).
 * @returns Configured FastifyInstance.
 */
export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const log = createLogger(options.logSink);

  const app = Fastify({
    logger: false,
    trustProxy: true,
    genReqId: (req) => {
      const headerId = req.headers["x-request-id"];
      return typeof headerId === "string" && headerId.length > 0 ? headerId : randomUUID();
    },
  });

  await app.register(rateLimit, {
    global: true,
    max: options.rateLimitMax ?? SAFETY_LIMITS.apiRequestsPerMinutePerIp,
    timeWindow: "1 minute",
    allowList: (request) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return false;
      }
      const urlPath = request.url.split("?")[0] ?? "/";
      return (
        urlPath === "/" ||
        urlPath === "/favicon.ico" ||
        urlPath.startsWith("/assets/") ||
        urlPath.startsWith("/art/") ||
        urlPath.startsWith("/audio/")
      );
    },
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      ...createApiError(
        "RATE_LIMITED",
        `Rate limit reached, please wait ${Math.ceil(context.ttl / 1000)} seconds before retrying.`,
        true,
        request.id,
      ),
    }),
  });

  app.addHook("onRequest", async (request, reply) => {
    request.startTimeNs = process.hrtime.bigint();
    reply.header("x-request-id", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    const elapsedMs =
      request.startTimeNs !== undefined
        ? Number(process.hrtime.bigint() - request.startTimeNs) / 1_000_000
        : 0;
    if (request.url.startsWith("/api/")) {
      log.info("http.request", {
        requestId: request.id,
        durationMs: elapsedMs,
        meta: {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          ip: request.ip,
        },
      });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? ((error as { statusCode: number }).statusCode)
        : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error";
    log.error("http.error", {
      requestId: request.id,
      meta: {
        statusCode,
        url: request.url,
        errorMessage: message,
      },
    });
    if (statusCode === 429) {
      return reply.status(429).send(
        createApiError("RATE_LIMITED", "Too many requests right now, so wait a moment and retry.", true, request.id),
      );
    }
    return reply.status(statusCode).send(
      createApiError(
        "INTERNAL_ERROR",
        "Something went wrong on the server, so please retry in a few seconds.",
        statusCode >= 500,
        request.id,
      ),
    );
  });

  const world = options.worldData ?? loadVerifiedWorldData();

  await registerHealthRoutes(app, {
    version: options.version ?? "0.1.0",
    commit: options.commit ?? "dev",
    builtAt: options.builtAt ?? new Date().toISOString(),
    placesLoaded: options.placesLoaded ?? world.dataset.places.length,
    geminiConfigured: Boolean(options.geminiApiKey && options.geminiApiKey.length > 0),
    mapsConfigured: Boolean(options.mapsBrowserKey && options.mapsBrowserKey.length > 0),
  });

  await registerConfigRoutes(app, {
    mapsBrowserKey: options.mapsBrowserKey ?? "",
    mapId: options.mapId,
    featureFlags: options.featureFlags,
  });

  await registerPlacesRoutes(app, world);

  const kitHooks = await registerKitRoutes(app, {
    worldData: world,
    geminiApiKey: options.geminiApiKey,
    mapsServerKey: options.mapsServerKey,
    mapsBrowserKey: options.mapsBrowserKey,
    routeMatrixFetcher: options.routeMatrixFetcher,
    summaryRunner: options.kitSummaryRunner,
    ttsRunner: options.ttsRunner,
    log,
  });

  await registerWorldRoutes(app, {
    worldData: world,
    geminiApiKey: options.geminiApiKey,
    runner: options.worldRunner,
    fallbackPlans: options.fallbackPlans,
    onPlanReady: (plan, reqId) => {
      kitHooks.prewarmOfficeCommutes(plan.officePlaceId, plan.recommendedNeighbourhoods, reqId);
    },
    log,
  });

  await registerLiveTokenRoutes(app, {
    worldData: world,
    geminiApiKey: options.geminiApiKey,
    minter: options.liveTokenMinter,
    onPhraseSelected: (phraseId, reqId) => {
      kitHooks.prewarmPhraseAudio(phraseId, reqId);
    },
    log,
  });

  await registerScoreRoutes(app, {
    worldData: world,
    geminiApiKey: options.geminiApiKey,
    runner: options.decisionRunner,
    log,
  });

  const webDist = options.webDistPath ?? defaultWebDist;
  const hasBuiltWeb = existsSync(path.join(webDist, "index.html"));

  if (hasBuiltWeb) {
    await app.register(fastifyStatic, { root: webDist, prefix: "/", wildcard: false });
  }

  app.setNotFoundHandler({ preHandler: app.rateLimit() }, async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.status(404).send(
        createApiError("NOT_FOUND", "That API endpoint does not exist, so check the request path.", false, request.id),
      );
    }
    if (hasBuiltWeb && (request.method === "GET" || request.method === "HEAD")) {
      return reply.sendFile("index.html");
    }
    return reply.status(404).send(
      createApiError("WEB_NOT_BUILT", "Web assets are not built yet, so run npm run build first.", false, request.id),
    );
  });

  return app;
}
