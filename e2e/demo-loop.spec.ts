/**
 * Feature: Phase 6 Full Keyboard Loop, ?demo=1 Timer, Replay Banner & Error Recovery E2E (e2e/demo-loop.spec.ts)
 * Purpose: Exercises ?demo=1 presenter timer, curated ORR campus chips, Director error -> Retry -> labelled replay banner, keyboard-only loop through Survival Kit, and checklist non-flicker stability.
 * Inputs: Built web/dist assets, server/dist/app.js factory, and recorded fixtures.
 * Outputs: Playwright pass/fail verdict with zero console errors.
 * Deliberately excludes: Unverified places or mocked client paths.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { MODEL_IDS, type KitPayload, type WeekPlan } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";
import { loadVerifiedWorldData } from "../server/dist/routes/places.js";
import type { DecisionRunnerOutput } from "../server/dist/score/decide.js";

test("p6 demo loop: ?demo=1 presenter timer, Director Retry -> Replayed banner, keyboard loop, and zero-flicker checklist", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.addInitScript(() => {
    window.__APNA_TEST_LIVE_TRANSPORT__ = async (_tokenData, callbacks) => {
      window.setTimeout(() => {
        callbacks.onOpen();
        callbacks.onOutputTranscript("Namaskara! Ready to head to the gate?");
        callbacks.onTurnComplete();
      }, 25);
      return {
        sendAudio16k: () => {},
        sendAudioStreamEnd: () => {},
        sendText: (text: string) => {
          if (text === "Hello!" || text === "नमस्ते!" || text === "Namaste! Hello!") return;
          window.setTimeout(() => {
            callbacks.onOutputTranscript("Super, meter is on!");
            callbacks.onToolCalls([
              { id: "tc-done", name: "complete_objective", args: { summary: "Boarded metered auto cleanly." } },
            ]);
            callbacks.onTurnComplete();
          }, 25);
        },
        sendToolResponses: () => {},
        close: () => {},
      };
    };
  });

  const worldData = loadVerifiedWorldData();
  const recordedPlan = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/director-neon.json"), "utf-8"),
  ) as WeekPlan;
  const recordedDecision = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/decision-1-score.json"), "utf-8"),
  ) as DecisionRunnerOutput;
  const recordedKitFixture = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/kit-live.json"), "utf-8"),
  ) as { kitPayload: KitPayload; ttsSampleWavBase64Prefix: string };

  let directorCalls = 0;
  let kitSummaryCalls = 0;

  const app = await buildServer({
    commit: "p6-e2e",
    mapsBrowserKey: "",
    worldData,
    worldRunner: async () => {
      directorCalls += 1;
      throw new Error("503 UNAVAILABLE");
    },
    fallbackPlans: {
      get [recordedPlan.officePlaceId]() {
        return directorCalls >= 3 ? recordedPlan : undefined!;
      },
    },
    liveTokenMinter: async (req) => ({
      ok: true,
      data: {
        token: "auth_tokens/p6-e2e",
        expireTime: "2026-11-28T18:00:00Z",
        model: MODEL_IDS.liveVoice,
        apiVersion: "v1alpha",
        maxDurationSeconds: req.difficulty.paceSeconds,
        voiceName: "Puck",
        includePhraseTool: true,
        phrase: {
          id: "auto_male_1",
          situation: "auto_meter",
          honorificGender: "male",
          kannada: "ಅಣ್ಣ, ದಯವಿಟ್ಟು ಮೀಟರ್ ಹಾಕಿ ಬನ್ನಿ.",
          transliteration: "Aṇṇa, dayaviṭṭu mīṭar hāki banni.",
          english: "Brother, please put the meter on and come.",
          hindi: "भैया, कृपया मीटर लगाकर चलिए।",
        },
      },
    }),
    decisionRunner: async () => recordedDecision,
    routeMatrixFetcher: async () => [
      { originIndex: 0, destinationIndex: 0, condition: "ROUTE_EXISTS", duration: "1200s", distanceMeters: 4200 },
      { originIndex: 1, destinationIndex: 0, condition: "ROUTE_EXISTS", duration: "1500s", distanceMeters: 6100 },
      { originIndex: 2, destinationIndex: 0, condition: "ROUTE_EXISTS", duration: "1800s", distanceMeters: 7900 },
    ],
    kitSummaryRunner: async () => {
      kitSummaryCalls += 1;
      return {
        outputText: JSON.stringify({
          summaries: recordedPlan.recommendedNeighbourhoods.map((rec) => ({
            neighbourhoodId: rec.neighbourhoodId,
            oneLine: `${rec.neighbourhoodId} connects smoothly along the Outer Ring Road service lane.`,
          })),
        }),
      };
    },
    ttsRunner: async () => ({
      audioWavBase64: recordedKitFixture.ttsSampleWavBase64Prefix,
      mimeType: "audio/wav",
    }),
    logSink: () => {},
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    await page.goto(`${address}/?demo=1`);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("office-combobox-input")).toBeEnabled();

    // 1. ?demo=1 shows presenter timer without preselecting an office, and curated RMZ Ecoworld chip is visible
    await expect(page.getByTestId("demo-timer-pill")).toContainText("/ 03:00");
    await expect(page.getByTestId("chip-ChIJY1us488TrjsReWn3vhpi6LQ")).toContainText("RMZ Ecoworld");

    // 2. Select fixture office via keyboard -> focus moves automatically to Build my first week -> press Enter
    const targetOffice = worldData.dataset.places.find((p) => p.id === recordedPlan.officePlaceId)!;
    await page.keyboard.press("Control+k");
    await page.keyboard.type(targetOffice.name.slice(0, 10));
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("build-week-cta")).toBeFocused();

    // First attempt fails (no fallback on calls 1..2) -> error banner with Retry button appears
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("stage-error-banner")).toBeVisible();
    await page.getByTestId("banner-retry-btn").click();

    // Retry succeeds via fallback-plans.json -> exact "Replayed from an earlier run" banner renders
    await expect(page.getByTestId("replayed-banner")).toHaveText("Replayed from an earlier run");

    // 3. Complete Mission 1 WITHOUT mark_phrase_attempt tool call -> Decision 1 phraseScore >= 2.0 still credits phrase!
    await page.getByTestId("start-mission-cta").click();
    await expect(page.getByTestId("live-mission-dialog")).toBeVisible();
    const textForm = page.getByTestId("live-text-form");
    if (!(await textForm.isVisible())) {
      await page.getByTestId("toggle-text-fallback-btn").click();
    }
    await page.getByTestId("live-text-input").fill("Anna, dayavittu mitar haki banni.");
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("mission-result-card")).toBeVisible();
    await expect(page.getByTestId("phrasebook-pill")).toContainText("Phrases · 1");

    // 4. Open Survival Kit -> toggle checklist via keyboard Space -> focus stays on checkbox & zero redundant Flash-Lite calls
    await page.getByTestId("result-open-kit-btn").click();
    await expect(page.getByTestId("survival-kit")).toBeVisible();
    expect(kitSummaryCalls).toBe(1);

    const firstCheckbox = page.locator('[data-testid^="kit-check-"]').first();
    const firstTestId = await firstCheckbox.getAttribute("data-testid");
    await firstCheckbox.focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("kit-checklist-progress")).toHaveText("1 of 6 ready");
    await expect(page.getByTestId(firstTestId!)).toBeFocused();
    expect(kitSummaryCalls).toBe(1);

    // 5. Escape from Survival Kit returns cleanly to the map stage
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("survival-kit")).toBeHidden();

    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
