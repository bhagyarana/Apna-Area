/**
 * Feature: Shared Config Unit Tests
 * Purpose: Verifies MODEL_IDS, ORR_BBOX coordinates, and safety caps match project rules.
 * Inputs: Constants from shared/src/config.ts.
 * Outputs: Vitest assertions.
 * Deliberately excludes: Network requests.
 */
import { describe, expect, it } from "vitest";
import { ENABLED_LANGUAGES, MODEL_IDS, ORR_BBOX, SAFETY_LIMITS } from "../config.js";

describe("shared/config", () => {
  it("exports exact verified Gemini 4, Decisions, Live, TTS, Nano Banana, and Lyria model IDs", () => {
    expect(MODEL_IDS).toEqual({
      frontierDeep: "gemini-4-carbon",
      frontierFast: "gemini-4-neon",
      fastWorkhorse: "gemini-4-hydrogen",
      textFastLite: "gemini-3.5-flash-lite",
      decisions: "gemini-decision-1",
      liveVoice: "gemini-3.8-live",
      ttsStudio: "gemini-3.8-flash-tts",
      imageDefault: "gemini-nano-banana-2.1",
      musicLoop: "lyria-3-clip-preview",
      musicSong: "lyria-3.5",
    });
  });

  it("defines a valid eastern ORR bounding box from Silk Board to Marathahalli", () => {
    expect(ORR_BBOX.north).toBeGreaterThan(ORR_BBOX.south);
    expect(ORR_BBOX.east).toBeGreaterThan(ORR_BBOX.west);
    expect(ORR_BBOX.south).toBeLessThanOrEqual(12.9177);
    expect(ORR_BBOX.north).toBeGreaterThanOrEqual(12.9569);
  });

  it("starts with English enabled and caps Live sessions at 90 seconds", () => {
    expect(ENABLED_LANGUAGES).toEqual(["en"]);
    expect(SAFETY_LIMITS.maxLiveSessionSeconds).toBe(90);
  });
});
