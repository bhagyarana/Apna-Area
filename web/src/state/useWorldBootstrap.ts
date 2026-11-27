/**
 * Feature: Runtime Config & Verified ORR World Bootstrap Hook (web/src/state/useWorldBootstrap.ts)
 * Purpose: Fetches and Zod-validates /api/config and /api/places once on boot with timeout, retry, and clean abort teardown.
 * Inputs: None (queries relative /api/config and /api/places).
 * Outputs: Validated PublicConfigData, PlacesPayload, worldReady flag, and optional loadError message.
 * Deliberately excludes: Mutating localStorage or initiating Gemini calls.
 */
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MAP_ID,
  ENABLED_LANGUAGES,
  fetchWithRetry,
  ORR_BBOX,
  PlacesPayloadSchema,
  PublicConfigDataSchema,
  TIMEOUTS_MS,
  toUserErrorMessage,
  type PlacesPayload,
  type PublicConfigData,
} from "@apna-area/shared";

const FALLBACK_CONFIG: PublicConfigData = {
  mapsBrowserKey: "",
  mapId: DEFAULT_MAP_ID,
  enabledLanguages: [...ENABLED_LANGUAGES],
  orrBbox: ORR_BBOX,
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
};

const EMPTY_WORLD: PlacesPayload = {
  verifiedAt: "",
  places: [],
  corridor: {
    type: "Feature",
    properties: { generatedAt: "", distanceMeters: 0, source: "loading" },
    geometry: {
      type: "LineString",
      coordinates: [
        [77.7011, 12.9569],
        [77.6238, 12.9177],
      ],
    },
  },
};

export interface WorldBootstrapState {
  config: PublicConfigData;
  world: PlacesPayload;
  worldReady: boolean;
  loadError: string | null;
  retryBootstrap: () => void;
}

/**
 * Loads runtime public config and verified ORR places/corridor on mount, with retry and auto-online recovery.
 *
 * @returns WorldBootstrapState with safe initial fallbacks and retryBootstrap action.
 */
export function useWorldBootstrap(): WorldBootstrapState {
  const [config, setConfig] = useState<PublicConfigData>(FALLBACK_CONFIG);
  const [world, setWorld] = useState<PlacesPayload>(EMPTY_WORLD);
  const [worldReady, setWorldReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const retryBootstrap = useCallback(() => {
    setLoadError(null);
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      if (!worldReady) {
        setLoadError(null);
        setReloadNonce((n) => n + 1);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [worldReady]);

  useEffect(() => {
    let unmounted = false;
    const controller = new AbortController();

    Promise.all([
      fetchWithRetry("/api/config", { signal: controller.signal, timeoutMs: TIMEOUTS_MS.healthCheck }).then((r) =>
        r.json(),
      ),
      fetchWithRetry("/api/places", { signal: controller.signal, timeoutMs: TIMEOUTS_MS.healthCheck }).then((r) =>
        r.json(),
      ),
    ])
      .then(([cfgJson, placesJson]: [unknown, unknown]) => {
        if (unmounted) return;
        const cfgEnv = cfgJson as { ok?: boolean; data?: unknown };
        const parsedCfg = PublicConfigDataSchema.safeParse(cfgEnv.data);
        if (cfgEnv.ok && parsedCfg.success) {
          setConfig(parsedCfg.data);
        }

        const plEnv = placesJson as { ok?: boolean; data?: unknown };
        const parsedPlaces = PlacesPayloadSchema.safeParse(plEnv.data);
        if (plEnv.ok && parsedPlaces.success) {
          setWorld(parsedPlaces.data);
          setWorldReady(true);
          setLoadError(null);
        } else {
          setLoadError("Could not load verified Outer Ring Road places, so tap Retry.");
        }
      })
      .catch((err: unknown) => {
        if (!unmounted && !controller.signal.aborted) {
          setLoadError(
            toUserErrorMessage(
              err,
              "Could not reach the Outer Ring Road map service, so tap Retry.",
              "You appear to be offline, so reconnect and tap Retry to load the map.",
            ),
          );
        }
      });

    return () => {
      unmounted = true;
      controller.abort();
    };
  }, [reloadNonce]);

  return { config, world, worldReady, loadError, retryBootstrap };
}
