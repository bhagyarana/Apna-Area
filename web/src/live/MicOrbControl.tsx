/**
 * Feature: 72px Amplitude Mic Orb Control & Privacy Pill (web/src/live/MicOrbControl.tsx)
 * Purpose: Renders the circular 72px microphone button with WebAudio RMS halo, Spacebar mute shortcut, and privacy note.
 * Inputs: LiveSessionStatus, muted state, RMS level [0..1], and toggleMute callback.
 * Outputs: Accessible interactive mic orb cluster.
 * Deliberately excludes: Audio capture or WebSocket logic.
 */
import type { JSX, KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mic01Icon } from "@hugeicons/core-free-icons";
import type { LiveSessionStatus } from "./liveSessionTypes";

export interface MicOrbControlProps {
  status: LiveSessionStatus;
  muted: boolean;
  rmsLevel: number;
  onToggleMute: () => void;
}

/**
 * Renders the 72px circular mic orb with real-time RMS halo and Spacebar mute toggle when focused.
 *
 * @param props - Session status, mute flag, RMS amplitude, and click/key callback.
 * @returns Accessible mic button and privacy note row.
 */
export function MicOrbControl({
  status,
  muted,
  rmsLevel,
  onToggleMute,
}: MicOrbControlProps): JSX.Element {
  const ringSpreadPx = rmsLevel > 0.01 ? Math.round(5 + rmsLevel * 20) : 3;

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === "Space") {
      e.preventDefault();
      onToggleMute();
    }
  };

  return (
    <div className="mic-orb-row">
      <button
        type="button"
        className={`mic-orb mic-orb-${status}${muted ? " mic-orb-muted" : ""}`}
        style={{
          boxShadow:
            status === "npc_speaking"
              ? `0 0 0 ${ringSpreadPx}px rgba(255, 210, 74, 0.24)`
              : `0 0 0 ${ringSpreadPx}px rgba(255, 79, 160, 0.24)`,
        }}
        disabled={status === "connecting"}
        aria-pressed={!muted}
        aria-label={muted ? "Unmute microphone" : "Mute microphone (Space when focused)"}
        data-testid="live-mic-orb"
        onClick={onToggleMute}
        onKeyDown={handleKeyDown}
      >
        <HugeiconsIcon icon={Mic01Icon} size={26} aria-hidden="true" />
      </button>
      <p className="live-privacy-note">Voice streams live to Gemini and is never stored.</p>
    </div>
  );
}
