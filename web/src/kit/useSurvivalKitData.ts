/**
 * Feature: Survival Kit Fetch & Retry Hook (web/src/kit/useSurvivalKitData.ts)
 * Purpose: Loads POST /api/kit with fetchWithRetry, AbortController cleanup, Zod validation, and structured warning logs.
 * Inputs: Verified office ID, budgetBand, optional recommendedNeighbourhoods, missionStars, and learnedPhraseIds.
 * Outputs: Typed { kit, loading, errorMessage, retry } state.
 * Deliberately excludes: UI rendering or external navigation.
 */
import { useCallback, useEffect, useState } from "react";
import {
  fetchWithRetry,
  KitPayloadSchema,
  logger,
  type ApiResult,
  type BudgetBand,
  type KitPayload,
  type MissionId,
  type RecommendedNeighbourhood,
} from "@apna-area/shared";

export interface UseSurvivalKitDataParams {
  officePlaceId: string;
  budgetBand: BudgetBand;
  recommendedNeighbourhoods?: readonly RecommendedNeighbourhood[];
  missionStars: Readonly<Record<string, number>>;
  learnedPhraseIds: readonly string[];
}

export interface SurvivalKitDataState {
  kit: KitPayload | null;
  loading: boolean;
  errorMessage: string | null;
  retry: () => void;
}

/**
 * Fetches and validates the player's Survival Kit payload for the chosen ORR office.
 *
 * @param params - Verified office ID, player preferences, and completed progress.
 * @returns Validated KitPayload, loading flag, error message, and retry trigger.
 */
export function useSurvivalKitData({
  officePlaceId,
  budgetBand,
  recommendedNeighbourhoods,
  missionStars,
  learnedPhraseIds,
}: UseSurvivalKitDataParams): SurvivalKitDataState {
  const [kit, setKit] = useState<KitPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrorMessage(null);

    const completedMissionIds = Object.keys(missionStars).filter((k): k is MissionId =>
      ["m1", "m2", "m3", "m4", "m5"].includes(k),
    );

    fetchWithRetry("/api/kit", {
      method: "POST",
      timeoutMs: 15_000,
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        officePlaceId,
        budgetBand,
        recommendedNeighbourhoods,
        completedMissionIds,
        learnedPhraseIds,
      }),
    })
      .then(async (res) => {
        const body = (await res.json()) as ApiResult<KitPayload>;
        if (!res.ok || !body.ok) {
          throw new Error(
            !body.ok ? body.error.message : "Could not build your Survival Kit right now.",
          );
        }
        setKit(KitPayloadSchema.parse(body.data));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        logger.warn("kit.load_failed", {
          meta: { officeId: officePlaceId, error: err instanceof Error ? err.message : String(err) },
        });
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Could not load commute data right now, so tap Retry in a moment.",
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [officePlaceId, budgetBand, learnedPhraseIds, missionStars, recommendedNeighbourhoods, reloadNonce]);

  const retry = useCallback(() => setReloadNonce((n) => n + 1), []);

  return { kit, loading, errorMessage, retry };
}
