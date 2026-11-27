/**
 * Feature: Shell Stage Navigation & Preferences Hook (web/src/state/useShellStage.ts)
 * Purpose: Encapsulates camera tour, office selection, Week One mission index, voice mission, phrase pulse, and Survival Kit open state.
 * Inputs: Clear/build/reset callbacks from useDirectorStream and useAdaptiveProgress.
 * Outputs: Typed stage state and memoized handlers consumed by App.tsx.
 * Deliberately excludes: Direct DOM queries or network transport calls.
 */
import { useCallback, useState } from "react";
import type { SurvivalPhrase } from "@apna-area/shared";
import type { BuildWeekParams } from "../hud/useDirectorStream";
import type { CompletedMissionTurn } from "../score/useAdaptiveProgress";
import {
  loadPlayerPreferences,
  recordLearnedPhraseId,
  savePlayerPreferences,
  type PlayerPreferences,
} from "./sessionStore";

export interface UseShellStageParams {
  prefs: PlayerPreferences;
  setPrefs: (next: PlayerPreferences) => void;
  selectedOfficeId: string | null;
  buildWeek: (params: BuildWeekParams) => Promise<void>;
  clearWeek: () => void;
  clearResult: () => void;
  resetAdaptiveWeek: () => void;
  scoreCompletedTurn: (turn: CompletedMissionTurn) => Promise<void>;
}

export interface ShellStageController {
  tourActive: boolean;
  activeMissionIndex: number;
  inVoiceMission: boolean;
  kitOpen: boolean;
  phrasePulse: boolean;
  setActiveMissionIndex: (idx: number) => void;
  setInVoiceMission: (open: boolean) => void;
  setKitOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  handleFinishTour: () => void;
  handleSelectOffice: (placeId: string) => void;
  handleClearOffice: () => void;
  handleBuildWeek: () => void;
  selectMission: (idx: number) => void;
  handlePhraseMastered: (phrase: SurvivalPhrase) => void;
  handleMissionCompleted: (turn: CompletedMissionTurn) => void;
}

/**
 * Manages root game stage transitions across Tour, Picker, Director, Live Voice, Result Card, and Survival Kit.
 *
 * @param params - Persisted preferences, selected office ID, and Director/Adaptive callbacks.
 * @returns ShellStageController state and handlers.
 */
export function useShellStage({
  prefs,
  setPrefs,
  selectedOfficeId,
  buildWeek,
  clearWeek,
  clearResult,
  resetAdaptiveWeek,
  scoreCompletedTurn,
}: UseShellStageParams): ShellStageController {
  const [activeMissionIndex, setActiveMissionIndex] = useState(0);
  const [inVoiceMission, setInVoiceMission] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [phrasePulse, setPhrasePulse] = useState(false);

  const [tourActive, setTourActive] = useState<boolean>(() => {
    const reduced =
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const initial = loadPlayerPreferences();
    return !reduced && !initial.tourCompleted && initial.selectedOfficeId === null;
  });

  const handleFinishTour = useCallback(() => {
    setTourActive(false);
    setPrefs(savePlayerPreferences({ tourCompleted: true }));
  }, [setPrefs]);

  const handleSelectOffice = useCallback(
    (placeId: string) => {
      setTourActive(false);
      setInVoiceMission(false);
      setKitOpen(false);
      clearWeek();
      resetAdaptiveWeek();
      setActiveMissionIndex(0);
      setPrefs(savePlayerPreferences({ selectedOfficeId: placeId, tourCompleted: true }));
    },
    [clearWeek, resetAdaptiveWeek, setPrefs],
  );

  const handleClearOffice = useCallback(() => {
    setInVoiceMission(false);
    setKitOpen(false);
    clearWeek();
    resetAdaptiveWeek();
    setActiveMissionIndex(0);
    setPrefs(savePlayerPreferences({ selectedOfficeId: null }));
  }, [clearWeek, resetAdaptiveWeek, setPrefs]);

  const handleBuildWeek = useCallback(() => {
    if (!selectedOfficeId) return;
    setActiveMissionIndex(0);
    setInVoiceMission(false);
    setKitOpen(false);
    resetAdaptiveWeek();
    void buildWeek({
      officePlaceId: selectedOfficeId,
      languageComfort: prefs.languageComfort,
      budgetBand: prefs.budgetBand,
    });
  }, [selectedOfficeId, prefs.languageComfort, prefs.budgetBand, buildWeek, resetAdaptiveWeek]);

  const selectMission = useCallback(
    (idx: number) => {
      setInVoiceMission(false);
      setKitOpen(false);
      clearResult();
      setActiveMissionIndex(idx);
    },
    [clearResult],
  );

  const handlePhraseMastered = useCallback(
    (phrase: SurvivalPhrase) => {
      setPrefs(recordLearnedPhraseId(phrase.id));
      setPhrasePulse(true);
      window.setTimeout(() => setPhrasePulse(false), 620);
    },
    [setPrefs],
  );

  const handleMissionCompleted = useCallback(
    (turn: CompletedMissionTurn) => {
      setInVoiceMission(false);
      void scoreCompletedTurn(turn);
    },
    [scoreCompletedTurn],
  );

  return {
    tourActive,
    activeMissionIndex,
    inVoiceMission,
    kitOpen,
    phrasePulse,
    setActiveMissionIndex,
    setInVoiceMission,
    setKitOpen,
    handleFinishTour,
    handleSelectOffice,
    handleClearOffice,
    handleBuildWeek,
    selectMission,
    handlePhraseMastered,
    handleMissionCompleted,
  };
}
