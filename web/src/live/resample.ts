/**
 * Feature: Pure 16 kHz / 24 kHz PCM Resampler, Base64 Codec & RMS Meter (web/src/live/resample.ts)
 * Purpose: Downsamples browser Float32 mic audio (44.1/48 kHz) to 16 kHz 16-bit little-endian PCM and decodes 24 kHz NPC PCM chunks.
 * Inputs: Float32Array WebAudio samples or base64-encoded Int16 PCM strings.
 * Outputs: Int16Array buffers, base64 strings, normalised Float32Array playback buffers, and [0..1] RMS levels.
 * Deliberately excludes: DOM/AudioContext globals so every codec path is 100% unit-testable in Node.
 */
import { LIVE_VOICE_CONFIG } from "@apna-area/shared";

/**
 * Downsamples mono Float32 audio into 16-bit signed PCM using boxcar averaging to prevent aliasing.
 *
 * @param input - Mono Float32Array in [-1, 1].
 * @param sourceSampleRate - Native AudioContext sample rate (e.g. 48000).
 * @param targetSampleRate - Target Live API sample rate (defaults to 16000).
 * @returns Int16Array of downsampled little-endian PCM frames.
 */
export function downsampleFloat32ToInt16Pcm(
  input: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number = LIVE_VOICE_CONFIG.inputSampleRateHz,
): Int16Array {
  if (input.length === 0 || sourceSampleRate <= 0 || targetSampleRate <= 0) {
    return new Int16Array(0);
  }

  if (sourceSampleRate === targetSampleRate) {
    const direct = new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, input[i] ?? 0));
      direct[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    }
    return direct;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outputLength);

  let offsetBuffer = 0;
  for (let i = 0; i < outputLength; i += 1) {
    const nextOffsetBuffer = Math.min(input.length, Math.round((i + 1) * ratio));
    let accum = 0;
    let count = 0;
    for (let j = offsetBuffer; j < nextOffsetBuffer; j += 1) {
      accum += input[j] ?? 0;
      count += 1;
    }
    const sample = count > 0 ? accum / count : (input[offsetBuffer] ?? 0);
    const clamped = Math.max(-1, Math.min(1, sample));
    output[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

/**
 * Encodes an Int16Array of little-endian PCM samples into a base64 string.
 *
 * @param samples - Signed 16-bit PCM array.
 * @returns Base64 string suitable for sendRealtimeInput({ audio }).
 */
export function int16PcmToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Decodes a base64-encoded 16-bit little-endian PCM chunk into normalised [-1, 1] Float32 samples.
 *
 * @param base64 - Base64 audio chunk from Gemini 3.8 Live serverContent.
 * @returns Float32Array ready for an AudioBuffer at 24 kHz.
 */
export function base64ToFloat32Pcm(base64: string): Float32Array {
  if (!base64) {
    return new Float32Array(0);
  }
  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } else {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
  }

  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / 0x8000;
  }
  return float32;
}

/**
 * Computes a clamped [0..1] Root-Mean-Square level for driving the 72px mic amplitude ring.
 *
 * @param samples - Float32 audio frame.
 * @returns Normalised visual amplitude in [0, 1].
 */
export function computeRmsLevel(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }
  let sumSq = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i] ?? 0;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / samples.length);
  return Math.min(1, Number((rms * 3.6).toFixed(3)));
}
