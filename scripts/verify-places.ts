/**
 * Feature: Build-Time ORR Places Verifier (scripts/verify-places.ts)
 * Purpose: Queries Google Maps Places API (New) Text Search strictly inside ORR_BBOX using Pro SKU field masks, drops closed/unbuilt entries, and writes data/orr/places.json.
 * Inputs: MAPS_SERVER_KEY from .env.local or .env (never exposed to browser or git).
 * Outputs: Verified data/orr/places.json and a category/neighbourhood summary report.
 * Deliberately excludes: Invented fallback places or Enterprise/Atmosphere billing fields.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  fetchWithRetry,
  logger,
  ORR_BBOX,
  ORR_NEIGHBOURHOOD_ANCHORS,
  TIMEOUTS_MS,
  VerifiedPlacesDatasetSchema,
  type PlaceCategory,
} from "@apna-area/shared";
import { normaliseAndDedupePlaces, type RawGooglePlace } from "../server/src/places/filter.js";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const apiKey = process.env.MAPS_SERVER_KEY || process.env.MAPS_BROWSER_KEY;
if (!apiKey) {
  throw new Error("MAPS_SERVER_KEY is required in .env.local or .env to verify ORR places.");
}

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const PRO_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.businessStatus",
  "places.googleMapsUri",
].join(",");

const TECH_PARK_SEEDS = [
  "RMZ EcoWorld Bellandur Bengaluru",
  "RMZ Ecospace Bellandur Bengaluru",
  "Embassy TechVillage Devarabisanahalli Bengaluru",
  "Prestige Tech Park Kadubeesanahalli Bengaluru",
  "Cessna Business Park Kadubeesanahalli Bengaluru",
  "Global Technology Park Bellandur Bengaluru",
  "Vaishnavi Tech Park Sarjapur Outer Ring Road Bengaluru",
  "Bagmane Constellation Business Park Marathahalli ORR Bengaluru",
];

const CATEGORY_TEMPLATES: ReadonlyArray<{ category: PlaceCategory; term: string; maxCount: number }> = [
  { category: "darshini", term: "Darshini Udupi South Indian breakfast filter coffee", maxCount: 6 },
  { category: "pg_coliving", term: "Coliving PG accommodation hostel", maxCount: 5 },
  { category: "transit_stop", term: "BMTC bus stop auto rickshaw stand", maxCount: 5 },
  { category: "lake_park", term: "Lake park walkway", maxCount: 4 },
  { category: "cafe_daily", term: "Cafe bakery supermarket", maxCount: 4 },
];

async function searchPlacesText(textQuery: string, maxResultCount = 6): Promise<RawGooglePlace[]> {
  const response = await fetchWithRetry(PLACES_ENDPOINT, {
    method: "POST",
    timeoutMs: TIMEOUTS_MS.routesMatrix,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey as string,
      "X-Goog-FieldMask": PRO_FIELD_MASK,
      "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
    },
    body: JSON.stringify({
      textQuery,
      pageSize: maxResultCount,
      regionCode: "IN",
      languageCode: "en",
      locationRestriction: {
        rectangle: {
          low: { latitude: ORR_BBOX.south, longitude: ORR_BBOX.west },
          high: { latitude: ORR_BBOX.north, longitude: ORR_BBOX.east },
        },
      },
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Places API HTTP ${response.status} for "${textQuery}": ${bodyText.slice(0, 240)}`);
  }

  const json = (await response.json()) as { places?: RawGooglePlace[] };
  return json.places ?? [];
}

async function main(): Promise<void> {
  const batches: Array<{ category: PlaceCategory; items: RawGooglePlace[] }> = [];

  for (const seed of TECH_PARK_SEEDS) {
    const items = await searchPlacesText(seed, 3);
    batches.push({ category: "tech_park", items });
  }

  for (const anchor of ORR_NEIGHBOURHOOD_ANCHORS) {
    for (const spec of CATEGORY_TEMPLATES) {
      const query = `${spec.term} near ${anchor.label} Outer Ring Road Bengaluru`;
      const items = await searchPlacesText(query, spec.maxCount);
      batches.push({ category: spec.category, items });
    }
  }

  const verifiedPlaces = normaliseAndDedupePlaces(batches, ORR_BBOX);
  const dataset = VerifiedPlacesDatasetSchema.parse({
    verifiedAt: new Date().toISOString(),
    bbox: ORR_BBOX,
    totalCount: verifiedPlaces.length,
    places: verifiedPlaces,
  });

  const outDir = path.resolve("data/orr");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "places.json"), `${JSON.stringify(dataset, null, 2)}\n`, "utf-8");

  const byCategory: Record<string, number> = {};
  const byNeighbourhood: Record<string, number> = {};
  for (const p of verifiedPlaces) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    byNeighbourhood[p.neighbourhood] = (byNeighbourhood[p.neighbourhood] ?? 0) + 1;
  }

  logger.info("verify_places.completed", {
    meta: {
      totalCount: verifiedPlaces.length,
      byCategory,
      byNeighbourhood,
    },
  });
}

main().catch((err: unknown) => {
  logger.error("verify_places.failed", {
    meta: { error: err instanceof Error ? err.message : String(err) },
  });
  process.exit(1);
});
