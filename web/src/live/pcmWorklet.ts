/**
 * Feature: Browser AudioWorklet 16 kHz PCM Microphone Capture (web/src/live/pcmWorklet.ts)
 * Purpose: Captures echo-cancelled mono microphone audio via an inline Blob AudioWorkletProcessor and emits 16 kHz base64 PCM chunks.
 * Inputs: Resumed AudioContext and chunk callback (base64Pcm16k, rmsLevel).
 * Outputs: Active MicCaptureHandle with mute control and deterministic track/node cleanup.
 * Deliberately excludes: External worker file paths that can 404 behind SPA static routers.
 */
import {
  computeRmsLevel,
  downsampleFloat32ToInt16Pcm,
  int16PcmToBase64,
} from "./resample";

const WORKLET_PROCESSOR_NAME = "apna-pcm-capture-processor";
const registeredContexts = new WeakSet<AudioContext>();

const WORKLET_SOURCE = `
class ApnaPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._offset = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset >= this._buffer.length) {
        this.port.postMessage(this._buffer.slice(0));
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("${WORKLET_PROCESSOR_NAME}", ApnaPcmCaptureProcessor);
`;

export interface MicCaptureHandle {
  setMuted: (muted: boolean) => void;
  stop: () => void;
}

/**
 * Starts echo-cancelled microphone capture and streams downsampled 16 kHz base64 PCM chunks.
 *
 * @param audioContext - User-gesture-resumed browser AudioContext.
 * @param onChunk - Invoked every ~42ms with base64 16 kHz Int16 PCM and [0..1] RMS level.
 * @returns MicCaptureHandle to mute or stop capture cleanly.
 */
export async function startMicPcmCapture(
  audioContext: AudioContext,
  onChunk: (base64Pcm16k: string, rms: number) => void,
): Promise<MicCaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  });

  if (!registeredContexts.has(audioContext)) {
    const blob = new Blob([WORKLET_SOURCE], { type: "application/javascript" });
    const moduleUrl = URL.createObjectURL(blob);
    try {
      await audioContext.audioWorklet.addModule(moduleUrl);
      registeredContexts.add(audioContext);
    } catch (err: unknown) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      throw err;
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
  }

  const source = audioContext.createMediaStreamSource(stream);
  const workletNode = new AudioWorkletNode(audioContext, WORKLET_PROCESSOR_NAME);
  let muted = false;

  workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (muted) {
      onChunk("", 0);
      return;
    }
    const samples = event.data;
    const rms = computeRmsLevel(samples);
    const pcm16 = downsampleFloat32ToInt16Pcm(samples, audioContext.sampleRate);
    if (pcm16.length > 0) {
      onChunk(int16PcmToBase64(pcm16), rms);
    }
  };

  source.connect(workletNode);

  return {
    setMuted(nextMuted: boolean): void {
      muted = nextMuted;
    },
    stop(): void {
      workletNode.port.onmessage = null;
      try {
        source.disconnect();
        workletNode.disconnect();
      } catch {
        // Ignore already-disconnected graph nodes during teardown
      }
      for (const track of stream.getTracks()) {
        track.stop();
      }
    },
  };
}
