/**
 * Feature: Shared Types & Envelope Unit Tests
 * Purpose: Verifies Zod boundary validation and typed API success/error builders.
 * Inputs: Valid and malformed schema inputs.
 * Outputs: Vitest assertions.
 * Deliberately excludes: Fastify transport layer.
 */
import { describe, expect, it } from "vitest";
import {
  createApiError,
  createApiSuccess,
  DifficultyStateSchema,
  HealthDataSchema,
  PhraseSituationSchema,
} from "../types.js";

describe("shared/types", () => {
  it("validates HealthData payloads and rejects negative place counts", () => {
    const ok = HealthDataSchema.safeParse({
      status: "ok",
      version: "0.1.0",
      commit: "abc1234",
      builtAt: "2026-11-27T08:00:00Z",
      upstreams: { placesLoaded: 0, geminiConfigured: false, mapsConfigured: false },
    });
    expect(ok.success).toBe(true);

    const bad = HealthDataSchema.safeParse({
      status: "ok",
      version: "0.1.0",
      commit: "abc1234",
      builtAt: "2026-11-27T08:00:00Z",
      upstreams: { placesLoaded: -1, geminiConfigured: false, mapsConfigured: false },
    });
    expect(bad.success).toBe(false);
  });

  it("enforces DifficultyState bounds and PhraseSituation enum values", () => {
    expect(
      DifficultyStateSchema.safeParse({ localLanguageShare: 0.4, hintLevel: 2, paceSeconds: 75 })
        .success,
    ).toBe(true);
    expect(
      DifficultyStateSchema.safeParse({ localLanguageShare: 0.95, hintLevel: 2, paceSeconds: 75 })
        .success,
    ).toBe(false);
    expect(PhraseSituationSchema.safeParse("darshini_order").success).toBe(true);
    expect(PhraseSituationSchema.safeParse("airport_taxi").success).toBe(false);
  });

  it("builds typed API success and failure envelopes", () => {
    const resOk = createApiSuccess({ ping: true }, "req-1");
    expect(resOk).toEqual({ ok: true, data: { ping: true }, requestId: "req-1" });

    const resErr = createApiError("NOT_FOUND", "Route was not found.", false, "req-2");
    expect(resErr).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Route was not found.", retryable: false },
      requestId: "req-2",
    });
  });
});
