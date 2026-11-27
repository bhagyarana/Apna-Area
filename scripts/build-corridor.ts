/**
 * Feature: Build-Time ORR Corridor Builder (scripts/build-corridor.ts)
 * Purpose: Computes the driving route along Bengaluru's eastern ORR from Marathahalli to Silk Board via Google Routes API v2 and writes data/orr/corridor.geojson.
 * Inputs: MAPS_SERVER_KEY from .env.local or .env.
 * Outputs: Validated GeoJSON LineString Feature in data/orr/corridor.geojson.
 * Deliberately excludes: Hand-drawn or unverified road coordinates.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  fetchWithRetry,
  GeoJSONLineStringFeatureSchema,
  logger,
  TIMEOUTS_MS,
} from "@apna-area/shared";
import { decodeGooglePolyline } from "../server/src/places/filter.js";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const apiKey = process.env.MAPS_SERVER_KEY || process.env.MAPS_BROWSER_KEY;
if (!apiKey) {
  throw new Error("MAPS_SERVER_KEY is required in .env.local or .env to build corridor.geojson.");
}

const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

async function main(): Promise<void> {
  const response = await fetchWithRetry(ROUTES_ENDPOINT, {
    method: "POST",
    timeoutMs: TIMEOUTS_MS.routesMatrix,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey as string,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.polyline.encodedPolyline",
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
    },
    body: JSON.stringify({
      origin: {
        location: { latLng: { latitude: 12.9569, longitude: 77.7011 } }, // Marathahalli Bridge
      },
      intermediates: [
        {
          via: true,
          location: { latLng: { latitude: 12.9392, longitude: 77.6953 } }, // Kadubeesanahalli ORR
        },
        {
          via: true,
          location: { latLng: { latitude: 12.926, longitude: 77.6762 } }, // Bellandur ORR
        },
        {
          via: true,
          location: { latLng: { latitude: 12.9212, longitude: 77.6455 } }, // Agara ORR
        },
      ],
      destination: {
        location: { latLng: { latitude: 12.9177, longitude: 77.6238 } }, // Silk Board Junction
      },
      travelMode: "DRIVE",
      polylineQuality: "HIGH_QUALITY",
      units: "METRIC",
      languageCode: "en-IN",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Routes API HTTP ${response.status}: ${errBody.slice(0, 240)}`);
  }

  const json = (await response.json()) as {
    routes?: Array<{ distanceMeters?: number; polyline?: { encodedPolyline?: string } }>;
  };
  const route = json.routes?.[0];
  const encoded = route?.polyline?.encodedPolyline;
  if (!encoded) {
    throw new Error("Routes API returned no encodedPolyline for the ORR corridor.");
  }

  const coordinates = decodeGooglePolyline(encoded);
  const feature = GeoJSONLineStringFeatureSchema.parse({
    type: "Feature",
    properties: {
      generatedAt: new Date().toISOString(),
      distanceMeters: route.distanceMeters ?? 0,
      source: "Google Routes API v2",
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  });

  const outDir = path.resolve("data/orr");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "corridor.geojson"), `${JSON.stringify(feature, null, 2)}\n`, "utf-8");

  logger.info("build_corridor.completed", {
    meta: {
      pointCount: coordinates.length,
      distanceMeters: feature.properties.distanceMeters,
    },
  });
}

main().catch((err: unknown) => {
  logger.error("build_corridor.failed", {
    meta: { error: err instanceof Error ? err.message : String(err) },
  });
  process.exit(1);
});
