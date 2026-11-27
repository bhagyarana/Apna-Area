/**
 * Feature: User-Gesture AudioContext Unlocker (web/src/live/audioUnlock.ts)
 * Purpose: Creates and resumes a browser AudioContext synchronously inside a pointer/keyboard gesture before async React renders or network awaits.
 * Inputs: Synchronous user click or key press on "Talk with <NPC>" or "Retry".
 * Outputs: Resumed AudioContext ready for AudioWorklet capture and 24 kHz PCM playback.
 * Deliberately excludes: Autoplay calls outside user gestures.
 */
let unlockedContext: AudioContext | null = null;

/**
 * Synchronously creates (if needed) and resumes an AudioContext inside an active user gesture.
 *
 * @returns Active AudioContext instance.
 */
export function primeUserGestureAudioContext(): AudioContext {
  if (!unlockedContext || unlockedContext.state === "closed") {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    unlockedContext = new AudioCtx();
  }
  if (unlockedContext.state === "suspended") {
    void unlockedContext.resume();
  }
  return unlockedContext;
}

/**
 * Closes and releases any active AudioContext at the end of a voice mission.
 */
export function releaseUserGestureAudioContext(): void {
  if (unlockedContext && unlockedContext.state !== "closed") {
    void unlockedContext.close().catch(() => {});
  }
  unlockedContext = null;
}
