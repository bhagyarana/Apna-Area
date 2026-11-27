/**
 * Feature: Main HUD Stage Router (web/src/hud/StageRouter.tsx)
 * Purpose: Routes the primary left-rail / mobile-sheet HUD panel across OfficePicker, ProgressChips, MissionCard, and MissionResultCard.
 * Inputs: World bootstrap ready flag, Director stream state, Adaptive result state, and action callbacks.
 * Outputs: Accessible <main className="shell-main"> surface.
 * Deliberately excludes: Full-screen modals or voice WebSocket state.
 */
import type { JSX } from "react";
import type {
  DifficultyOverrideMode,
  DifficultyState,
  LanguageCode,
  Mission,
  ScoreData,
  VerifiedPlace,
  WeekPlan,
} from "@apna-area/shared";
import { OfficePicker } from "../picker/OfficePicker";
import { MissionResultCard } from "../score/MissionResultCard";
import { MissionCard } from "./MissionCard";
import { ProgressChips } from "./ProgressChips";
import type { ProgressChipItem } from "./useDirectorStream";

export interface StageRouterProps {
  bannerMessage: string | null;
  directorStatus: "idle" | "generating" | "week_ready" | "error";
  directorChips: readonly ProgressChipItem[];
  directorReplayed: boolean;
  weekPlan: WeekPlan | null;
  techParks: readonly VerifiedPlace[];
  selectedOffice: VerifiedPlace | null;
  activeMissionIndex: number;
  activeMissionPlace: VerifiedPlace | undefined;
  worldReady: boolean;
  enableVoiceNpcs: boolean;
  canOpenKit: boolean;
  enabledLanguages: readonly LanguageCode[];
  resultState: {
    mission: Mission;
    completionSummary: string;
    loading: boolean;
    scoreData: ScoreData | null;
    overrideMode: DifficultyOverrideMode | null;
  } | null;
  effectiveNextDifficulty: DifficultyState;
  effectiveSummary: string;
  onCancelGeneration: () => void;
  onSelectOverride: (mode: DifficultyOverrideMode) => void;
  onReplayMission: () => void;
  onContinueNextStop: () => void;
  onOpenKit: () => void;
  onSelectMissionIndex: (idx: number) => void;
  onSelectOffice: (placeId: string) => void;
  onClearOffice: () => void;
  onBuildWeek: () => void;
  onStartVoiceMission: () => void;
}

/**
 * Renders the primary HUD card for the current non-voice, non-kit game stage.
 *
 * @param props - Active world, director, and adaptive score state plus handlers.
 * @returns Accessible <main className="shell-main"> container.
 */
export function StageRouter({
  bannerMessage,
  directorStatus,
  directorChips,
  directorReplayed,
  weekPlan,
  techParks,
  selectedOffice,
  activeMissionIndex,
  activeMissionPlace,
  worldReady,
  enableVoiceNpcs,
  canOpenKit,
  enabledLanguages,
  resultState,
  effectiveNextDifficulty,
  effectiveSummary,
  onCancelGeneration,
  onSelectOverride,
  onReplayMission,
  onContinueNextStop,
  onOpenKit,
  onSelectMissionIndex,
  onSelectOffice,
  onClearOffice,
  onBuildWeek,
  onStartVoiceMission,
}: StageRouterProps): JSX.Element {
  const missions = weekPlan?.missions ?? [];

  return (
    <main className="shell-main">
      {bannerMessage && (
        <div className="error-banner" role="alert">
          {bannerMessage}
        </div>
      )}
      {directorStatus === "generating" && selectedOffice ? (
        <ProgressChips
          officeName={selectedOffice.name}
          items={directorChips}
          onCancel={onCancelGeneration}
        />
      ) : resultState && weekPlan ? (
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
          enabledLanguages={enabledLanguages}
          onSelectOverride={onSelectOverride}
          onReplayMission={onReplayMission}
          onContinueNextStop={onContinueNextStop}
          onOpenKit={canOpenKit ? onOpenKit : undefined}
        />
      ) : directorStatus === "week_ready" && weekPlan && selectedOffice ? (
        <MissionCard
          weekPlan={weekPlan}
          activeMissionIndex={activeMissionIndex}
          office={selectedOffice}
          missionPlace={activeMissionPlace}
          replayed={directorReplayed}
          enableVoiceNpcs={enableVoiceNpcs}
          onSelectMission={onSelectMissionIndex}
          onSwitchOffice={onClearOffice}
          onStartVoiceMission={onStartVoiceMission}
        />
      ) : (
        <OfficePicker
          techParks={techParks}
          selectedOffice={selectedOffice}
          onSelectOffice={onSelectOffice}
          onClearOffice={onClearOffice}
          onBuildWeek={onBuildWeek}
          placesReady={worldReady}
        />
      )}
    </main>
  );
}
