/**
 * Feature: Phase 4 Mission Result Card & Adaptive Routing Summary (web/src/score/MissionResultCard.tsx)
 * Purpose: Celebrates a completed stop with 280ms rolling XP, 200ms spring stars, adaptation copy, and 1-click player overrides.
 * Inputs: Active Mission, next Mission day, ScoreData (or loading state), active DifficultyState, and replay/continue callbacks.
 * Outputs: Smoked-acrylic result card floating cleanly over the open ORR map stage on both desktop and mobile.
 * Deliberately excludes: Full-screen blocking modals or un-overridable difficulty locks.
 */
import type { JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import type {
  DifficultyOverrideMode,
  DifficultyState,
  LanguageCode,
  Mission,
  ScoreData,
  VerifiedPlace,
} from "@apna-area/shared";
import { useRollingNumber } from "../hud/XpCounter";
import { primeUserGestureAudioContext } from "../live/audioUnlock";
import { WhyChangedDisclosure } from "./WhyChangedDisclosure";

export interface MissionResultCardProps {
  mission: Mission;
  missionIndex: number;
  totalMissions: number;
  nextMissionDay: string;
  missionPlace: VerifiedPlace | undefined;
  completionSummary: string;
  scoringLoading: boolean;
  scoreData: ScoreData | null;
  effectiveNextDifficulty: DifficultyState;
  effectiveSummary: string;
  overrideMode: DifficultyOverrideMode | null;
  enabledLanguages: readonly LanguageCode[];
  onSelectOverride: (mode: DifficultyOverrideMode) => void;
  onReplayMission: () => void;
  onContinueNextStop: () => void;
  onOpenKit?: () => void;
}

const HINT_LABEL: Record<1 | 2 | 3, string> = {
  1: "Subtle hints",
  2: "Balanced hints",
  3: "Early hints",
};

/**
 * Renders the post-mission adaptive score card with rolling XP, outline/fill spring stars, rubric disclosure, and Next stop CTA.
 *
 * @param props - Mission metadata, ScoreData, override state, and navigation callbacks.
 * @returns Accessible smoked-acrylic result card.
 */
export function MissionResultCard({
  mission,
  missionIndex,
  totalMissions,
  nextMissionDay,
  missionPlace,
  completionSummary,
  scoringLoading,
  scoreData,
  effectiveNextDifficulty,
  effectiveSummary,
  overrideMode,
  enabledLanguages,
  onSelectOverride,
  onReplayMission,
  onContinueNextStop,
  onOpenKit,
}: MissionResultCardProps): JSX.Element {
  const animatedEarnedXp = useRollingNumber(scoreData?.xpEarned ?? 0, 280);
  const stars = scoreData?.stars ?? 0;
  const hasKannada = enabledLanguages.includes("kn");
  const sharePct = Math.round(effectiveNextDifficulty.localLanguageShare * 100);
  const shareLabel =
    sharePct === 0
      ? "English focus"
      : hasKannada
        ? `${sharePct}% Kannada mix`
        : `${sharePct}% Hindi mix`;
  const isLastStop = missionIndex >= totalMissions - 1;

  return (
    <section
      className="picker-card result-card"
      aria-label={`Stop ${missionIndex + 1} result: ${mission.title}`}
      data-testid="mission-result-card"
    >
      <div className="result-scroll-body">
        <div className="destination-header">
          <span className="meter-flag-pill meter-flag-done">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} size={13} aria-hidden="true" />
            <span>
              STOP {missionIndex + 1} SCORED · {mission.day.toUpperCase()}
            </span>
          </span>
        </div>

        <h1 className="mission-title">{mission.title}</h1>

        <div className="result-hero-strip" role="status">
          <div className="result-stars-inline">
            <div className="result-stars-row" aria-hidden="true">
              {[1, 2, 3].map((slot) => {
                const earned = slot <= stars;
                return (
                  <svg
                    key={slot}
                    className={
                      earned
                        ? `result-star-svg result-star-earned result-star-delay-${slot}`
                        : "result-star-svg"
                    }
                    width="19"
                    height="19"
                    viewBox="0 0 16 16"
                    fill={earned ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={earned ? "0" : "1.35"}
                  >
                    <path d="M8 1.3l1.95 4.08 4.5.62-3.27 3.16.79 4.48L8 11.5l-3.97 2.14.79-4.48L1.55 6l4.5-.62L8 1.3z" />
                  </svg>
                );
              })}
            </div>
            <span className="result-stars-caption" data-testid="result-stars-text">
              {scoringLoading ? "Scoring turn..." : `${stars} of 3 stars`}
            </span>
          </div>

          <div className="result-xp-inline">
            <span className="result-xp-value" data-testid="result-xp-earned">
              {scoringLoading ? "+---" : `+${animatedEarnedXp}`}
            </span>
            <span className="result-xp-unit">XP</span>
          </div>
        </div>

        <p className="result-completion-line" data-testid="live-completed-banner">
          {missionPlace ? `${missionPlace.name}: ` : ""}
          {completionSummary}
        </p>

        <div className="result-adaptation-box" data-testid="adaptation-panel">
          <span className="result-adaptation-eyebrow">
            {overrideMode ? "NEXT STOP · YOUR PACE" : "NEXT STOP · ADAPTIVE ROUTING"}
          </span>
          <p className="result-adaptation-copy" data-testid="adaptation-summary">
            {scoringLoading
              ? "Calibrating your next stop on Outer Ring Road..."
              : effectiveSummary}
          </p>
          {!scoringLoading && (
            <div className="result-settings-pills" data-testid="next-difficulty-pills">
              <span className="result-setting-pill">{shareLabel}</span>
              <span className="result-setting-pill">
                {HINT_LABEL[effectiveNextDifficulty.hintLevel]}
              </span>
              <span className="result-setting-pill">{effectiveNextDifficulty.paceSeconds}s pace</span>
            </div>
          )}
        </div>

        {scoreData && (
          <WhyChangedDisclosure
            rubric={scoreData.rubric}
            effectiveRoute={scoreData.effectiveRoute}
            durationMs={scoreData.durationMs}
            fallbackUsed={scoreData.fallbackUsed}
            lowConfidenceFallback={scoreData.lowConfidenceFallback}
            enabledLanguages={enabledLanguages}
            overrideMode={overrideMode}
            onSelectOverride={onSelectOverride}
          />
        )}
      </div>

      <div className="mission-nav-row result-footer-row">
        <button
          type="button"
          className="mission-secondary-btn"
          onClick={() => {
            primeUserGestureAudioContext();
            onReplayMission();
          }}
          data-testid="replay-mission-btn"
        >
          Replay stop
        </button>
        {!isLastStop && onOpenKit && (
          <button
            type="button"
            className="mission-secondary-btn"
            disabled={scoringLoading}
            onClick={onOpenKit}
            data-testid="result-open-kit-btn"
          >
            Survival Kit
          </button>
        )}
        <button
          type="button"
          className="primary-cta-btn mission-primary-cta"
          disabled={scoringLoading}
          onClick={isLastStop && onOpenKit ? onOpenKit : onContinueNextStop}
          data-testid="complete-continue-btn"
        >
          <span>
            {isLastStop
              ? onOpenKit
                ? "Open Survival Kit"
                : "Review Monday"
              : `Next stop · ${nextMissionDay}`}
          </span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
