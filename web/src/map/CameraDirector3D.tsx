/**
 * Feature: 3D Sky-Drop Camera Director, Voice Street Orbit & Lazy WebGL Loader (web/src/map/CameraDirector3D.tsx)
 * Purpose: Drives the 3-stage parabolic Sky-Drop swoop (12.6/0 -> 15.2/38 -> 17.4/65), 1.2 deg/s voice street orbit, and lazy OrrWebGlLayer lifecycle on Vector maps.
 * Inputs: Active target place, selectedOffice, corridor GeoJSON, BeaconSpec list, inVoiceMission flag, and heading state.
 * Outputs: Null render component imperatively steering google.maps.Map in 3D mode.
 * Deliberately excludes: Static Three.js imports or fighting user pointer drag gestures.
 */
import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import {
  MAP_3D_CONFIG,
  ORR_DEFAULT_CENTER,
  type GeoJSONLineStringFeature,
  type VerifiedPlace,
} from "@apna-area/shared";
import { OVERVIEW_CAMERA } from "./CameraGlideController";
import {
  computeCorridorHeadingDeg,
  normalizeHeadingDeg,
  type BeaconSpec,
} from "./orrTrafficGeometry";
import type { OrrWebGlController } from "./OrrWebGlLayer";

export interface CameraPose3D {
  lat: number;
  lng: number;
  zoom: number;
  tilt: number;
  heading: number;
}

export interface CameraDirector3DProps {
  corridor: GeoJSONLineStringFeature;
  selectedOffice: VerifiedPlace | null;
  activeMissionPlace: VerifiedPlace | null;
  beacons: readonly BeaconSpec[];
  tourActive: boolean;
  inVoiceMission: boolean;
  manualHeadingDeltaDeg: number;
  onPoseChange: (pose: CameraPose3D) => void;
}

function interpolateAngleDeg(fromDeg: number, toDeg: number, t: number): number {
  const diff = ((toDeg - fromDeg + 540) % 360) - 180;
  return normalizeHeadingDeg(fromDeg + diff * t);
}

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function applyPose(
  map: google.maps.Map,
  poseRef: { current: CameraPose3D },
  onPoseChange: (pose: CameraPose3D) => void,
  next: CameraPose3D,
): void {
  poseRef.current = next;
  map.moveCamera({
    center: { lat: next.lat, lng: next.lng },
    zoom: next.zoom,
    tilt: next.tilt,
    heading: next.heading,
  });
  onPoseChange(next);
}

/**
 * Orchestrates 3D vector camera choreography and mounts the lazy Three.js WebGLOverlayView layer.
 * @param props - Corridor geometry, office/mission targets, beacon specs, manual heading delta, and pose callback.
 * @returns Null (imperative Google Map controller).
 */
export function CameraDirector3D({
  corridor,
  selectedOffice,
  activeMissionPlace,
  beacons,
  tourActive,
  inVoiceMission,
  manualHeadingDeltaDeg,
  onPoseChange,
}: CameraDirector3DProps): null {
  const map = useMap();
  const webglRef = useRef<OrrWebGlController | null>(null);
  const latestRef = useRef({ corridor, beacons, tourActive });
  latestRef.current = { corridor, beacons, tourActive };

  const poseRef = useRef<CameraPose3D>({
    lat: OVERVIEW_CAMERA.lat,
    lng: OVERVIEW_CAMERA.lng,
    zoom: MAP_3D_CONFIG.overviewZoom,
    tilt: MAP_3D_CONFIG.idleCorridorTiltDeg,
    heading: MAP_3D_CONFIG.corridorDefaultHeadingDeg,
  });
  const prevDeltaRef = useRef(manualHeadingDeltaDeg);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    void import("./OrrWebGlLayer").then((mod) => {
      if (cancelled) return;
      const cur = latestRef.current;
      webglRef.current = mod.createOrrWebGlController(map, {
        corridor: cur.corridor,
        beacons: cur.beacons,
        animateTraffic: !reduced && !cur.tourActive,
      });
    });
    return () => {
      cancelled = true;
      webglRef.current?.dispose();
      webglRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    webglRef.current?.update({ corridor, beacons, animateTraffic: !reduced && !tourActive });
  }, [corridor, beacons, tourActive]);

  useEffect(() => {
    const delta = manualHeadingDeltaDeg - prevDeltaRef.current;
    prevDeltaRef.current = manualHeadingDeltaDeg;
    if (!map || delta === 0 || tourActive) return;
    const c = map.getCenter();
    applyPose(map, poseRef, onPoseChange, {
      lat: c?.lat() ?? poseRef.current.lat,
      lng: c?.lng() ?? poseRef.current.lng,
      zoom: map.getZoom() ?? poseRef.current.zoom,
      tilt: map.getTilt() ?? poseRef.current.tilt,
      heading: normalizeHeadingDeg((map.getHeading() ?? poseRef.current.heading) + delta),
    });
  }, [map, manualHeadingDeltaDeg, tourActive, onPoseChange]);

  useEffect(() => {
    if (!map || tourActive) return;
    const target = activeMissionPlace ?? selectedOffice;
    const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

    if (!target) {
      applyPose(map, poseRef, onPoseChange, {
        lat: OVERVIEW_CAMERA.lat,
        lng: OVERVIEW_CAMERA.lng,
        zoom: MAP_3D_CONFIG.overviewZoom,
        tilt: MAP_3D_CONFIG.idleCorridorTiltDeg,
        heading: MAP_3D_CONFIG.corridorDefaultHeadingDeg,
      });
      return;
    }

    const baseHeading =
      selectedOffice && activeMissionPlace && selectedOffice.id !== activeMissionPlace.id
        ? computeCorridorHeadingDeg(
            selectedOffice.lat,
            selectedOffice.lng,
            activeMissionPlace.lat,
            activeMissionPlace.lng,
          )
        : computeCorridorHeadingDeg(
            ORR_DEFAULT_CENTER.lat,
            ORR_DEFAULT_CENTER.lng,
            target.lat,
            target.lng,
          );

    const destLat = inVoiceMission ? target.lat : target.lat;
    const destLng = inVoiceMission ? target.lng : target.lng - 0.0022;

    if (reduced) {
      applyPose(map, poseRef, onPoseChange, {
        lat: destLat,
        lng: destLng,
        zoom: MAP_3D_CONFIG.streetZoom,
        tilt: MAP_3D_CONFIG.streetTiltDeg,
        heading: baseHeading,
      });
      return;
    }

    const startCenter = map.getCenter();
    const fromLat = startCenter?.lat() ?? OVERVIEW_CAMERA.lat;
    const fromLng = startCenter?.lng() ?? OVERVIEW_CAMERA.lng;
    const fromHeading = map.getHeading() ?? MAP_3D_CONFIG.corridorDefaultHeadingDeg;
    const bankHeading = normalizeHeadingDeg(baseHeading - 14);

    let interrupted = false;
    let rafId = 0;
    const dragListener = map.addListener("dragstart", () => {
      interrupted = true;
    });
    const swoopStart = performance.now();

    const step = (now: number) => {
      if (interrupted) return;
      const p = Math.min(1, (now - swoopStart) / MAP_3D_CONFIG.skyDropDurationMs);
      if (p < 1) {
        const geoT = easeOutQuint(p);
        const s = p <= 0.48 ? easeOutQuint(p / 0.48) : easeOutQuint((p - 0.48) / 0.52);
        const zoom =
          p <= 0.48
            ? MAP_3D_CONFIG.overviewZoom + (MAP_3D_CONFIG.midBankZoom - MAP_3D_CONFIG.overviewZoom) * s
            : MAP_3D_CONFIG.midBankZoom + (MAP_3D_CONFIG.streetZoom - MAP_3D_CONFIG.midBankZoom) * s;
        const tilt =
          p <= 0.48
            ? MAP_3D_CONFIG.overviewTiltDeg +
              (MAP_3D_CONFIG.midBankTiltDeg - MAP_3D_CONFIG.overviewTiltDeg) * s
            : MAP_3D_CONFIG.midBankTiltDeg +
              (MAP_3D_CONFIG.streetTiltDeg - MAP_3D_CONFIG.midBankTiltDeg) * s;
        const heading =
          p <= 0.48
            ? interpolateAngleDeg(fromHeading, bankHeading, s)
            : interpolateAngleDeg(bankHeading, baseHeading, s);
        applyPose(map, poseRef, onPoseChange, {
          lat: fromLat + (destLat - fromLat) * geoT,
          lng: fromLng + (destLng - fromLng) * geoT,
          zoom,
          tilt,
          heading,
        });
        rafId = window.requestAnimationFrame(step);
        return;
      }

      if (inVoiceMission) {
        const orbitSec = (now - swoopStart - MAP_3D_CONFIG.skyDropDurationMs) / 1_000;
        applyPose(map, poseRef, onPoseChange, {
          lat: target.lat,
          lng: target.lng,
          zoom: MAP_3D_CONFIG.streetZoom,
          tilt: MAP_3D_CONFIG.streetTiltDeg,
          heading: normalizeHeadingDeg(baseHeading + orbitSec * MAP_3D_CONFIG.voiceOrbitDegPerSec),
        });
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      interrupted = true;
      window.cancelAnimationFrame(rafId);
      dragListener.remove();
    };
  }, [map, selectedOffice, activeMissionPlace, tourActive, inVoiceMission, onPoseChange]);

  return null;
}
