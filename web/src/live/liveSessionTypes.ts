/**
 * Feature: Live Session State Types, Tool Reducer & Ephemeral Token Fetcher (web/src/live/liveSessionTypes.ts)
 * Purpose: Defines LiveSessionStatus, LiveSessionState, NON_BLOCKING tool state reducer, and validated POST /api/live-token fetch helper.
 * Inputs: Validated LiveTokenRequest payload and incoming LiveToolCallItem arrays.
 * Outputs: Typed FetchEphemeralTokenResult and deterministic tool call state transitions.
 * Deliberately excludes: WebAudio or WebSocket state.
 */
import {
  fetchWithRetry,
  LiveTokenDataSchema,
  SAFETY_LIMITS,
  TIMEOUTS_MS,
  toUserErrorMessage,
  type LiveTokenData,
  type LiveTokenRequest,
  type LiveToolSignals,
  type SurvivalPhrase,
  type TranscriptTurn,
} from "@apna-area/shared";
import type { LiveToolCallItem } from "./liveTransport";

export type LiveSessionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "npc_speaking"
  | "permission_denied"
  | "completed"
  | "error";

export interface LiveSessionState {
  status: LiveSessionStatus;
  secondsRemaining: number;
  npcCaption: string;
  playerCaption: string;
  transcript: readonly TranscriptTurn[];
  activeHint: string | null;
  targetPhrase: SurvivalPhrase | null;
  rmsLevel: number;
  muted: boolean;
  toolSignals: LiveToolSignals;
  errorMessage: string | null;
}

export const INITIAL_LIVE_SIGNALS: LiveToolSignals = {
  hintsGiven: 0,
  objectiveCompleted: false,
};

export const INITIAL_LIVE_STATE: LiveSessionState = {
  status: "idle",
  secondsRemaining: SAFETY_LIMITS.maxLiveSessionSeconds,
  npcCaption: "",
  playerCaption: "",
  transcript: [],
  activeHint: null,
  targetPhrase: null,
  rmsLevel: 0,
  muted: false,
  toolSignals: INITIAL_LIVE_SIGNALS,
  errorMessage: null,
};

export type FetchEphemeralTokenResult =
  | { ok: true; data: LiveTokenData }
  | { ok: false; error: string };

/**
 * Applies NON_BLOCKING tool calls from Gemini 3.8 Live onto LiveSessionState and produces tool responses.
 *
 * @param prev - Current LiveSessionState.
 * @param calls - Tool calls emitted by the model.
 * @param fallbackHint - First hint in mission hintLadder when hintText is omitted.
 * @returns Updated state, completion flag, and function response items.
 */
export function applyLiveToolCalls(
  prev: LiveSessionState,
  calls: readonly LiveToolCallItem[],
  fallbackHint: string,
): {
  nextState: LiveSessionState;
  objectiveJustCompleted: boolean;
  responses: ReadonlyArray<{ id?: string; name: string; result: string }>;
} {
  let nextState = prev;
  let objectiveJustCompleted = false;
  const responses = calls.map((call) => {
    if (call.name === "give_hint") {
      const hintText = String(call.args.hintText ?? fallbackHint);
      nextState = {
        ...nextState,
        activeHint: hintText,
        toolSignals: { ...nextState.toolSignals, hintsGiven: nextState.toolSignals.hintsGiven + 1 },
      };
      return { id: call.id, name: call.name, result: "shown" };
    }
    if (call.name === "mark_phrase_attempt") {
      const quality = call.args.quality === "clear" ? "clear" : "partial";
      nextState = {
        ...nextState,
        toolSignals: { ...nextState.toolSignals, phraseQuality: quality },
      };
      return { id: call.id, name: call.name, result: "recorded" };
    }
    if (call.name === "complete_objective") {
      objectiveJustCompleted = true;
      const summary = String(call.args.summary ?? "You completed this stop cleanly.");
      nextState = {
        ...nextState,
        toolSignals: { ...nextState.toolSignals, objectiveCompleted: true, completionSummary: summary },
      };
      return { id: call.id, name: call.name, result: "completed" };
    }
    return { id: call.id, name: call.name, result: "ignored" };
  });

  return { nextState, objectiveJustCompleted, responses };
}

/**
 * Advances the local hint ladder by one step on LiveSessionState.
 *
 * @param prev - Current LiveSessionState.
 * @param hintLadder - Ordered 3-step hint ladder for the active mission.
 * @returns Updated LiveSessionState with activeHint populated.
 */
export function applyLocalHintStep(
  prev: LiveSessionState,
  hintLadder: readonly string[],
): LiveSessionState {
  const idx = Math.min(hintLadder.length - 1, prev.toolSignals.hintsGiven);
  return {
    ...prev,
    activeHint: hintLadder[idx] ?? hintLadder[0] ?? null,
    toolSignals: { ...prev.toolSignals, hintsGiven: prev.toolSignals.hintsGiven + 1 },
  };
}

/**
 * Appends any buffered input/output speech drafts onto LiveSessionState transcript turns.
 *
 * @param prev - Current LiveSessionState.
 * @param playerDraft - Buffered input speech draft.
 * @param npcDraft - Buffered output speech draft.
 * @param completed - When true, sets status to "completed".
 * @returns Updated LiveSessionState with flushed transcript turns.
 */
export function appendDraftTurns(
  prev: LiveSessionState,
  playerDraft: string,
  npcDraft: string,
  completed = false,
): LiveSessionState {
  const pTxt = playerDraft.trim();
  const nTxt = npcDraft.trim();
  const now = Date.now();
  const extra: TranscriptTurn[] = [];
  if (pTxt) extra.push({ speaker: "player", text: pTxt, timestampMs: now });
  if (nTxt) extra.push({ speaker: "npc", text: nTxt, timestampMs: now });
  return {
    ...prev,
    ...(completed ? { status: "completed" as const } : {}),
    rmsLevel: 0,
    playerCaption: pTxt || prev.playerCaption,
    npcCaption: nTxt || prev.npcCaption,
    transcript: extra.length > 0 ? [...prev.transcript, ...extra] : prev.transcript,
  };
}

/**
 * Selects the initial scene greeting text matching the active language and comfort mode.
 *
 * @param req - Active LiveTokenRequest.
 * @returns Short opening greeting sent on WebSocket open.
 */
export function openingCueForRequest(req: LiveTokenRequest): string {
  if (req.activeLanguage === "hi") {
    return req.languageComfort === "en_hi" ? "Namaste! Hello!" : "नमस्ते!";
  }
  return "Hello!";
}

/**
 * Requests a short-lived server-locked ephemeral token from POST /api/live-token with timeout and retry.
 *
 * @param req - Validated mission, place, difficulty, and language context.
 * @returns Typed FetchEphemeralTokenResult.
 */
export async function fetchEphemeralToken(
  req: LiveTokenRequest,
): Promise<FetchEphemeralTokenResult> {
  try {
    const res = await fetchWithRetry("/api/live-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      timeoutMs: TIMEOUTS_MS.liveToken,
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: unknown;
      error?: { message?: string };
    };
    const parsed = LiveTokenDataSchema.safeParse(json.data);
    if (!res.ok || !json.ok || !parsed.success) {
      return {
        ok: false,
        error:
          json.error?.message ?? "Voice connection dropped. Tap Retry to reconnect to this mission.",
      };
    }
    return { ok: true, data: parsed.data };
  } catch (err: unknown) {
    return {
      ok: false,
      error: toUserErrorMessage(
        err,
        "Voice connection timed out, so tap Retry to reconnect to this mission.",
        "You appear to be offline, so reconnect and tap Retry to start this voice mission.",
      ),
    };
  }
}
