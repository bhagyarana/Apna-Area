/**
 * Feature: Phase 5 Survival Kit & Human-in-Control Confirm Sheet E2E Test (e2e/confirm-sheet.spec.ts)
 * Purpose: Proves Survival Kit renders real Routes API commutes, phrase TTS replay, inline copy, checklist persistence, and ZERO external navigation/downloads without ConfirmSheet confirmation.
 * Inputs: Built web/dist assets, server/dist/app.js factory, recorded director-neon.json, and recorded kit-live.json.
 * Outputs: Playwright pass/fail verdict with zero console errors.
 * Deliberately excludes: Allowing any unconfirmed window.open or file download.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { KitPayload, WeekPlan } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";
import { loadVerifiedWorldData } from "../server/dist/routes/places.js";

test("kit & confirm-sheet: gates Google Maps navigation and PNG downloads behind focus-trapped ConfirmSheet", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.addInitScript(() => {
    (window as unknown as { __OPENED_URLS__: string[] }).__OPENED_URLS__ = [];
    window.open = ((url?: string | URL) => {
      (window as unknown as { __OPENED_URLS__: string[] }).__OPENED_URLS__.push(String(url ?? ""));
      return null;
    }) as typeof window.open;
  });

  const worldData = loadVerifiedWorldData();
  const recordedPlan = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/director-neon.json"), "utf-8"),
  ) as WeekPlan;
  const recordedKitFixture = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/kit-live.json"), "utf-8"),
  ) as { kitPayload: KitPayload; ttsSampleWavBase64Prefix: string };

  let ttsHits = 0;

  const app = await buildServer({
    commit: "p5-e2e",
    mapsBrowserKey: "",
    worldData,
    worldRunner: async () => ({
      outputText: JSON.stringify(recordedPlan),
      usage: { inputTokens: 800, outputTokens: 580, totalTokens: 1380 },
    }),
    routeMatrixFetcher: async (input) => [
      {
        originIndex: 0,
        destinationIndex: 0,
        condition: "ROUTE_EXISTS",
        duration: input.travelMode === "TWO_WHEELER" ? "960s" : "1260s",
        distanceMeters: 4200,
      },
      {
        originIndex: 1,
        destinationIndex: 0,
        condition: "ROUTE_EXISTS",
        duration: "1680s",
        distanceMeters: 6800,
      },
      {
        originIndex: 2,
        destinationIndex: 0,
        condition: "ROUTE_EXISTS",
        duration: "1980s",
        distanceMeters: 8500,
      },
    ],
    kitSummaryRunner: async () => ({
      outputText: JSON.stringify({
        summaries: recordedPlan.recommendedNeighbourhoods.map((rec) => ({
          neighbourhoodId: rec.neighbourhoodId,
          oneLine: `${rec.neighbourhoodId} keeps your weekday Outer Ring Road commute steady and predictable.`,
        })),
      }),
    }),
    ttsRunner: async () => {
      ttsHits += 1;
      return {
        audioWavBase64: recordedKitFixture.ttsSampleWavBase64Prefix,
        mimeType: "audio/wav",
      };
    },
    logSink: () => {},
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    await page.goto(address);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("office-combobox-input")).toBeEnabled();

    const targetOffice = worldData.dataset.places.find((p) => p.id === recordedPlan.officePlaceId)!;
    await page.keyboard.press("Control+k");
    await page.keyboard.type(targetOffice.name.slice(0, 10));
    await page.keyboard.press("Enter");
    await page.getByTestId("build-week-cta").click();
    await expect(page.getByTestId("mission-card")).toBeVisible();

    // Open Survival Kit via topbar PhrasebookPill trigger
    await page.getByTestId("phrasebook-pill").click();
    await expect(page.getByTestId("survival-kit")).toBeVisible();
    await expect(page.getByTestId("kit-hero-headline")).toHaveText("YOU'RE READY FOR MONDAY.");
    await expect(page.getByTestId("kit-commute-card")).toContainText("21 min");
    await expect(page.getByTestId("kit-commute-card")).toContainText("16 min");

    // Exercise Gemini 3.8 TTS replay button and inline Copy phrases button
    const firstPlayBtn = page.locator('[data-testid^="play-phrase-btn-"]').first();
    await firstPlayBtn.click();
    expect(ttsHits).toBe(1);

    await page.getByTestId("copy-phrases-btn").click();
    await expect(page.getByTestId("copy-phrases-btn")).toContainText("Copied");

    // Exercise Checklist persistence
    await expect(page.getByTestId("kit-checklist-progress")).toHaveText("0 of 6 ready");
    await page.locator('[data-testid^="kit-check-"]').first().click();
    await expect(page.getByTestId("kit-checklist-progress")).toHaveText("1 of 6 ready");

    // 1. Prove Google Maps button NEVER opens window.open on click, Escape, or Cancel
    const firstHoodId = recordedPlan.recommendedNeighbourhoods[0]!.neighbourhoodId;
    const openMapsTrigger = page.getByTestId(`open-maps-btn-${firstHoodId}`);
    await openMapsTrigger.click();
    await expect(page.getByTestId("confirm-sheet")).toBeVisible();
    await expect(page.getByTestId("confirm-sheet-title")).toHaveText(
      "Open this route in Google Maps?",
    );

    let openedUrls = await page.evaluate(
      () => (window as unknown as { __OPENED_URLS__: string[] }).__OPENED_URLS__,
    );
    expect(openedUrls).toEqual([]);

    // Dismiss via Escape -> focus returns to trigger, zero external navigation
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("confirm-sheet")).toBeHidden();
    await expect(openMapsTrigger).toBeFocused();
    openedUrls = await page.evaluate(
      () => (window as unknown as { __OPENED_URLS__: string[] }).__OPENED_URLS__,
    );
    expect(openedUrls).toEqual([]);

    // Open again, dismiss via Cancel -> zero external navigation
    await openMapsTrigger.click();
    await page.getByTestId("confirm-sheet-cancel").click();
    await expect(page.getByTestId("confirm-sheet")).toBeHidden();
    openedUrls = await page.evaluate(
      () => (window as unknown as { __OPENED_URLS__: string[] }).__OPENED_URLS__,
    );
    expect(openedUrls).toEqual([]);

    // Confirm explicitly -> opens Google Maps Directions URL exactly once
    await openMapsTrigger.click();
    await page.getByTestId("confirm-sheet-confirm").click();
    await expect(page.getByTestId("confirm-sheet")).toBeHidden();
    openedUrls = await page.evaluate(
      () => (window as unknown as { __OPENED_URLS__: string[] }).__OPENED_URLS__,
    );
    expect(openedUrls).toHaveLength(1);
    expect(openedUrls[0]).toContain("https://www.google.com/maps/dir/?api=1");

    // 2. Prove Save my kit PNG download is gated behind ConfirmSheet
    await page.getByTestId("save-kit-btn").click();
    await expect(page.getByTestId("confirm-sheet-title")).toHaveText(
      "Download your Survival Kit?",
    );
    await page.getByTestId("confirm-sheet-cancel").click();
    await expect(page.getByTestId("confirm-sheet")).toBeHidden();

    await page.getByTestId("save-kit-btn").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("confirm-sheet-confirm").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("apna-area-survival-kit.png");

    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
