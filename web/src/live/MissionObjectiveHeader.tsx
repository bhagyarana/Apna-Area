/**
 * Feature: In-Mission Top-Left Objective & Fare-Meter Header Card (web/src/live/MissionObjectiveHeader.tsx)
 * Purpose: Displays the 90-second Fare-Meter countdown, active mission objective, hint trigger, text-reply toggle, and End scene button.
 * Inputs: Mission metadata, remaining seconds, active hint text, session status, and control callbacks.
 * Outputs: Smoked-acrylic objective cluster positioned top-left above the zoomed ORR map.
 * Deliberately excludes: Audio capture or WebSocket logic.
 */
import type { JSX } from "react";
import type { Mission } from "@apna-area/shared";
import type { LiveSessionStatus } from "./liveSessionTypes";

export interface MissionObjectiveHeaderProps {
  mission: Mission;
  missionIndex: number;
  placeName: string;
  secondsRemaining: number;
  status: LiveSessionStatus;
  activeHint: string | null;
  showTextBox: boolean;
  onRequestHint: () => void;
  onToggleTextBox: () => void;
  onEndScene: () => void;
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Renders the top-left mission objective card with 90-second tabular countdown and hint controls.
 *
 * @param props - Mission details, countdown, hint state, and button handlers.
 * @returns Accessible objective section element.
 */
export function MissionObjectiveHeader({
  mission,
  missionIndex,
  placeName,
  secondsRemaining,
  status,
  activeHint,
  showTextBox,
  onRequestHint,
  onToggleTextBox,
  onEndScene,
}: MissionObjectiveHeaderProps): JSX.Element {
  const isCompleted = status === "completed";
  const meterClass = isCompleted
    ? "meter-flag-pill meter-flag-done"
    : secondsRemaining <= 15
      ? "meter-flag-pill meter-flag-urgent"
      : "meter-flag-pill";

  return (
    <section className="picker-card live-objective-card" aria-label="Active mission objective">
      <div className="destination-header">
        <span className={meterClass} data-testid="live-countdown">
          <svg
            className={isCompleted ? "meter-flag-svg" : "meter-flag-svg meter-flag-tilted"}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 10.5V2M2.5 2.2H9.2L7.7 4.5L9.2 6.8H2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            {isCompleted ? "SCENE COMPLETE" : `METER ON · ${formatCountdown(secondsRemaining)}`}
          </span>
        </span>
        <button
          type="button"
          className="change-office-btn"
          onClick={onEndScene}
          data-testid="end-mission-btn"
        >
          {isCompleted ? "Back to card" : "End scene"}
        </button>
      </div>

      <h1 className="mission-title live-mission-title">
        Stop {missionIndex + 1} · {mission.title}
      </h1>
      <p className="live-objective-line">
        <span className="live-place-highlight">{placeName}:</span> {mission.objective}
      </p>

      {!isCompleted && (
        <div className="live-utility-row">
          <button
            type="button"
            className={activeHint ? "live-chip-btn live-chip-btn-active" : "live-chip-btn"}
            aria-pressed={Boolean(activeHint)}
            onClick={onRequestHint}
            data-testid="request-hint-btn"
          >
            {activeHint ? "Next hint" : "Need a hint"}
          </button>
          <button
            type="button"
            className={showTextBox ? "live-chip-btn live-chip-btn-active" : "live-chip-btn"}
            aria-expanded={showTextBox || status === "permission_denied"}
            onClick={() => {
              if (status === "permission_denied") {
                document.querySelector<HTMLInputElement>('[data-testid="live-text-input"]')?.focus();
                return;
              }
              onToggleTextBox();
            }}
            data-testid="toggle-text-fallback-btn"
          >
            {status === "permission_denied" ? "Focus reply" : showTextBox ? "Hide keyboard" : "Type instead"}
          </button>
        </div>
      )}

      {!isCompleted && activeHint && (
        <div className="live-hint-banner" role="status" data-testid="live-hint-banner">
          Hint: {activeHint}
        </div>
      )}
    </section>
  );
}
