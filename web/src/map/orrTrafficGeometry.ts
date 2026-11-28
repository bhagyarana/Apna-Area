/**
 * Feature: Pure ORR Corridor Spline & Radar Projection Math (web/src/map/orrTrafficGeometry.ts)
 * Purpose: Converts WGS84 coordinates into local tangent-plane meters, builds arc-length tables over the 545-point corridor, and projects heading-locked radar blips.
 * Inputs: GeoJSON [lng, lat] coordinate arrays, camera pose, and VerifiedPlace coordinates.
 * Outputs: Typed CorridorSpline, interpolated TrafficSample positions, compass bearings, and RadarBlipProjection coordinates.
 * Deliberately excludes: Three.js or DOM imports so unit tests run in Node and 2D bundles stay lightweight.
 */
import { MAP_3D_CONFIG, ORR_DEFAULT_CENTER } from "@apna-area/shared";

const EARTH_RADIUS_METERS = 6_371_010;
const DEG_TO_RAD = Math.PI / 180;

export interface LocalPointMeters {
  x: number;
  y: number;
}

export interface CorridorSpline {
  pointsX: Float64Array;
  pointsY: Float64Array;
  headingsRad: Float64Array;
  cumulativeMeters: Float64Array;
  totalLengthMeters: number;
}

export interface TrafficSample {
  x: number;
  y: number;
  headingRad: number;
}

export interface RadarBlipProjection {
  x: number;
  y: number;
  clamped: boolean;
}

export type BeaconKind = "office" | "active" | "completed" | "upcoming";

export interface BeaconSpec {
  id: string;
  lat: number;
  lng: number;
  kind: BeaconKind;
}

/**
 * Builds verified 3D beacon descriptors for the selected office and 5 Week One mission stops.
 * @param params - Selected office, missions array, verified places map, active index, and completion record.
 * @returns Ordered BeaconSpec array for Three.js WebGLOverlayView rendering.
 */
export function buildMapBeacons(params: {
  selectedOffice: { id: string; lat: number; lng: number } | null;
  missions?: ReadonlyArray<{ id: string; placeId: string }>;
  placesById: ReadonlyMap<string, { lat: number; lng: number }>;
  activeMissionIndex: number;
  completedMissions?: Readonly<Record<string, number>>;
}): BeaconSpec[] {
  const out: BeaconSpec[] = [];
  if (params.selectedOffice) {
    const o = params.selectedOffice;
    out.push({ id: o.id, lat: o.lat, lng: o.lng, kind: "office" });
  }
  params.missions?.forEach((m, idx) => {
    const p = params.placesById.get(m.placeId);
    if (!p) return;
    const kind: BeaconKind =
      idx === params.activeMissionIndex
        ? "active"
        : params.completedMissions?.[m.id]
          ? "completed"
          : "upcoming";
    out.push({ id: m.id, lat: p.lat, lng: p.lng, kind });
  });
  return out;
}

/**
 * Normalises any angle in degrees into the [0, 360) compass interval.
 * @param deg - Input angle in degrees.
 * @returns Normalized compass heading in [0, 360).
 */
export function normalizeHeadingDeg(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Projects a WGS84 (lat, lng) coordinate into local East (+x) and North (+y) meters around an anchor.
 * @param lat - Target latitude.
 * @param lng - Target longitude.
 * @param anchorLat - Origin latitude.
 * @param anchorLng - Origin longitude.
 * @returns Local East/North offset in meters.
 */
export function latLngToLocalMeters(
  lat: number,
  lng: number,
  anchorLat: number = ORR_DEFAULT_CENTER.lat,
  anchorLng: number = ORR_DEFAULT_CENTER.lng,
): LocalPointMeters {
  const dLat = (lat - anchorLat) * DEG_TO_RAD;
  const dLng = (lng - anchorLng) * DEG_TO_RAD;
  return {
    x: dLng * EARTH_RADIUS_METERS * Math.cos(anchorLat * DEG_TO_RAD),
    y: dLat * EARTH_RADIUS_METERS,
  };
}

/**
 * Computes compass heading in degrees (0 = North, 90 = East) from one coordinate to another.
 * @param fromLat - Origin latitude.
 * @param fromLng - Origin longitude.
 * @param toLat - Destination latitude.
 * @param toLng - Destination longitude.
 * @param fallbackDeg - Fallback heading when points coincide.
 * @returns Compass bearing in [0, 360).
 */
export function computeCorridorHeadingDeg(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fallbackDeg: number = MAP_3D_CONFIG.corridorDefaultHeadingDeg,
): number {
  const delta = latLngToLocalMeters(toLat, toLng, fromLat, fromLng);
  if (Math.hypot(delta.x, delta.y) < 5) return normalizeHeadingDeg(fallbackDeg);
  return normalizeHeadingDeg(Math.atan2(delta.x, delta.y) / DEG_TO_RAD);
}

/**
 * Builds an arc-length-parameterised spline from GeoJSON LineString [lng, lat] coordinates.
 * @param coordinates - Verified corridor.geojson [lng, lat] pairs.
 * @param anchor - Scene origin in WGS84 degrees.
 * @returns Precomputed CorridorSpline.
 */
export function buildCorridorSpline(
  coordinates: ReadonlyArray<readonly [number, number]>,
  anchor: { lat: number; lng: number } = ORR_DEFAULT_CENTER,
): CorridorSpline {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < coordinates.length; i += 1) {
    const pair = coordinates[i];
    if (!pair) continue;
    const pt = latLngToLocalMeters(pair[1], pair[0], anchor.lat, anchor.lng);
    const prevX = xs[xs.length - 1];
    const prevY = ys[ys.length - 1];
    if (prevX !== undefined && prevY !== undefined && Math.hypot(pt.x - prevX, pt.y - prevY) < 0.05) {
      continue;
    }
    xs.push(pt.x);
    ys.push(pt.y);
  }
  if (xs.length < 2) {
    xs.push(0, 10);
    ys.push(0, 10);
  }
  const n = xs.length;
  const pointsX = Float64Array.from(xs);
  const pointsY = Float64Array.from(ys);
  const headingsRad = new Float64Array(n);
  const cumulativeMeters = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = pointsX[i + 1]! - pointsX[i]!;
    const dy = pointsY[i + 1]! - pointsY[i]!;
    headingsRad[i] = Math.atan2(dy, dx);
    total += Math.hypot(dx, dy);
    cumulativeMeters[i + 1] = total;
  }
  headingsRad[n - 1] = headingsRad[n - 2] ?? 0;
  return { pointsX, pointsY, headingsRad, cumulativeMeters, totalLengthMeters: Math.max(1, total) };
}

/**
 * Samples local (x, y) meters and tangent heading at any wrapped distance along the ORR spline.
 * @param spline - Precomputed CorridorSpline.
 * @param distanceMeters - Distance along the corridor (wraps modulo totalLengthMeters).
 * @param laneOffsetMeters - Perpendicular carriageway offset in meters.
 * @returns Interpolated local meter position and tangent heading in radians.
 */
export function sampleCorridorAtDistance(
  spline: CorridorSpline,
  distanceMeters: number,
  laneOffsetMeters = 0,
): TrafficSample {
  const total = spline.totalLengthMeters;
  const wrapped = ((distanceMeters % total) + total) % total;
  const cum = spline.cumulativeMeters;
  let lo = 0;
  let hi = cum.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((cum[mid] ?? 0) <= wrapped) lo = mid;
    else hi = mid - 1;
  }
  const segStart = cum[lo] ?? 0;
  const segLen = Math.max(0.001, (cum[lo + 1] ?? segStart + 1) - segStart);
  const t = Math.min(1, Math.max(0, (wrapped - segStart) / segLen));
  const x0 = spline.pointsX[lo] ?? 0;
  const y0 = spline.pointsY[lo] ?? 0;
  const headingRad = spline.headingsRad[lo] ?? 0;
  return {
    x: x0 + ((spline.pointsX[lo + 1] ?? x0) - x0) * t - Math.sin(headingRad) * laneOffsetMeters,
    y: y0 + ((spline.pointsY[lo + 1] ?? y0) - y0) * t + Math.cos(headingRad) * laneOffsetMeters,
    headingRad,
  };
}

/**
 * Projects a WGS84 target onto a heading-locked circular radar SVG where camera heading points straight up (-Y).
 * @param lat - Target latitude.
 * @param lng - Target longitude.
 * @param centerLat - Radar center latitude.
 * @param centerLng - Radar center longitude.
 * @param cameraHeadingDeg - Camera heading in degrees.
 * @param rangeMeters - Ground range mapped to disc radius.
 * @param maxRadiusPx - Perimeter clamp radius in SVG pixels.
 * @returns Projected SVG coordinates and clamped flag.
 */
export function projectRadarBlip(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  cameraHeadingDeg: number,
  rangeMeters: number = MAP_3D_CONFIG.radarRangeMeters,
  maxRadiusPx = 52,
): RadarBlipProjection {
  const { x: eastM, y: northM } = latLngToLocalMeters(lat, lng, centerLat, centerLng);
  const rad = normalizeHeadingDeg(cameraHeadingDeg) * DEG_TO_RAD;
  const forwardM = eastM * Math.sin(rad) + northM * Math.cos(rad);
  const rightM = eastM * Math.cos(rad) - northM * Math.sin(rad);
  const scale = 54 / Math.max(1, rangeMeters);
  const rawX = rightM * scale;
  const rawY = -forwardM * scale;
  const dist = Math.hypot(rawX, rawY);
  if (dist > maxRadiusPx && dist > 0) {
    const ratio = maxRadiusPx / dist;
    return { x: rawX * ratio, y: rawY * ratio, clamped: true };
  }
  return { x: rawX, y: rawY, clamped: false };
}
