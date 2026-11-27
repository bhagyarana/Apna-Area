/**
 * Feature: Public Runtime Config Route (GET /api/config)
 * Purpose: Delivers referrer-restricted Maps browser configuration, ORR bounds, and feature flags to the web app.
 * Inputs: Public-safe runtime options resolved on server boot.
 * Outputs: Validated ApiSuccess<PublicConfigData> JSON response.
 * Deliberately excludes: GEMINI_API_KEY, MAPS_SERVER_KEY, or any server-only credentials.
 */
import type { FastifyInstance } from "fastify";
import {
  createApiSuccess,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MAP_ID,
  ENABLED_LANGUAGES,
  ORR_BBOX,
  PublicConfigDataSchema,
  type FeatureFlags,
  type PublicConfigData,
} from "@apna-area/shared";

export interface PublicRuntimeOptions {
  mapsBrowserKey: string;
  mapId?: string;
  featureFlags?: Partial<FeatureFlags>;
}

/**
 * Registers GET /api/config on the Fastify instance.
 *
 * @param app - Fastify server instance.
 * @param options - Referrer-restricted browser key, Cloud Map ID, and feature flag overrides.
 */
export async function registerConfigRoutes(
  app: FastifyInstance,
  options: PublicRuntimeOptions,
): Promise<void> {
  app.get("/api/config", async (request, reply) => {
    reply.header("Cache-Control", "public, max-age=60");
    const payload: PublicConfigData = PublicConfigDataSchema.parse({
      mapsBrowserKey: options.mapsBrowserKey,
      mapId: options.mapId && options.mapId.length > 0 ? options.mapId : DEFAULT_MAP_ID,
      enabledLanguages: [...ENABLED_LANGUAGES],
      orrBbox: ORR_BBOX,
      featureFlags: {
        ...DEFAULT_FEATURE_FLAGS,
        ...options.featureFlags,
      },
    });
    return createApiSuccess(payload, request.id);
  });
}
