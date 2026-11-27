/**
 * Feature: React Hook for Gesture-Gated Lyria Ambient Soundtrack Sync (web/src/audio/useAmbientSync.ts)
 * Purpose: Bridges React state (enabled flag, active MissionMood, voice ducking, mute preference) to the singleton ambientAudio controller.
 * Inputs: enabled boolean, active MissionMood, ducked boolean, and muted boolean.
 * Outputs: Side-effectful gesture listener and mood/volume synchronization.
 * Deliberately excludes: Auto-starting audio prior to a genuine pointerdown or keydown gesture, or starting audio when clicking Mute.
 */
import { useEffect } from "react";
import type { MissionMood } from "@apna-area/shared";
import { ambientAudio } from "./ambient";

export interface UseAmbientSyncParams {
  enabled: boolean;
  mood: MissionMood;
  ducked: boolean;
  muted: boolean;
}

/**
 * Synchronizes React mood, voice-ducking, and mute state with the gesture-gated Lyria loop controller.
 *
 * @param params - Runtime feature flag, target mood, voice-session ducking flag, and persisted mute flag.
 */
export function useAmbientSync({ enabled, mood, ducked, muted }: UseAmbientSyncParams): void {
  useEffect(() => {
    if (!enabled) {
      ambientAudio.setMuted(true);
      return;
    }
    ambientAudio.setMuted(muted);
  }, [enabled, muted]);

  useEffect(() => {
    if (!enabled) return;
    ambientAudio.setDucked(ducked);
  }, [enabled, ducked]);

  useEffect(() => {
    if (!enabled) return;
    ambientAudio.setMood(mood);
  }, [enabled, mood]);

  useEffect(() => {
    if (!enabled || ambientAudio.isUnlocked()) return;

    const detach = (): void => {
      window.removeEventListener("pointerdown", onFirstGesture, { capture: true });
      window.removeEventListener("keydown", onFirstGesture, { capture: true });
    };

    const onFirstGesture = (ev: Event): void => {
      if (
        ev instanceof KeyboardEvent &&
        (ev.key === "Shift" || ev.key === "Meta" || ev.key === "Control" || ev.key === "Alt")
      ) {
        return;
      }
      if (ev.target instanceof Element && ev.target.closest('[data-testid="ambient-mute-btn"]')) {
        return;
      }
      ambientAudio.unlockFromUserGesture();
      detach();
    };

    window.addEventListener("pointerdown", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onFirstGesture, { capture: true });
    return detach;
  }, [enabled]);
}
