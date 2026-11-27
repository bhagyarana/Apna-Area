/**
 * Feature: PCM Resampler & Base64 Codec Unit Tests (T3a.2)
 * Purpose: Verifies 48 kHz -> 16 kHz decimation length, saturation clamping, base64 round-trip fidelity, and RMS metering.
 * Inputs: Synthetic sine waves, overdrive impulses, and silence frames.
 * Outputs: Vitest assertions.
 * Deliberately excludes: Browser AudioContext mocks.
 */
import { describe, expect, it } from "vitest";
import {
  base64ToFloat32Pcm,
  computeRmsLevel,
  downsampleFloat32ToInt16Pcm,
  int16PcmToBase64,
} from "../resample";

describe("web/live/resample", () => {
  it("downsamples 48 kHz Float32 audio to 16 kHz Int16 PCM at exact 3:1 ratio and clamps clipping", () => {
    const input = new Float32Array(4800);
    for (let i = 0; i < input.length; i += 1) {
      input[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
    }
    input[0] = 2.4;
    input[1] = 2.4;
    input[2] = 2.4;
    input[3] = -2.4;
    input[4] = -2.4;
    input[5] = -2.4;

    const pcm16 = downsampleFloat32ToInt16Pcm(input, 48000, 16000);
    expect(pcm16.length).toBe(1600);
    expect(pcm16[0]).toBe(32767);
    expect(pcm16[1]).toBe(-32768);
  });

  it("round-trips Int16 PCM through base64 into normalised Float32 samples", () => {
    const original = new Int16Array([0, 16384, -16384, 32767, -32768]);
    const b64 = int16PcmToBase64(original);
    const decoded = base64ToFloat32Pcm(b64);

    expect(decoded.length).toBe(5);
    expect(decoded[0]).toBeCloseTo(0, 4);
    expect(decoded[1]).toBeCloseTo(0.5, 3);
    expect(decoded[2]).toBeCloseTo(-0.5, 3);
    expect(decoded[3]).toBeCloseTo(32767 / 32768, 4);
    expect(decoded[4]).toBeCloseTo(-1, 4);
  });

  it("computes 0 RMS on silence and positive bounded RMS on speech energy", () => {
    expect(computeRmsLevel(new Float32Array(256))).toBe(0);
    const loud = new Float32Array(256).fill(0.5);
    expect(computeRmsLevel(loud)).toBe(1);
    const moderate = new Float32Array(256).fill(0.1);
    expect(computeRmsLevel(moderate)).toBeCloseTo(0.36, 2);
  });
});
