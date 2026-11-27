/**
 * Feature: POST /api/world SSE & Fallback Ladder Contract Tests (T2.3)
 * Purpose: Exercises POST /api/world (SSE + JSON) using a recorded real Gemini 4 Neon response fixture, verifier retry, Hydrogen fallback, and cold-503 replay.
 * Inputs: Recorded fixture server/src/__tests__/fixtures/director-neon.json and verified data/orr/places.json.
 * Outputs: Vitest assertions against WorldProgressEventSchema and WorldPlanPayloadSchema.
 * Deliberately excludes: Live Gemini network requests inside automated unit/contract test runs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MODEL_IDS,
  WorldPlanPayloadSchema,
  WorldProgressEventSchema,
  type WeekPlan,
  type WorldProgressEvent,
} from "@apna-area/shared";
import { buildServer } from "../app.js";
import { loadVerifiedWorldData } from "../routes/places.js";
import { loadFallbackWeekPlans } from "../routes/world.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, "./fixtures/director-neon.json");

function loadRecordedNeonFixture(): WeekPlan {
  return JSON.parse(readFileSync(fixturePath, "utf-8")) as WeekPlan;
}

function parseSseFrames(rawBody: string): WorldProgressEvent[] {
  return rawBody
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (!dataLine) {
        throw new Error(`Missing data line in SSE block: ${block}`);
      }
      return WorldProgressEventSchema.parse(JSON.parse(dataLine.slice(6)) as unknown);
    });
}

describe("POST /api/world contract", () => {
  const worldData = loadVerifiedWorldData();

  it("loads committed data/orr/fallback-plans.json cleanly at server boot", () => {
    const map = loadFallbackWeekPlans();
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(1);
  });

  it("streams real SSE progress chips and verified WeekPlan from recorded Gemini 4 Neon fixture", async () => {
    const recordedPlan = loadRecordedNeonFixture();
    const app = await buildServer({
      worldData,
      worldRunner: async () => ({
        outputText: JSON.stringify(recordedPlan),
        usage: { inputTokens: 820, outputTokens: 640, totalTokens: 1460 },
      }),
      logSink: () => {},
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/world",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
      },
      payload: {
        officePlaceId: recordedPlan.officePlaceId,
        languageComfort: "en_hi",
        budgetBand: "20_30k",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");

    const events = parseSseFrames(res.body);
    const steps = events
      .filter((e): e is Extract<WorldProgressEvent, { type: "progress" }> => e.type === "progress")
      .map((e) => e.step);
    expect(steps).toEqual(["scanning", "candidates_found", "planning", "verified"]);

    const complete = events.find(
      (e): e is Extract<WorldProgressEvent, { type: "complete" }> => e.type === "complete",
    );
    expect(complete).toBeDefined();
    expect(complete?.replayed).toBe(false);
    expect(complete?.modelUsed).toBe(MODEL_IDS.frontierFast);
    expect(complete?.plan.missions).toHaveLength(5);

    await app.close();
  });

  it("retries verification failure on Neon and falls back cleanly to Gemini 4 Hydrogen", async () => {
    const recordedPlan = loadRecordedNeonFixture();
    const calls: string[] = [];

    const app = await buildServer({
      worldData,
      worldRunner: async (params) => {
        calls.push(params.model);
        if (calls.length <= 2) {
          const hallucinated = structuredClone(recordedPlan);
          hallucinated.missions[0]!.placeId = "ChIJ_invented_bad_id";
          return { outputText: JSON.stringify(hallucinated) };
        }
        return { outputText: JSON.stringify(recordedPlan) };
      },
      logSink: () => {},
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/world",
      headers: { accept: "application/json" },
      payload: {
        officePlaceId: recordedPlan.officePlaceId,
        languageComfort: "en",
        budgetBand: "20_30k",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(calls).toEqual([
      MODEL_IDS.frontierFast,
      MODEL_IDS.frontierFast,
      MODEL_IDS.fastWorkhorse,
    ]);

    const body = res.json() as { ok: boolean; data: unknown };
    expect(body.ok).toBe(true);
    const parsed = WorldPlanPayloadSchema.parse(body.data);
    expect(parsed.modelUsed).toBe(MODEL_IDS.fastWorkhorse);
    expect(parsed.replayed).toBe(false);

    await app.close();
  });

  it("serves labelled replayed: true fallback plan when all live models return 503", async () => {
    const recordedPlan = loadRecordedNeonFixture();
    const app = await buildServer({
      worldData,
      worldRunner: async () => {
        throw new Error("503 UNAVAILABLE");
      },
      fallbackPlans: {
        [recordedPlan.officePlaceId]: recordedPlan,
      },
      logSink: () => {},
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/world",
      headers: { accept: "application/json" },
      payload: {
        officePlaceId: recordedPlan.officePlaceId,
        languageComfort: "hi",
        budgetBand: "15_20k",
      },
    });

    expect(res.statusCode).toBe(200);
    const parsed = WorldPlanPayloadSchema.parse((res.json() as { data: unknown }).data);
    expect(parsed.replayed).toBe(true);
    expect(parsed.modelUsed).toBe("fallback-replay");

    await app.close();
  });

  it("returns 400 INVALID_OFFICE for unverified officePlaceId", async () => {
    const app = await buildServer({
      worldData,
      worldRunner: async () => ({ outputText: "{}" }),
      logSink: () => {},
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/world",
      headers: { accept: "application/json" },
      payload: {
        officePlaceId: "ChIJ_not_a_real_office",
        languageComfort: "en",
        budgetBand: "20_30k",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: { code: "INVALID_OFFICE", retryable: false },
    });

    await app.close();
  });
});
