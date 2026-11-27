/**
 * Feature: Three-Tier Cinema Voice Caption Ribbon & Kannada Phrase Strip (web/src/live/Captions.tsx)
 * Purpose: Displays high-contrast live NPC/player transcriptions and the mission's polite Kannada survival phrase (`script · transliteration · meaning`).
 * Inputs: NPC first name, role label, session status, live captions, optional target SurvivalPhrase, phraseQuality, and languageComfort.
 * Outputs: Accessible aria-live subtitle card following Design.md Section 3 & Section 4.3.
 * Deliberately excludes: Multi-message chat scrollbars that obscure the map.
 */
import type { JSX } from "react";
import type { LanguageComfort, SurvivalPhrase } from "@apna-area/shared";
import type { LiveSessionStatus } from "./useLiveSession";

export interface CaptionsProps {
  npcFirstName: string;
  roleLabel: string;
  status: LiveSessionStatus;
  npcCaption: string;
  playerCaption: string;
  targetPhrase?: SurvivalPhrase | null;
  phraseQuality?: "partial" | "clear";
  languageComfort?: LanguageComfort;
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
 * Renders the Cinema Voice Ribbon for live NPC dialogue, player speech, and Kannada phrase practice.
 *
 * @param props - NPC identity, session status, captions, and optional target Kannada phrase state.
 * @returns Accessible live subtitle panel.
 */
export function Captions({
  npcFirstName,
  roleLabel,
  status,
  npcCaption,
  playerCaption,
  targetPhrase = null,
  phraseQuality,
  languageComfort = "en",
}: CaptionsProps): JSX.Element {
  const isClear = phraseQuality === "clear";
  const meaningText =
    targetPhrase && languageComfort === "hi" ? targetPhrase.hindi : targetPhrase?.english;

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

      {targetPhrase && (
        <div
          className={isClear ? "target-phrase-strip target-phrase-strip-clear" : "target-phrase-strip"}
          data-testid="target-phrase-card"
        >
          <div className="target-phrase-lines">
            <span className="target-phrase-kn" data-testid="target-phrase-kn">
              {targetPhrase.kannada}
            </span>
            <span className="target-phrase-sub">
              {targetPhrase.transliteration} · {meaningText}
            </span>
          </div>
          <span
            className={isClear ? "target-phrase-badge target-phrase-badge-clear" : "target-phrase-badge"}
            data-testid="target-phrase-status"
          >
            {isClear ? "Saved to kit" : phraseQuality === "partial" ? "Almost there" : "Try in Kannada"}
          </span>
        </div>
      )}
    </div>
  );
}
