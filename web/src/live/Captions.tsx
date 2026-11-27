/**
 * Feature: Three-Tier Cinema Voice Caption Ribbon (web/src/live/Captions.tsx)
 * Purpose: Displays high-contrast live NPC and player transcriptions in a smoked-acrylic subtitle ribbon above the 72px mic orb.
 * Inputs: NPC first name, role label, live session status, NPC transcript text, and player transcript text.
 * Outputs: Accessible aria-live subtitle card following Design.md Section 3.
 * Deliberately excludes: Multi-message chat scrollbars that obscure the map.
 */
import type { JSX } from "react";
import type { LiveSessionStatus } from "./useLiveSession";

export interface CaptionsProps {
  npcFirstName: string;
  roleLabel: string;
  status: LiveSessionStatus;
  npcCaption: string;
  playerCaption: string;
}

function statusCue(status: LiveSessionStatus, npcFirstName: string): string {
  switch (status) {
    case "connecting":
      return `Connecting to ${npcFirstName}...`;
    case "npc_speaking":
      return `${npcFirstName} is speaking · Speak anytime to interrupt`;
    case "permission_denied":
      return `${npcFirstName} · Type your reply below`;
    case "completed":
      return `${npcFirstName} · Scene complete`;
    case "error":
      return "Connection paused";
    default:
      return `${npcFirstName} is listening`;
  }
}

/**
 * Renders the 3-tier Cinema Voice Ribbon for live NPC dialogue and player speech.
 *
 * @param props - NPC identity, session status, and live input/output caption strings.
 * @returns Accessible live subtitle panel.
 */
export function Captions({
  npcFirstName,
  roleLabel,
  status,
  npcCaption,
  playerCaption,
}: CaptionsProps): JSX.Element {
  return (
    <div
      className="cinema-caption-card"
      aria-live="polite"
      data-testid="live-captions"
    >
      <div className="caption-speaker-row">
        <span className="caption-speaker-tag">
          {npcFirstName} · {roleLabel}
        </span>
        <span className="caption-state-cue">{statusCue(status, npcFirstName)}</span>
      </div>

      <p className="caption-npc-line" data-testid="npc-caption-line">
        {npcCaption ||
          (status === "connecting"
            ? "Stepping up to the spot..."
            : `Greet ${npcFirstName} or start with your objective.`)}
      </p>

      <p className="caption-player-line" data-testid="player-caption-line">
        {playerCaption
          ? `You: ${playerCaption}`
          : status === "permission_denied"
            ? "Mic blocked in browser, so send a typed line below."
            : "Your live speech appears here as you talk."}
      </p>
    </div>
  );
}
