/**
 * Feature: React Live Voice Mission Session Hook (web/src/live/useLiveSession.ts)
 * Purpose: Coordinates gesture-unlocked AudioContext, POST /api/live-token, 16 kHz mic capture, 24 kHz barge-in playback, 90s cap, and NON_BLOCKING tools.
 * Inputs: LiveTokenRequest parameters when the player enters a mission conversation.
 * Outputs: Reactive status, captions, 90s countdown, RMS level, hint state, and mic/text/end controls.
 * Deliberately excludes: Persisting transcripts or audio to server or disk.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_VOICE_CONFIG, SAFETY_LIMITS, type LiveTokenRequest, type TranscriptTurn } from "@apna-area/shared";
import { primeUserGestureAudioContext, releaseUserGestureAudioContext } from "./audioUnlock";
import {
  applyLiveToolCalls,
  applyLocalHintStep,
  fetchEphemeralToken,
  INITIAL_LIVE_STATE,
  openingCueForRequest,
  type LiveSessionState,
  type LiveSessionStatus,
} from "./liveSessionTypes";
import { connectLiveTransport, type LiveTransportSession } from "./liveTransport";
import { createPcmPlayer, type PcmPlayerHandle } from "./pcmPlayer";
import { startMicPcmCapture, type MicCaptureHandle } from "./pcmWorklet";

export type { LiveSessionState, LiveSessionStatus };

/**
 * Manages a bounded 90-second Gemini 3.8 Live voice conversation with text fallback.
 *
 * @returns LiveSessionState and imperative session controls.
 */
export function useLiveSession() {
  const [state, setState] = useState<LiveSessionState>(INITIAL_LIVE_STATE);
  const sessionSeqRef = useRef(0);
  const secondsLeftRef = useRef<number>(SAFETY_LIMITS.maxLiveSessionSeconds);
  const playerRef = useRef<PcmPlayerHandle | null>(null);
  const micRef = useRef<MicCaptureHandle | null>(null);
  const transportRef = useRef<LiveTransportSession | null>(null);
  const countdownRef = useRef<number | null>(null);
  const drainTimerRef = useRef<number | null>(null);
  const objectiveDoneRef = useRef(false);
  const npcDraftRef = useRef("");
  const playerDraftRef = useRef("");

  const cleanupSessionNodes = useCallback(() => {
    sessionSeqRef.current += 1;
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    if (drainTimerRef.current !== null) window.clearTimeout(drainTimerRef.current);
    countdownRef.current = null;
    drainTimerRef.current = null;
    micRef.current?.stop();
    micRef.current = null;
    playerRef.current?.flush();
    playerRef.current = null;
    transportRef.current?.close();
    transportRef.current = null;
  }, []);

  useEffect(() => () => {
    cleanupSessionNodes();
    releaseUserGestureAudioContext();
  }, [cleanupSessionNodes]);

  const stopSession = useCallback(() => {
    cleanupSessionNodes();
    releaseUserGestureAudioContext();
    objectiveDoneRef.current = false;
    setState(INITIAL_LIVE_STATE);
  }, [cleanupSessionNodes]);

  const startSession = useCallback(
    async (req: LiveTokenRequest): Promise<void> => {
      cleanupSessionNodes();
      const mySeq = sessionSeqRef.current;
      const audioCtx = primeUserGestureAudioContext();
      secondsLeftRef.current = SAFETY_LIMITS.maxLiveSessionSeconds;
      objectiveDoneRef.current = false;
      npcDraftRef.current = "";
      playerDraftRef.current = "";
      setState({ ...INITIAL_LIVE_STATE, status: "connecting" });

      const tokenRes = await fetchEphemeralToken(req);
      if (sessionSeqRef.current !== mySeq) return;
      if (!tokenRes.ok) {
        setState((prev) => ({ ...prev, status: "error", errorMessage: tokenRes.error }));
        return;
      }

      try {
        const tokenData = tokenRes.data;
        setState((prev) => ({ ...prev, targetPhrase: tokenData.phrase ?? req.targetPhrase ?? null }));
        const pcmPlayer = createPcmPlayer(audioCtx, (speaking) => {
          if (sessionSeqRef.current !== mySeq) return;
          setState((prev) =>
            prev.status === "completed" || prev.status === "error" || prev.status === "permission_denied"
              ? prev
              : { ...prev, status: speaking ? "npc_speaking" : "listening" },
          );
        });
        playerRef.current = pcmPlayer;

        const scheduleCompletionDrain = () => {
          if (drainTimerRef.current !== null) return;
          const waitMs = Math.min(LIVE_VOICE_CONFIG.drainTimeoutMs, pcmPlayer.remainingMs() + 120);
          drainTimerRef.current = window.setTimeout(() => {
            cleanupSessionNodes();
            setState((prev) => ({ ...prev, status: "completed", rmsLevel: 0 }));
          }, waitMs);
        };

        let socketOpened = false;
        let greeted = false;
        const openingCue = openingCueForRequest(req);
        const transport = await connectLiveTransport(tokenData, {
          onOpen: () => {
            socketOpened = true;
            if (!greeted && transportRef.current) {
              greeted = true;
              transportRef.current.sendText(openingCue);
            }
          },
          onAudioChunk24k: (b64) => {
            if (sessionSeqRef.current !== mySeq) return;
            const rms = pcmPlayer.enqueueBase64Pcm24k(b64);
            setState((prev) => ({ ...prev, rmsLevel: rms }));
          },
          onInputTranscript: (chunk) => {
            if (sessionSeqRef.current !== mySeq) return;
            playerDraftRef.current = `${playerDraftRef.current}${chunk}`;
            const nextPlayerCaption = playerDraftRef.current.trim();
            setState((prev) => ({ ...prev, playerCaption: nextPlayerCaption }));
          },
          onOutputTranscript: (chunk) => {
            if (sessionSeqRef.current !== mySeq) return;
            npcDraftRef.current = `${npcDraftRef.current}${chunk}`;
            const nextNpcCaption = npcDraftRef.current.trim();
            setState((prev) => ({ ...prev, npcCaption: nextNpcCaption }));
          },
          onInterrupted: () => {
            pcmPlayer.flush();
            npcDraftRef.current = "";
          },
          onTurnComplete: () => {
            if (sessionSeqRef.current !== mySeq) return;
            const pTxt = playerDraftRef.current.trim();
            const nTxt = npcDraftRef.current.trim();
            playerDraftRef.current = "";
            npcDraftRef.current = "";
            setState((prev) => {
              const now = Date.now();
              const turns: TranscriptTurn[] = [];
              if (pTxt) turns.push({ speaker: "player", text: pTxt, timestampMs: now });
              if (nTxt) turns.push({ speaker: "npc", text: nTxt, timestampMs: now });
              const npcCaption = nTxt || prev.npcCaption;
              const playerCaption = pTxt || prev.playerCaption;
              return { ...prev, npcCaption, playerCaption, transcript: [...prev.transcript, ...turns], rmsLevel: 0 };
            });
            if (objectiveDoneRef.current) scheduleCompletionDrain();
          },
          onToolCalls: (calls) => {
            if (sessionSeqRef.current !== mySeq) return;
            const fallbackHint = req.mission.hintLadder[0] ?? "";
            const preview = applyLiveToolCalls(INITIAL_LIVE_STATE, calls, fallbackHint);
            if (preview.objectiveJustCompleted) objectiveDoneRef.current = true;
            setState((prev) => applyLiveToolCalls(prev, calls, fallbackHint).nextState);
            transportRef.current?.sendToolResponses(preview.responses);
            if (preview.objectiveJustCompleted && !pcmPlayer.isPlaying()) scheduleCompletionDrain();
          },
          onError: (msg) => {
            if (sessionSeqRef.current !== mySeq) return;
            cleanupSessionNodes();
            setState((prev) => ({ ...prev, status: "error", errorMessage: msg, rmsLevel: 0 }));
          },
          onClose: () => {
            if (sessionSeqRef.current === mySeq) setState((prev) => ({ ...prev, rmsLevel: 0 }));
          },
        });

        if (sessionSeqRef.current !== mySeq) {
          transport.close();
          return;
        }
        transportRef.current = transport;
        if (socketOpened && !greeted) {
          greeted = true;
          transport.sendText(openingCue);
        }

        countdownRef.current = window.setInterval(() => {
          secondsLeftRef.current = Math.max(0, secondsLeftRef.current - 1);
          const nextSec = secondsLeftRef.current;
          if (nextSec <= 0) {
            cleanupSessionNodes();
            setState((prev) => ({ ...prev, secondsRemaining: 0, status: "completed", rmsLevel: 0 }));
          } else {
            setState((prev) => ({ ...prev, secondsRemaining: nextSec }));
          }
        }, 1_000);

        try {
          const micHandle = await startMicPcmCapture(audioCtx, (b64, rms) => {
            if (b64 && sessionSeqRef.current === mySeq) {
              transport.sendAudio16k(b64);
              setState((prev) => (prev.status === "npc_speaking" ? prev : { ...prev, rmsLevel: rms }));
            }
          });
          if (sessionSeqRef.current !== mySeq) {
            micHandle.stop();
            return;
          }
          micRef.current = micHandle;
          setState((prev) => (prev.status === "npc_speaking" ? prev : { ...prev, status: "listening" }));
        } catch {
          if (sessionSeqRef.current === mySeq) setState((prev) => ({ ...prev, status: "permission_denied" }));
        }
      } catch (err: unknown) {
        if (sessionSeqRef.current !== mySeq) return;
        cleanupSessionNodes();
        const errorMessage = err instanceof Error ? err.message : "Voice connection dropped. Tap Retry to reconnect.";
        setState((prev) => ({ ...prev, status: "error", errorMessage }));
      }
    },
    [cleanupSessionNodes],
  );

  const toggleMute = useCallback(() => {
    setState((prev) => {
      const nextMuted = !prev.muted;
      micRef.current?.setMuted(nextMuted);
      if (nextMuted) transportRef.current?.sendAudioStreamEnd();
      return { ...prev, muted: nextMuted, rmsLevel: 0 };
    });
  }, []);

  const sendTextReply = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !transportRef.current) return;
    playerDraftRef.current = "";
    const turn: TranscriptTurn = { speaker: "player", text: trimmed, timestampMs: Date.now() };
    setState((prev) => ({ ...prev, playerCaption: trimmed, transcript: [...prev.transcript, turn] }));
    transportRef.current.sendText(trimmed);
  }, []);

  const requestLocalHint = useCallback((hintLadder: readonly string[]) => {
    setState((prev) => applyLocalHintStep(prev, hintLadder));
  }, []);

  return { live: state, startSession, toggleMute, sendTextReply, requestLocalHint, stopSession };
}
