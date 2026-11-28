/**
 * Feature: Phase 8 ORR 3D Spline, Radar Projection & WebGL Lifecycle Unit Tests (web/src/map/__tests__/orrTrafficGeometry.test.ts)
 * Purpose: Verifies 545-point corridor.geojson arc-length interpolation, bi-directional lane offsets, heading-locked radar projection, software GPU filtering, and WebGLOverlayView cleanup.
 * Inputs: Verified data/orr/corridor.geojson coordinates and synthetic camera poses.
 * Outputs: Deterministic Vitest assertions.
 * Deliberately excludes: Browser network calls.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, type GeoJSONLineStringFeature } from "@apna-area/shared";
import { isSoftwareRendererName } from "../../state/sessionStore";
import {
  buildCorridorSpline,
  computeCorridorHeadingDeg,
  normalizeHeadingDeg,
  projectRadarBlip,
  sampleCorridorAtDistance,
} from "../orrTrafficGeometry";
import { createOrrWebGlController } from "../OrrWebGlLayer";

const corridorPath = path.resolve(process.cwd(), "data/orr/corridor.geojson");
const verifiedCorridor = JSON.parse(readFileSync(corridorPath, "utf-8")) as GeoJSONLineStringFeature;

describe("Phase 8 ORR 3D geometry, hardware gate & WebGL lifecycle", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "google");
  });

  it("enables enable3dDusk in DEFAULT_FEATURE_FLAGS and builds full 545-point corridor spline", () => {
    expect(DEFAULT_FEATURE_FLAGS.enable3dDusk).toBe(true);
    expect(verifiedCorridor.geometry.coordinates.length).toBe(545);

    const spline = buildCorridorSpline(verifiedCorridor.geometry.coordinates);
    expect(spline.totalLengthMeters).toBeGreaterThan(14_000);
    expect(spline.totalLengthMeters).toBeLessThan(16_500);

    const start = sampleCorridorAtDistance(spline, 0, 0);
    const wrapped = sampleCorridorAtDistance(spline, spline.totalLengthMeters, 0);
    expect(wrapped.x).toBeCloseTo(start.x, 4);
    expect(wrapped.y).toBeCloseTo(start.y, 4);

    // Bi-directional carriageways separate laterally by 17m (+8.5m vs -8.5m)
    const leftLane = sampleCorridorAtDistance(spline, 3_200, 8.5);
    const rightLane = sampleCorridorAtDistance(spline, 3_200, -8.5);
    const laneSeparation = Math.hypot(leftLane.x - rightLane.x, leftLane.y - rightLane.y);
    expect(laneSeparation).toBeCloseTo(17, 2);
  });

  it("rotates heading-locked radar blips so camera forward points straight up (-Y) and clamps distant stops", () => {
    expect(normalizeHeadingDeg(-18)).toBe(342);
    expect(computeCorridorHeadingDeg(12.93, 77.68, 12.93, 77.69)).toBeCloseTo(90, 0);

    // Point due East when camera faces East (90 deg) should sit straight ahead (x ~ 0, y < 0)
    const ahead = projectRadarBlip(12.9315, 77.695, 12.9315, 77.6848, 90);
    expect(Math.abs(ahead.x)).toBeLessThan(1);
    expect(ahead.y).toBeLessThan(-15);
    expect(ahead.clamped).toBe(false);

    // Distant Marathahalli stop clamps cleanly to maxRadiusPx (52px)
    const far = projectRadarBlip(12.975, 77.715, 12.9177, 77.6238, 32, 2_600, 52);
    expect(far.clamped).toBe(true);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(52, 3);
  });

  it("excludes SwiftShader, llvmpipe, and software WebGL rasterizers while allowing hardware GPUs", () => {
    expect(
      isSoftwareRendererName("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))"),
    ).toBe(true);
    expect(isSoftwareRendererName("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(isSoftwareRendererName("Microsoft Basic Render Driver")).toBe(true);
    expect(isSoftwareRendererName("ANGLE (Apple, Apple M3 Pro, OpenGL 4.1)")).toBe(false);
    expect(isSoftwareRendererName("ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11)")).toBe(
      false,
    );
  });

  it("mounts and disposes WebGLOverlayView cleanly and respects isWebGLOverlayViewAvailable === false", () => {
    const attachedMaps: unknown[] = [];
    let redrawCount = 0;

    class MockWebGLOverlayView {
      onAdd = () => {};
      onContextRestored = () => {};
      onContextLost = () => {};
      onDraw = () => {};
      onRemove = () => {};
      setMap(m: unknown) {
        attachedMaps.push(m);
        if (m === null) this.onRemove();
      }
      requestRedraw() {
        redrawCount += 1;
      }
    }

    Object.assign(globalThis, {
      google: { maps: { WebGLOverlayView: MockWebGLOverlayView } },
    });

    const unsupportedMap = {
      getMapCapabilities: () => ({ isWebGLOverlayViewAvailable: false }),
    } as unknown as google.maps.Map;
    expect(
      createOrrWebGlController(unsupportedMap, {
        corridor: verifiedCorridor,
        beacons: [],
        animateTraffic: false,
      }),
    ).toBeNull();

    const vectorMap = {
      getMapCapabilities: () => ({ isWebGLOverlayViewAvailable: true }),
    } as unknown as google.maps.Map;
    const ctrl = createOrrWebGlController(vectorMap, {
      corridor: verifiedCorridor,
      beacons: [{ id: "office-1", lat: 12.9315, lng: 77.6848, kind: "office" }],
      animateTraffic: false,
    });
    expect(ctrl).not.toBeNull();
    expect(attachedMaps).toEqual([vectorMap]);

    ctrl!.update({
      corridor: verifiedCorridor,
      beacons: [
        { id: "office-1", lat: 12.9315, lng: 77.6848, kind: "office" },
        { id: "stop-1", lat: 12.926, lng: 77.6762, kind: "active" },
      ],
      animateTraffic: false,
    });
    expect(redrawCount).toBe(1);

    ctrl!.dispose();
    expect(attachedMaps).toEqual([vectorMap, null]);
  });
});
