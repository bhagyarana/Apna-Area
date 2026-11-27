/**
 * Feature: Fastify API Contract Tests
 * Purpose: Verifies GET /api/health, GET /api/config secret isolation, 404 typed envelopes, and rate limiting.
 * Inputs: In-memory Fastify app.inject() requests.
 * Outputs: Vitest assertions against Zod contracts.
 * Deliberately excludes: Live external network calls.
 */
import { describe, expect, it } from "vitest";
import {
  HealthDataSchema,
  ORR_BBOX,
  PlacesPayloadSchema,
  PublicConfigDataSchema,
} from "@apna-area/shared";
import { buildServer } from "../app.js";

describe("server routes", () => {
  it("GET /api/health returns validated health metadata and x-request-id", async () => {
    const logs: string[] = [];
    const app = await buildServer({
      version: "0.1.0",
      commit: "p0test1",
      builtAt: "2026-11-27T08:30:00Z",
      geminiApiKey: "test-gemini-secret",
      mapsBrowserKey: "test-maps-public",
      logSink: (l) => logs.push(l),
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toBeTruthy();

    const body = res.json() as { ok: boolean; data: unknown; requestId: string };
    expect(body.ok).toBe(true);
    const parsed = HealthDataSchema.parse(body.data);
    expect(parsed.commit).toBe("p0test1");
    expect(parsed.upstreams.geminiConfigured).toBe(true);
    expect(parsed.upstreams.mapsConfigured).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(1);

    await app.close();
  });

  it("GET /api/config exposes browser config without ever leaking GEMINI_API_KEY or MAPS_SERVER_KEY", async () => {
    const app = await buildServer({
      geminiApiKey: "server-only-gemini-credential-do-not-expose",
      mapsServerKey: "server-only-maps-credential-do-not-expose",
      mapsBrowserKey: "maps-browser-referrer-restricted",
      logSink: () => {},
    });

    const res = await app.inject({ method: "GET", url: "/api/config" });
    expect(res.statusCode).toBe(200);
    const rawText = res.body;
    expect(rawText).not.toContain("server-only-gemini-credential-do-not-expose");
    expect(rawText).not.toContain("server-only-maps-credential-do-not-expose");

    const body = res.json() as { ok: boolean; data: unknown };
    expect(body.ok).toBe(true);
    const parsed = PublicConfigDataSchema.parse(body.data);
    expect(parsed.mapsBrowserKey).toBe("maps-browser-referrer-restricted");
    expect(parsed.enabledLanguages).toEqual(["en"]);

    await app.close();
  });

  it("returns typed 404 JSON on unknown /api/* routes and enforces per-IP rate limits", async () => {
    const app = await buildServer({
      rateLimitMax: 2,
      logSink: () => {},
    });

    const missing = await app.inject({ method: "GET", url: "/api/does-not-exist" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", retryable: false },
    });

    await app.inject({ method: "GET", url: "/api/health" });
    const throttled = await app.inject({ method: "GET", url: "/api/health" });
    expect(throttled.statusCode).toBe(429);
    expect(throttled.json()).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED", retryable: true },
    });

    await app.close();
  });

  it("GET /api/places filters verified places by category and rejects unknown categories", async () => {
    const app = await buildServer({
      worldData: {
        dataset: {
          verifiedAt: "2026-11-27T10:00:00Z",
          bbox: ORR_BBOX,
          totalCount: 2,
          places: [
            {
              id: "ChIJ_test_ecoworld",
              name: "RMZ EcoWorld",
              category: "tech_park",
              neighbourhood: "Bellandur",
              lat: 12.9215,
              lng: 77.6845,
              shortAddress: "Bellandur, Bengaluru",
              googleMapsUri: "https://maps.google.com/?cid=101",
            },
            {
              id: "ChIJ_test_darshini",
              name: "Udupi Upahar",
              category: "darshini",
              neighbourhood: "Bellandur",
              lat: 12.9255,
              lng: 77.6761,
              shortAddress: "Bellandur, Bengaluru",
              googleMapsUri: "https://maps.google.com/?cid=102",
            },
          ],
        },
        corridor: {
          type: "Feature",
          properties: {
            generatedAt: "2026-11-27T10:00:00Z",
            distanceMeters: 11200,
            source: "Google Routes API v2",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [77.7011, 12.9569],
              [77.6238, 12.9177],
            ],
          },
        },
      },
      logSink: () => {},
    });

    const allRes = await app.inject({ method: "GET", url: "/api/places" });
    expect(allRes.statusCode).toBe(200);
    const allPayload = PlacesPayloadSchema.parse((allRes.json() as { data: unknown }).data);
    expect(allPayload.places).toHaveLength(2);

    const parkRes = await app.inject({ method: "GET", url: "/api/places?category=tech_park" });
    expect(parkRes.statusCode).toBe(200);
    const parkPayload = PlacesPayloadSchema.parse((parkRes.json() as { data: unknown }).data);
    expect(parkPayload.places).toHaveLength(1);
    expect(parkPayload.places[0]?.id).toBe("ChIJ_test_ecoworld");

    const badRes = await app.inject({ method: "GET", url: "/api/places?category=nightclub" });
    expect(badRes.statusCode).toBe(400);

    await app.close();
  });
});
