/**
 * Feature: Live NPC Persona, Tool Safety & POST /api/live-token Contract Tests (T3a.1)
 * Purpose: Verifies fictional NPC guardrails, language clamping, NON_BLOCKING tool schemas, verified place enforcement, and secret isolation.
 * Inputs: Recorded WeekPlan fixture and Fastify app.inject() requests.
 * Outputs: Vitest pass/fail assertions.
 * Deliberately excludes: Live external WebSocket calls inside unit tests.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildSharedLiveTools,
  LiveTokenDataSchema,
  MODEL_IDS,
  resolveComfortLanguage,
  type LiveTokenRequest,
  type WeekPlan,
} from "@apna-area/shared";
import { buildServer } from "../app.js";
import { buildNpcSystemInstruction, resolveEnabledLanguage, selectVoiceForNpc } from "../live/persona.js";
import { loadVerifiedWorldData } from "../routes/places.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const recordedPlan = JSON.parse(
  readFileSync(path.resolve(currentDir, "./fixtures/director-neon.json"), "utf-8"),
) as WeekPlan;

function makeTokenRequest(): LiveTokenRequest {
  const mission = recordedPlan.missions[0]!;
  return {
    mission,
    officeName: "Bagmane IT park",
    placeName: "Chinnappanahalli Lake",
    placeCategory: "lake_park",
    difficulty: {
      localLanguageShare: 0,
      hintLevel: 2,
      paceSeconds: 90,
    },
    activeLanguage: "en",
  };
}

describe("server/live/persona & POST /api/live-token", () => {
  it("enforces fictional persona, no money claims, no negative business claims, and clamps unenabled languages", () => {
    expect(resolveEnabledLanguage("kn", ["en"])).toBe("en");
    expect(resolveEnabledLanguage("hi", ["en", "hi"])).toBe("hi");

    const req = makeTokenRequest();
    req.activeLanguage = "kn"; // Clamped to English in P3a
    const prompt = buildNpcSystemInstruction(req, ["en"]);

    expect(prompt).toContain("100% fictional character");
    expect(prompt).toContain("never a real employee");
    expect(prompt).toContain("Never invent or state exact rupees, rents, deposits, or fares");
    expect(prompt).toContain("Never say anything negative");
    expect(prompt).toContain("Lead in Indian English");
    expect(prompt).not.toContain("\u2014");

    // Phase 3b Hindi & Hinglish code-switching routing
    expect(resolveComfortLanguage("hi", ["en", "hi"])).toBe("hi");
    expect(resolveComfortLanguage("en_hi", ["en", "hi"])).toBe("hi");
    expect(resolveComfortLanguage("hi", ["en"])).toBe("en");

    const hiReq: LiveTokenRequest = { ...makeTokenRequest(), activeLanguage: "hi", languageComfort: "hi" };
    const hiPrompt = buildNpcSystemInstruction(hiReq, ["en", "hi"]);
    expect(hiPrompt).toContain("Lead in Hindi");
    expect(hiPrompt).toContain("code-switch naturally between Hindi and English");

    const hinglishReq: LiveTokenRequest = { ...makeTokenRequest(), activeLanguage: "hi", languageComfort: "en_hi" };
    const hinglishPrompt = buildNpcSystemInstruction(hinglishReq, ["en", "hi"]);
    expect(hinglishPrompt).toContain("Lead in natural conversational Hinglish");
  });

  it("registers NON_BLOCKING tools and omits mark_phrase_attempt until Kannada phrase is active", () => {
    const enTools = buildSharedLiveTools(false);
    expect(enTools.map((t) => t.name)).toEqual(["give_hint", "complete_objective"]);
    expect(enTools.every((t) => t.behavior === "NON_BLOCKING")).toBe(true);

    const knTools = buildSharedLiveTools(true);
    expect(knTools.map((t) => t.name)).toContain("mark_phrase_attempt");
    expect(selectVoiceForNpc("darshini_owner", "female")).toBe("Aoede");
    expect(selectVoiceForNpc("auto_driver", "male")).toBe("Puck");
  });

  it("POST /api/live-token mints ephemeral token without leaking GEMINI_API_KEY and rejects unverified placeIds", async () => {
    const worldData = loadVerifiedWorldData();
    const app = await buildServer({
      worldData,
      geminiApiKey: "super-secret-server-gemini-key",
      liveTokenMinter: async (req) => ({
        ok: true,
        data: {
          token: "auth_tokens/ephemeral-test-token-123",
          expireTime: "2026-11-27T16:00:00Z",
          model: MODEL_IDS.liveVoice,
          apiVersion: "v1alpha",
          maxDurationSeconds: 90,
          voiceName: selectVoiceForNpc(req.mission.npcRole, req.mission.npcGender),
          includePhraseTool: false,
        },
      }),
      logSink: () => {},
    });

    const okRes = await app.inject({
      method: "POST",
      url: "/api/live-token",
      payload: makeTokenRequest(),
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.headers["cache-control"]).toBe("no-store");
    expect(okRes.body).not.toContain("super-secret-server-gemini-key");

    const parsed = LiveTokenDataSchema.parse((okRes.json() as { data: unknown }).data);
    expect(parsed.token).toBe("auth_tokens/ephemeral-test-token-123");
    expect(parsed.maxDurationSeconds).toBe(90);

    const badReq = makeTokenRequest();
    badReq.mission = { ...badReq.mission, placeId: "ChIJ_unverified_place_id" };
    const badRes = await app.inject({
      method: "POST",
      url: "/api/live-token",
      payload: badReq,
    });
    expect(badRes.statusCode).toBe(400);

    await app.close();
  });
});
