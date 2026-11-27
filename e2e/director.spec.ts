/**
 * Feature: Phase 2 Director SSE, Staggered Pins & Mission HUD E2E Test (T2.4)
 * Purpose: Verifies keyboard office selection -> Build my first week SSE stream -> 5 staggered map pins -> WeekProgressBar -> MissionCard provenance tooltip.
 * Inputs: Built web/dist assets, server/dist/app.js factory, and recorded real Gemini 4 Neon fixture.
 * Outputs: Playwright pass/fail assertions with zero console errors.
 * Deliberately excludes: Hardcoded client-side mocks.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { WeekPlan } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";
import { loadVerifiedWorldData } from "../server/dist/routes/places.js";

test("director: streams SSE progress chips, drops 5 mission pins, and navigates Week One stops", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const worldData = loadVerifiedWorldData();
  const recordedPlan = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/director-neon.json"), "utf-8"),
  ) as WeekPlan;

  let releaseRunner!: () => void;
  const runnerGate = new Promise<void>((resolve) => {
    releaseRunner = resolve;
  });

  const app = await buildServer({
    commit: "p2-e2e",
    mapsBrowserKey: "",
    worldData,
    worldRunner: async () => {
      await runnerGate;
      return {
        outputText: JSON.stringify(recordedPlan),
        usage: { inputTokens: 800, outputTokens: 580, totalTokens: 1380 },
      };
    },
    logSink: () => {},
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    await page.goto(address);

    // 1. Skip camera tour with Escape and select the recorded fixture's office via chip/combobox
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("office-combobox-input")).toBeVisible();
    const targetOffice = worldData.dataset.places.find((p) => p.id === recordedPlan.officePlaceId);
    expect(targetOffice).toBeDefined();

    await page.keyboard.press("Control+k");
    await page.keyboard.type(targetOffice!.name.slice(0, 10));
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("selected-office-card")).toContainText(targetOffice!.name);

    // 2. Click Build my first week -> observe SSE progress card -> release stream -> settle on Week One HUD
    await page.getByTestId("build-week-cta").click();
    await expect(page.getByTestId("director-progress-card")).toBeVisible();
    await expect(page.getByTestId("progress-chip-candidates_found")).toBeVisible();
    releaseRunner();

    await expect(page.getByTestId("week-progress-bar")).toBeVisible();
    await expect(page.getByTestId("mission-card")).toBeVisible();

    // 3. Verify all 5 numbered mission pins dropped onto the stage
    for (let i = 1; i <= 5; i += 1) {
      await expect(page.getByTestId(`mission-pin-${i}`)).toBeVisible();
    }

    // 4. Reveal verified Google Maps place_id provenance tooltip
    await page.getByTestId("mission-provenance").click();
    await expect(page.getByTestId("provenance-tooltip")).toContainText(
      recordedPlan.missions[0]!.placeId,
    );

    // 5. Advance to Tuesday via primary CTA and verify stop counter updates
    await page.getByTestId("next-mission-cta").click();
    await expect(page.getByTestId("mission-card")).toContainText("STOP 2 OF 5 · TUESDAY");

    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
