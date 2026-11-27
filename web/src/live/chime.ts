/**
 * Feature: Two-Note WebAudio Phrase Mastery Chime (web/src/live/chime.ts)
 * Purpose: Synthesizes a gentle, studio-grade two-note harmonic chime (E5 -> B5) on clear Kannada phrase mastery.
 * Inputs: Optional AudioContext from audioUnlock.ts.
 * Outputs: Non-blocking 280ms auditory confirmation with zero external network assets.
 * Deliberately excludes: Loud jarring alerts or autoplay outside unlocked contexts.
 */
import { primeUserGestureAudioContext } from "./audioUnlock";

/**
 * Plays a soft two-note ascending fifth chime when mark_phrase_attempt reports quality "clear".
 */
export function playPhraseMasteryChime(): void {
  try {
    const ctx = primeUserGestureAudioContext();
    if (ctx.state !== "running") {
      return;
    }
    const now = ctx.currentTime;
    const notes: ReadonlyArray<{ freq: number; offset: number; dur: number }> = [
      { freq: 659.25, offset: 0, dur: 0.14 },
      { freq: 987.77, offset: 0.09, dur: 0.22 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.freq, now + note.offset);
      gain.gain.setValueAtTime(0.0001, now + note.offset);
      gain.gain.exponentialRampToValueAtTime(0.055, now + note.offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.offset + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.offset);
      osc.stop(now + note.offset + note.dur + 0.02);
    }
  } catch {
    // Ignore WebAudio errors in headless/unsupported environments
  }
}
