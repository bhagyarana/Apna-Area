/**
 * Feature: Phase 8 3D Neon Dusk Open-World Mode E2E Test (e2e/map-3d.spec.ts)
 * Purpose: Verifies headless 2D auto-default, lazy vendor-three isolation, hardware GPU 3D auto-default, 3D/2D topbar pill persistence, Q/E heading-locked RadarMinimap rotation, input focus guard, twilight horizon scrim, and mobile 2D safety.
 * Inputs: Built web/dist assets, server/dist/app.js factory, and recorded WeekPlan fixture.
 * Outputs: Playwright pass/fail verdict with zero console errors.
 * Deliberately excludes: Third-party game assets or unverified places.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { WeekPlan } from "@apna-area/shared";
import { buildServer } from "../server/dist/app.js";
import { loadVerifiedWorldData } from "../server/dist/routes/places.js";

test("map 3d dusk: gates headless/mobile to 2D without vendor-three, enables 3D toggle + Q/E RadarMinimap + horizon scrim, and persists state", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const requestedScripts: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("request", (req) => {
    if (req.resourceType() === "script") requestedScripts.push(req.url());
  });

  const worldData = loadVerifiedWorldData();
  const recordedPlan = JSON.parse(
    readFileSync(path.resolve("server/src/__tests__/fixtures/director-neon.json"), "utf-8"),
  ) as WeekPlan;

  const app = await buildServer({
    commit: "p8-e2e",
    mapsBrowserKey: "",
    worldData,
    worldRunner: async () => ({
      outputText: JSON.stringify(recordedPlan),
      modelUsed: "gemini-4-neon",
    }),
    logSink: () => {},
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(address);
    await page.keyboard.press("Escape");

    // 1. Headless Chromium auto-defaults to crisp 2D with zero vendor-three chunk downloaded
    const toggleBtn = page.getByTestId("map-3d-toggle");
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("radar-minimap")).toBeHidden();
    expect(requestedScripts.some((u) => u.includes("vendor-three"))).toBe(false);

    // 2. Toggle 3D ON -> RadarMinimap & twilight horizon scrim mount cleanly above attribution zone
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
    const radar = page.getByTestId("radar-minimap");
    await expect(radar).toBeVisible();
    await expect(page.getByTestId("orr-horizon-scrim")).toBeVisible();

    const radarBox = await radar.boundingBox();
    expect(radarBox).not.toBeNull();
    expect(Math.round(radarBox!.width)).toBe(136);
    expect(Math.round(radarBox!.height)).toBe(136);
    expect(Math.round(radarBox!.x)).toBe(24);
    expect(radarBox!.y + radarBox!.height).toBeLessThanOrEqual(900 - 34);

    // 3. Typing 'q'/'e' inside combobox input does NOT rotate camera heading; pressing E/Q outside input rotates radar
    const initialHeading = Number(await radar.getAttribute("data-heading"));
    const combobox = page.getByTestId("office-combobox-input");
    await combobox.focus();
    await page.keyboard.type("eq");
    expect(Number(await radar.getAttribute("data-heading"))).toBe(initialHeading);
    await combobox.fill("");
    await combobox.evaluate((el: HTMLElement) => el.blur());

    await page.keyboard.press("e");
    const rotatedRight = Number(await radar.getAttribute("data-heading"));
    expect(rotatedRight).toBe((initialHeading + 18) % 360);

    await page.keyboard.press("q");
    expect(Number(await radar.getAttribute("data-heading"))).toBe(initialHeading);

    // 4. Select office & generate Week One -> office star & mission blips render on RadarMinimap
    const targetOffice = worldData.dataset.places.find((p) => p.id === recordedPlan.officePlaceId)!;
    await page.keyboard.press("Control+k");
    await page.keyboard.type(targetOffice.name.slice(0, 10));
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("radar-office-blip")).toBeVisible();

    await page.getByTestId("build-week-cta").click();
    await expect(page.getByTestId("mission-pin-1")).toBeVisible();

    // 5. Reload preserves persisted map3dEnabled: true; toggling back to 2D removes radar & horizon cleanly
    await page.reload();
    await expect(page.getByTestId("map-3d-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("radar-minimap")).toBeVisible();

    await page.getByTestId("map-3d-toggle").click();
    await expect(page.getByTestId("map-3d-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("radar-minimap")).toBeHidden();
    await expect(page.getByTestId("orr-horizon-scrim")).toBeHidden();

    // 6. Mobile viewport (390x844) hides 3D pill & radar to preserve single-row mobile topbar
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("map-3d-toggle")).toBeHidden();
    await expect(page.getByTestId("radar-minimap")).toBeHidden();

    // 7. Hardware-accelerated desktop WebGL2 auto-defaults 3D ON when no saved preference exists
    const hwContext = await page.context().browser()!.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const hwPage = await hwContext.newPage();
    await hwPage.addInitScript(() => {
      (window as Window & { __APNA_FORCE_HW_3D__?: boolean }).__APNA_FORCE_HW_3D__ = true;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ) {
        if (contextId === "webgl2") {
          return {
            RENDERER: 0x1f01,
            getExtension: (name: string) =>
              name === "WEBGL_debug_renderer_info"
                ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
                : name === "WEBGL_lose_context"
                  ? { loseContext: () => {} }
                  : null,
            getParameter: () => "ANGLE (Apple, Apple M3 Pro, OpenGL 4.1)",
          } as unknown as RenderingContext;
        }
        return origGetContext.call(this, contextId as never, options as never);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await hwPage.goto(address);
    await hwPage.keyboard.press("Escape");
    await expect(hwPage.getByTestId("map-3d-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect(hwPage.getByTestId("radar-minimap")).toBeVisible();
    await hwContext.close();

    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
