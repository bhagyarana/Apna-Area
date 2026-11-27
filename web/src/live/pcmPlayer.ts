/**
 * Feature: Gapless 24 kHz PCM Playback Queue with Barge-In Flush (web/src/live/pcmPlayer.ts)
 * Purpose: Schedules incoming 24 kHz Int16 PCM chunks from Gemini 3.8 Live onto WebAudio and flushes instantly on interruption.
 * Inputs: Resumed AudioContext and base64 24 kHz PCM strings.
 * Outputs: PcmPlayerHandle with enqueue, flush, remainingMs, and dispose helpers.
 * Deliberately excludes: HTMLAudioElement buffering lag or uninterruptible playback queues.
 */
import { LIVE_VOICE_CONFIG } from "@apna-area/shared";
import { base64ToFloat32Pcm, computeRmsLevel } from "./resample";

export interface PcmPlayerHandle {
  enqueueBase64Pcm24k: (base64: string) => number;
  flush: () => void;
  remainingMs: () => number;
  isPlaying: () => boolean;
}

/**
 * Creates a gapless 24 kHz PCM queue attached to the provided AudioContext.
 *
 * @param audioContext - User-gesture-resumed AudioContext.
 * @param onPlaybackState - Optional listener notified when NPC audio starts or drains.
 * @returns PcmPlayerHandle with instant barge-in flush.
 */
export function createPcmPlayer(
  audioContext: AudioContext,
  onPlaybackState?: (speaking: boolean) => void,
): PcmPlayerHandle {
  const activeSources = new Set<AudioBufferSourceNode>();
  let scheduledUntil = 0;

  return {
    enqueueBase64Pcm24k(base64: string): number {
      const floatSamples = base64ToFloat32Pcm(base64);
      if (floatSamples.length === 0) {
        return 0;
      }

      const buffer = audioContext.createBuffer(
        1,
        floatSamples.length,
        LIVE_VOICE_CONFIG.outputSampleRateHz,
      );
      buffer.getChannelData(0).set(floatSamples);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      const startAt = Math.max(audioContext.currentTime + 0.015, scheduledUntil);
      scheduledUntil = startAt + buffer.duration;

      if (activeSources.size === 0) {
        onPlaybackState?.(true);
      }
      activeSources.add(source);

      source.onended = () => {
        activeSources.delete(source);
        if (activeSources.size === 0) {
          onPlaybackState?.(false);
        }
      };

      source.start(startAt);
      return computeRmsLevel(floatSamples);
    },

    flush(): void {
      for (const source of activeSources) {
        try {
          source.onended = null;
          source.stop();
          source.disconnect();
        } catch {
          // Ignore already-stopped nodes
        }
      }
      activeSources.clear();
      scheduledUntil = 0;
      onPlaybackState?.(false);
    },

    remainingMs(): number {
      return Math.max(0, Math.round((scheduledUntil - audioContext.currentTime) * 1000));
    },

    isPlaying(): boolean {
      return activeSources.size > 0;
    },
  };
}
