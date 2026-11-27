/**
 * Feature: Topbar Lyria Ambient Soundtrack Mute Toggle (web/src/components/AmbientMuteButton.tsx)
 * Purpose: Provides an accessible 40x40px+ topbar toggle for the gesture-gated Lyria mood loops, remembered across reloads.
 * Inputs: Current muted boolean and onToggle callback.
 * Outputs: Compact smoked-acrylic topbar button with explicit aria-pressed state.
 * Deliberately excludes: Auto-starting audio before user interaction.
 */
import type { JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon, VolumeMute01Icon } from "@hugeicons/core-free-icons";

export interface AmbientMuteButtonProps {
  muted: boolean;
  onToggle: () => void;
}

/**
 * Renders the persistent ambient soundtrack mute/unmute button in the topbar.
 *
 * @param props - Persisted muted flag and click handler.
 * @returns Accessible 40px topbar audio toggle.
 */
export function AmbientMuteButton({ muted, onToggle }: AmbientMuteButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={muted ? "sound-pill sound-pill-muted" : "sound-pill"}
      aria-pressed={!muted}
      aria-label={muted ? "Unmute ambient Bengaluru soundtrack" : "Mute ambient Bengaluru soundtrack"}
      onClick={onToggle}
      data-testid="ambient-mute-btn"
    >
      <HugeiconsIcon icon={muted ? VolumeMute01Icon : VolumeHighIcon} size={15} aria-hidden="true" />
      <span className="sound-pill-label">{muted ? "Muted" : "Sound"}</span>
    </button>
  );
}
