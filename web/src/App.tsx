/**
 * Feature: Phase 2 ORR World, Office Picker & Director HUD Root Shell (web/src/App.tsx)
 * Purpose: Coordinates runtime config, verified ORR places, skippable camera tour, office selection, and SSE Week One generation.
 * Inputs: /api/config, /api/places, POST /api/world SSE stream, and persisted localStorage preferences.
 * Outputs: Interactive ORR Neon Dusk map stage with OfficePicker, ProgressChips, WeekProgressBar, and MissionCard.
 * Deliberately excludes: Client-side API keys or unverified fallback places.
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
import { MissionCard } from "./hud/MissionCard";
import { ProgressChips } from "./hud/ProgressChips";
import { useDirectorStream } from "./hud/useDirectorStream";
import { WeekProgressBar } from "./hud/WeekProgressBar";
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
    geometry: { type: "LineString", coordinates: [[77.7011, 12.9569], [77.6238, 12.9177]] },
  },
};

/**
 * Root Apna Area application shell for Phase 2.
 *
 * @returns Full-viewport interactive map, office picker, and Week One HUD.
 */
export function App(): JSX.Element {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => loadPlayerPreferences());
  const [config, setConfig] = useState<PublicConfigData>(FALLBACK_CONFIG);
  const [world, setWorld] = useState<PlacesPayload>(EMPTY_WORLD);
  const [worldReady, setWorldReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeMissionIndex, setActiveMissionIndex] = useState(0);
  const { director, buildWeek, cancelGeneration, clearWeek } = useDirectorStream();

  const [tourActive, setTourActive] = useState<boolean>(() => {
    const reduced = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const initial = loadPlayerPreferences();
    return !reduced && !initial.tourCompleted && initial.selectedOfficeId === null;
  });

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

  const placesById = useMemo(() => new Map(world.places.map((p) => [p.id, p])), [world.places]);
  const techParks = useMemo(() => world.places.filter((p) => p.category === "tech_park"), [world.places]);
  const selectedOffice = useMemo(
    () => techParks.find((p) => p.id === prefs.selectedOfficeId) ?? null,
    [techParks, prefs.selectedOfficeId],
  );
  const handleFinishTour = useCallback(() => {
    setTourActive(false);
    setPrefs(savePlayerPreferences({ tourCompleted: true }));
  }, []);

  const handleSelectOffice = useCallback(
    (placeId: string) => {
      setTourActive(false);
      clearWeek();
      setActiveMissionIndex(0);
      setPrefs(savePlayerPreferences({ selectedOfficeId: placeId, tourCompleted: true }));
    },
    [clearWeek],
  );

  const handleClearOffice = useCallback(() => {
    clearWeek();
    setActiveMissionIndex(0);
    setPrefs(savePlayerPreferences({ selectedOfficeId: null }));
  }, [clearWeek]);

  const handleBuildWeek = useCallback(() => {
    if (!selectedOffice) return;
    setActiveMissionIndex(0);
    void buildWeek({ officePlaceId: selectedOffice.id, languageComfort: prefs.languageComfort, budgetBand: prefs.budgetBand });
  }, [selectedOffice, prefs.languageComfort, prefs.budgetBand, buildWeek]);
  const activeMissionPlace = useMemo(() => {
    if (!director.weekPlan) return undefined;
    const m = director.weekPlan.missions[activeMissionIndex] ?? director.weekPlan.missions[0];
    return m ? placesById.get(m.placeId) : undefined;
  }, [director.weekPlan, activeMissionIndex, placesById]);
  const bannerMessage = loadError ?? director.errorMessage;

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
        weekPlan={director.weekPlan}
        activeMissionIndex={activeMissionIndex}
        onSelectMission={setActiveMissionIndex}
        tourActive={tourActive}
        onFinishTour={handleFinishTour}
      />

      <header className="shell-topbar">
        <div className="wordmark-pill" data-testid="wordmark">
          <span>Apna Area</span>
        </div>

        {!tourActive && director.status === "week_ready" && director.weekPlan && (
          <WeekProgressBar
            weekPlan={director.weekPlan}
            activeMissionIndex={activeMissionIndex}
            onSelectMission={setActiveMissionIndex}
          />
        )}

        <div className="topbar-actions">
          {!tourActive && (
            <TunePopover
              budgetBand={prefs.budgetBand}
              languageComfort={prefs.languageComfort}
              enabledLanguages={config.enabledLanguages}
              onChangeBudget={(budgetBand: BudgetBand) => setPrefs(savePlayerPreferences({ budgetBand }))}
              onChangeLanguageComfort={(languageComfort: LanguageComfort) =>
                setPrefs(savePlayerPreferences({ languageComfort }))
              }
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
          {bannerMessage && (
            <div className="error-banner" role="alert">
              {bannerMessage}
            </div>
          )}

          {director.status === "generating" && selectedOffice ? (
            <ProgressChips
              officeName={selectedOffice.name}
              items={director.chips}
              onCancel={cancelGeneration}
            />
          ) : director.status === "week_ready" && director.weekPlan && selectedOffice ? (
            <MissionCard
              weekPlan={director.weekPlan}
              activeMissionIndex={activeMissionIndex}
              office={selectedOffice}
              missionPlace={activeMissionPlace}
              replayed={director.replayed}
              enableVoiceNpcs={config.featureFlags.enableVoiceNpcs}
              onSelectMission={setActiveMissionIndex}
              onSwitchOffice={handleClearOffice}
            />
          ) : (
            <OfficePicker
              techParks={techParks}
              selectedOffice={selectedOffice}
              onSelectOffice={handleSelectOffice}
              onClearOffice={handleClearOffice}
              onBuildWeek={handleBuildWeek}
              placesReady={worldReady}
            />
          )}
        </main>
      )}
    </div>
  );
}
