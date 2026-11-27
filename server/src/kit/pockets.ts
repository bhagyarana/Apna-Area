/**
 * Feature: Candidate ORR Neighbourhood Pocket Resolver & Commute Cache (server/src/kit/pockets.ts)
 * Purpose: Selects 3 verified residential/corridor pockets near a chosen ORR office, parses Routes API durations, and maintains the 6h TTL cache.
 * Inputs: Verified office place, full verified places dataset, and optional WeekPlan recommendedNeighbourhoods.
 * Outputs: Ordered pocket coordinates/IDs, parsed integer minutes, and bounded CommuteCache.
 * Deliberately excludes: HTTP transport calls.
 */
import {
  KIT_CONFIG,
  ORR_NEIGHBOURHOOD_ANCHORS,
  type MondayIstWindow,
  type NeighbourhoodCommute,
  type NeighbourhoodId,
  type RecommendedNeighbourhood,
  type VerifiedPlace,
} from "@apna-area/shared";

export interface RouteMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  condition?: string;
  status?: { code?: number; message?: string };
}

export type RawNeighbourhoodCommute = Omit<NeighbourhoodCommute, "oneLine">;

export interface CommuteCacheEntry {
  expiresAtMs: number;
  mondayWindow: MondayIstWindow;
  items: RawNeighbourhoodCommute[];
}

export interface CommuteCache {
  get: (key: string) => CommuteCacheEntry | undefined;
  set: (key: string, value: CommuteCacheEntry) => void;
  inflight: Map<string, Promise<{ mondayWindow: MondayIstWindow; items: RawNeighbourhoodCommute[] }>>;
}

/**
 * Creates a bounded in-memory TTL cache with in-flight request coalescing for office commute matrices.
 *
 * @returns CommuteCache instance.
 */
export function createCommuteCache(): CommuteCache {
  const store = new Map<string, CommuteCacheEntry>();
  return {
    get(key: string): CommuteCacheEntry | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() > hit.expiresAtMs) {
        store.delete(key);
        return undefined;
      }
      return hit;
    },
    set(key: string, value: CommuteCacheEntry): void {
      if (store.size >= KIT_CONFIG.commuteCacheMaxEntries && !store.has(key)) {
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) store.delete(oldestKey);
      }
      store.set(key, value);
    },
    inflight: new Map(),
  };
}

/**
 * Computes straight-line distance in kilometres rounded to 1 decimal place.
 *
 * @param lat1 - Origin latitude.
 * @param lng1 - Origin longitude.
 * @param lat2 - Destination latitude.
 * @param lng2 - Destination longitude.
 * @returns Distance in kilometres.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

/**
 * Parses a Routes API duration string (such as "1680s") into rounded minutes when condition === "ROUTE_EXISTS".
 *
 * @param el - RouteMatrixElement from computeRouteMatrix.
 * @returns Integer minutes (>= 1) or null if unavailable.
 */
export function parseDurationMinutes(el: RouteMatrixElement | undefined): number | null {
  if (!el || el.condition !== "ROUTE_EXISTS" || (el.status?.code && el.status.code !== 0)) {
    return null;
  }
  const match = /^(\d+(?:\.\d+)?)s$/.exec(el.duration ?? "");
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(1, Math.round(seconds / 60));
}

export interface CandidatePocket {
  neighbourhoodId: NeighbourhoodId;
  areaName: string;
  fitReason: string;
  originName: string;
  originPlaceId?: string;
  lat: number;
  lng: number;
}

/**
 * Resolves 3 candidate residential pockets for an office strictly from verified ORR places and anchors.
 *
 * @param office - Verified target office place.
 * @param places - Full verified ORR dataset.
 * @param recommended - Optional Director recommendedNeighbourhoods list.
 * @returns Array of 3 CandidatePockets.
 */
export function resolveCandidatePockets(
  office: VerifiedPlace,
  places: readonly VerifiedPlace[],
  recommended?: readonly RecommendedNeighbourhood[],
): CandidatePocket[] {
  const anchorById = new Map(ORR_NEIGHBOURHOOD_ANCHORS.map((a) => [a.id, a]));
  const chosen: RecommendedNeighbourhood[] =
    recommended && recommended.length > 0
      ? [...recommended.slice(0, KIT_CONFIG.defaultNeighbourhoodCount)]
      : [...ORR_NEIGHBOURHOOD_ANCHORS]
          .filter((a) => a.id !== "silk_board")
          .sort(
            (a, b) =>
              haversineKm(office.lat, office.lng, a.lat, a.lng) -
              haversineKm(office.lat, office.lng, b.lat, b.lng),
          )
          .slice(0, KIT_CONFIG.defaultNeighbourhoodCount)
          .map((a) => ({
            neighbourhoodId: a.id,
            fitReason: `Connected directly to ${office.neighbourhood} along the Outer Ring Road corridor.`,
          }));

  return chosen.map((rec) => {
    const anchor = anchorById.get(rec.neighbourhoodId) ?? ORR_NEIGHBOURHOOD_ANCHORS[3]!;
    const hoodToken = anchor.label.split("&")[0]!.trim().toLowerCase();
    const residentialMatch = places.find(
      (p) =>
        p.id !== office.id &&
        (p.category === "pg_coliving" || p.category === "darshini" || p.category === "transit_stop") &&
        p.neighbourhood.toLowerCase().includes(hoodToken.slice(0, 6)),
    );

    return {
      neighbourhoodId: rec.neighbourhoodId,
      areaName: anchor.label,
      fitReason: rec.fitReason,
      originName: residentialMatch?.name ?? anchor.label,
      originPlaceId: residentialMatch?.id,
      lat: residentialMatch?.lat ?? anchor.lat,
      lng: residentialMatch?.lng ?? anchor.lng,
    };
  });
}
