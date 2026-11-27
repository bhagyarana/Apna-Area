/**
 * Feature: Phase 3a ORR World, Director & Live Voice Mission Root Shell (web/src/App.tsx)
 * Purpose: Coordinates world bootstrap, skippable camera tour, office picker, SSE Week One generation, and Live Voice NPC missions.
 * Inputs: useWorldBootstrap state, useDirectorStream SSE state, and persisted localStorage preferences.
 * Outputs: Interactive ORR Neon Dusk map stage with OfficePicker, ProgressChips, WeekProgressBar, MissionCard, and MissionDialog.
 * Deliberately excludes: Client-side API keys or unverified fallback places.
 */
import { lazy, Suspense, useCallback, useMemo, useState, type JSX } from "react";
import { resolveComfortLanguage, type DifficultyState, type SurvivalPhrase } from "@apna-area/shared";
import { HealthBadge } from "./components/HealthBadge";
import { MissionCard } from "./hud/MissionCard";
import { PhrasebookPill } from "./hud/PhraseFlyCard";
import { ProgressChips } from "./hud/ProgressChips";
import { useDirectorStream } from "./hud/useDirectorStream";
import { WeekProgressBar } from "./hud/WeekProgressBar";
import { OrrMap } from "./map/OrrMap";
import { OfficePicker } from "./picker/OfficePicker";
import { TunePopover } from "./picker/TunePopover";
import {
  loadPlayerPreferences,
  recordLearnedPhraseId,
  savePlayerPreferences,
  type BudgetBand,
  type LanguageComfort,
  type PlayerPreferences,
} from "./state/sessionStore";
import { useWorldBootstrap } from "./state/useWorldBootstrap";

const LazyMissionDialog = lazy(() =>
  import("./live/MissionDialog").then((m) => ({ default: m.MissionDialog })),
);

const INITIAL_DIFFICULTY: DifficultyState = {
  localLanguageShare: 0,
  hintLevel: 2,
  paceSeconds: 90,
};

/**
 * Root Apna Area application shell.
 *
 * @returns Full-viewport interactive map, office picker, Week One HUD, and Live Voice Mission stage.
 */
export function App(): JSX.Element {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => loadPlayerPreferences());
  const { config, world, worldReady, loadError } = useWorldBootstrap();
  const [activeMissionIndex, setActiveMissionIndex] = useState(0);
  const [inVoiceMission, setInVoiceMission] = useState(false);
  const [phrasePulse, setPhrasePulse] = useState(false);
  const { director, buildWeek, cancelGeneration, clearWeek } = useDirectorStream();

  const [tourActive, setTourActive] = useState<boolean>(() => {
    const reduced =
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const initial = loadPlayerPreferences();
    return !reduced && !initial.tourCompleted && initial.selectedOfficeId === null;
  });

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
      setInVoiceMission(false);
      clearWeek();
      setActiveMissionIndex(0);
      setPrefs(savePlayerPreferences({ selectedOfficeId: placeId, tourCompleted: true }));
    },
    [clearWeek],
  );

  const handleClearOffice = useCallback(() => {
    setInVoiceMission(false);
    clearWeek();
    setActiveMissionIndex(0);
    setPrefs(savePlayerPreferences({ selectedOfficeId: null }));
  }, [clearWeek]);

  const handleBuildWeek = useCallback(() => {
    if (!selectedOffice) return;
    setActiveMissionIndex(0);
    setInVoiceMission(false);
    void buildWeek({
      officePlaceId: selectedOffice.id,
      languageComfort: prefs.languageComfort,
      budgetBand: prefs.budgetBand,
    });
  }, [selectedOffice, prefs.languageComfort, prefs.budgetBand, buildWeek]);

  const activeMissionPlace = useMemo(() => {
    if (!director.weekPlan) return undefined;
    const m = director.weekPlan.missions[activeMissionIndex] ?? director.weekPlan.missions[0];
    return m ? placesById.get(m.placeId) : undefined;
  }, [director.weekPlan, activeMissionIndex, placesById]);

  const handlePhraseMastered = useCallback((phrase: SurvivalPhrase) => {
    setPrefs(recordLearnedPhraseId(phrase.id));
    setPhrasePulse(true);
    window.setTimeout(() => setPhrasePulse(false), 620);
  }, []);

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
        inVoiceMission={inVoiceMission}
        onSelectMission={(idx) => {
          setInVoiceMission(false);
          setActiveMissionIndex(idx);
        }}
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
            inVoiceMission={inVoiceMission}
            onSelectMission={(idx) => {
              setInVoiceMission(false);
              setActiveMissionIndex(idx);
            }}
          />
        )}

        <div className="topbar-actions">
          {!tourActive && config.enabledLanguages.includes("kn") && (
            <PhrasebookPill count={prefs.learnedPhraseIds.length} pulse={phrasePulse} />
          )}
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
      ) : inVoiceMission && director.weekPlan && selectedOffice && activeMissionPlace ? (
        <Suspense fallback={null}>
          <LazyMissionDialog
            mission={director.weekPlan.missions[activeMissionIndex] ?? director.weekPlan.missions[0]!}
            missionIndex={activeMissionIndex}
            office={selectedOffice}
            missionPlace={activeMissionPlace}
            difficulty={INITIAL_DIFFICULTY}
            activeLanguage={resolveComfortLanguage(prefs.languageComfort, config.enabledLanguages)}
            languageComfort={prefs.languageComfort}
            onPhraseMastered={handlePhraseMastered}
            onExitMission={() => setInVoiceMission(false)}
            onAdvanceNextMission={() => {
              setInVoiceMission(false);
              setActiveMissionIndex((prev) => (prev + 1) % director.weekPlan!.missions.length);
            }}
          />
        </Suspense>
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
              onStartVoiceMission={() => setInVoiceMission(true)}
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
