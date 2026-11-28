/**
 * Feature: Heading-Locked 3D Radar Minimap & 3D Stage Hook (web/src/map/RadarMinimap.tsx)
 * Purpose: Renders a 136x136px smoked-acrylic corner radar above Google Maps attribution and manages shared 3D camera pose + Q/E orbit hotkeys.
 * Inputs: Camera center/heading, verified corridor GeoJSON, selectedOffice, WeekPlan, placesById, activeMissionIndex, and completed mission map.
 * Outputs: Non-interactive (<aside pointer-events: none>) SVG radar instrument and useMap3dStage state hook.
 * Deliberately excludes: Covering Google Maps logos/copyright or mounting on <= 768px mobile viewports.
 */
import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import {
  MAP_3D_CONFIG,
  ORR_DEFAULT_CENTER,
  type GeoJSONLineStringFeature,
  type VerifiedPlace,
  type WeekPlan,
} from "@apna-area/shared";
import type { CameraPose3D } from "./CameraDirector3D";
import {
  computeCorridorHeadingDeg,
  normalizeHeadingDeg,
  projectRadarBlip,
} from "./orrTrafficGeometry";

export interface RadarMinimapProps {
  centerLat: number;
  centerLng: number;
  cameraHeadingDeg: number;
  corridor: GeoJSONLineStringFeature;
  selectedOffice: VerifiedPlace | null;
  weekPlan?: WeekPlan | null;
  placesById: ReadonlyMap<string, VerifiedPlace>;
  activeMissionIndex: number;
  completedMissions?: Readonly<Record<string, number>>;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest('[role="combobox"], [role="textbox"]'));
}

/**
 * Tracks 3D camera pose and Q/E keyboard orbit deltas across Google Maps and fallback stages.
 * @param params - Active 3D flag, Maps key presence, tour/kit visibility, and target places.
 * @returns Shared cameraPose state, pose setter, and cumulative manual heading delta.
 */
export function useMap3dStage(params: {
  map3dActive: boolean;
  hasMapsKey: boolean;
  tourActive: boolean;
  hidePins: boolean;
  selectedOffice: VerifiedPlace | null;
  activeMissionPlace: VerifiedPlace | null;
}) {
  const { map3dActive, hasMapsKey, tourActive, hidePins, selectedOffice, activeMissionPlace } =
    params;

  const [cameraPose, setCameraPose] = useState<CameraPose3D>({
    lat: ORR_DEFAULT_CENTER.lat,
    lng: ORR_DEFAULT_CENTER.lng,
    zoom: MAP_3D_CONFIG.overviewZoom,
    tilt: MAP_3D_CONFIG.idleCorridorTiltDeg,
    heading: MAP_3D_CONFIG.corridorDefaultHeadingDeg,
  });
  const [manualHeadingDeltaDeg, setManualHeadingDeltaDeg] = useState(0);
  const handlePoseChange = useCallback((next: CameraPose3D) => setCameraPose(next), []);

  useEffect(() => {
    if (!map3dActive || hasMapsKey) return;
    const target = activeMissionPlace ?? selectedOffice;
    if (!target) {
      setCameraPose((prev) => ({
        ...prev,
        lat: ORR_DEFAULT_CENTER.lat,
        lng: ORR_DEFAULT_CENTER.lng,
        tilt: MAP_3D_CONFIG.idleCorridorTiltDeg,
      }));
      return;
    }
    const nextHeading = computeCorridorHeadingDeg(
      ORR_DEFAULT_CENTER.lat,
      ORR_DEFAULT_CENTER.lng,
      target.lat,
      target.lng,
    );
    setCameraPose({
      lat: target.lat,
      lng: target.lng,
      zoom: MAP_3D_CONFIG.streetZoom,
      tilt: MAP_3D_CONFIG.streetTiltDeg,
      heading: nextHeading,
    });
  }, [map3dActive, hasMapsKey, selectedOffice, activeMissionPlace]);

  useEffect(() => {
    if (!map3dActive || tourActive || hidePins) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableElement(e.target)) return;
      if (e.key === "q" || e.key === "Q" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        const step =
          e.key === "q" || e.key === "Q"
            ? -MAP_3D_CONFIG.keyRotateStepDeg
            : MAP_3D_CONFIG.keyRotateStepDeg;
        setManualHeadingDeltaDeg((prev) => prev + step);
        if (!hasMapsKey) {
          setCameraPose((prev) => ({
            ...prev,
            heading: normalizeHeadingDeg(prev.heading + step),
          }));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [map3dActive, hasMapsKey, tourActive, hidePins]);

  return { cameraPose, setCameraPose: handlePoseChange, manualHeadingDeltaDeg };
}

/**
 * Renders the 136x136px heading-locked ORR Neon Dusk radar minimap in 3D mode.
 * @param props - Live camera center/heading, corridor feature, office, and Week One mission state.
 * @returns Accessible <aside> radar widget.
 */
export function RadarMinimap({
  centerLat,
  centerLng,
  cameraHeadingDeg,
  corridor,
  selectedOffice,
  weekPlan = null,
  placesById,
  activeMissionIndex,
  completedMissions = {},
}: RadarMinimapProps): JSX.Element {
  const heading = normalizeHeadingDeg(cameraHeadingDeg);
  const focusLat = selectedOffice || weekPlan ? centerLat : ORR_DEFAULT_CENTER.lat;
  const focusLng = selectedOffice || weekPlan ? centerLng : ORR_DEFAULT_CENTER.lng;

  const spinePoints = useMemo(() => {
    const raw = corridor.geometry.coordinates;
    const step = raw.length > 48 ? 10 : 1;
    const pts: string[] = [];
    for (let i = 0; i < raw.length; i += step) {
      const pair = raw[i];
      if (!pair) continue;
      const p = projectRadarBlip(pair[1], pair[0], focusLat, focusLng, heading, undefined, 999);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    const last = raw[raw.length - 1];
    if (last && step > 1) {
      const p = projectRadarBlip(last[1], last[0], focusLat, focusLng, heading, undefined, 999);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [corridor, focusLat, focusLng, heading]);

  const officeBlip = useMemo(
    () =>
      selectedOffice
        ? projectRadarBlip(selectedOffice.lat, selectedOffice.lng, focusLat, focusLng, heading)
        : null,
    [selectedOffice, focusLat, focusLng, heading],
  );

  const missionBlips = useMemo(() => {
    if (!weekPlan) return [];
    return weekPlan.missions.flatMap((m, idx) => {
      const place = placesById.get(m.placeId);
      if (!place) return [];
      return [
        {
          id: m.id,
          proj: projectRadarBlip(place.lat, place.lng, focusLat, focusLng, heading),
          isActive: idx === activeMissionIndex,
          isDone: Boolean(completedMissions[m.id]),
        },
      ];
    });
  }, [weekPlan, placesById, focusLat, focusLng, heading, activeMissionIndex, completedMissions]);

  const northRad = (-heading * Math.PI) / 180;

  return (
    <aside
      className="radar-minimap"
      data-testid="radar-minimap"
      data-heading={Math.round(heading)}
      aria-label={`Outer Ring Road radar minimap, heading ${Math.round(heading)} degrees`}
    >
      <svg className="radar-svg" viewBox="-68 -68 136 136" width="136" height="136" aria-hidden="true">
        <defs>
          <clipPath id="radar-disc-clip">
            <circle cx="0" cy="0" r="56" />
          </clipPath>
          <radialGradient id="radar-fov-grad" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#3DE6D0" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#3DE6D0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="56" className="radar-ring-outer" />
        <circle cx="0" cy="0" r="32" className="radar-ring-inner" />
        <path d="M 0 0 L -23 -53 A 58 58 0 0 1 23 -53 Z" fill="url(#radar-fov-grad)" />
        <g clipPath="url(#radar-disc-clip)">
          {spinePoints.length > 0 && (
            <>
              <polyline points={spinePoints} className="radar-corridor-glow" />
              <polyline points={spinePoints} className="radar-corridor-core" />
            </>
          )}
          {missionBlips.map((b) => (
            <g key={b.id} transform={`translate(${b.proj.x.toFixed(1)}, ${b.proj.y.toFixed(1)})`}>
              {b.isActive && <circle cx="0" cy="0" r="7.5" className="radar-blip-pulse" />}
              <circle
                cx="0"
                cy="0"
                r={b.isActive ? "4.4" : "3.2"}
                className={
                  b.isActive
                    ? "radar-blip radar-blip-active"
                    : b.isDone
                      ? "radar-blip radar-blip-done"
                      : "radar-blip"
                }
              />
            </g>
          ))}
          {officeBlip && (
            <g
              transform={`translate(${officeBlip.x.toFixed(1)}, ${officeBlip.y.toFixed(1)})`}
              data-testid="radar-office-blip"
            >
              <polygon points="0,-6 4.6,0 0,6 -4.6,0" className="radar-office-star" />
            </g>
          )}
        </g>
        <circle cx="0" cy="0" r="2.8" className="radar-center-dot" />
        <g transform={`translate(${(Math.sin(northRad) * 58).toFixed(1)}, ${(-Math.cos(northRad) * 58).toFixed(1)})`}>
          <circle cx="0" cy="0" r="7" className="radar-north-pill" />
          <text x="0" y="3.2" textAnchor="middle" className="radar-north-text">
            N
          </text>
        </g>
      </svg>
    </aside>
  );
}
