/**
 * Feature: Live URL & Local Preview Playwright Configuration
 * Purpose: Executes end-to-end smoke assertions against BASE_URL (Cloud Run preview or local production server).
 * Inputs: BASE_URL environment variable (defaults to http://127.0.0.1:8080).
 * Outputs: Pass/fail report verifying wordmark, tagline, live health dot, and zero console errors.
 * Deliberately excludes: Mocked network responses.
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:8080";
const useLocalWebServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: useLocalWebServer
    ? {
        command: "node server/dist/main.js",
        url: "http://127.0.0.1:8080/api/health",
        reuseExistingServer: true,
        timeout: 15_000,
      }
    : undefined,
});
