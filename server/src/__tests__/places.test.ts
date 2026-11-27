/**
 * Feature: Verified Places & Polyline Filter Unit Tests
 * Purpose: Tests ORR bounding-box filtering, closed-business dropping, under-construction metro exclusion, deduplication, and polyline decoding.
 * Inputs: Synthetic RawGooglePlace records and reference Google encoded polylines.
 * Outputs: Vitest assertions.
 * Deliberately excludes: Live Google Maps HTTP requests.
 */
import { describe, expect, it } from "vitest";
import {
  decodeGooglePolyline,
  isNonCampusTechParkSubvenue,
  isUnderConstructionOrrMetro,
  isWithinBoundingBox,
  normaliseAndDedupePlaces,
} from "../places/filter.js";

describe("server/places/filter", () => {
  it("accepts coordinates inside ORR_BBOX and rejects out-of-box points", () => {
    expect(isWithinBoundingBox(12.926, 77.6762)).toBe(true); // Bellandur
    expect(isWithinBoundingBox(12.9716, 77.5946)).toBe(false); // MG Road (west of box)
    expect(isWithinBoundingBox(13.1986, 77.7066)).toBe(false); // KIA Airport (north of box)
  });

  it("drops closed places, out-of-box places, duplicates, and under-construction ORR metro stations", () => {
    const places = normaliseAndDedupePlaces([
      {
        category: "tech_park",
        items: [
          {
            id: "ChIJ_ecoworld_1",
            displayName: { text: "RMZ EcoWorld" },
            location: { latitude: 12.9215, longitude: 77.6845 },
            businessStatus: "OPERATIONAL",
            googleMapsUri: "https://maps.google.com/?cid=1",
          },
          {
            id: "ChIJ_ecoworld_1", // Duplicate ID
            displayName: { text: "RMZ EcoWorld Duplicate" },
            location: { latitude: 12.9215, longitude: 77.6845 },
            businessStatus: "OPERATIONAL",
          },
          {
            id: "ChIJ_closed_1",
            displayName: { text: "Old Closed Cafe" },
            location: { latitude: 12.926, longitude: 77.676 },
            businessStatus: "CLOSED_PERMANENTLY",
          },
          {
            id: "ChIJ_outside_1",
            displayName: { text: "Indiranagar Office" },
            location: { latitude: 12.9784, longitude: 77.6408 },
            businessStatus: "OPERATIONAL",
          },
        ],
      },
      {
        category: "transit_stop",
        items: [
          {
            id: "ChIJ_bellandur_metro_uc",
            displayName: { text: "Bellandur Metro Station" },
            location: { latitude: 12.9262, longitude: 77.6764 },
            types: ["subway_station", "transit_station"],
            businessStatus: "OPERATIONAL",
          },
          {
            id: "ChIJ_bellandur_bmtc",
            displayName: { text: "Bellandur Gate BMTC Bus Stop" },
            location: { latitude: 12.9258, longitude: 77.6759 },
            types: ["bus_station", "transit_station"],
            businessStatus: "OPERATIONAL",
          },
        ],
      },
    ]);

    expect(places.map((p) => p.id)).toEqual(["ChIJ_bellandur_bmtc", "ChIJ_ecoworld_1"]);
    expect(places[0]?.neighbourhood).toBe("Bellandur");
  });

  it("identifies subway/metro station labels for ORR Phase 2A exclusion", () => {
    expect(isUnderConstructionOrrMetro("Kadubeesanahalli Metro Station", [])).toBe(true);
    expect(isUnderConstructionOrrMetro("Stop", ["subway_station"])).toBe(true);
    expect(isUnderConstructionOrrMetro("Agara BMTC Bus Depot", ["bus_station"])).toBe(false);
  });

  it("excludes in-campus salons, eateries, bus stops, and duplicate campus names from tech_park", () => {
    expect(isNonCampusTechParkSubvenue("Enrich Salon RMZ EcoWorld", [], "beauty_salon")).toBe(true);
    expect(isNonCampusTechParkSubvenue("Embassy Tech Village", [], "bus_stop")).toBe(true);
    expect(isNonCampusTechParkSubvenue("RMZ Ecospace", ["premise"], "premise")).toBe(false);
  });

  it("decodes canonical Google encoded polyline into [lng, lat] pairs", () => {
    // Canonical Google polyline example: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
    const coords = decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(coords).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });
});
