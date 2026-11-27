/**
 * Feature: Gesture-Gated Lyria Ambient Loop Crossfader (web/src/audio/ambient.ts)
 * Purpose: Plays pre-generated 30s Lyria instrumental loops strictly after a user gesture, crossfades by MissionMood, ducks during Live voice, and persists mute state.
 * Inputs: Active MissionMood ("calm" | "morning" | "rush" | "evening"), muted boolean, and ducked boolean.
 * Outputs: Testable createAmbientController factory and browser singleton controller.
 * Deliberately excludes: Autoplaying before user interaction or crashing when audio assets are blocked/missing.
 */
import { KIT_CONFIG, type MissionMood } from "@apna-area/shared";

export interface LoopTrackHandle {
  volume: number;
  loop: boolean;
  play: () => Promise<void>;
  pause: () => void;
}

export type TrackFactory = (src: string) => LoopTrackHandle;

export interface AmbientControllerOptions {
  createTrack?: TrackFactory;
  crossfadeMs?: number;
  defaultVolume?: number;
  duckedVolume?: number;
  scheduleStep?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelStep?: (id: ReturnType<typeof setTimeout>) => void;
}

export interface AmbientController {
  isUnlocked: () => boolean;
  isMuted: () => boolean;
  getCurrentMood: () => MissionMood;
  unlockFromUserGesture: () => void;
  setMood: (mood: MissionMood) => void;
  setMuted: (muted: boolean) => void;
  setDucked: (ducked: boolean) => void;
  dispose: () => void;
}

const MOOD_AUDIO_PATHS: Record<MissionMood, string> = {
  calm: "/audio/calm.mp3",
  morning: "/audio/morning.mp3",
  rush: "/audio/rush.mp3",
  evening: "/audio/evening.mp3",
};

function defaultBrowserTrackFactory(src: string): LoopTrackHandle {
  if (typeof Audio === "undefined") {
    return {
      volume: 0,
      loop: true,
      play: async () => {},
      pause: () => {},
    };
  }
  const el = new Audio(src);
  el.preload = "auto";
  el.loop = true;
  el.volume = 0;
  return {
    get volume() {
      return el.volume;
    },
    set volume(v: number) {
      el.volume = Math.max(0, Math.min(1, v));
    },
    get loop() {
      return el.loop;
    },
    set loop(flag: boolean) {
      el.loop = flag;
    },
    play: async () => {
      try {
        await el.play();
      } catch {
        // Browser autoplay policy or missing optional asset: degrade silently.
      }
    },
    pause: () => {
      el.pause();
    },
  };
}

/**
 * Creates a gesture-gated ambient soundtrack controller with smooth mood crossfades and voice ducking.
 *
 * @param opts - Optional track factory and timing overrides for deterministic unit tests.
 * @returns AmbientController instance.
 */
export function createAmbientController(opts: AmbientControllerOptions = {}): AmbientController {
  const createTrack = opts.createTrack ?? defaultBrowserTrackFactory;
  const crossfadeMs = opts.crossfadeMs ?? KIT_CONFIG.ambientCrossfadeMs;
  const defaultVolume = opts.defaultVolume ?? KIT_CONFIG.ambientDefaultVolume;
  const duckedVolume = opts.duckedVolume ?? KIT_CONFIG.ambientVoiceDuckedVolume;
  const scheduleStep = opts.scheduleStep ?? ((cb, ms) => setTimeout(cb, ms));
  const cancelStep = opts.cancelStep ?? ((id) => clearTimeout(id));

  const tracks = new Map<MissionMood, LoopTrackHandle>();
  let unlocked = false;
  let muted = false;
  let ducked = false;
  let activeMood: MissionMood = "calm";
  let playingMood: MissionMood | null = null;
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  const targetGain = (): number => (muted ? 0 : ducked ? duckedVolume : defaultVolume);

  const getOrCreateTrack = (mood: MissionMood): LoopTrackHandle => {
    let track = tracks.get(mood);
    if (!track) {
      track = createTrack(MOOD_AUDIO_PATHS[mood]);
      track.loop = true;
      tracks.set(mood, track);
    }
    return track;
  };

  const stopFade = (): void => {
    if (fadeTimer !== null) {
      cancelStep(fadeTimer);
      fadeTimer = null;
    }
  };

  const syncPlayback = (previousMood: MissionMood | null): void => {
    stopFade();
    if (!unlocked) return;

    if (muted) {
      for (const t of tracks.values()) {
        t.volume = 0;
        t.pause();
      }
      playingMood = null;
      return;
    }

    const desired = targetGain();
    const incoming = getOrCreateTrack(activeMood);
    const outgoing =
      previousMood && previousMood !== activeMood ? tracks.get(previousMood) ?? null : null;

    if (playingMood !== activeMood) {
      incoming.volume = outgoing ? 0 : desired;
      void incoming.play();
      playingMood = activeMood;
    }

    if (!outgoing || crossfadeMs <= 0) {
      incoming.volume = desired;
      return;
    }

    const steps = 6;
    const stepMs = Math.max(16, Math.round(crossfadeMs / steps));
    const startOut = outgoing.volume;
    let tick = 0;

    const advance = (): void => {
      tick += 1;
      const ratio = Math.min(1, tick / steps);
      incoming.volume = targetGain() * ratio;
      outgoing.volume = Math.max(0, startOut * (1 - ratio));
      if (ratio >= 1) {
        outgoing.volume = 0;
        outgoing.pause();
        fadeTimer = null;
        return;
      }
      fadeTimer = scheduleStep(advance, stepMs);
    };

    fadeTimer = scheduleStep(advance, stepMs);
  };

  return {
    isUnlocked: () => unlocked,
    isMuted: () => muted,
    getCurrentMood: () => activeMood,
    unlockFromUserGesture(): void {
      if (unlocked) return;
      unlocked = true;
      syncPlayback(null);
    },
    setMood(mood: MissionMood): void {
      if (mood === activeMood && playingMood === mood) return;
      const prev = playingMood;
      activeMood = mood;
      syncPlayback(prev);
    },
    setMuted(nextMuted: boolean): void {
      if (muted === nextMuted) return;
      muted = nextMuted;
      syncPlayback(playingMood);
    },
    setDucked(nextDucked: boolean): void {
      if (ducked === nextDucked) return;
      ducked = nextDucked;
      if (unlocked && !muted && playingMood) {
        const activeTrack = tracks.get(playingMood);
        if (activeTrack) activeTrack.volume = targetGain();
      }
    },
    dispose(): void {
      stopFade();
      for (const t of tracks.values()) {
        t.volume = 0;
        t.pause();
      }
      tracks.clear();
      playingMood = null;
    },
  };
}

/** Shared singleton ambient audio controller for the browser SPA. */
export const ambientAudio: AmbientController = createAmbientController();
