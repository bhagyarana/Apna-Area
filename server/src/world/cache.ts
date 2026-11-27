/**
 * Feature: Bounded In-Memory LRU Cache for Director WeekPlans (server/src/world/cache.ts)
 * Purpose: Caches verified WeekPlans per (officePlaceId, languageComfort, budgetBand) for 2 hours to protect API quota and repeat-pick latency.
 * Inputs: WorldRequest key tuple and verified WorldPlanPayload.
 * Outputs: Cached WorldPlanPayload on hit, or null on miss/expiry.
 * Deliberately excludes: Caching error states or unverified outputs.
 */
import { DIRECTOR_CONFIG, type WorldPlanPayload, type WorldRequest } from "@apna-area/shared";

interface CacheRecord {
  payload: WorldPlanPayload;
  expiresAt: number;
}

/**
 * Formats a deterministic cache key for a WorldRequest.
 *
 * @param req - Validated WorldRequest parameters.
 * @returns Composite cache key string.
 */
export function makeWorldCacheKey(req: WorldRequest): string {
  return `${req.officePlaceId}:${req.languageComfort}:${req.budgetBand}`;
}

export interface WorldPlanCache {
  get: (key: string) => WorldPlanPayload | null;
  set: (key: string, payload: WorldPlanPayload) => void;
  size: () => number;
}

/**
 * Creates a bounded TTL + LRU cache for verified WeekPlans.
 *
 * @param maxEntries - Maximum retained entries before evicting least-recently-used key.
 * @param ttlMs - Time-to-live in milliseconds before expiry.
 * @returns WorldPlanCache instance.
 */
export function createWorldPlanCache(
  maxEntries: number = DIRECTOR_CONFIG.lruMaxEntries,
  ttlMs: number = DIRECTOR_CONFIG.lruTtlMs,
): WorldPlanCache {
  const map = new Map<string, CacheRecord>();

  return {
    get(key: string): WorldPlanPayload | null {
      const hit = map.get(key);
      if (!hit) {
        return null;
      }
      if (Date.now() > hit.expiresAt) {
        map.delete(key);
        return null;
      }
      // Refresh LRU position
      map.delete(key);
      map.set(key, hit);
      return hit.payload;
    },

    set(key: string, payload: WorldPlanPayload): void {
      if (map.has(key)) {
        map.delete(key);
      } else if (map.size >= maxEntries) {
        const oldestKey = map.keys().next().value;
        if (oldestKey !== undefined) {
          map.delete(oldestKey);
        }
      }
      map.set(key, {
        payload,
        expiresAt: Date.now() + ttlMs,
      });
    },

    size(): number {
      return map.size;
    },
  };
}
