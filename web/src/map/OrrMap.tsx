/**
 * Feature: ORR 2D/3D Vector Map Canvas & Camera Stage Controller (web/src/map/OrrMap.tsx)
 * Purpose: Renders the dark @vis.gl/react-google-maps vector map restricted to ORR_BBOX, optional 3D Neon Dusk mode (RenderingType.VECTOR + WebGLOverlayView + RadarMinimap), and resilient fallback canvas.
 * Inputs: Public Maps config, verified places, corridor GeoJSON, selected office, optional WeekPlan, 3D flag, and tour state.
 * Outputs: Full-bleed interactive map stage with 2D glide or 3D Sky-Drop/orbit choreography.
 * Deliberately excludes: Legacy google.maps.Marker, nested interactive controls, or geolocation prompts.
 */
import { useMemo, useState, type JSX } from "react";
import {
  AdvancedMarker, APILoadingStatus, APIProvider, ColorScheme,
  Map as GoogleMap, RenderingType, useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import {
  DEFAULT_MAP_ID, MAP_3D_CONFIG, type BoundingBox,
  type GeoJSONLineStringFeature, type VerifiedPlace, type WeekPlan,
} from "@apna-area/shared";
import { CameraDirector3D, type CameraPose3D } from "./CameraDirector3D";
import { CameraGlideController, OVERVIEW_CAMERA } from "./CameraGlideController";
import { CameraTour } from "./CameraTour";
import { CorridorLayer } from "./CorridorLayer";
import { FallbackCorridorCanvas } from "./FallbackCorridorCanvas";
import { MissionMarkers } from "./MissionMarkers";
import { buildMapBeacons, type BeaconSpec } from "./orrTrafficGeometry";
import { RadarMinimap, useMap3dStage } from "./RadarMinimap";

export interface OrrMapProps {
  mapsBrowserKey: string;
  mapId: string;
  orrBbox: BoundingBox;
  places: readonly VerifiedPlace[];
  corridor: GeoJSONLineStringFeature;
  selectedOffice: VerifiedPlace | null;
  onSelectOffice: (placeId: string) => void;
  weekPlan?: WeekPlan | null;
  activeMissionIndex?: number;
  inVoiceMission?: boolean;
  hidePins?: boolean;
  map3dActive?: boolean;
  completedMissions?: Readonly<Record<string, number>>;
  onSelectMission?: (index: number) => void;
  tourActive: boolean;
  onFinishTour: () => void;
}

const CORRIDOR_ANCHOR_PARK_IDS = new Set([
  "ChIJ10E9RAQRrjsRJxXRmkKBqcw",
  "ChIJ7-Cgk7MTrjsRpYr_lkVDiM8",
  "ChIJ4VFw06gTrjsRBi6R59JUG0Q",
  "ChIJh9_I9A0TrjsRj_uXAthQcWg",
]);

interface MapStageInnerProps extends Omit<OrrMapProps, "mapsBrowserKey"> {
  placesById: ReadonlyMap<string, VerifiedPlace>;
  activeMissionPlace: VerifiedPlace | null;
  beacons: readonly BeaconSpec[];
  manualHeadingDeltaDeg: number;
  onPoseChange: (pose: CameraPose3D) => void;
}

function MapStageInner(props: MapStageInnerProps): JSX.Element {
  const {
    mapId, orrBbox, places, corridor, selectedOffice, onSelectOffice,
    weekPlan = null, activeMissionIndex = 0, inVoiceMission = false, hidePins = false,
    map3dActive = false, onSelectMission, tourActive, onFinishTour,
    placesById, activeMissionPlace, beacons, manualHeadingDeltaDeg, onPoseChange,
  } = props;
  const status = useApiLoadingStatus();
  const [tourHoods, setTourHoods] = useState<readonly string[]>([]);

  const weekClusterPlaces = useMemo(() => {
    if (!weekPlan) return undefined;
    const list: VerifiedPlace[] = selectedOffice ? [selectedOffice] : [];
    weekPlan.missions.forEach((m) => {
      const p = placesById.get(m.placeId);
      if (p) list.push(p);
    });
    return list;
  }, [weekPlan, selectedOffice, placesById]);

  const visibleTechParks = useMemo(
    () => (weekPlan && selectedOffice ? [selectedOffice] : places.filter((p) => p.category === "tech_park")),
    [places, weekPlan, selectedOffice],
  );

  if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
    return (
      <FallbackCorridorCanvas
        selectedOffice={selectedOffice} weekPlan={weekPlan} placesById={placesById}
        activeMissionIndex={activeMissionIndex} onSelectMission={onSelectMission}
        tourActive={tourActive} onTourNeighbourhoodsChange={setTourHoods} onFinishTour={onFinishTour}
      />
    );
  }

  return (
    <div
      className="orr-map-container"
      data-testid="orr-map-stage"
      data-has-selection={selectedOffice ? "true" : "false"}
      data-voice-mission={inVoiceMission ? "true" : "false"}
      data-3d-active={map3dActive ? "true" : "false"}
    >
      <div className="orr-map-canvas-grade">
        <GoogleMap
          mapId={mapId || DEFAULT_MAP_ID}
          colorScheme={ColorScheme.DARK}
          renderingType={map3dActive ? RenderingType.VECTOR : undefined}
          defaultCenter={{ lat: OVERVIEW_CAMERA.lat, lng: OVERVIEW_CAMERA.lng }}
          defaultZoom={OVERVIEW_CAMERA.zoom}
          restriction={{
            latLngBounds: {
              south: orrBbox.south - 0.035, west: orrBbox.west - 0.02,
              north: orrBbox.north + 0.015, east: orrBbox.east + 0.02,
            },
            strictBounds: false,
          }}
          clickableIcons={false}
          disableDefaultUI
          gestureHandling="greedy"
          internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
          onCameraChanged={(ev) => {
            if (!map3dActive) return;
            const d = ev.detail;
            onPoseChange({ lat: d.center.lat, lng: d.center.lng, zoom: d.zoom, tilt: d.tilt, heading: d.heading });
          }}
        >
          <CorridorLayer corridor={corridor} />
          {map3dActive ? (
            <CameraDirector3D
              corridor={corridor} selectedOffice={selectedOffice} activeMissionPlace={activeMissionPlace}
              beacons={beacons} tourActive={tourActive} inVoiceMission={inVoiceMission}
              manualHeadingDeltaDeg={manualHeadingDeltaDeg} onPoseChange={onPoseChange}
            />
          ) : (
            <CameraGlideController
              target={activeMissionPlace ?? selectedOffice}
              boundsPlaces={weekClusterPlaces}
              fitCluster={Boolean(weekPlan && activeMissionIndex === 0 && !inVoiceMission)}
              tourActive={tourActive}
              isMissionStop={Boolean(activeMissionPlace && (activeMissionIndex > 0 || inVoiceMission))}
              inVoiceMission={inVoiceMission}
            />
          )}
          {!hidePins && visibleTechParks.map((park) => {
            const isSelected = selectedOffice?.id === park.id;
            const isSpot = Boolean(tourActive && tourHoods.includes(park.neighbourhood));
            const isFeat = CORRIDOR_ANCHOR_PARK_IDS.has(park.id);
            const cls = isSelected
              ? "map-pin map-pin-selected"
              : isSpot ? "map-pin map-pin-spotlight" : isFeat ? "map-pin map-pin-featured" : "map-pin";
            return (
              <AdvancedMarker
                key={park.id}
                position={{ lat: park.lat, lng: park.lng }}
                zIndex={isSelected ? 30 : isSpot ? 20 : isFeat ? 15 : 4}
              >
                <div className="map-pin-anchor">
                  <button
                    type="button" className={cls}
                    data-testid={isSelected ? "selected-office-pin" : `office-pin-${park.id}`}
                    aria-pressed={isSelected} aria-label={`Select ${park.name}`}
                    onPointerDown={(e) => e.stopPropagation()} onClick={() => onSelectOffice(park.id)}
                  >
                    <span className="map-pin-label">{park.name}</span>
                  </button>
                  <span className="map-pin-stem" aria-hidden="true" />
                  <span className={isSelected || isSpot ? "map-pin-ground map-pin-ground-active" : "map-pin-ground"} aria-hidden="true" />
                </div>
              </AdvancedMarker>
            );
          })}
          {!hidePins && weekPlan && onSelectMission && (
            <MissionMarkers
              weekPlan={weekPlan} placesById={placesById} activeMissionIndex={activeMissionIndex}
              onlyActive={inVoiceMission} onSelectMission={onSelectMission}
            />
          )}
        </GoogleMap>
      </div>
      <div className="orr-map-scrim" aria-hidden="true" />
      <CameraTour active={tourActive} hasMapProvider onStepNeighbourhoods={setTourHoods} onFinish={onFinishTour} />
    </div>
  );
}

/**
 * Root map wrapper mounting APIProvider and optional 3D RadarMinimap + twilight horizon scrim.
 * @param props - Map config, verified places, corridor GeoJSON, active stage flags, and callbacks.
 * @returns Full-bleed ORR map stage.
 */
export function OrrMap(props: OrrMapProps): JSX.Element {
  const { weekPlan = null, activeMissionIndex = 0, hidePins = false, map3dActive = false, completedMissions } = props;
  const placesById = useMemo(() => new globalThis.Map(props.places.map((p) => [p.id, p])), [props.places]);
  const activeMissionPlace = useMemo(() => {
    const m = weekPlan?.missions[activeMissionIndex] ?? weekPlan?.missions[0];
    return m ? (placesById.get(m.placeId) ?? null) : null;
  }, [weekPlan, activeMissionIndex, placesById]);

  const { cameraPose, setCameraPose, manualHeadingDeltaDeg } = useMap3dStage({
    map3dActive, hasMapsKey: Boolean(props.mapsBrowserKey),
    tourActive: props.tourActive, hidePins, selectedOffice: props.selectedOffice, activeMissionPlace,
  });

  const beacons = useMemo(
    () => buildMapBeacons({ selectedOffice: props.selectedOffice, missions: weekPlan?.missions, placesById, activeMissionIndex, completedMissions }),
    [props.selectedOffice, weekPlan, placesById, activeMissionIndex, completedMissions],
  );
  const show3dHud = map3dActive && !props.tourActive && !hidePins;

  return (
    <>
      {props.mapsBrowserKey ? (
        <APIProvider apiKey={props.mapsBrowserKey} libraries={["marker"]} region="IN" language="en">
          <MapStageInner {...props} placesById={placesById} activeMissionPlace={activeMissionPlace} beacons={beacons} manualHeadingDeltaDeg={manualHeadingDeltaDeg} onPoseChange={setCameraPose} />
        </APIProvider>
      ) : (
        <FallbackCorridorCanvas selectedOffice={props.selectedOffice} weekPlan={props.weekPlan} placesById={placesById} activeMissionIndex={props.activeMissionIndex} onSelectMission={props.onSelectMission} tourActive={props.tourActive} onFinishTour={props.onFinishTour} />
      )}
      {show3dHud && cameraPose.tilt >= MAP_3D_CONFIG.horizonTiltThresholdDeg && (
        <div className="orr-horizon-scrim" data-testid="orr-horizon-scrim" aria-hidden="true" />
      )}
      {show3dHud && (
        <RadarMinimap centerLat={cameraPose.lat} centerLng={cameraPose.lng} cameraHeadingDeg={cameraPose.heading} corridor={props.corridor} selectedOffice={props.selectedOffice} weekPlan={weekPlan} placesById={placesById} activeMissionIndex={activeMissionIndex} completedMissions={completedMissions} />
      )}
    </>
  );
}
