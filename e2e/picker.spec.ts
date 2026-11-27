/**
 * Feature: Phase 1 Keyboard-Only Office Picker E2E Test (T1.5)
 * Purpose: Starts an isolated Fastify instance with test-only verified places fixtures and proves keyboard-only tour skip, Ctrl+K search, selection, and localStorage persistence.
 * Inputs: Built web/dist assets and server/dist/app.js factory.
 * Outputs: Playwright pass/fail verdict.
 * Deliberately excludes: Mouse clicks during selection or committing fixture data to data/orr/places.json.
 */
import { expect, test } from "@playwright/test";
import { ORR_BBOX } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";

test("picker: selects an ORR office using keyboard only (Escape, Ctrl+K, typeahead, Enter) and persists on reload", async ({
  page,
}) => {
  const app = await buildServer({
    commit: "p1-e2e",
    mapsBrowserKey: "",
    worldData: {
      dataset: {
        verifiedAt: "2026-11-27T10:00:00Z",
        bbox: ORR_BBOX,
        totalCount: 2,
        places: [
          {
            id: "ChIJ_e2e_ecoworld",
            name: "RMZ EcoWorld",
            category: "tech_park",
            neighbourhood: "Bellandur",
            lat: 12.9215,
            lng: 77.6845,
            shortAddress: "Devarabisanahalli, Bellandur",
            googleMapsUri: "https://maps.google.com/?cid=101",
          },
          {
            id: "ChIJ_e2e_prestige",
            name: "Prestige Tech Park",
            category: "tech_park",
            neighbourhood: "Kadubeesanahalli",
            lat: 12.9432,
            lng: 77.6942,
            shortAddress: "Kadubeesanahalli, ORR",
            googleMapsUri: "https://maps.google.com/?cid=102",
          },
        ],
      },
      corridor: {
        type: "Feature",
        properties: {
          generatedAt: "2026-11-27T10:00:00Z",
          distanceMeters: 11400,
          source: "Google Routes API v2",
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [77.7011, 12.9569],
            [77.6762, 12.926],
            [77.6238, 12.9177],
          ],
        },
      },
    },
    logSink: () => {},
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    await page.goto(address);

    // 1. First load starts the skippable corridor tour; dismiss by keyboard Escape
    await expect(page.getByTestId("tour-pill")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: /which office are you joining/i })).toBeVisible();

    // 2. Open combobox via Ctrl+K, filter via keyboard, and confirm with Enter
    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("office-combobox-input")).toBeFocused();
    await page.keyboard.type("Prestige");
    await page.keyboard.press("Enter");

    // 3. Assert selected office card and pin appear
    await expect(page.getByTestId("selected-office-card")).toContainText("Prestige Tech Park");
    await expect(page.getByTestId("selected-office-pin")).toContainText("Prestige Tech Park");

    // 4. Reload and assert localStorage persistence (tour skipped, office retained)
    await page.reload();
    await expect(page.getByTestId("selected-office-card")).toContainText("Prestige Tech Park");
  } finally {
    await app.close();
  }
});
