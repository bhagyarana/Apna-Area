/**
 * Feature: Shared Survival Kit Contracts & Pure Helper Unit Tests (shared/src/__tests__/kit.test.ts)
 * Purpose: Verifies future Monday IST timestamp math, Google Maps Directions URL builder, and budget-tailored checklists.
 * Inputs: Deterministic epoch timestamps, verified coordinates, and BudgetBand options.
 * Outputs: Vitest assertions with zero network calls.
 * Deliberately excludes: External HTTP requests.
 */
import { describe, expect, it } from "vitest";
import {
  buildFirstWeekChecklist,
  buildGoogleMapsDirectionsUrl,
  computeNextMondayIstTimestamps,
  DEFAULT_FEATURE_FLAGS,
} from "../index.js";

describe("shared/kit", () => {
  it("enables Survival Kit and Ambient Music feature flags in Phase 5", () => {
    expect(DEFAULT_FEATURE_FLAGS.enableSurvivalKit).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableAmbientMusic).toBe(true);
  });

  it("computes upcoming Monday 09:00 IST (03:30Z) and 18:30 IST (13:00Z) strictly in the future", () => {
    // Saturday 2026-11-28T00:35:00+05:30 = 2026-11-27T19:05:00.000Z -> Monday 2026-11-30
    const satNow = Date.parse("2026-11-27T19:05:00.000Z");
    const satWindow = computeNextMondayIstTimestamps(satNow);
    expect(satWindow).toEqual({
      dateKey: "2026-11-30",
      morningIso: "2026-11-30T03:30:00.000Z",
      eveningIso: "2026-11-30T13:00:00.000Z",
    });

    // Monday 2026-11-30 at 10:00 IST (04:30Z) -> rolls forward 7 days so morningIso stays in the future
    const monLate = Date.parse("2026-11-30T04:30:00.000Z");
    const nextMonWindow = computeNextMondayIstTimestamps(monLate);
    expect(nextMonWindow.dateKey).toBe("2026-12-07");
    expect(Date.parse(nextMonWindow.morningIso)).toBeGreaterThan(monLate);
  });

  it("builds escaped Google Maps Cross-Platform Directions URLs with verified place IDs", () => {
    const uri = buildGoogleMapsDirectionsUrl({
      originLat: 12.926,
      originLng: 77.6762,
      originName: "Bellandur",
      originPlaceId: "ChIJ_origin_bellandur",
      destinationLat: 12.9315,
      destinationLng: 77.6848,
      destinationName: "Embassy TechVillage",
      destinationPlaceId: "ChIJ_dest_etv",
      travelMode: "driving",
    });
    const parsed = new URL(uri);
    expect(parsed.origin).toBe("https://www.google.com");
    expect(parsed.pathname).toBe("/maps/dir/");
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.get("origin_place_id")).toBe("ChIJ_origin_bellandur");
    expect(parsed.searchParams.get("destination_place_id")).toBe("ChIJ_dest_etv");
    expect(parsed.searchParams.get("travelmode")).toBe("driving");
  });

  it("returns 6 concrete checklist items per budgetBand with zero em dashes or rupee symbols", () => {
    for (const band of ["15_20k", "20_30k", "30k_plus"] as const) {
      const list = buildFirstWeekChecklist(band);
      expect(list).toHaveLength(6);
      for (const item of list) {
        expect(item.label).not.toMatch(/[\u2014\u2013₹]/);
        expect(item.detail).not.toMatch(/[\u2014\u2013₹]/);
      }
    }
  });
});
