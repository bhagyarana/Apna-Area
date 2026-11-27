/**
 * Feature: Live Voice Mission Stage & Cinema Ribbon HUD (web/src/live/MissionDialog.tsx)
 * Purpose: Renders the active voice mission HUD: Objective header, NPC portrait, Cinema Captions, Kannada phrase mastery flight, and 72px mic orb.
 * Inputs: Active Mission, verified office + stop places, difficulty, active language, and completion/close callbacks.
 * Outputs: Smoked-acrylic top objective card and bottom Cinema Voice Ribbon over the zoomed ORR map.
 * Deliberately excludes: Blocking full-screen modals that hide the Bengaluru corridor map.
 */
import { useEffect, useRef, useState, type FormEvent, type JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type {
  DifficultyState,
  LanguageCode,
  LanguageComfort,
  Mission,
  NpcRole,
  SurvivalPhrase,
  VerifiedPlace,
} from "@apna-area/shared";
import { PhraseFlyCard } from "../hud/PhraseFlyCard";
import type { CompletedMissionTurn } from "../score/useAdaptiveProgress";
import { primeUserGestureAudioContext } from "./audioUnlock";
import { Captions } from "./Captions";
import { playPhraseMasteryChime } from "./chime";
import { MicOrbControl } from "./MicOrbControl";
import { MissionObjectiveHeader } from "./MissionObjectiveHeader";
import { useLiveSession } from "./useLiveSession";

export interface MissionDialogProps {
  mission: Mission;
  missionIndex: number;
  office: VerifiedPlace;
  missionPlace: VerifiedPlace;
  difficulty: DifficultyState;
  activeLanguage: LanguageCode;
  languageComfort?: LanguageComfort;
  onPhraseMastered?: (phrase: SurvivalPhrase) => void;
  onMissionCompleted?: (turn: CompletedMissionTurn) => void;
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

/** Renders the in-mission voice HUD with 72px mic orb, live captions, Kannada mastery chime, and text fallback. */
export function MissionDialog({ mission, missionIndex, office, missionPlace, difficulty, activeLanguage, languageComfort, onPhraseMastered, onMissionCompleted, onExitMission, onAdvanceNextMission }: MissionDialogProps): JSX.Element {
  const { live, startSession, toggleMute, sendTextReply, requestLocalHint, stopSession } = useLiveSession();
  const [imgFailed, setImgFailed] = useState(false);
  const [showTextBox, setShowTextBox] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [masteryFlash, setMasteryFlash] = useState(false);
  const [flyingPhrase, setFlyingPhrase] = useState<SurvivalPhrase | null>(null);
  const celebratedMissionRef = useRef<string | null>(null);
  const submittedScoreRef = useRef<string | null>(null);
  const usedTextRef = useRef(false);
  const { localLanguageShare, hintLevel, paceSeconds } = difficulty;

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape" || ev.defaultPrevented) return;
      if (showTextBox && live.status !== "permission_denied") {
        setShowTextBox(false);
        return;
      }
      stopSession();
      onExitMission();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [live.status, onExitMission, showTextBox, stopSession]);

  useEffect(() => {
    setImgFailed(false);
    setFlyingPhrase(null);
    celebratedMissionRef.current = null;
    submittedScoreRef.current = null;
    usedTextRef.current = false;
    void startSession({
      mission,
      officeName: office.name,
      placeName: missionPlace.name,
      placeCategory: missionPlace.category,
      difficulty: { localLanguageShare, hintLevel, paceSeconds },
      activeLanguage,
      languageComfort,
    });
    return () => stopSession();
  }, [mission, office.name, missionPlace.name, missionPlace.category, localLanguageShare, hintLevel, paceSeconds, activeLanguage, languageComfort, startSession, stopSession]);

  useEffect(() => {
    if (live.toolSignals.phraseQuality === "clear" && live.targetPhrase && celebratedMissionRef.current !== mission.id) {
      celebratedMissionRef.current = mission.id;
      playPhraseMasteryChime();
      setMasteryFlash(true);
      setFlyingPhrase(live.targetPhrase);
      onPhraseMastered?.(live.targetPhrase);
      const t = window.setTimeout(() => setMasteryFlash(false), 320);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [live.toolSignals.phraseQuality, live.targetPhrase, mission.id, onPhraseMastered]);

  useEffect(() => {
    if (live.status === "completed" && onMissionCompleted && submittedScoreRef.current !== mission.id) {
      submittedScoreRef.current = mission.id;
      onMissionCompleted({
        mission,
        difficulty: { localLanguageShare, hintLevel, paceSeconds },
        activeLanguage,
        transcript: live.transcript,
        toolSignals: live.toolSignals,
        targetPhrase: live.targetPhrase,
        usedTextFallback: usedTextRef.current,
      });
    }
  }, [live.status, live.transcript, live.toolSignals, live.targetPhrase, onMissionCompleted, mission, localLanguageShare, hintLevel, paceSeconds, activeLanguage]);

  const handleRetry = () => {
    primeUserGestureAudioContext();
    void startSession({ mission, officeName: office.name, placeName: missionPlace.name, placeCategory: missionPlace.category, difficulty, activeLanguage, languageComfort });
  };

  const handleSubmitText = (e: FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    usedTextRef.current = true;
    sendTextReply(typedText);
    setTypedText("");
  };

  const roleLabel = ROLE_LABELS[mission.npcRole];
  const isCompleted = live.status === "completed";
  const textInputVisible = !isCompleted && (showTextBox || live.status === "permission_denied");

  return (
    <div className="live-stage" data-testid="live-mission-dialog">
      {flyingPhrase && <PhraseFlyCard phrase={flyingPhrase} />}

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
        onEndScene={() => { stopSession(); onExitMission(); }}
      />

      <section className="cinema-voice-dock" aria-label="Voice conversation controls">
        {live.status === "error" && (
          <div className="live-warning-banner" role="alert" data-testid="live-error-banner">
            <span>{live.errorMessage ?? "Voice connection dropped, so tap Retry to reconnect to this mission."}</span>
            <button type="button" className="change-office-btn" onClick={handleRetry} data-testid="retry-live-btn">Retry</button>
          </div>
        )}

        {isCompleted && !onMissionCompleted && (
          <div className="live-completed-card" role="status" data-testid="live-completed-banner">
            <div className="live-completed-copy">
              <span className="live-completed-badge">Objective complete</span>
              <p>{live.toolSignals.completionSummary ?? "Scene complete. Ready for your next stop."}</p>
            </div>
            <button
              type="button"
              className="primary-cta-btn live-next-btn"
              onClick={() => { stopSession(); onAdvanceNextMission(); }}
              data-testid="complete-continue-btn"
            >
              <span>Next stop</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className={masteryFlash ? "cinema-ribbon-panel cinema-ribbon-mastered" : "cinema-ribbon-panel"}>
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
                <span className="npc-portrait-fallback" aria-hidden="true">{mission.npcFirstName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <Captions
              npcFirstName={mission.npcFirstName}
              roleLabel={roleLabel}
              status={live.status}
              npcCaption={live.npcCaption}
              playerCaption={live.playerCaption}
              targetPhrase={live.targetPhrase}
              phraseQuality={live.toolSignals.phraseQuality}
              languageComfort={languageComfort}
            />
          </div>

          {textInputVisible && (
            <form
              className="live-text-form"
              onSubmit={handleSubmitText}
              data-testid="live-text-form"
            >
              <input
                type="text"
                className="live-text-input"
                data-testid="live-text-input"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={`Type a reply to ${mission.npcFirstName}...`}
                aria-label={`Type your reply to ${mission.npcFirstName}`}
              />
              <button type="submit" className="live-send-btn" data-testid="live-text-send">Send</button>
            </form>
          )}
        </div>

        {!isCompleted && live.status !== "permission_denied" && (
          <MicOrbControl status={live.status} muted={live.muted} rmsLevel={live.rmsLevel} onToggleMute={toggleMute} />
        )}
      </section>
    </div>
  );
}
