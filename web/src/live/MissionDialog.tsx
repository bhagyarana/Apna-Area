/**
 * Feature: Live Voice Mission Stage & Cinema Ribbon HUD (web/src/live/MissionDialog.tsx)
 * Purpose: Renders the active 90s voice mission HUD: Objective header, NPC portrait, Cinema Captions, 72px waveform mic orb, and text fallback.
 * Inputs: Active Mission, verified office + stop places, difficulty, active language, and close/advance callbacks.
 * Outputs: Smoked-acrylic top objective card and bottom Cinema Voice Ribbon over the zoomed ORR map.
 * Deliberately excludes: Blocking full-screen modals that hide the Bengaluru corridor map.
 */
import { useEffect, useState, type FormEvent, type JSX, type KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Mic01Icon } from "@hugeicons/core-free-icons";
import type {
  DifficultyState,
  LanguageCode,
  Mission,
  NpcRole,
  VerifiedPlace,
} from "@apna-area/shared";
import { primeUserGestureAudioContext } from "./audioUnlock";
import { Captions } from "./Captions";
import { MissionObjectiveHeader } from "./MissionObjectiveHeader";
import { useLiveSession } from "./useLiveSession";

export interface MissionDialogProps {
  mission: Mission;
  missionIndex: number;
  office: VerifiedPlace;
  missionPlace: VerifiedPlace;
  difficulty: DifficultyState;
  activeLanguage: LanguageCode;
  onExitMission: () => void;
  onAdvanceNextMission: () => void;
}

const ROLE_LABELS: Record<NpcRole, string> = {
  auto_driver: "Auto driver",
  darshini_owner: "Darshini counter host",
  pg_owner: "PG manager",
  transit_helper: "BMTC commuter",
  office_buddy: "Office teammate",
};

/**
 * Renders the in-mission voice HUD with 72px amplitude mic orb, live captions, and docked text fallback.
 *
 * @param props - Active mission, verified place metadata, difficulty, language, and navigation callbacks.
 * @returns Full-stage voice HUD overlay.
 */
export function MissionDialog({
  mission,
  missionIndex,
  office,
  missionPlace,
  difficulty,
  activeLanguage,
  onExitMission,
  onAdvanceNextMission,
}: MissionDialogProps): JSX.Element {
  const { live, startSession, toggleMute, sendTextReply, requestLocalHint, stopSession } =
    useLiveSession();
  const [imgFailed, setImgFailed] = useState(false);
  const [showTextBox, setShowTextBox] = useState(false);
  const [typedText, setTypedText] = useState("");
  const { localLanguageShare, hintLevel, paceSeconds } = difficulty;

  useEffect(() => {
    setImgFailed(false);
    void startSession({
      mission,
      officeName: office.name,
      placeName: missionPlace.name,
      placeCategory: missionPlace.category,
      difficulty: { localLanguageShare, hintLevel, paceSeconds },
      activeLanguage,
    });
    return () => {
      stopSession();
    };
  }, [
    mission,
    office.name,
    missionPlace.name,
    missionPlace.category,
    localLanguageShare,
    hintLevel,
    paceSeconds,
    activeLanguage,
    startSession,
    stopSession,
  ]);

  const handleRetry = () => {
    primeUserGestureAudioContext();
    void startSession({
      mission,
      officeName: office.name,
      placeName: missionPlace.name,
      placeCategory: missionPlace.category,
      difficulty,
      activeLanguage,
    });
  };

  const handleMicKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === "Space") {
      e.preventDefault();
      toggleMute();
    }
  };

  const handleSubmitText = (e: FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    sendTextReply(typedText);
    setTypedText("");
  };

  const ringSpreadPx = live.rmsLevel > 0.01 ? Math.round(5 + live.rmsLevel * 20) : 3;
  const roleLabel = ROLE_LABELS[mission.npcRole];
  const isCompleted = live.status === "completed";
  const textInputVisible = !isCompleted && (showTextBox || live.status === "permission_denied");

  return (
    <div className="live-stage" data-testid="live-mission-dialog">
      <MissionObjectiveHeader
        mission={mission}
        missionIndex={missionIndex}
        placeName={missionPlace.name}
        secondsRemaining={live.secondsRemaining}
        status={live.status}
        activeHint={live.activeHint}
        showTextBox={showTextBox}
        onRequestHint={() => requestLocalHint(mission.hintLadder)}
        onToggleTextBox={() => setShowTextBox((prev) => !prev)}
        onEndScene={() => {
          stopSession();
          onExitMission();
        }}
      />

      <section className="cinema-voice-dock" aria-label="Voice conversation controls">
        {live.status === "permission_denied" && (
          <div className="live-warning-banner" role="alert" data-testid="mic-denied-banner">
            Microphone access is blocked. Allow mic access in your browser bar or type your reply below.
          </div>
        )}

        {live.status === "error" && (
          <div className="live-warning-banner" role="alert" data-testid="live-error-banner">
            <span>{live.errorMessage ?? "Voice connection dropped. Tap Retry to reconnect to this mission."}</span>
            <button type="button" className="change-office-btn" onClick={handleRetry} data-testid="retry-live-btn">
              Retry
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="live-completed-card" role="status" data-testid="live-completed-banner">
            <div className="live-completed-copy">
              <span className="live-completed-badge">Objective complete</span>
              <p>{live.toolSignals.completionSummary ?? "Scene complete. Ready for your next stop."}</p>
            </div>
            <button
              type="button"
              className="primary-cta-btn live-next-btn"
              onClick={() => {
                stopSession();
                onAdvanceNextMission();
              }}
              data-testid="complete-continue-btn"
            >
              <span>Next stop</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="cinema-ribbon-panel">
          <div className="cinema-ribbon-row">
            <div className="npc-portrait-frame" data-testid="npc-portrait">
              {!imgFailed ? (
                <img
                  src={`/art/npcs/${mission.npcRole}_${mission.npcGender}.webp`}
                  alt={`${mission.npcFirstName}, fictional ${roleLabel}`}
                  className="npc-portrait-img"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span className="npc-portrait-fallback" aria-hidden="true">
                  {mission.npcFirstName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <Captions
              npcFirstName={mission.npcFirstName}
              roleLabel={roleLabel}
              status={live.status}
              npcCaption={live.npcCaption}
              playerCaption={live.playerCaption}
            />
          </div>

          {textInputVisible && (
            <form className="live-text-form" onSubmit={handleSubmitText} data-testid="live-text-form">
              <input
                type="text"
                className="live-text-input"
                data-testid="live-text-input"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={`Type a reply to ${mission.npcFirstName}...`}
                aria-label={`Type your reply to ${mission.npcFirstName}`}
              />
              <button type="submit" className="live-send-btn" data-testid="live-text-send">
                Send
              </button>
            </form>
          )}
        </div>

        {!isCompleted && (
          <div className="mic-orb-row">
            <button
              type="button"
              className={`mic-orb mic-orb-${live.status}${live.muted ? " mic-orb-muted" : ""}`}
              style={{
                boxShadow:
                  live.status === "npc_speaking"
                    ? `0 0 0 ${ringSpreadPx}px rgba(255, 210, 74, 0.24)`
                    : `0 0 0 ${ringSpreadPx}px rgba(255, 79, 160, 0.24)`,
              }}
              disabled={live.status === "connecting"}
              aria-pressed={!live.muted}
              aria-label={live.muted ? "Unmute microphone" : "Mute microphone (Space when focused)"}
              data-testid="live-mic-orb"
              onClick={toggleMute}
              onKeyDown={handleMicKeyDown}
            >
              <HugeiconsIcon icon={Mic01Icon} size={26} aria-hidden="true" />
            </button>
            <p className="live-privacy-note">
              Voice streams live to Gemini and is never stored.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
