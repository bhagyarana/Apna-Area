/**
 * Feature: Phase 5 ORR World, Director, Voice NPC, Adaptive Score & Survival Kit Shell (web/src/App.tsx)
 * Purpose: Coordinates world bootstrap, skippable camera tour, office picker, Week One generation, Live NPC missions, adaptive scoring, Lyria ambience, and Survival Kit.
 * Inputs: useWorldBootstrap state, useDirectorStream SSE state, useAdaptiveProgress state, and useShellStage state.
 * Outputs: Interactive ORR Neon Dusk map stage with TopbarChrome, StageRouter, Voice Ribbon, and Survival Kit peak screen.
 * Deliberately excludes: Client-side API keys or unconfirmed external exits.
 */
import { lazy, Suspense, useMemo, useState, type JSX } from "react";
import { resolveComfortLanguage, type MissionMood } from "@apna-area/shared";
import { ambientAudio } from "./audio/ambient";
import { useAmbientSync } from "./audio/useAmbientSync";
import { StageRouter } from "./hud/StageRouter";
import { TopbarChrome } from "./hud/TopbarChrome";
import { useDirectorStream } from "./hud/useDirectorStream";
import { OrrMap } from "./map/OrrMap";
import { useAdaptiveProgress } from "./score/useAdaptiveProgress";
import {
  loadPlayerPreferences,
  savePlayerPreferences,
  toggleChecklistItem,
  type PlayerPreferences,
} from "./state/sessionStore";
import { useShellStage } from "./state/useShellStage";
import { useWorldBootstrap } from "./state/useWorldBootstrap";

const LazyMissionDialog = lazy(() =>
  import("./live/MissionDialog").then((m) => ({ default: m.MissionDialog })),
);
const LazySurvivalKit = lazy(() =>
  import("./kit/SurvivalKit").then((m) => ({ default: m.SurvivalKit })),
);

/**
 * Root Apna Area application shell.
 *
 * @returns Full-viewport interactive map, office picker, Week One HUD, Voice stage, Result card, and Survival Kit.
 */
export function App(): JSX.Element {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => loadPlayerPreferences());
  const { config, world, worldReady, loadError } = useWorldBootstrap();
  const { director, buildWeek, cancelGeneration, clearWeek } = useDirectorStream();
  const {
    resultState,
    effectiveNextDifficulty,
    effectiveSummary,
    scoreCompletedTurn,
    selectOverride,
    clearResult,
    resetAdaptiveWeek,
  } = useAdaptiveProgress(prefs, setPrefs, config.enabledLanguages);

  const placesById = useMemo(() => new Map(world.places.map((p) => [p.id, p])), [world.places]);
  const techParks = useMemo(
    () => world.places.filter((p) => p.category === "tech_park"),
    [world.places],
  );
  const selectedOffice = useMemo(
    () => techParks.find((p) => p.id === prefs.selectedOfficeId) ?? null,
    [techParks, prefs.selectedOfficeId],
  );

  const stage = useShellStage({
    prefs,
    setPrefs,
    selectedOfficeId: selectedOffice?.id ?? null,
    buildWeek,
    clearWeek,
    clearResult,
    resetAdaptiveWeek,
    scoreCompletedTurn,
  });

  const activeMission =
    director.weekPlan?.missions[stage.activeMissionIndex] ?? director.weekPlan?.missions[0];
  const activeMissionPlace = activeMission ? placesById.get(activeMission.placeId) : undefined;
  const activeMood: MissionMood = stage.kitOpen ? "evening" : (activeMission?.mood ?? "calm");

  useAmbientSync({
    enabled: config.featureFlags.enableAmbientMusic,
    mood: activeMood,
    ducked: stage.inVoiceMission,
    muted: prefs.musicMuted,
  });

  const totalStars = useMemo(
    () => Object.values(prefs.missionStars).reduce<number>((sum, val) => sum + val, 0),
    [prefs.missionStars],
  );
  const canOpenKit =
    config.featureFlags.enableSurvivalKit &&
    Boolean(selectedOffice) &&
    (director.status === "week_ready" || prefs.learnedPhraseIds.length > 0);
  const showXpHud =
    !stage.tourActive &&
    config.featureFlags.enableAdaptiveScoring &&
    ((director.status === "week_ready" && !stage.kitOpen) || prefs.totalXp > 0);
  const missions = director.weekPlan?.missions ?? [];

  return (
    <div className={stage.kitOpen ? "shell-stage shell-stage-kit" : "shell-stage"}>
      <OrrMap
        mapsBrowserKey={config.mapsBrowserKey}
        mapId={config.mapId}
        orrBbox={config.orrBbox}
        places={world.places}
        corridor={world.corridor}
        selectedOffice={selectedOffice}
        onSelectOffice={stage.handleSelectOffice}
        weekPlan={director.weekPlan}
        activeMissionIndex={stage.activeMissionIndex}
        inVoiceMission={stage.inVoiceMission}
        onSelectMission={stage.selectMission}
        tourActive={stage.tourActive}
        onFinishTour={stage.handleFinishTour}
      />

      <TopbarChrome
        tourActive={stage.tourActive}
        kitOpen={stage.kitOpen}
        inVoiceMission={stage.inVoiceMission}
        weekReady={director.status === "week_ready"}
        weekPlan={director.weekPlan}
        activeMissionIndex={stage.activeMissionIndex}
        prefs={prefs}
        totalStars={totalStars}
        phrasePulse={stage.phrasePulse}
        canOpenKit={canOpenKit}
        showXpHud={showXpHud}
        config={config}
        onSelectMission={stage.selectMission}
        onToggleKit={() => stage.setKitOpen((prev) => !prev)}
        onToggleMute={() => {
          if (prefs.musicMuted) {
            ambientAudio.unlockFromUserGesture();
          }
          setPrefs(savePlayerPreferences({ musicMuted: !prefs.musicMuted }));
        }}
        onChangeBudget={(budgetBand) => setPrefs(savePlayerPreferences({ budgetBand }))}
        onChangeLanguageComfort={(languageComfort) =>
          setPrefs(savePlayerPreferences({ languageComfort }))
        }
      />

      {stage.tourActive ? (
        <div className="sr-only" data-testid="tagline">
          Play your first week before it happens.
        </div>
      ) : stage.kitOpen && selectedOffice ? (
        <Suspense fallback={null}>
          <LazySurvivalKit
            office={selectedOffice}
            weekPlan={director.weekPlan}
            prefs={prefs}
            onToggleChecklist={(id) => setPrefs(toggleChecklistItem(id))}
            onBackToMap={() => stage.setKitOpen(false)}
          />
        </Suspense>
      ) : stage.inVoiceMission &&
        director.weekPlan &&
        selectedOffice &&
        activeMission &&
        activeMissionPlace ? (
        <Suspense fallback={null}>
          <LazyMissionDialog
            mission={activeMission}
            missionIndex={stage.activeMissionIndex}
            office={selectedOffice}
            missionPlace={activeMissionPlace}
            difficulty={prefs.difficulty}
            activeLanguage={resolveComfortLanguage(prefs.languageComfort, config.enabledLanguages)}
            languageComfort={prefs.languageComfort}
            onPhraseMastered={stage.handlePhraseMastered}
            onMissionCompleted={
              config.featureFlags.enableAdaptiveScoring ? stage.handleMissionCompleted : undefined
            }
            onExitMission={() => stage.setInVoiceMission(false)}
            onAdvanceNextMission={() =>
              stage.selectMission((stage.activeMissionIndex + 1) % missions.length)
            }
          />
        </Suspense>
      ) : (
        <StageRouter
          bannerMessage={loadError ?? director.errorMessage}
          directorStatus={director.status}
          directorChips={director.chips}
          directorReplayed={director.replayed}
          weekPlan={director.weekPlan}
          techParks={techParks}
          selectedOffice={selectedOffice}
          activeMissionIndex={stage.activeMissionIndex}
          activeMissionPlace={activeMissionPlace}
          worldReady={worldReady}
          enableVoiceNpcs={config.featureFlags.enableVoiceNpcs}
          canOpenKit={canOpenKit}
          enabledLanguages={config.enabledLanguages}
          resultState={resultState}
          effectiveNextDifficulty={effectiveNextDifficulty}
          effectiveSummary={effectiveSummary}
          onCancelGeneration={cancelGeneration}
          onSelectOverride={selectOverride}
          onReplayMission={() => {
            clearResult();
            stage.setInVoiceMission(true);
          }}
          onContinueNextStop={() =>
            stage.selectMission((stage.activeMissionIndex + 1) % missions.length)
          }
          onOpenKit={() => stage.setKitOpen(true)}
          onSelectMissionIndex={stage.setActiveMissionIndex}
          onSelectOffice={stage.handleSelectOffice}
          onClearOffice={stage.handleClearOffice}
          onBuildWeek={stage.handleBuildWeek}
          onStartVoiceMission={() => stage.setInVoiceMission(true)}
        />
      )}
    </div>
  );
}
