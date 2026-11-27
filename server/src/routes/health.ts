/**
 * Feature: Health Check Route (GET /api/health)
 * Purpose: Reports container liveness, build commit/time metadata, and non-token-spending upstream readiness checks.
 * Inputs: Build metadata and environment readiness flags injected at server startup.
 * Outputs: Validated ApiSuccess<HealthData> JSON response.
 * Deliberately excludes: Live upstream LLM calls (never spends quota on health checks) or secret values.
 */
import type { FastifyInstance } from "fastify";
import { createApiSuccess, HealthDataSchema, type HealthData } from "@apna-area/shared";

export interface BuildMetadata {
  version: string;
  commit: string;
  builtAt: string;
  placesLoaded: number;
  geminiConfigured: boolean;
  mapsConfigured: boolean;
  mapsServerConfigured?: boolean;
  phrasesLoaded?: number;
  fallbackPlansLoaded?: number;
}

/**
 * Registers GET /api/health on the Fastify instance.
 *
 * @param app - Fastify server instance.
 * @param meta - Immutable build and upstream configuration metadata.
 */
export async function registerHealthRoutes(
  app: FastifyInstance,
  meta: BuildMetadata,
): Promise<void> {
  const payload: HealthData = HealthDataSchema.parse({
    status: "ok",
    version: meta.version,
    commit: meta.commit,
    builtAt: meta.builtAt,
    upstreams: {
      placesLoaded: meta.placesLoaded,
      geminiConfigured: meta.geminiConfigured,
      mapsConfigured: meta.mapsConfigured,
      ...(meta.mapsServerConfigured !== undefined
        ? { mapsServerConfigured: meta.mapsServerConfigured }
        : {}),
      ...(meta.phrasesLoaded !== undefined ? { phrasesLoaded: meta.phrasesLoaded } : {}),
      ...(meta.fallbackPlansLoaded !== undefined
        ? { fallbackPlansLoaded: meta.fallbackPlansLoaded }
        : {}),
    },
  });

  app.get("/api/health", async (request) => {
    return createApiSuccess(payload, request.id);
  });
}
