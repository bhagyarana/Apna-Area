/**
 * Feature: Client Adaptive Scoring & Difficulty Override Hook (web/src/score/useAdaptiveProgress.ts)
 * Purpose: Submits completed mission turns to POST /api/score, updates persisted XP/stars/difficulty, and handles 1-click overrides.
 * Inputs: Current setPrefs updater and enabled LanguageCode list.
 * Outputs: Active mission result state, scoreCompletedTurn handler, pure override handler, and reset/advance helpers.
 * Deliberately excludes: Persisting raw transcripts anywhere outside transient in-flight request payloads.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyDifficultyOverride,
  buildAdaptationSummary,
  nextDifficulty,
  ScoreDataSchema,
  starsFor,
  TIMEOUTS_MS,
  xpFor,
  type DifficultyOverrideMode,
  type DifficultyState,
  type LanguageCode,
  type LiveToolSignals,
  type Mission,
  type RouteChoice,
  type RubricScores,
  type ScoreData,
  type SurvivalPhrase,
  type TranscriptTurn,
} from "@apna-area/shared";
import {
  DEFAULT_DIFFICULTY,
  loadPlayerPreferences,
  savePlayerPreferences,
  type PlayerPreferences,
} from "../state/sessionStore";

export interface CompletedMissionTurn {
  mission: Mission;
  difficulty: DifficultyState;
  activeLanguage: LanguageCode;
  transcript: readonly TranscriptTurn[];
  toolSignals: LiveToolSignals;
  targetPhrase: SurvivalPhrase | null;
  usedTextFallback: boolean;
}

export interface ActiveMissionResult {
  mission: Mission;
  baseDifficulty: DifficultyState;
  completionSummary: string;
  loading: boolean;
  scoreData: ScoreData | null;
  overrideMode: DifficultyOverrideMode | null;
}

function buildClientFallbackScore(
  turn: CompletedMissionTurn,
  enabledLanguages: readonly LanguageCode[],
): ScoreData {
  const completed = turn.toolSignals.objectiveCompleted;
  const clearPhrase = turn.toolSignals.phraseQuality === "clear";
  const hints = turn.toolSignals.hintsGiven;
  const routeChoice: RouteChoice =
    completed && hints <= 1 ? "step_up" : !completed && hints >= 2 ? "ease_level" : "keep_level";
  const rubric: RubricScores = {
    objectiveProb: completed ? 0.85 : 0.35,
    objectiveScore: completed ? 2.4 : 0.9,
    phraseScore: clearPhrase ? 2.6 : 0.7,
    toneScore: 2.2,
    routeChoice,
    confidence: 0.82,
  };
  const effectiveRoute = routeChoice;
  return {
    missionId: turn.mission.id,
    xpEarned: xpFor(rubric),
    stars: starsFor(rubric),
    objectiveMet: completed,
    effectiveRoute,
    lowConfidenceFallback: false,
    rubric,
    nextDifficulty: nextDifficulty(turn.difficulty, rubric, enabledLanguages),
    adaptationSummary: buildAdaptationSummary(effectiveRoute, false, enabledLanguages),
    modelUsed: "client-fallback",
    fallbackUsed: true,
    durationMs: 0,
  };
}

/** Coordinates POST /api/score evaluation, XP/star odometer updates, and 1-click player pace overrides. */
export function useAdaptiveProgress(
  prefs: PlayerPreferences,
  setPrefs: (next: PlayerPreferences) => void,
  enabledLanguages: readonly LanguageCode[],
) {
  const [resultState, setResultState] = useState<ActiveMissionResult | null>(null);
  const resultRef = useRef<ActiveMissionResult | null>(null);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    resultRef.current = resultState;
  }, [resultState]);

  const scoreCompletedTurn = useCallback(
    async (turn: CompletedMissionTurn): Promise<void> => {
      reqSeqRef.current += 1;
      const mySeq = reqSeqRef.current;
      const summary =
        turn.toolSignals.completionSummary ?? "Scene complete. Ready for your next stop.";

      const pendingState: ActiveMissionResult = {
        mission: turn.mission,
        baseDifficulty: turn.difficulty,
        completionSummary: summary,
        loading: true,
        scoreData: null,
        overrideMode: null,
      };
      resultRef.current = pendingState;
      setResultState(pendingState);

      let resolvedScore: ScoreData;
      const controller = new AbortController();
      const timeoutMs = TIMEOUTS_MS.decisionsScore * 2 + 1_200;
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mission: turn.mission,
            difficulty: turn.difficulty,
            activeLanguage: turn.activeLanguage,
            transcript: [...turn.transcript],
            toolSignals: turn.toolSignals,
            ...(turn.targetPhrase ? { targetPhrase: turn.targetPhrase } : {}),
            usedTextFallback: turn.usedTextFallback,
          }),
          signal: controller.signal,
        });
        const json = (await res.json()) as { ok?: boolean; data?: unknown };
        const parsed = ScoreDataSchema.safeParse(json.data);
        resolvedScore =
          res.ok && json.ok && parsed.success
            ? parsed.data
            : buildClientFallbackScore(turn, enabledLanguages);
      } catch {
        resolvedScore = buildClientFallbackScore(turn, enabledLanguages);
      } finally {
        window.clearTimeout(timer);
      }

      if (reqSeqRef.current !== mySeq) return;

      const latest = loadPlayerPreferences();
      const prevBestStars = latest.missionStars[turn.mission.id] ?? 0;
      const bestStars = Math.max(prevBestStars, resolvedScore.stars) as 1 | 2 | 3;
      const earnedPhraseId =
        turn.targetPhrase && resolvedScore.rubric.phraseScore >= 2.0 ? turn.targetPhrase.id : null;
      const nextPhraseIds =
        earnedPhraseId && !latest.learnedPhraseIds.includes(earnedPhraseId)
          ? [...latest.learnedPhraseIds, earnedPhraseId]
          : latest.learnedPhraseIds;
      const updated = savePlayerPreferences({
        totalXp: latest.totalXp + resolvedScore.xpEarned,
        missionStars: { ...latest.missionStars, [turn.mission.id]: bestStars },
        learnedPhraseIds: nextPhraseIds,
        difficulty: resolvedScore.nextDifficulty,
      });
      setPrefs(updated);

      const finalState: ActiveMissionResult = {
        mission: turn.mission,
        baseDifficulty: turn.difficulty,
        completionSummary: summary,
        loading: false,
        scoreData: resolvedScore,
        overrideMode: null,
      };
      resultRef.current = finalState;
      setResultState(finalState);
    },
    [enabledLanguages, setPrefs],
  );

  const selectOverride = useCallback(
    (mode: DifficultyOverrideMode) => {
      const current = resultRef.current;
      if (!current || !current.scoreData) return;
      const nextMode = current.overrideMode === mode ? null : mode;
      const nextDiff = nextMode
        ? applyDifficultyOverride(current.baseDifficulty, nextMode, enabledLanguages)
        : current.scoreData.nextDifficulty;
      setPrefs(savePlayerPreferences({ difficulty: nextDiff }));
      const nextResult: ActiveMissionResult = { ...current, overrideMode: nextMode };
      resultRef.current = nextResult;
      setResultState(nextResult);
    },
    [enabledLanguages, setPrefs],
  );

  const clearResult = useCallback(() => {
    reqSeqRef.current += 1;
    resultRef.current = null;
    setResultState(null);
  }, []);

  const resetAdaptiveWeek = useCallback(() => {
    reqSeqRef.current += 1;
    resultRef.current = null;
    setResultState(null);
    setPrefs(
      savePlayerPreferences({
        totalXp: 0,
        missionStars: {},
        difficulty: DEFAULT_DIFFICULTY,
      }),
    );
  }, [setPrefs]);

  const derived = useMemo(() => {
    if (!resultState || !resultState.scoreData) {
      return {
        effectiveNextDifficulty: resultState?.baseDifficulty ?? prefs.difficulty,
        effectiveSummary: "",
      };
    }
    const effectiveNextDifficulty = resultState.overrideMode
      ? applyDifficultyOverride(resultState.baseDifficulty, resultState.overrideMode, enabledLanguages)
      : resultState.scoreData.nextDifficulty;
    const effectiveSummary = buildAdaptationSummary(
      resultState.scoreData.effectiveRoute,
      resultState.scoreData.lowConfidenceFallback,
      enabledLanguages,
      resultState.overrideMode,
    );
    return { effectiveNextDifficulty, effectiveSummary };
  }, [enabledLanguages, prefs.difficulty, resultState]);

  return {
    resultState,
    effectiveNextDifficulty: derived.effectiveNextDifficulty,
    effectiveSummary: derived.effectiveSummary,
    scoreCompletedTurn,
    selectOverride,
    clearResult,
    resetAdaptiveWeek,
  };
}
