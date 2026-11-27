/**
 * Feature: Phase 1 ORR World & Office Picker Root Shell
 * Purpose: Loads runtime config + verified ORR places with timeout/retry, runs the skippable corridor tour on first visit, and coordinates map + office selection.
 * Inputs: /api/config and /api/places responses plus persisted localStorage preferences.
 * Outputs: Interactive ORR Neon Dusk map stage and keyboard-accessible office picker.
 * Deliberately excludes: Gemini calls, missions, voice sessions, or mocked fallback places.
 */
import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MAP_ID,
  ENABLED_LANGUAGES,
  fetchWithRetry,
  ORR_BBOX,
  PlacesPayloadSchema,
  PublicConfigDataSchema,
  TIMEOUTS_MS,
  type PlacesPayload,
  type PublicConfigData,
} from "@apna-area/shared";
import { HealthBadge } from "./components/HealthBadge";
import { OrrMap } from "./map/OrrMap";
import { OfficePicker } from "./picker/OfficePicker";
import { TunePopover } from "./picker/TunePopover";
import {
  loadPlayerPreferences,
  savePlayerPreferences,
  type BudgetBand,
  type LanguageComfort,
  type PlayerPreferences,
} from "./state/sessionStore";

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

/**
 * Root Apna Area application shell for Phase 1.
 *
 * @returns Full-viewport interactive map and office picker view.
 */
export function App(): JSX.Element {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => loadPlayerPreferences());
  const [config, setConfig] = useState<PublicConfigData>(FALLBACK_CONFIG);
  const [world, setWorld] = useState<PlacesPayload>(EMPTY_WORLD);
  const [worldReady, setWorldReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tourActive, setTourActive] = useState<boolean>(() => {
    const reduced =
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const initial = loadPlayerPreferences();
    return !reduced && !initial.tourCompleted && initial.selectedOfficeId === null;
  });

  useEffect(() => {
    let unmounted = false;
    const controller = new AbortController();

    Promise.all([
      fetchWithRetry("/api/config", {
        signal: controller.signal,
        timeoutMs: TIMEOUTS_MS.healthCheck,
      }).then((r) => r.json()),
      fetchWithRetry("/api/places", {
        signal: controller.signal,
        timeoutMs: TIMEOUTS_MS.healthCheck,
      }).then((r) => r.json()),
    ])
      .then(([cfgJson, placesJson]: [unknown, unknown]) => {
        if (unmounted) {
          return;
        }
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
        } else {
          setLoadError("Could not load verified Outer Ring Road places, so refresh to retry.");
        }
      })
      .catch(() => {
        if (!unmounted && !controller.signal.aborted) {
          setLoadError("You appear to be offline, so reconnect and refresh to load the map.");
        }
      });

    return () => {
      unmounted = true;
      controller.abort();
    };
  }, []);

  const techParks = useMemo(
    () => world.places.filter((p) => p.category === "tech_park"),
    [world.places],
  );

  const selectedOffice = useMemo(
    () => techParks.find((p) => p.id === prefs.selectedOfficeId) ?? null,
    [techParks, prefs.selectedOfficeId],
  );

  const handleFinishTour = useCallback(() => {
    setTourActive(false);
    setPrefs(savePlayerPreferences({ tourCompleted: true }));
  }, []);

  const handleSelectOffice = useCallback((placeId: string) => {
    setTourActive(false);
    setPrefs(savePlayerPreferences({ selectedOfficeId: placeId, tourCompleted: true }));
  }, []);

  const handleClearOffice = useCallback(() => {
    setPrefs(savePlayerPreferences({ selectedOfficeId: null }));
  }, []);

  const handleChangeBudget = useCallback((budgetBand: BudgetBand) => {
    setPrefs(savePlayerPreferences({ budgetBand }));
  }, []);

  const handleChangeLanguage = useCallback((languageComfort: LanguageComfort) => {
    setPrefs(savePlayerPreferences({ languageComfort }));
  }, []);

  return (
    <div className="shell-stage">
      <OrrMap
        mapsBrowserKey={config.mapsBrowserKey}
        mapId={config.mapId}
        orrBbox={config.orrBbox}
        places={world.places}
        corridor={world.corridor}
        selectedOffice={selectedOffice}
        onSelectOffice={handleSelectOffice}
        tourActive={tourActive}
        onFinishTour={handleFinishTour}
      />

      <header className="shell-topbar">
        <div className="wordmark-pill" data-testid="wordmark">
          <span>Apna Area</span>
        </div>

        <div className="topbar-actions">
          {!tourActive && (
            <TunePopover
              budgetBand={prefs.budgetBand}
              languageComfort={prefs.languageComfort}
              enabledLanguages={config.enabledLanguages}
              onChangeBudget={handleChangeBudget}
              onChangeLanguageComfort={handleChangeLanguage}
            />
          )}
          <HealthBadge />
        </div>
      </header>

      {tourActive ? (
        <div className="sr-only" data-testid="tagline">
          Play your first week before it happens.
        </div>
      ) : (
        <main className="shell-main">
          {loadError && (
            <div className="error-banner" role="alert">
              {loadError}
            </div>
          )}
          <OfficePicker
            techParks={techParks}
            selectedOffice={selectedOffice}
            onSelectOffice={handleSelectOffice}
            onClearOffice={handleClearOffice}
            placesReady={worldReady}
          />
        </main>
      )}
    </div>
  );
}
