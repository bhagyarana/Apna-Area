/**
 * Feature: Phase 3a Live Voice Mission HUD & Text Fallback E2E Test (T3a.4)
 * Purpose: Verifies Talk with <NPC> -> POST /api/live-token -> NPC portrait + Cinema Captions -> typed fallback reply -> give_hint + complete_objective -> Next stop.
 * Inputs: Built web/dist assets, server/dist/app.js factory, and recorded WeekPlan fixture.
 * Outputs: Playwright pass/fail verdict with zero console errors.
 * Deliberately excludes: Requiring physical microphone hardware in headless CI.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { MODEL_IDS, type WeekPlan } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";
import { loadVerifiedWorldData } from "../server/dist/routes/places.js";

test("live: launches voice mission, renders portrait + captions, handles text reply + tools, and advances to Stop 2", async ({
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
      }, 40);

      return {
        sendAudio16k: () => {},
        sendAudioStreamEnd: () => {},
        sendText: (text: string) => {
          if (text === "Hello!" || text === "नमस्ते!" || text === "Namaste! Hello!") return;
          window.setTimeout(() => {
            if (text.toLowerCase().includes("hint")) {
              callbacks.onToolCalls([
                { id: "tc-hint", name: "give_hint", args: { level: 1, hintText: "Ask politely for the meter." } },
              ]);
              callbacks.onOutputTranscript("Just ask politely if we can go by the meter.");
              callbacks.onTurnComplete();
              return;
            }
            callbacks.onOutputTranscript(`Sure, meter is on for "${text}", hop in!`);
            callbacks.onToolCalls([
              {
                id: "tc-done",
                name: "complete_objective",
                args: { summary: "Agreed on a metered auto ride to the gate." },
              },
            ]);
            callbacks.onTurnComplete();
          }, 40);
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

  const app = await buildServer({
    commit: "p3a-e2e",
    mapsBrowserKey: "",
    worldData,
    worldRunner: async () => ({
      outputText: JSON.stringify(recordedPlan),
      usage: { inputTokens: 800, outputTokens: 580, totalTokens: 1380 },
    }),
    liveTokenMinter: async () => ({
      ok: true,
      data: {
        token: "auth_tokens/e2e-ephemeral-token",
        expireTime: "2026-11-27T18:00:00Z",
        model: MODEL_IDS.liveVoice,
        apiVersion: "v1alpha",
        maxDurationSeconds: 90,
        voiceName: "Puck",
        includePhraseTool: false,
      },
    }),
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
    await expect(page.getByTestId("tune-trigger")).toContainText("Tune · EN");

    // Switch comfort language to Hindi + English (Hinglish) via Tune popover
    await page.getByTestId("tune-trigger").click();
    await page.getByRole("button", { name: "Hindi + English" }).click();
    await page.getByRole("button", { name: "Close setup" }).click();
    await expect(page.getByTestId("tune-trigger")).toContainText("Tune · HI+EN");

    // Open Stop 1 live voice mission
    await page.getByTestId("start-mission-cta").click();
    await expect(page.getByTestId("live-mission-dialog")).toBeVisible();
    await expect(page.getByTestId("npc-portrait")).toBeVisible();
    await expect(page.getByTestId("npc-caption-line")).toContainText("where on Outer Ring Road");

    // In headless Chromium getUserMedia fails or user clicks Type instead -> submit typed reply
    const textForm = page.getByTestId("live-text-form");
    if (!(await textForm.isVisible())) {
      await page.getByTestId("toggle-text-fallback-btn").click();
    }
    await page.getByTestId("live-text-input").fill("Could I get a quick hint?");
    await page.getByTestId("live-text-send").click();
    await expect(page.getByTestId("live-hint-banner")).toContainText("Ask politely for the meter.");

    await page.getByTestId("live-text-input").fill("Please go by the meter to Bagmane IT park.");
    await page.getByTestId("live-text-send").click();
    await expect(page.getByTestId("live-completed-banner")).toContainText("Agreed on a metered auto ride");

    // Continue cleanly to Stop 2
    await page.getByTestId("complete-continue-btn").click();
    await expect(page.getByTestId("mission-card")).toContainText("STOP 2 OF 5 · TUESDAY");
    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
