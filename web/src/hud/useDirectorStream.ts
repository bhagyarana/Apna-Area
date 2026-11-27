/**
 * Feature: Client SSE Stream Hook for POST /api/world (web/src/hud/useDirectorStream.ts)
 * Purpose: Streams live WorldProgressEvents over POST /api/world SSE with automatic JSON fallback on proxy buffering or network drop.
 * Inputs: Validated WorldRequest when the player clicks "Build my first week".
 * Outputs: Reactive status ("idle" | "generating" | "week_ready" | "error"), progress chip items, verified WeekPlan, and abort/reset controls.
 * Deliberately excludes: Hardcoded fake progress timers or unvalidated payloads.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WorldPlanPayloadSchema,
  WorldProgressEventSchema,
  type WeekPlan,
  type WorldRequest,
} from "@apna-area/shared";
import type { ProgressChipItem } from "./ProgressChips";

export type DirectorStatus = "idle" | "generating" | "week_ready" | "error";

export interface DirectorState {
  status: DirectorStatus;
  chips: readonly ProgressChipItem[];
  weekPlan: WeekPlan | null;
  replayed: boolean;
  errorMessage: string | null;
}

const INITIAL_STATE: DirectorState = {
  status: "idle",
  chips: [],
  weekPlan: null,
  replayed: false,
  errorMessage: null,
};

async function fetchWorldJsonFallback(
  req: WorldRequest,
  signal: AbortSignal,
): Promise<{ plan: WeekPlan; replayed: boolean }> {
  const res = await fetch("/api/world", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(req),
    signal,
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: unknown;
    error?: { message?: string };
  };
  if (!res.ok || !json.ok) {
    throw new Error(
      json.error?.message ??
        "Could not build your Week One plan right now, so tap Build my first week to retry.",
    );
  }
  const parsed = WorldPlanPayloadSchema.parse(json.data);
  return { plan: parsed.plan, replayed: parsed.replayed };
}

/**
 * React hook managing the SSE request lifecycle for Week One generation.
 *
 * @returns Current DirectorState plus buildWeek, cancelGeneration, and clearWeek actions.
 */
export function useDirectorStream() {
  const [state, setState] = useState<DirectorState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const clearWeek = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const buildWeek = useCallback(async (req: WorldRequest): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: "generating",
      chips: [
        {
          step: "scanning",
          detail: "Scanning verified Outer Ring Road places near your office",
          done: false,
        },
      ],
      weekPlan: null,
      replayed: false,
      errorMessage: null,
    });

    try {
      const response = await fetch("/api/world", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const fallback = await fetchWorldJsonFallback(req, controller.signal);
        setState({
          status: "week_ready",
          chips: [],
          weekPlan: fallback.plan,
          replayed: fallback.replayed,
          errorMessage: null,
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (!completed) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const frame of parts) {
          const dataLine = frame
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) {
            continue;
          }
          const parsed = WorldProgressEventSchema.safeParse(
            JSON.parse(dataLine.slice(6)) as unknown,
          );
          if (!parsed.success) {
            continue;
          }
          const ev = parsed.data;
          if (ev.type === "progress") {
            setState((prev) => {
              const markedDone = prev.chips.map((c) => ({ ...c, done: true }));
              const existingIdx = markedDone.findIndex((c) => c.step === ev.step);
              if (existingIdx >= 0) {
                markedDone[existingIdx] = {
                  step: ev.step,
                  detail: ev.detail,
                  done: ev.step === "verified",
                };
                return { ...prev, chips: markedDone };
              }
              return {
                ...prev,
                chips: [
                  ...markedDone,
                  { step: ev.step, detail: ev.detail, done: ev.step === "verified" },
                ],
              };
            });
          } else if (ev.type === "complete") {
            completed = true;
            setState({
              status: "week_ready",
              chips: [],
              weekPlan: ev.plan,
              replayed: ev.replayed,
              errorMessage: null,
            });
          } else if (ev.type === "error") {
            completed = true;
            setState({
              status: "error",
              chips: [],
              weekPlan: null,
              replayed: false,
              errorMessage: ev.message,
            });
          }
        }
      }

      if (!completed && !controller.signal.aborted) {
        const fallback = await fetchWorldJsonFallback(req, controller.signal);
        setState({
          status: "week_ready",
          chips: [],
          weekPlan: fallback.plan,
          replayed: fallback.replayed,
          errorMessage: null,
        });
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      setState({
        status: "error",
        chips: [],
        weekPlan: null,
        replayed: false,
        errorMessage:
          err instanceof Error
            ? err.message
            : "Could not build your Week One plan right now, so please retry.",
      });
    }
  }, []);

  return {
    director: state,
    buildWeek,
    cancelGeneration: clearWeek,
    clearWeek,
  };
}
