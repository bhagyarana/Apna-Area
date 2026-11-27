/**
 * Feature: Phase 4 POST /api/score & Gemini Decision 1 Contract Tests (T4.2)
 * Purpose: Verifies recorded real gemini-decision-1 fixture parsing, transcript redaction in logs, heuristic fallback, and verified place guards.
 * Inputs: Recorded server/src/__tests__/fixtures/decision-1-score.json and Fastify app.inject() payloads.
 * Outputs: Deterministic Vitest pass/fail assertions.
 * Deliberately excludes: Live external API calls during unit/contract test runs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MODEL_IDS,
  ScoreDataSchema,
  type ScoreRequest,
  type WeekPlan,
} from "@apna-area/shared";
import { buildServer } from "../app.js";
import { buildNpcSystemInstruction } from "../live/persona.js";
import { loadVerifiedWorldData } from "../routes/places.js";
import {
  MISSION_DECISION_QUESTIONS,
  type DecisionRunnerOutput,
} from "../score/decide.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const recordedPlan = JSON.parse(
  readFileSync(path.resolve(currentDir, "./fixtures/director-neon.json"), "utf-8"),
) as WeekPlan;
const recordedDecision = JSON.parse(
  readFileSync(path.resolve(currentDir, "./fixtures/decision-1-score.json"), "utf-8"),
) as DecisionRunnerOutput;

const SECRET_TRANSCRIPT_MARKER = "PRIVATE_PLAYER_UTTERANCE_DO_NOT_LOG_991";

function makeScoreRequest(overrides: Partial<ScoreRequest> = {}): ScoreRequest {
  return {
    mission: recordedPlan.missions[0]!,
    difficulty: { localLanguageShare: 0.25, hintLevel: 2, paceSeconds: 75 },
    activeLanguage: "en",
    usedTextFallback: false,
    toolSignals: {
      hintsGiven: 0,
      phraseQuality: "clear",
      objectiveCompleted: true,
      completionSummary: "Agreed on a metered auto ride cleanly.",
    },
    transcript: [
      { speaker: "npc", text: "Namaskara! Where are you heading?", timestampMs: 1000 },
      {
        speaker: "player",
        text: `Namaskara Anna, dayavittu mitar haki banni ${SECRET_TRANSCRIPT_MARKER}`,
        timestampMs: 2500,
      },
    ],
    ...overrides,
  };
}

describe("POST /api/score & server/score/decide (T4.2)", () => {
  it("defines sorted choice keys with explicit other on MISSION_DECISION_QUESTIONS", () => {
    const choiceKeys = Object.keys(MISSION_DECISION_QUESTIONS.next_route.criteria);
    expect(choiceKeys).toEqual(["ease_level", "keep_level", "other", "step_up"]);
    expect([...choiceKeys].sort()).toEqual(choiceKeys);
  });

  it("scores via recorded gemini-decision-1 fixture, steps up Mission 2 Kannada share, and redacts transcripts from logs", async () => {
    const logs: string[] = [];
    const worldData = loadVerifiedWorldData();
    const app = await buildServer({
      worldData,
      geminiApiKey: "secret-server-key-never-leak",
      decisionRunner: async () => recordedDecision,
      logSink: (line) => logs.push(line),
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/score",
      payload: makeScoreRequest(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");

    const parsed = ScoreDataSchema.parse((res.json() as { data: unknown }).data);
    expect(parsed.modelUsed).toBe(MODEL_IDS.decisions);
    expect(parsed.fallbackUsed).toBe(false);
    expect(parsed.stars).toBe(3);
    expect(parsed.xpEarned).toBeGreaterThanOrEqual(280);
    expect(parsed.effectiveRoute).toBe("step_up");
    expect(parsed.nextDifficulty).toEqual({
      localLanguageShare: 0.5,
      hintLevel: 1,
      paceSeconds: 60,
    });
    expect(parsed.adaptationSummary).not.toContain("\u2014");

    // Verify raw transcript and API key never appear in structured server logs
    const joinedLogs = logs.join("\n");
    expect(joinedLogs).toContain("gemini.call");
    expect(joinedLogs).not.toContain(SECRET_TRANSCRIPT_MARKER);
    expect(joinedLogs).not.toContain("secret-server-key-never-leak");

    // Verify Mission 2 persona reflects stepped-up 50% Kannada blend
    const mission2Prompt = buildNpcSystemInstruction(
      {
        mission: recordedPlan.missions[1]!,
        officeName: "Bagmane IT park",
        placeName: "Udupi Darshini",
        placeCategory: "darshini",
        difficulty: parsed.nextDifficulty,
        activeLanguage: "en",
      },
      ["en", "hi", "kn"],
    );
    expect(mission2Prompt).toContain("50% simple spoken Bengaluru Kannada");
    expect(mission2Prompt).toContain("60-second scene pace");

    await app.close();
  });

  it("falls back deterministically when gemini-decision-1 fails and rejects unverified places", async () => {
    const worldData = loadVerifiedWorldData();
    const app = await buildServer({
      worldData,
      decisionRunner: async () => {
        throw new Error("503 UNAVAILABLE upstream");
      },
      logSink: () => {},
    });

    const weakFallbackRes = await app.inject({
      method: "POST",
      url: "/api/score",
      payload: makeScoreRequest({
        usedTextFallback: true,
        toolSignals: { hintsGiven: 2, objectiveCompleted: false },
        transcript: [{ speaker: "player", text: "Help please", timestampMs: 1200 }],
      }),
    });
    expect(weakFallbackRes.statusCode).toBe(200);
    const weakData = ScoreDataSchema.parse((weakFallbackRes.json() as { data: unknown }).data);
    expect(weakData.fallbackUsed).toBe(true);
    expect(weakData.modelUsed).toBe("heuristic-fallback");
    expect(weakData.effectiveRoute).toBe("ease_level");
    expect(weakData.nextDifficulty.localLanguageShare).toBe(0.05);
    expect(weakData.nextDifficulty.hintLevel).toBe(3);

    const badPlaceReq = makeScoreRequest();
    badPlaceReq.mission = { ...badPlaceReq.mission, placeId: "ChIJ_fake_unverified" };
    const badPlaceRes = await app.inject({
      method: "POST",
      url: "/api/score",
      payload: badPlaceReq,
    });
    expect(badPlaceRes.statusCode).toBe(400);

    const badSchemaRes = await app.inject({
      method: "POST",
      url: "/api/score",
      payload: { invalid: true },
    });
    expect(badSchemaRes.statusCode).toBe(400);

    await app.close();
  });
});
