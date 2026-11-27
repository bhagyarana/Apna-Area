/**
 * Feature: Viewport-Aware Map Camera Glide & Bounds Controller (web/src/map/CameraGlideController.tsx)
 * Purpose: Fits map bounds asymmetrically around {office + 5 mission stops} on Week One reveal and glides smoothly to individual stops.
 * Inputs: Target VerifiedPlace, optional boundsPlaces cluster, tourActive flag, and isMissionStop hint.
 * Outputs: Null render component driving map.fitBounds / map.moveCamera with reduced-motion support.
 * Deliberately excludes: Blocking user pan/zoom gestures after camera transitions finish.
 */
import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { ORR_DEFAULT_CENTER, type VerifiedPlace } from "@apna-area/shared";

export const OVERVIEW_CAMERA = { lat: 12.942, lng: 77.653, zoom: 12.45 };

function computeFramedCenter(
  target: VerifiedPlace,
  zoomOverride?: number,
  inVoiceMission = false,
): { lat: number; lng: number; zoom: number } {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const zoom = zoomOverride ?? (isMobile ? 14.5 : 14.8);
  if (inVoiceMission) {
    return isMobile
      ? { lat: target.lat - 0.00025, lng: target.lng, zoom }
      : { lat: target.lat - 0.00055, lng: target.lng - 0.0014, zoom };
  }
  if (isMobile) {
    return { lat: target.lat - 0.0045, lng: target.lng, zoom };
  }
  return { lat: target.lat, lng: target.lng - 0.0075, zoom };
}

export interface CameraGlideControllerProps {
  target: VerifiedPlace | null;
  boundsPlaces?: readonly VerifiedPlace[];
  fitCluster?: boolean;
  tourActive: boolean;
  isMissionStop: boolean;
  inVoiceMission?: boolean;
}

/**
 * Animates map camera transitions and fits asymmetric HUD-safe bounds around Week One stops.
 *
 * @param props - Target place, optional cluster bounds list, tour flag, and mission zoom indicator.
 * @returns Null (imperative map controller).
 */
export function CameraGlideController({
  target,
  boundsPlaces,
  fitCluster = false,
  tourActive,
  isMissionStop,
  inVoiceMission = false,
}: CameraGlideControllerProps): null {
  const map = useMap();

  useEffect(() => {
    if (!map || tourActive) {
      return;
    }

    if (fitCluster && boundsPlaces && boundsPlaces.length >= 2) {
      let north = -90;
      let south = 90;
      let east = -180;
      let west = 180;
      for (const p of boundsPlaces) {
        if (p.lat > north) north = p.lat;
        if (p.lat < south) south = p.lat;
        if (p.lng > east) east = p.lng;
        if (p.lng < west) west = p.lng;
      }
      const minPadDeg = 0.0022;
      if (north - south < minPadDeg) {
        north += minPadDeg / 2;
        south -= minPadDeg / 2;
      }
      if (east - west < minPadDeg) {
        east += minPadDeg / 2;
        west -= minPadDeg / 2;
      }
      const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
      if (isMobile) {
        const midLat = (north + south) / 2;
        const midLng = (east + west) / 2;
        const maxSpan = Math.max((north - south) * 1.35, east - west);
        const zoom = maxSpan > 0.03 ? 13.1 : maxSpan > 0.018 ? 13.55 : 13.95;
        const southOffset = 0.0068 * Math.pow(2, 14 - zoom);
        map.moveCamera({
          center: { lat: midLat - southOffset, lng: midLng },
          zoom,
        });
        return;
      }
      map.fitBounds({ north, south, east, west }, { top: 96, right: 84, bottom: 72, left: 492 });
      return;
    }

    if (!target) {
      map.moveCamera({
        center: { lat: OVERVIEW_CAMERA.lat, lng: OVERVIEW_CAMERA.lng },
        zoom: OVERVIEW_CAMERA.zoom,
      });
      return;
    }

    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const zoomTarget = inVoiceMission ? (isMobile ? 16.0 : 16.5) : isMissionStop ? 15.3 : undefined;
    const framed = computeFramedCenter(target, zoomTarget, inVoiceMission);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      map.moveCamera({ center: { lat: framed.lat, lng: framed.lng }, zoom: framed.zoom });
      return;
    }

    const startCenter = map.getCenter();
    const fromLat = startCenter?.lat() ?? ORR_DEFAULT_CENTER.lat;
    const fromLng = startCenter?.lng() ?? ORR_DEFAULT_CENTER.lng;
    const fromZoom = map.getZoom() ?? OVERVIEW_CAMERA.zoom;
    const durationMs = 760;
    const t0 = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 5);
      map.moveCamera({
        center: {
          lat: fromLat + (framed.lat - fromLat) * eased,
          lng: fromLng + (framed.lng - fromLng) * eased,
        },
        zoom: fromZoom + (framed.zoom - fromZoom) * eased,
      });
      if (p < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [map, target, boundsPlaces, fitCluster, tourActive, isMissionStop, inVoiceMission]);

  return null;
}
