/**
 * Feature: Deterministic ORR Candidate Place Selector (server/src/world/candidates.ts)
 * Purpose: Selects verified non-office places near a chosen ORR tech park (3 km primary, 5 km fallback) with balanced category coverage.
 * Inputs: Target officePlaceId and the frozen VerifiedPlace array loaded from data/orr/places.json.
 * Outputs: Typed { ok, data | error } result containing the office, sorted CandidatePlace list, and radius used.
 * Deliberately excludes: Live Places API calls or non-deterministic random shuffling.
 */
import {
  DIRECTOR_CONFIG,
  ORR_BBOX,
  SAFETY_LIMITS,
  type BoundingBox,
  type PlaceCategory,
  type VerifiedPlace,
} from "@apna-area/shared";
import { haversineKm, isWithinBoundingBox } from "../places/filter.js";

export interface CandidatePlace extends VerifiedPlace {
  readonly distanceKm: number;
}

export interface CandidateSelection {
  readonly office: VerifiedPlace;
  readonly candidates: readonly CandidatePlace[];
  readonly radiusUsedKm: number;
}

export type CandidateSelectionResult =
  | { ok: true; data: CandidateSelection }
  | { ok: false; error: string };

const MISSION_CATEGORIES: readonly PlaceCategory[] = [
  "darshini",
  "pg_coliving",
  "transit_stop",
  "cafe_daily",
  "lake_park",
];

function sortByDistanceAndId(a: CandidatePlace, b: CandidatePlace): number {
  if (a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }
  return a.id.localeCompare(b.id);
}

function hasAllAvailableCategories(
  subset: readonly CandidatePlace[],
  universe: readonly CandidatePlace[],
): boolean {
  for (const cat of MISSION_CATEGORIES) {
    const existsInUniverse = universe.some((p) => p.category === cat);
    if (existsInUniverse && !subset.some((p) => p.category === cat)) {
      return false;
    }
  }
  return true;
}

function capBalancedCandidates(
  pool: readonly CandidatePlace[],
  maxCount: number,
): CandidatePlace[] {
  if (pool.length <= maxCount) {
    return [...pool].sort(sortByDistanceAndId);
  }

  const buckets = new Map<PlaceCategory, CandidatePlace[]>();
  for (const cat of MISSION_CATEGORIES) {
    buckets.set(
      cat,
      pool.filter((p) => p.category === cat).sort(sortByDistanceAndId),
    );
  }

  const picked = new Map<string, CandidatePlace>();
  let addedInRound = true;
  while (picked.size < maxCount && addedInRound) {
    addedInRound = false;
    for (const cat of MISSION_CATEGORIES) {
      if (picked.size >= maxCount) {
        break;
      }
      const list = buckets.get(cat);
      const next = list?.shift();
      if (next && !picked.has(next.id)) {
        picked.set(next.id, next);
        addedInRound = true;
      }
    }
  }

  return [...picked.values()].sort(sortByDistanceAndId);
}

/**
 * Selects verified ORR places near the chosen tech park using a 3.0 km primary radius and 5.0 km fallback.
 *
 * @param officePlaceId - Verified Google Maps place_id of the chosen office.
 * @param allPlaces - All verified places from data/orr/places.json.
 * @param bbox - Bounding rectangle to enforce (defaults to ORR_BBOX).
 * @returns Typed CandidateSelectionResult with deterministically ordered candidates.
 */
export function selectCandidatePlaces(
  officePlaceId: string,
  allPlaces: readonly VerifiedPlace[],
  bbox: BoundingBox = ORR_BBOX,
): CandidateSelectionResult {
  const office = allPlaces.find((p) => p.id === officePlaceId && p.category === "tech_park");
  if (!office) {
    return {
      ok: false,
      error: "Choose a verified Outer Ring Road tech park from the picker.",
    };
  }
  if (!isWithinBoundingBox(office.lat, office.lng, bbox)) {
    return {
      ok: false,
      error: "Selected office lies outside the eastern Outer Ring Road bounds.",
    };
  }

  const eligible: CandidatePlace[] = allPlaces
    .filter(
      (p) =>
        p.id !== office.id &&
        p.category !== "tech_park" &&
        isWithinBoundingBox(p.lat, p.lng, bbox),
    )
    .map((p) => ({
      ...p,
      distanceKm: Number(haversineKm(office.lat, office.lng, p.lat, p.lng).toFixed(2)),
    }))
    .sort(sortByDistanceAndId);

  const withinPrimary = eligible.filter((p) => p.distanceKm <= SAFETY_LIMITS.candidateRadiusKm);
  const primarySufficient =
    withinPrimary.length >= DIRECTOR_CONFIG.minPrimaryCandidates &&
    hasAllAvailableCategories(withinPrimary, eligible);

  let pool: CandidatePlace[];
  let radiusUsedKm: number;

  if (primarySufficient) {
    pool = withinPrimary;
    radiusUsedKm = SAFETY_LIMITS.candidateRadiusKm;
  } else {
    const withinFallback = eligible.filter(
      (p) => p.distanceKm <= SAFETY_LIMITS.candidateFallbackRadiusKm,
    );
    const byId = new Map(withinFallback.map((p) => [p.id, p]));
    for (const cat of MISSION_CATEGORIES) {
      if (![...byId.values()].some((p) => p.category === cat)) {
        const closestInCat = eligible.find((p) => p.category === cat);
        if (closestInCat) {
          byId.set(closestInCat.id, closestInCat);
        }
      }
    }
    pool = [...byId.values()].sort(sortByDistanceAndId);
    radiusUsedKm = SAFETY_LIMITS.candidateFallbackRadiusKm;
  }

  if (pool.length < 5) {
    return {
      ok: false,
      error: "Not enough verified places near this office to build a 5-stop week.",
    };
  }

  return {
    ok: true,
    data: {
      office,
      candidates: capBalancedCandidates(pool, DIRECTOR_CONFIG.maxPromptCandidates),
      radiusUsedKm,
    },
  };
}
