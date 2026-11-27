/**
 * Feature: Survival Kit Fetch & Retry Hook (web/src/kit/useSurvivalKitData.ts)
 * Purpose: Loads POST /api/kit with fetchWithRetry, AbortController cleanup, Zod validation, and structured warning logs.
 * Inputs: Verified office ID, budgetBand, optional recommendedNeighbourhoods, missionStars, and learnedPhraseIds.
 * Outputs: Typed { kit, loading, errorMessage, retry } state.
 * Deliberately excludes: UI rendering or external navigation.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchWithRetry,
  KitPayloadSchema,
  logger,
  toUserErrorMessage,
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
  const loadedOfficeRef = useRef<string | null>(null);

  const completedKey = useMemo(
    () =>
      Object.keys(missionStars)
        .filter((k): k is MissionId => ["m1", "m2", "m3", "m4", "m5"].includes(k))
        .sort()
        .join(","),
    [missionStars],
  );
  const learnedKey = useMemo(() => [...learnedPhraseIds].join(","), [learnedPhraseIds]);
  const recommendedKey = useMemo(
    () =>
      recommendedNeighbourhoods
        ? recommendedNeighbourhoods.map((r) => `${r.neighbourhoodId}:${r.fitReason}`).join("|")
        : "",
    [recommendedNeighbourhoods],
  );

  useEffect(() => {
    const controller = new AbortController();
    const officeOrRetryChanged = loadedOfficeRef.current !== `${officePlaceId}:${budgetBand}`;
    if (officeOrRetryChanged || !kit) {
      setLoading(true);
    }
    setErrorMessage(null);

    const completedMissionIds = completedKey
      ? (completedKey.split(",") as MissionId[])
      : ([] as MissionId[]);
    const phraseIds = learnedKey ? learnedKey.split(",") : [];

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
        learnedPhraseIds: phraseIds,
      }),
    })
      .then(async (res) => {
        const body = (await res.json()) as ApiResult<KitPayload>;
        if (!res.ok || !body.ok) {
          throw new Error(
            !body.ok ? body.error.message : "Could not build your Survival Kit right now.",
          );
        }
        const parsed = KitPayloadSchema.parse(body.data);
        loadedOfficeRef.current = `${officePlaceId}:${budgetBand}`;
        setKit(parsed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        logger.warn("kit.load_failed", {
          meta: { officeId: officePlaceId, error: err instanceof Error ? err.message : String(err) },
        });
        setErrorMessage(
          toUserErrorMessage(
            err,
            "Could not load commute data right now, so tap Retry in a moment.",
            "You appear to be offline, so reconnect and tap Retry to load your Survival Kit.",
          ),
        );
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officePlaceId, budgetBand, completedKey, learnedKey, recommendedKey, reloadNonce]);

  const retry = useCallback(() => {
    loadedOfficeRef.current = null;
    setReloadNonce((n) => n + 1);
  }, []);

  return { kit, loading, errorMessage, retry };
}
