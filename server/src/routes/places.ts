/**
 * Feature: Verified World Data Loader & GET /api/places Route
 * Purpose: Loads verified ORR places.json and corridor.geojson once at boot and serves optional category-filtered views.
 * Inputs: Optional ?category= query parameter validated with PlaceCategorySchema.
 * Outputs: Validated ApiSuccess<PlacesPayload> or typed 400 error on invalid category.
 * Deliberately excludes: Live Google Places queries per visitor (all places are pre-verified in data/orr/places.json).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import {
  createApiError,
  createApiSuccess,
  GeoJSONLineStringFeatureSchema,
  ORR_BBOX,
  PlaceCategorySchema,
  PlacesPayloadSchema,
  VerifiedPlacesDatasetSchema,
  type GeoJSONLineStringFeature,
  type VerifiedPlacesDataset,
} from "@apna-area/shared";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.resolve(currentDir, "../../../data/orr");

export interface LoadedWorldData {
  dataset: VerifiedPlacesDataset;
  corridor: GeoJSONLineStringFeature;
}

const emptyFallbackWorld: LoadedWorldData = {
  dataset: {
    verifiedAt: new Date(0).toISOString(),
    bbox: ORR_BBOX,
    totalCount: 0,
    places: [],
  },
  corridor: {
    type: "Feature",
    properties: {
      generatedAt: new Date(0).toISOString(),
      distanceMeters: 0,
      source: "uninitialised",
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [77.7011, 12.9569],
        [77.6238, 12.9177],
      ],
    },
  },
};

/**
 * Loads and schema-validates data/orr/places.json and data/orr/corridor.geojson from disk.
 *
 * @param dataDir - Directory containing places.json and corridor.geojson.
 * @returns Frozen world dataset and corridor feature.
 * @throws SyntaxError or ZodError if JSON files exist on disk with invalid syntax or schema.
 */
export function loadVerifiedWorldData(dataDir: string = defaultDataDir): LoadedWorldData {
  const placesPath = path.join(dataDir, "places.json");
  const corridorPath = path.join(dataDir, "corridor.geojson");
  if (!existsSync(placesPath) || !existsSync(corridorPath)) {
    return emptyFallbackWorld;
  }
  const rawPlaces = JSON.parse(readFileSync(placesPath, "utf-8")) as unknown;
  const rawCorridor = JSON.parse(readFileSync(corridorPath, "utf-8")) as unknown;
  return {
    dataset: VerifiedPlacesDatasetSchema.parse(rawPlaces),
    corridor: GeoJSONLineStringFeatureSchema.parse(rawCorridor),
  };
}

/**
 * Registers GET /api/places on the Fastify instance.
 *
 * @param app - Fastify server instance.
 * @param world - Pre-validated world dataset and corridor LineString.
 * @returns Promise resolving once the route is registered.
 */
export async function registerPlacesRoutes(
  app: FastifyInstance,
  world: LoadedWorldData,
): Promise<void> {
  app.get<{ Querystring: { category?: string } }>("/api/places", async (request, reply) => {
    const rawCategory = request.query.category;
    let filtered = world.dataset.places;

    if (rawCategory !== undefined && rawCategory.length > 0) {
      const parsedCat = PlaceCategorySchema.safeParse(rawCategory);
      if (!parsedCat.success) {
        return reply
          .status(400)
          .send(
            createApiError(
              "INVALID_CATEGORY",
              "Unknown place category filter, so choose a supported ORR category.",
              false,
              request.id,
            ),
          );
      }
      filtered = filtered.filter((p) => p.category === parsedCat.data);
    }

    reply.header("Cache-Control", "public, max-age=300");
    const payload = PlacesPayloadSchema.parse({
      places: filtered,
      corridor: world.corridor,
      verifiedAt: world.dataset.verifiedAt,
    });
    return createApiSuccess(payload, request.id);
  });
}
