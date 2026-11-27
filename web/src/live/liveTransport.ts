/**
 * Feature: Gemini 3.8 Live Browser WebSocket Transport (web/src/live/liveTransport.ts)
 * Purpose: Lazily loads @google/genai on demand and connects to gemini-3.8-live using a server-minted ephemeral token.
 * Inputs: Ephemeral LiveTokenData and callbacks for 24 kHz audio, transcriptions, barge-in interruptions, and tool calls.
 * Outputs: LiveTransportSession handle supporting 16 kHz PCM streaming, text fallback, tool responses, and clean teardown.
 * Deliberately excludes: Bundling @google/genai in the initial landing chunk or holding GEMINI_API_KEY in the browser.
 */
import { buildSharedLiveTools, type LiveTokenData } from "@apna-area/shared";

export interface LiveToolCallItem {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LiveTransportCallbacks {
  onOpen: () => void;
  onAudioChunk24k: (base64Pcm: string) => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onToolCalls: (calls: readonly LiveToolCallItem[]) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export interface LiveTransportSession {
  sendAudio16k: (base64Pcm: string) => void;
  sendAudioStreamEnd: () => void;
  sendText: (text: string) => void;
  sendToolResponses: (
    responses: ReadonlyArray<{ id?: string; name: string; result: string }>,
  ) => void;
  close: () => void;
}

export type LiveTransportFactory = (
  tokenData: LiveTokenData,
  callbacks: LiveTransportCallbacks,
) => Promise<LiveTransportSession>;

declare global {
  interface Window {
    __APNA_TEST_LIVE_TRANSPORT__?: LiveTransportFactory;
  }
}

/**
 * Connects to Gemini 3.8 Live via an ephemeral token (or Playwright test transport when explicitly injected).
 *
 * @param tokenData - Server-minted ephemeral token metadata from POST /api/live-token.
 * @param callbacks - Event handlers for audio, captions, interruptions, and NON_BLOCKING tools.
 * @returns Connected LiveTransportSession.
 */
export async function connectLiveTransport(
  tokenData: LiveTokenData,
  callbacks: LiveTransportCallbacks,
): Promise<LiveTransportSession> {
  if (typeof window !== "undefined" && window.__APNA_TEST_LIVE_TRANSPORT__) {
    return window.__APNA_TEST_LIVE_TRANSPORT__(tokenData, callbacks);
  }

  const { Behavior, GoogleGenAI, Modality } = await import("@google/genai");
  const ai = new GoogleGenAI({
    apiKey: tokenData.token,
    httpOptions: { apiVersion: tokenData.apiVersion },
  });

  const sharedTools = buildSharedLiveTools(tokenData.includePhraseTool);
  const functionDeclarations = sharedTools.map((decl) => ({
    name: decl.name,
    description: decl.description,
    behavior: Behavior.NON_BLOCKING,
    parameters: decl.parameters,
  }));

  let closed = false;
  const session = await ai.live.connect({
    model: tokenData.model,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: tokenData.voiceName },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      sessionResumption: {},
      tools: [{ functionDeclarations: functionDeclarations as never }],
    },
    callbacks: {
      onopen: () => {
        callbacks.onOpen();
      },
      onmessage: (msg) => {
        const sc = msg.serverContent;
        if (sc) {
          if (sc.interrupted) {
            callbacks.onInterrupted();
          }
          if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) {
                callbacks.onAudioChunk24k(part.inlineData.data);
              }
            }
          }
          if (sc.inputTranscription?.text) {
            callbacks.onInputTranscript(sc.inputTranscription.text);
          }
          if (sc.outputTranscription?.text) {
            callbacks.onOutputTranscript(sc.outputTranscription.text);
          }
          if (sc.turnComplete) {
            callbacks.onTurnComplete();
          }
        }

        if (msg.toolCall?.functionCalls && msg.toolCall.functionCalls.length > 0) {
          const mapped: LiveToolCallItem[] = msg.toolCall.functionCalls
            .filter((fc): fc is NonNullable<typeof fc> & { name: string } => Boolean(fc?.name))
            .map((fc) => ({
              id: fc.id,
              name: fc.name,
              args: (fc.args as Record<string, unknown> | undefined) ?? {},
            }));
          if (mapped.length > 0) {
            callbacks.onToolCalls(mapped);
          }
        }
      },
      onerror: (err: ErrorEvent) => {
        if (!closed) {
          callbacks.onError(err.message || "Voice connection dropped.");
        }
      },
      onclose: () => {
        if (!closed) {
          closed = true;
          callbacks.onClose();
        }
      },
    },
  });

  return {
    sendAudio16k(base64Pcm: string): void {
      if (!closed && base64Pcm.length > 0) {
        session.sendRealtimeInput({
          audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" },
        });
      }
    },
    sendAudioStreamEnd(): void {
      if (!closed) {
        session.sendRealtimeInput({ audioStreamEnd: true });
      }
    },
    sendText(text: string): void {
      if (!closed && text.trim().length > 0) {
        session.sendRealtimeInput({ text: text.trim() });
      }
    },
    sendToolResponses(responses): void {
      if (!closed && responses.length > 0) {
        session.sendToolResponse({
          functionResponses: responses.map((r) => ({
            id: r.id,
            name: r.name,
            response: { result: r.result },
          })),
        });
      }
    },
    close(): void {
      if (!closed) {
        closed = true;
        session.close();
      }
    },
  };
}
