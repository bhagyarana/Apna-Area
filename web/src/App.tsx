/**
 * Feature: Phase 4 ORR World, Director, Voice NPC & Adaptive Score Shell (web/src/App.tsx)
 * Purpose: Coordinates world bootstrap, skippable camera tour, office picker, Week One generation, Live NPC missions, and adaptive scoring.
 * Inputs: useWorldBootstrap state, useDirectorStream SSE state, useAdaptiveProgress state, and persisted localStorage preferences.
 * Outputs: Interactive ORR Neon Dusk map stage with XpCounter, WeekProgressBar, MissionCard, MissionDialog, and MissionResultCard.
 * Deliberately excludes: Client-side API keys or unverified fallback places.
 */
import { lazy, Suspense, useCallback, useMemo, useState, type JSX } from "react";
import { resolveComfortLanguage, type SurvivalPhrase } from "@apna-area/shared";
import { HealthBadge } from "./components/HealthBadge";
import { MissionCard } from "./hud/MissionCard";
import { PhrasebookPill } from "./hud/PhraseFlyCard";
import { ProgressChips } from "./hud/ProgressChips";
import { useDirectorStream } from "./hud/useDirectorStream";
import { WeekProgressBar } from "./hud/WeekProgressBar";
import { XpCounter } from "./hud/XpCounter";
import { OrrMap } from "./map/OrrMap";
import { OfficePicker } from "./picker/OfficePicker";
import { TunePopover } from "./picker/TunePopover";
import { MissionResultCard } from "./score/MissionResultCard";
import { useAdaptiveProgress, type CompletedMissionTurn } from "./score/useAdaptiveProgress";
import { loadPlayerPreferences, recordLearnedPhraseId, savePlayerPreferences, type BudgetBand, type LanguageComfort, type PlayerPreferences } from "./state/sessionStore";
import { useWorldBootstrap } from "./state/useWorldBootstrap";

const LazyMissionDialog = lazy(() => import("./live/MissionDialog").then((m) => ({ default: m.MissionDialog })));

/**
 * Root Apna Area application shell.
 *
 * @returns Full-viewport interactive map, office picker, Week One HUD, Voice stage, and Adaptive Result card.
 */
export function App(): JSX.Element {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => loadPlayerPreferences());
  const { config, world, worldReady, loadError } = useWorldBootstrap();
  const [activeMissionIndex, setActiveMissionIndex] = useState(0);
  const [inVoiceMission, setInVoiceMission] = useState(false);
  const [phrasePulse, setPhrasePulse] = useState(false);
  const { director, buildWeek, cancelGeneration, clearWeek } = useDirectorStream();
  const { resultState, effectiveNextDifficulty, effectiveSummary, scoreCompletedTurn, selectOverride, clearResult, resetAdaptiveWeek } =
    useAdaptiveProgress(prefs, setPrefs, config.enabledLanguages);

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
      resetAdaptiveWeek();
      setActiveMissionIndex(0);
      setPrefs(savePlayerPreferences({ selectedOfficeId: placeId, tourCompleted: true }));
    },
    [clearWeek, resetAdaptiveWeek],
  );

  const handleClearOffice = useCallback(() => {
    setInVoiceMission(false);
    clearWeek();
    resetAdaptiveWeek();
    setActiveMissionIndex(0);
    setPrefs(savePlayerPreferences({ selectedOfficeId: null }));
  }, [clearWeek, resetAdaptiveWeek]);

  const handleBuildWeek = useCallback(() => {
    if (!selectedOffice) return;
    setActiveMissionIndex(0);
    setInVoiceMission(false);
    resetAdaptiveWeek();
    void buildWeek({
      officePlaceId: selectedOffice.id,
      languageComfort: prefs.languageComfort,
      budgetBand: prefs.budgetBand,
    });
  }, [selectedOffice, prefs.languageComfort, prefs.budgetBand, buildWeek, resetAdaptiveWeek]);

  const selectMission = useCallback(
    (idx: number) => {
      setInVoiceMission(false);
      clearResult();
      setActiveMissionIndex(idx);
    },
    [clearResult],
  );

  const activeMission = director.weekPlan?.missions[activeMissionIndex] ?? director.weekPlan?.missions[0];
  const activeMissionPlace = activeMission ? placesById.get(activeMission.placeId) : undefined;
  const totalStars = useMemo(
    () => Object.values(prefs.missionStars).reduce<number>((sum, val) => sum + val, 0),
    [prefs.missionStars],
  );

  const handlePhraseMastered = useCallback((phrase: SurvivalPhrase) => {
    setPrefs(recordLearnedPhraseId(phrase.id));
    setPhrasePulse(true);
    window.setTimeout(() => setPhrasePulse(false), 620);
  }, []);

  const handleMissionCompleted = useCallback(
    (turn: CompletedMissionTurn) => {
      setInVoiceMission(false);
      void scoreCompletedTurn(turn);
    },
    [scoreCompletedTurn],
  );

  const showXpHud =
    !tourActive &&
    config.featureFlags.enableAdaptiveScoring &&
    (director.status === "week_ready" || prefs.totalXp > 0);
  const bannerMessage = loadError ?? director.errorMessage;
  const missions = director.weekPlan?.missions ?? [];

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
        onSelectMission={selectMission}
        tourActive={tourActive}
        onFinishTour={handleFinishTour}
      />

      <header className="shell-topbar">
        <div className="wordmark-pill" data-testid="wordmark"><span>Apna Area</span></div>
        {!tourActive && director.status === "week_ready" && director.weekPlan && (
          <WeekProgressBar
            weekPlan={director.weekPlan}
            activeMissionIndex={activeMissionIndex}
            completedMissions={prefs.missionStars}
            inVoiceMission={inVoiceMission}
            onSelectMission={selectMission}
          />
        )}
        <div className="topbar-actions">
          {showXpHud && <XpCounter totalXp={prefs.totalXp} totalStars={totalStars} />}
          {!tourActive && config.enabledLanguages.includes("kn") && (
            <PhrasebookPill count={prefs.learnedPhraseIds.length} pulse={phrasePulse} />
          )}
          {!tourActive && (
            <TunePopover
              budgetBand={prefs.budgetBand}
              languageComfort={prefs.languageComfort}
              enabledLanguages={config.enabledLanguages}
              onChangeBudget={(budgetBand: BudgetBand) => setPrefs(savePlayerPreferences({ budgetBand }))}
              onChangeLanguageComfort={(languageComfort: LanguageComfort) => setPrefs(savePlayerPreferences({ languageComfort }))}
            />
          )}
          <HealthBadge />
        </div>
      </header>

      {tourActive ? (
        <div className="sr-only" data-testid="tagline">Play your first week before it happens.</div>
      ) : inVoiceMission && director.weekPlan && selectedOffice && activeMission && activeMissionPlace ? (
        <Suspense fallback={null}>
          <LazyMissionDialog
            mission={activeMission}
            missionIndex={activeMissionIndex}
            office={selectedOffice}
            missionPlace={activeMissionPlace}
            difficulty={prefs.difficulty}
            activeLanguage={resolveComfortLanguage(prefs.languageComfort, config.enabledLanguages)}
            languageComfort={prefs.languageComfort}
            onPhraseMastered={handlePhraseMastered}
            onMissionCompleted={config.featureFlags.enableAdaptiveScoring ? handleMissionCompleted : undefined}
            onExitMission={() => setInVoiceMission(false)}
            onAdvanceNextMission={() => selectMission((activeMissionIndex + 1) % missions.length)}
          />
        </Suspense>
      ) : (
        <main className="shell-main">
          {bannerMessage && <div className="error-banner" role="alert">{bannerMessage}</div>}
          {director.status === "generating" && selectedOffice ? (
            <ProgressChips officeName={selectedOffice.name} items={director.chips} onCancel={cancelGeneration} />
          ) : resultState && director.weekPlan ? (
            <MissionResultCard
              mission={resultState.mission}
              missionIndex={activeMissionIndex}
              totalMissions={missions.length}
              nextMissionDay={missions[(activeMissionIndex + 1) % missions.length]!.day}
              missionPlace={activeMissionPlace}
              completionSummary={resultState.completionSummary}
              scoringLoading={resultState.loading}
              scoreData={resultState.scoreData}
              effectiveNextDifficulty={effectiveNextDifficulty}
              effectiveSummary={effectiveSummary}
              overrideMode={resultState.overrideMode}
              enabledLanguages={config.enabledLanguages}
              onSelectOverride={selectOverride}
              onReplayMission={() => { clearResult(); setInVoiceMission(true); }}
              onContinueNextStop={() => selectMission((activeMissionIndex + 1) % missions.length)}
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
