/**
 * Feature: Routes API v2 Commute Matrix Aggregator & Pre-Warmer (server/src/kit/commute.ts)
 * Purpose: Computes Monday 09:00 and 18:30 IST commute times (DRIVE, TWO_WHEELER, TRANSIT) from 3 verified ORR pockets to the chosen office via Google Routes API computeRouteMatrix.
 * Inputs: Verified office place, verified places dataset, optional recommendedNeighbourhoods, and server Maps API key.
 * Outputs: Cached array of RawNeighbourhoodCommute records with real durations, distances, and Google Maps Directions URLs.
 * Deliberately excludes: Estimating or inventing commute durations with an LLM.
 */
import {
  buildGoogleMapsDirectionsUrl,
  computeNextMondayIstTimestamps,
  createLogger,
  fetchWithRetry,
  KIT_CONFIG,
  TIMEOUTS_MS,
  type KitTravelMode,
  type MondayIstWindow,
  type RecommendedNeighbourhood,
  type VerifiedPlace,
} from "@apna-area/shared";
import {
  createCommuteCache,
  haversineKm,
  parseDurationMinutes,
  resolveCandidatePockets,
  type CommuteCache,
  type RawNeighbourhoodCommute,
  type RouteMatrixElement,
} from "./pockets.js";

export { createCommuteCache, type CommuteCache, type RawNeighbourhoodCommute, type RouteMatrixElement };

const ROUTE_MATRIX_ENDPOINT = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const ROUTE_MATRIX_FIELD_MASK =
  "originIndex,destinationIndex,duration,distanceMeters,status,condition";

export interface RouteMatrixCallInput {
  origins: ReadonlyArray<{ lat: number; lng: number }>;
  destination: { lat: number; lng: number };
  travelMode: KitTravelMode;
  departureTimeIso: string;
}

export type RouteMatrixFetcher = (
  input: RouteMatrixCallInput,
) => Promise<readonly RouteMatrixElement[]>;

/**
 * Creates the production Google Routes API v2 computeRouteMatrix HTTP fetcher.
 * Omits routingPreference when travelMode is TRANSIT per Routes API v2 specification.
 *
 * @param apiKey - Server Google Maps API key.
 * @returns RouteMatrixFetcher function.
 */
export function createGoogleRouteMatrixFetcher(apiKey: string): RouteMatrixFetcher {
  return async (input: RouteMatrixCallInput): Promise<readonly RouteMatrixElement[]> => {
    const body: Record<string, unknown> = {
      origins: input.origins.map((pt) => ({
        waypoint: { location: { latLng: { latitude: pt.lat, longitude: pt.lng } } },
      })),
      destinations: [
        {
          waypoint: {
            location: {
              latLng: { latitude: input.destination.lat, longitude: input.destination.lng },
            },
          },
        },
      ],
      travelMode: input.travelMode,
      departureTime: input.departureTimeIso,
      languageCode: "en-IN",
      units: "METRIC",
    };

    if (input.travelMode === "DRIVE" || input.travelMode === "TWO_WHEELER") {
      body.routingPreference = "TRAFFIC_AWARE";
    }

    const res = await fetchWithRetry(ROUTE_MATRIX_ENDPOINT, {
      method: "POST",
      timeoutMs: TIMEOUTS_MS.routesMatrix,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": ROUTE_MATRIX_FIELD_MASK,
        "X-Goog-Maps-Solution-ID": "gmp_git_agentskills_v1",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`computeRouteMatrix ${input.travelMode} HTTP ${res.status}: ${text.slice(0, 180)}`);
    }

    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as RouteMatrixElement[]) : [];
  };
}

/**
 * Computes or returns cached Monday 09:00 and 18:30 IST neighbourhood commutes to a verified ORR office.
 *
 * @param office - Verified target office place.
 * @param places - Full verified ORR places dataset.
 * @param opts - Optional recommended neighbourhoods, Routes fetcher, cache, logger, and nowMs override.
 * @returns Monday window timestamps and raw neighbourhood commute records.
 */
export async function computeOfficeCommutes(
  office: VerifiedPlace,
  places: readonly VerifiedPlace[],
  opts: {
    recommended?: readonly RecommendedNeighbourhood[];
    fetcher?: RouteMatrixFetcher | null;
    cache?: CommuteCache;
    nowMs?: number;
    requestId?: string;
    log?: ReturnType<typeof createLogger>;
  } = {},
): Promise<{ mondayWindow: MondayIstWindow; items: RawNeighbourhoodCommute[] }> {
  const mondayWindow = computeNextMondayIstTimestamps(opts.nowMs);
  const pockets = resolveCandidatePockets(office, places, opts.recommended);
  const cacheKey = `${office.id}:${mondayWindow.dateKey}:${pockets.map((p) => p.neighbourhoodId).join(",")}`;

  const hit = opts.cache?.get(cacheKey);
  if (hit) return { mondayWindow: hit.mondayWindow, items: hit.items };

  const inflight = opts.cache?.inflight.get(cacheKey);
  if (inflight) return inflight;

  const runPromise = (async () => {
    const origins = pockets.map((p) => ({ lat: p.lat, lng: p.lng }));
    const dest = { lat: office.lat, lng: office.lng };
    let driveAm: readonly RouteMatrixElement[] = [];
    let drivePm: readonly RouteMatrixElement[] = [];
    let twoWheelerAm: readonly RouteMatrixElement[] = [];
    let transitAm: readonly RouteMatrixElement[] = [];
    let liveSucceeded = false;

    if (opts.fetcher) {
      const t0 = performance.now();
      const settled = await Promise.allSettled([
        opts.fetcher({ origins, destination: dest, travelMode: "DRIVE", departureTimeIso: mondayWindow.morningIso }),
        opts.fetcher({ origins, destination: dest, travelMode: "DRIVE", departureTimeIso: mondayWindow.eveningIso }),
        opts.fetcher({ origins, destination: dest, travelMode: "TWO_WHEELER", departureTimeIso: mondayWindow.morningIso }),
        opts.fetcher({ origins, destination: dest, travelMode: "TRANSIT", departureTimeIso: mondayWindow.morningIso }),
      ]);

      const errors = settled
        .filter((s): s is PromiseRejectedResult => s.status === "rejected")
        .map((s) => (s.reason instanceof Error ? s.reason.message : String(s.reason)));
      if (errors.length > 0) {
        opts.log?.warn("kit.routes_matrix_degraded", {
          requestId: opts.requestId,
          meta: { officePlaceId: office.id, failedCalls: errors.length, errors },
        });
      }

      driveAm = settled[0].status === "fulfilled" ? settled[0].value : [];
      drivePm = settled[1].status === "fulfilled" ? settled[1].value : [];
      twoWheelerAm = settled[2].status === "fulfilled" ? settled[2].value : [];
      transitAm = settled[3].status === "fulfilled" ? settled[3].value : [];
      liveSucceeded = settled.some((s) => s.status === "fulfilled" && s.value.length > 0);

      opts.log?.info("kit.routes_matrix", {
        requestId: opts.requestId,
        durationMs: performance.now() - t0,
        meta: { officePlaceId: office.id, liveSucceeded, dateKey: mondayWindow.dateKey },
      });
    }

    const byOrigin = (list: readonly RouteMatrixElement[], idx: number) =>
      list.find((el) => (el.originIndex ?? 0) === idx);

    const items: RawNeighbourhoodCommute[] = pockets.map((pocket, idx) => {
      const amEl = byOrigin(driveAm, idx);
      const pmEl = byOrigin(drivePm, idx);
      const twEl = byOrigin(twoWheelerAm, idx);
      const trEl = byOrigin(transitAm, idx);
      const meters = amEl?.distanceMeters ?? twEl?.distanceMeters ?? trEl?.distanceMeters;
      const distanceKm =
        typeof meters === "number" && meters > 0
          ? Math.round((meters / 1000) * 10) / 10
          : Math.max(0.4, haversineKm(pocket.lat, pocket.lng, office.lat, office.lng));

      return {
        neighbourhoodId: pocket.neighbourhoodId,
        areaName: pocket.areaName,
        originPlaceName: pocket.originName,
        ...(pocket.originPlaceId ? { originPlaceId: pocket.originPlaceId } : {}),
        originLat: pocket.lat,
        originLng: pocket.lng,
        distanceKm,
        morningDriveMin: parseDurationMinutes(amEl),
        eveningDriveMin: parseDurationMinutes(pmEl),
        twoWheelerMin: parseDurationMinutes(twEl),
        transitMin: parseDurationMinutes(trEl),
        fitReason: pocket.fitReason,
        mapsDirectionsUri: buildGoogleMapsDirectionsUrl({
          originLat: pocket.lat,
          originLng: pocket.lng,
          originName: pocket.originName,
          originPlaceId: pocket.originPlaceId,
          destinationLat: office.lat,
          destinationLng: office.lng,
          destinationName: office.name,
          destinationPlaceId: office.id,
          travelMode: "driving",
        }),
        commuteSource: liveSucceeded ? "routes_api" : "corridor_unavailable",
      };
    });

    if (liveSucceeded && opts.cache) {
      opts.cache.set(cacheKey, {
        expiresAtMs: Date.now() + KIT_CONFIG.commuteCacheTtlMs,
        mondayWindow,
        items,
      });
    }
    return { mondayWindow, items };
  })();

  opts.cache?.inflight.set(cacheKey, runPromise);
  try {
    return await runPromise;
  } finally {
    opts.cache?.inflight.delete(cacheKey);
  }
}
