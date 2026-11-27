/**
 * Feature: Phase 4 Adaptive Scoring, XP Odometer & Human Override E2E Test (e2e/score.spec.ts)
 * Purpose: Verifies XpCounter odometer, POST /api/score MissionResultCard, WhyChangedDisclosure rubric bars, and 1-click player override feeding Stop 2.
 * Inputs: Built web/dist assets, server/dist/app.js factory, recorded WeekPlan fixture, and recorded decision-1-score.json fixture.
 * Outputs: Playwright pass/fail verdict with zero console errors.
 * Deliberately excludes: Requiring physical microphone hardware in headless CI.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { MODEL_IDS, type DifficultyState, type WeekPlan } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";
import { loadVerifiedWorldData } from "../server/dist/routes/places.js";
import type { DecisionRunnerOutput } from "../server/dist/score/decide.js";

test("score: rolls up XP odometer, reveals 4 calibrated rubric bars, and feeds 1-click pace override into Stop 2", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.addInitScript(() => {
    window.__APNA_TEST_LIVE_TRANSPORT__ = async (_tokenData, callbacks) => {
      window.setTimeout(() => {
        callbacks.onOpen();
        callbacks.onOutputTranscript("Namaskara! Hop in, where on Outer Ring Road are you headed?");
        callbacks.onTurnComplete();
      }, 30);

      return {
        sendAudio16k: () => {},
        sendAudioStreamEnd: () => {},
        sendText: (text: string) => {
          if (text === "Hello!" || text === "नमस्ते!" || text === "Namaste! Hello!") return;
          window.setTimeout(() => {
            callbacks.onOutputTranscript("Super, meter is on!");
            callbacks.onToolCalls([
              {
                id: "tc-phrase",
                name: "mark_phrase_attempt",
                args: { phraseId: "auto_male_1", attempted: true, quality: "clear" },
              },
              {
                id: "tc-done",
                name: "complete_objective",
                args: { summary: "Agreed on a metered auto ride to campus." },
              },
            ]);
            callbacks.onTurnComplete();
          }, 30);
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

  const observedDifficulties: DifficultyState[] = [];

  const app = await buildServer({
    commit: "p4-e2e",
    mapsBrowserKey: "",
    worldData,
    worldRunner: async () => ({
      outputText: JSON.stringify(recordedPlan),
      usage: { inputTokens: 800, outputTokens: 580, totalTokens: 1380 },
    }),
    liveTokenMinter: async (req) => {
      observedDifficulties.push(req.difficulty);
      return {
        ok: true,
        data: {
          token: "auth_tokens/e2e-score-token",
          expireTime: "2026-11-27T19:00:00Z",
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
      };
    },
    decisionRunner: async () => recordedDecision,
    logSink: () => {},
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    await page.goto(address);
    await page.keyboard.press("Escape");

    const targetOffice = worldData.dataset.places.find((p) => p.id === recordedPlan.officePlaceId)!;
    await page.keyboard.press("Control+k");
    await page.keyboard.type(targetOffice.name.slice(0, 10));
    await page.keyboard.press("Enter");

    await page.getByTestId("build-week-cta").click();
    await expect(page.getByTestId("mission-card")).toBeVisible();
    await expect(page.getByTestId("xp-counter-value")).toHaveText("00,000");

    // Start Stop 1 and complete objective via text fallback
    await page.getByTestId("start-mission-cta").click();
    await expect(page.getByTestId("live-mission-dialog")).toBeVisible();
    expect(observedDifficulties[0]).toEqual({
      localLanguageShare: 0.2,
      hintLevel: 2,
      paceSeconds: 90,
    });

    const textForm = page.getByTestId("live-text-form");
    if (!(await textForm.isVisible())) {
      await page.getByTestId("toggle-text-fallback-btn").click();
    }
    await page.getByTestId("live-text-input").fill("Anna, dayavittu mitar haki banni.");
    await page.getByTestId("live-text-send").click();

    // MissionResultCard transitions in with 3 stars, +300 XP, and stepped-up 45% Kannada mix
    await expect(page.getByTestId("mission-result-card")).toBeVisible();
    await expect(page.getByTestId("result-stars-text")).toHaveText("3 of 3 stars");
    await expect(page.getByTestId("xp-counter-value")).toHaveText("00,300");
    await expect(page.getByTestId("adaptation-summary")).toContainText("more Kannada and fewer hints");
    await expect(page.getByTestId("next-difficulty-pills")).toContainText("45% Kannada mix");

    // Expand "Why did this change?" disclosure and inspect all 4 calibrated rubric rows
    await page.getByTestId("why-changed-toggle").click();
    await expect(page.getByTestId("why-changed-panel")).toBeVisible();
    await expect(page.getByTestId("rubric-row-objective")).toBeVisible();
    await expect(page.getByTestId("rubric-row-phrase")).toBeVisible();
    await expect(page.getByTestId("rubric-row-tone")).toBeVisible();
    await expect(page.getByTestId("rubric-row-confidence")).toContainText("92%");

    // Exercise 1-click player override: Keep gentler pace
    await page.getByTestId("override-gentle-btn").click();
    await expect(page.getByTestId("adaptation-summary")).toContainText("Pace updated by you");
    await expect(page.getByTestId("next-difficulty-pills")).toContainText("English focus");
    await expect(page.getByTestId("next-difficulty-pills")).toContainText("Early hints");
    await expect(page.getByTestId("next-difficulty-pills")).toContainText("90s pace");

    // Advance to Stop 2 and verify Stop 2 receives the player's overridden DifficultyState
    await page.getByTestId("complete-continue-btn").click();
    await expect(page.getByTestId("mission-card")).toContainText("STOP 2 OF 5 · TUESDAY");
    await page.getByTestId("start-mission-cta").click();
    await expect(page.getByTestId("live-mission-dialog")).toBeVisible();
    expect(observedDifficulties[1]).toEqual({
      localLanguageShare: 0,
      hintLevel: 3,
      paceSeconds: 90,
    });
    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
