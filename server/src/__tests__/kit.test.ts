/**
 * Feature: Phase 5 Server Survival Kit Contract & Unit Tests (server/src/__tests__/kit.test.ts)
 * Purpose: Verifies Routes API computeRouteMatrix aggregation, Flash-Lite summary price/em-dash verifier, POST /api/kit, and cached POST /api/tts.
 * Inputs: Verified ORR world data, mock RouteMatrixFetcher, SummaryRunner, and TtsRunner.
 * Outputs: Vitest assertions against KitPayloadSchema and TtsPayloadSchema.
 * Deliberately excludes: Unbounded live network charges during CI unit runs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KitPayloadSchema, TtsPayloadSchema, type KitTravelMode } from "@apna-area/shared";
import { buildServer } from "../app.js";
import { loadVerifiedWorldData } from "../routes/places.js";
import { verifyAreaSummaryLine } from "../kit/summary.js";

describe("server/kit", () => {
  it("validates recorded real Routes API + gemini-3.5-flash-lite + gemini-3.8-flash-tts fixture", () => {
    const raw = JSON.parse(
      readFileSync(path.resolve("server/src/__tests__/fixtures/kit-live.json"), "utf-8"),
    ) as { kitPayload: unknown; ttsHeaderAscii: string };
    const parsed = KitPayloadSchema.parse(raw.kitPayload);
    expect(parsed.neighbourhoods).toHaveLength(3);
    expect(parsed.neighbourhoods[0]?.commuteSource).toBe("routes_api");
    expect(parsed.summaryFallbackUsed).toBe(false);
    expect(raw.ttsHeaderAscii).toBe("RIFF");
  });
  it("rejects summary lines with prices, rupee symbols, k-shorthand, exclamation marks, or em dashes", () => {
    expect(
      verifyAreaSummaryLine(
        "Direct service-lane hop toward Embassy TechVillage with quick two-wheeler access.",
      ),
    ).toBe(true);
    expect(verifyAreaSummaryLine("Rents here start around ₹22,000 per month.")).toBe(false);
    expect(verifyAreaSummaryLine("Rents here start around 22,000 per month.")).toBe(false);
    expect(verifyAreaSummaryLine("Auto fares are low along this stretch.")).toBe(false);
    expect(verifyAreaSummaryLine("Rooms cost 18k near the main gate.")).toBe(false);
    expect(verifyAreaSummaryLine("Morning drive takes 21 minutes along the highway.")).toBe(false);
    expect(verifyAreaSummaryLine("Bellandur \u2014 super close to work")).toBe(false);
    expect(verifyAreaSummaryLine("Quick morning ride to your campus!")).toBe(false);
  });

  it("aggregates out-of-order computeRouteMatrix responses, caches per office, and validates Flash-Lite summaries on POST /api/kit", async () => {
    const worldData = loadVerifiedWorldData();
    const office = worldData.dataset.places.find((p) => p.category === "tech_park")!;
    const observedModes: KitTravelMode[] = [];

    const app = await buildServer({
      worldData,
      routeMatrixFetcher: async (input) => {
        observedModes.push(input.travelMode);
        // Deliberately return reverse originIndex order to verify index matching
        return [
          { originIndex: 2, destinationIndex: 0, condition: "ROUTE_EXISTS", duration: "1920s", distanceMeters: 5400 },
          { originIndex: 0, destinationIndex: 0, condition: "ROUTE_EXISTS", duration: "840s", distanceMeters: 1850 },
          {
            originIndex: 1,
            destinationIndex: 0,
            condition: input.travelMode === "TRANSIT" ? "ROUTE_NOT_FOUND" : "ROUTE_EXISTS",
            duration: "1260s",
            distanceMeters: 3100,
          },
        ];
      },
      kitSummaryRunner: async () => ({
        outputText: JSON.stringify({
          summaries: [
            {
              neighbourhoodId: "bellandur",
              oneLine: "Bellandur service lanes feed straight into the campus gate with minimal crossings.",
            },
            {
              neighbourhoodId: "devarabisanahalli",
              oneLine: "Rent is 25k here — cheap rooms!", // Must be rejected by verifier and replaced cleanly
            },
            {
              neighbourhoodId: "kadubeesanahalli",
              oneLine: "Active residential pocket with frequent Vajra bus stops along the main road.",
            },
          ],
        }),
      }),
      logSink: () => {},
    });

    try {
      const payloadReq = {
        officePlaceId: office.id,
        budgetBand: "20_30k",
        recommendedNeighbourhoods: [
          { neighbourhoodId: "bellandur", fitReason: "Closest residential pocket." },
          { neighbourhoodId: "devarabisanahalli", fitReason: "Walkable tech park feeder." },
          { neighbourhoodId: "kadubeesanahalli", fitReason: "Active bus and co-living hub." },
        ],
        completedMissionIds: ["m1", "m2"],
        learnedPhraseIds: ["auto_male_1"],
      };

      const res1 = await app.inject({ method: "POST", url: "/api/kit", payload: payloadReq });
      expect(res1.statusCode).toBe(200);
      const parsed1 = KitPayloadSchema.parse((res1.json() as { data: unknown }).data);

      expect(observedModes).toHaveLength(4);
      expect(observedModes).toEqual(
        expect.arrayContaining(["DRIVE", "TWO_WHEELER", "TRANSIT"]),
      );
      expect(parsed1.neighbourhoods).toHaveLength(3);
      expect(parsed1.neighbourhoods[0]?.morningDriveMin).toBe(14);
      expect(parsed1.neighbourhoods[1]?.transitMin).toBeNull();
      expect(parsed1.neighbourhoods[1]?.oneLine).not.toMatch(/25k|\u2014|!/i);
      expect(parsed1.summaryFallbackUsed).toBe(true);
      expect(parsed1.phrases.length).toBeGreaterThanOrEqual(3);
      expect(parsed1.phrases[0]?.id).toBe("auto_male_1");
      expect(parsed1.checklist).toHaveLength(6);

      // Second call hits commuteCache without invoking routeMatrixFetcher again
      const res2 = await app.inject({ method: "POST", url: "/api/kit", payload: payloadReq });
      expect(res2.statusCode).toBe(200);
      expect(observedModes).toHaveLength(4);
    } finally {
      await app.close();
    }
  });

  it("synthesizes and caches verified Kannada survival phrases on POST /api/tts and rejects unknown phraseIds", async () => {
    const worldData = loadVerifiedWorldData();
    let ttsCalls = 0;

    const app = await buildServer({
      worldData,
      ttsRunner: async () => {
        ttsCalls += 1;
        return { audioWavBase64: "UklGRiQAAABXQVZFZm10IBAAAAABAAEA", mimeType: "audio/wav" };
      },
      logSink: () => {},
    });

    try {
      const unknownRes = await app.inject({
        method: "POST",
        url: "/api/tts",
        payload: { phraseId: "not_a_real_phrase" },
      });
      expect(unknownRes.statusCode).toBe(404);

      const first = await app.inject({
        method: "POST",
        url: "/api/tts",
        payload: { phraseId: "greet_neutral_1" },
      });
      expect(first.statusCode).toBe(200);
      const parsedFirst = TtsPayloadSchema.parse((first.json() as { data: unknown }).data);
      expect(parsedFirst.cached).toBe(false);
      expect(ttsCalls).toBe(1);

      const second = await app.inject({
        method: "POST",
        url: "/api/tts",
        payload: { phraseId: "greet_neutral_1" },
      });
      expect(second.statusCode).toBe(200);
      const parsedSecond = TtsPayloadSchema.parse((second.json() as { data: unknown }).data);
      expect(parsedSecond.cached).toBe(true);
      expect(ttsCalls).toBe(1);
    } finally {
      await app.close();
    }
  });
});
