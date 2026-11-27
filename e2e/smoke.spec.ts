/**
 * Feature: Phase 0 Core Smoke Test
 * Purpose: Asserts that the built Apna Area app renders the wordmark, tagline, and healthy /api/health status dot with zero console errors.
 * Inputs: Live HTTP server at BASE_URL.
 * Outputs: Playwright pass/fail verdict.
 * Deliberately excludes: Stubbed API routes.
 */
import { expect, test } from "@playwright/test";

test("smoke: renders themed Apna Area shell with healthy server dot and zero console errors", async ({
  page,
}) => {
  const consoleIssues: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleIssues.push(`pageerror: ${err.message}`);
  });

  await page.goto("/");

  await expect(page.getByTestId("wordmark")).toContainText("Apna Area");
  await expect(page.getByTestId("tagline")).toHaveText("Play your first week before it happens.");

  const healthDot = page.getByTestId("health-dot");
  await expect(healthDot).toHaveAttribute("data-status", "ok", { timeout: 5_000 });

  expect(consoleIssues).toEqual([]);
});
