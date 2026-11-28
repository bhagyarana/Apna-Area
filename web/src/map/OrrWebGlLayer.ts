/**
 * Feature: Lazy Three.js WebGLOverlayView Beacons & ORR Dusk Traffic Layer (web/src/map/OrrWebGlLayer.ts)
 * Purpose: Renders additive vertical light pillars at verified office/mission stops and bi-directional InstancedMesh traffic streaks along all 545 corridor.geojson points inside Google Maps WebGLOverlayView.
 * Inputs: google.maps.Map instance, verified GeoJSON corridor, BeaconSpec list, and animation flag.
 * Outputs: OrrWebGlController with update() and leak-free dispose() lifecycle methods.
 * Deliberately excludes: Top-level static imports from entry bundles (loaded strictly via dynamic import in 3D mode).
 */
import {
  AdditiveBlending, BoxGeometry, CylinderGeometry, DoubleSide, Group,
  InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera,
  RingGeometry, Scene, WebGLRenderer,
} from "three";
import { MAP_3D_CONFIG, ORR_DEFAULT_CENTER, type GeoJSONLineStringFeature } from "@apna-area/shared";
import {
  buildCorridorSpline, latLngToLocalMeters, sampleCorridorAtDistance,
  type BeaconKind, type BeaconSpec, type CorridorSpline,
} from "./orrTrafficGeometry";

export type { BeaconKind, BeaconSpec };

export interface OrrWebGlLayerState {
  corridor: GeoJSONLineStringFeature;
  beacons: readonly BeaconSpec[];
  animateTraffic: boolean;
}

export interface OrrWebGlController {
  update: (next: OrrWebGlLayerState) => void;
  dispose: () => void;
}

const PALETTE: Record<BeaconKind, { hex: number; outer: number; core: number; ring: number }> = {
  office: { hex: 0xffd24a, outer: 0.4, core: 0.78, ring: 0.62 },
  active: { hex: 0xff4fa0, outer: 0.46, core: 0.86, ring: 0.72 },
  completed: { hex: 0x3de6d0, outer: 0.32, core: 0.64, ring: 0.5 },
  upcoming: { hex: 0xcfc4e8, outer: 0.16, core: 0.34, ring: 0.28 },
};

function makeAdditiveMat(color: number, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
  });
}

/**
 * Mounts a Three.js WebGLOverlayView onto a vector Google Map and returns an update/dispose handle.
 * @param map - Active google.maps.Map configured with RenderingType.VECTOR.
 * @param initialState - Verified corridor, initial beacons, and reduced-motion animation flag.
 * @returns OrrWebGlController, or null if WebGLOverlayView is unavailable.
 */
export function createOrrWebGlController(
  map: google.maps.Map,
  initialState: OrrWebGlLayerState,
): OrrWebGlController | null {
  if (typeof google === "undefined" || !google.maps?.WebGLOverlayView) return null;
  if (map.getMapCapabilities?.()?.isWebGLOverlayViewAvailable === false) return null;

  let state = initialState;
  let corridorRef = initialState.corridor;
  let spline: CorridorSpline = buildCorridorSpline(initialState.corridor.geometry.coordinates, ORR_DEFAULT_CENTER);
  let disposed = false;
  let rafId = 0;
  let renderer: WebGLRenderer | null = null;
  const startMs = performance.now();

  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const beaconGroup = new Group();
  scene.add(beaconGroup);

  const h = MAP_3D_CONFIG.pillarHeightMeters;
  const r = MAP_3D_CONFIG.pillarRadiusMeters;
  const pillarGeo = new CylinderGeometry(r * 0.44, r, h, 18, 1, true);
  pillarGeo.rotateX(Math.PI / 2);
  pillarGeo.translate(0, 0, h / 2);

  const coreGeo = new CylinderGeometry(r * 0.16, r * 0.34, h * 1.12, 12, 1, true);
  coreGeo.rotateX(Math.PI / 2);
  coreGeo.translate(0, 0, (h * 1.12) / 2);

  const ringGeo = new RingGeometry(r * 1.15, r * 1.95, 28);
  const streakGeo = new BoxGeometry(28, 3.6, 2.2);

  const allMaterials: MeshBasicMaterial[] = [];
  const trackMat = (hex: number, op: number): MeshBasicMaterial => {
    const m = makeAdditiveMat(hex, op);
    allMaterials.push(m);
    return m;
  };

  const mats = (["office", "active", "completed", "upcoming"] as const).reduce(
    (acc, k) => {
      const p = PALETTE[k];
      acc[k] = { outer: trackMat(p.hex, p.outer), core: trackMat(p.hex, p.core), ring: trackMat(p.hex, p.ring) };
      return acc;
    },
    {} as Record<BeaconKind, { outer: MeshBasicMaterial; core: MeshBasicMaterial; ring: MeshBasicMaterial }>,
  );

  const count = MAP_3D_CONFIG.trafficStreakCountPerDir;
  const southboundTraffic = new InstancedMesh(streakGeo, trackMat(0xff4fa0, 0.8), count);
  const northboundTraffic = new InstancedMesh(streakGeo, trackMat(0xffd24a, 0.76), count);
  southboundTraffic.frustumCulled = false;
  northboundTraffic.frustumCulled = false;
  scene.add(southboundTraffic, northboundTraffic);

  const dummy = new Object3D();
  let activeRings: Mesh[] = [];

  const syncBeacons = (beacons: readonly BeaconSpec[]): void => {
    beaconGroup.clear();
    activeRings = [];
    for (const b of beacons) {
      const pos = latLngToLocalMeters(b.lat, b.lng, ORR_DEFAULT_CENTER.lat, ORR_DEFAULT_CENTER.lng);
      const xy = b.kind === "office" || b.kind === "active" ? 1.15 : 0.82;
      const zScale = b.kind === "upcoming" ? 0.68 : 1;
      const mSet = mats[b.kind];

      const outer = new Mesh(pillarGeo, mSet.outer);
      outer.position.set(pos.x, pos.y, 0);
      outer.scale.set(xy, xy, zScale);
      outer.frustumCulled = false;

      const core = new Mesh(coreGeo, mSet.core);
      core.position.set(pos.x, pos.y, 0);
      core.scale.set(xy, xy, zScale);
      core.frustumCulled = false;

      const ring = new Mesh(ringGeo, mSet.ring);
      ring.position.set(pos.x, pos.y, 1.6);
      ring.scale.set(xy, xy, 1);
      ring.frustumCulled = false;
      if (b.kind === "active" || b.kind === "office") activeRings.push(ring);
      beaconGroup.add(outer, core, ring);
    }
  };

  const updateFrame = (elapsedSec: number): void => {
    const spacing = spline.totalLengthMeters / count;
    const travel = elapsedSec * MAP_3D_CONFIG.trafficSpeedMetersPerSec;
    for (let i = 0; i < count; i += 1) {
      const south = sampleCorridorAtDistance(spline, i * spacing + travel, 8.5);
      dummy.position.set(south.x, south.y, 2.2);
      dummy.rotation.set(0, 0, south.headingRad);
      dummy.updateMatrix();
      southboundTraffic.setMatrixAt(i, dummy.matrix);

      const north = sampleCorridorAtDistance(spline, spline.totalLengthMeters - (i * spacing + travel * 0.92), -8.5);
      dummy.position.set(north.x, north.y, 2.2);
      dummy.rotation.set(0, 0, north.headingRad + Math.PI);
      dummy.updateMatrix();
      northboundTraffic.setMatrixAt(i, dummy.matrix);
    }
    southboundTraffic.instanceMatrix.needsUpdate = true;
    northboundTraffic.instanceMatrix.needsUpdate = true;
    const pulse = 1 + 0.14 * Math.sin(elapsedSec * 3.2);
    for (const ring of activeRings) ring.scale.set(pulse, pulse, 1);
  };

  syncBeacons(state.beacons);
  updateFrame(0);

  const overlay = new google.maps.WebGLOverlayView();
  overlay.onAdd = () => {};
  overlay.onContextRestored = ({ gl }) => {
    if (disposed) return;
    renderer = new WebGLRenderer({ canvas: gl.canvas, context: gl, ...gl.getContextAttributes() });
    renderer.autoClear = false;
    renderer.autoClearDepth = false;
  };
  overlay.onContextLost = () => {
    renderer?.dispose();
    renderer = null;
  };
  overlay.onDraw = ({ gl, transformer }) => {
    if (disposed || !renderer) return;
    updateFrame(state.animateTraffic ? (performance.now() - startMs) / 1_000 : 0);
    renderer.setViewport(0, 0, gl.canvas.width, gl.canvas.height);
    camera.projectionMatrix.fromArray(transformer.fromLatLngAltitude({ ...ORR_DEFAULT_CENTER, altitude: 0 }));
    gl.disable(gl.SCISSOR_TEST);
    renderer.render(scene, camera);
    renderer.resetState();

    if (state.animateTraffic && rafId === 0) {
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        if (!disposed) overlay.requestRedraw();
      });
    }
  };
  overlay.onRemove = () => {
    if (rafId !== 0) window.cancelAnimationFrame(rafId);
    rafId = 0;
    renderer?.dispose();
    renderer = null;
  };
  overlay.setMap(map);

  return {
    update(next) {
      if (disposed) return;
      state = next;
      if (next.corridor !== corridorRef) {
        corridorRef = next.corridor;
        spline = buildCorridorSpline(next.corridor.geometry.coordinates, ORR_DEFAULT_CENTER);
      }
      syncBeacons(next.beacons);
      overlay.requestRedraw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      rafId = 0;
      overlay.setMap(null);
      beaconGroup.clear();
      [pillarGeo, coreGeo, ringGeo, streakGeo, southboundTraffic, northboundTraffic].forEach((d) => d.dispose());
      allMaterials.forEach((m) => m.dispose());
      renderer?.dispose();
      renderer = null;
    },
  };
}
