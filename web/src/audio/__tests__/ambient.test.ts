/**
 * Feature: Gesture-Gated Ambient Controller Unit Tests (web/src/audio/__tests__/ambient.test.ts)
 * Purpose: Proves ambient loops never play before a user gesture, crossfade cleanly across MissionMoods, duck during voice missions, and honour mute state.
 * Inputs: Deterministic mock LoopTrackHandle instances and fake timers.
 * Outputs: Vitest assertions.
 * Deliberately excludes: Browser HTMLAudioElement network decoding.
 */
import { describe, expect, it, vi } from "vitest";
import { createAmbientController, type LoopTrackHandle } from "../ambient";

interface MockTrack extends LoopTrackHandle {
  src: string;
  playCalls: number;
  pauseCalls: number;
}

function makeMockTrack(src: string): MockTrack {
  const track: MockTrack = {
    src,
    volume: 0,
    loop: false,
    playCalls: 0,
    pauseCalls: 0,
    play: async () => {
      track.playCalls += 1;
    },
    pause: () => {
      track.pauseCalls += 1;
    },
  };
  return track;
}

describe("web/audio/ambient", () => {
  it("never calls play() before unlockFromUserGesture(), then plays at low volume and crossfades moods", () => {
    vi.useFakeTimers();
    const created = new Map<string, MockTrack>();
    const ctrl = createAmbientController({
      createTrack: (src) => {
        const t = makeMockTrack(src);
        created.set(src, t);
        return t;
      },
      crossfadeMs: 600,
      defaultVolume: 0.18,
      duckedVolume: 0.04,
    });

    // Mood updates before gesture must NEVER instantiate or play audio
    ctrl.setMood("morning");
    expect(ctrl.isUnlocked()).toBe(false);
    expect(created.size).toBe(0);

    // First user gesture unlocks and starts morning loop at low default volume
    ctrl.unlockFromUserGesture();
    expect(ctrl.isUnlocked()).toBe(true);
    const morning = created.get("/audio/morning.mp3")!;
    expect(morning.playCalls).toBe(1);
    expect(morning.volume).toBeCloseTo(0.18, 3);

    // Crossfade from morning -> rush over 600ms
    ctrl.setMood("rush");
    const rush = created.get("/audio/rush.mp3")!;
    expect(rush.playCalls).toBe(1);
    expect(rush.volume).toBe(0);

    vi.advanceTimersByTime(700);
    expect(rush.volume).toBeCloseTo(0.18, 3);
    expect(morning.volume).toBe(0);
    expect(morning.pauseCalls).toBeGreaterThanOrEqual(1);

    // Ducking during Live voice mission lowers gain to 0.04, then restores to 0.18
    ctrl.setDucked(true);
    expect(rush.volume).toBeCloseTo(0.04, 3);
    ctrl.setDucked(false);
    expect(rush.volume).toBeCloseTo(0.18, 3);

    // Muting pauses immediately and keeps play() blocked while muted
    ctrl.setMuted(true);
    expect(rush.volume).toBe(0);
    expect(rush.pauseCalls).toBeGreaterThanOrEqual(1);

    ctrl.setMood("evening");
    expect(created.has("/audio/evening.mp3")).toBe(false);

    ctrl.setMuted(false);
    expect(created.get("/audio/evening.mp3")?.playCalls).toBe(1);

    ctrl.dispose();
    vi.useRealTimers();
  });
});
