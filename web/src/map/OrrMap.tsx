/**
 * Feature: ORR 2D Vector Map Canvas & Asymmetric Camera Glide Controller
 * Purpose: Renders the dark @vis.gl/react-google-maps vector map restricted to ORR_BBOX, coordinate-anchored office/mission pins, and viewport-aware camera glides.
 * Inputs: Public Maps config, verified places, corridor GeoJSON, selected office, optional WeekPlan, and tour state.
 * Outputs: Full-bleed interactive map stage with resilient fallback canvas.
 * Deliberately excludes: Legacy google.maps.Marker, nested interactive controls, or geolocation prompts.
 */
import { useMemo, useState, type JSX } from "react";
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  ColorScheme,
  Map as GoogleMap,
  useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import {
  DEFAULT_MAP_ID,
  type BoundingBox,
  type GeoJSONLineStringFeature,
  type VerifiedPlace,
  type WeekPlan,
} from "@apna-area/shared";
import { CameraGlideController, OVERVIEW_CAMERA } from "./CameraGlideController";
import { CorridorLayer } from "./CorridorLayer";
import { CameraTour } from "./CameraTour";
import { FallbackCorridorCanvas } from "./FallbackCorridorCanvas";
import { MissionMarkers } from "./MissionMarkers";

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
  onSelectMission?: (index: number) => void;
  tourActive: boolean;
  onFinishTour: () => void;
}

const CORRIDOR_ANCHOR_PARK_IDS = new Set([
  "ChIJ10E9RAQRrjsRJxXRmkKBqcw", // Bagmane IT park (Marathahalli north)
  "ChIJ7-Cgk7MTrjsRpYr_lkVDiM8", // Prestige Tech Park (Kadubeesanahalli)
  "ChIJ4VFw06gTrjsRBi6R59JUG0Q", // Embassy TechVillage (Devarabisanahalli)
  "ChIJh9_I9A0TrjsRj_uXAthQcWg", // Vaishnavi Tech Park (Sarjapur Junction south)
]);

function MapStageInner({
  mapId,
  orrBbox,
  places,
  corridor,
  selectedOffice,
  onSelectOffice,
  weekPlan = null,
  activeMissionIndex = 0,
  inVoiceMission = false,
  hidePins = false,
  onSelectMission,
  tourActive,
  onFinishTour,
}: Omit<OrrMapProps, "mapsBrowserKey">): JSX.Element {
  const status = useApiLoadingStatus();
  const [tourHoods, setTourHoods] = useState<readonly string[]>([]);
  const placesById = useMemo(() => new globalThis.Map(places.map((p) => [p.id, p])), [places]);

  const activeMissionPlace = useMemo(() => {
    if (!weekPlan) return null;
    const mission = weekPlan.missions[activeMissionIndex] ?? weekPlan.missions[0];
    return mission ? (placesById.get(mission.placeId) ?? null) : null;
  }, [weekPlan, activeMissionIndex, placesById]);

  const weekClusterPlaces = useMemo(() => {
    if (!weekPlan) return undefined;
    const list: VerifiedPlace[] = [];
    if (selectedOffice) list.push(selectedOffice);
    for (const m of weekPlan.missions) {
      const p = placesById.get(m.placeId);
      if (p) list.push(p);
    }
    return list;
  }, [weekPlan, selectedOffice, placesById]);

  const visibleTechParks = useMemo(() => {
    const allParks = places.filter((p) => p.category === "tech_park");
    if (weekPlan && selectedOffice) {
      return [selectedOffice];
    }
    return allParks;
  }, [places, weekPlan, selectedOffice]);

  if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
    return (
      <FallbackCorridorCanvas
        selectedOffice={selectedOffice}
        weekPlan={weekPlan}
        placesById={placesById}
        activeMissionIndex={activeMissionIndex}
        onSelectMission={onSelectMission}
        tourActive={tourActive}
        onTourNeighbourhoodsChange={setTourHoods}
        onFinishTour={onFinishTour}
      />
    );
  }

  return (
    <div
      className="orr-map-container"
      data-testid="orr-map-stage"
      data-has-selection={selectedOffice ? "true" : "false"}
      data-voice-mission={inVoiceMission ? "true" : "false"}
    >
      <div className="orr-map-canvas-grade">
        <GoogleMap
          mapId={mapId || DEFAULT_MAP_ID}
          colorScheme={ColorScheme.DARK}
          defaultCenter={{ lat: OVERVIEW_CAMERA.lat, lng: OVERVIEW_CAMERA.lng }}
          defaultZoom={OVERVIEW_CAMERA.zoom}
          restriction={{
            latLngBounds: {
              south: orrBbox.south - 0.035,
              west: orrBbox.west - 0.02,
              north: orrBbox.north + 0.015,
              east: orrBbox.east + 0.02,
            },
            strictBounds: false,
          }}
          clickableIcons={false}
          disableDefaultUI
          gestureHandling="greedy"
          internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
        >
          <CorridorLayer corridor={corridor} />
          <CameraGlideController
            target={activeMissionPlace ?? selectedOffice}
            boundsPlaces={weekClusterPlaces}
            fitCluster={Boolean(weekPlan && activeMissionIndex === 0 && !inVoiceMission)}
            tourActive={tourActive}
            isMissionStop={Boolean(activeMissionPlace && (activeMissionIndex > 0 || inVoiceMission))}
            inVoiceMission={inVoiceMission}
          />

          {!hidePins && visibleTechParks.map((park) => {
            const isSelected = selectedOffice?.id === park.id;
            const isTourSpotlight = Boolean(tourActive && tourHoods.includes(park.neighbourhood));
            const isFeatured = CORRIDOR_ANCHOR_PARK_IDS.has(park.id);
            const pinClass = isSelected
              ? "map-pin map-pin-selected"
              : isTourSpotlight
                ? "map-pin map-pin-spotlight"
                : isFeatured
                  ? "map-pin map-pin-featured"
                  : "map-pin";

            return (
              <AdvancedMarker
                key={park.id}
                position={{ lat: park.lat, lng: park.lng }}
                zIndex={isSelected ? 30 : isTourSpotlight ? 20 : isFeatured ? 15 : 4}
              >
                <div className="map-pin-anchor">
                  <button
                    type="button"
                    className={pinClass}
                    data-testid={isSelected ? "selected-office-pin" : `office-pin-${park.id}`}
                    aria-pressed={isSelected}
                    aria-label={`Select ${park.name}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelectOffice(park.id)}
                  >
                    <span className="map-pin-label">{park.name}</span>
                  </button>
                  <span className="map-pin-stem" aria-hidden="true" />
                  <span
                    className={
                      isSelected || isTourSpotlight
                        ? "map-pin-ground map-pin-ground-active"
                        : "map-pin-ground"
                    }
                    aria-hidden="true"
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {!hidePins && weekPlan && onSelectMission && (
            <MissionMarkers
              weekPlan={weekPlan}
              placesById={placesById}
              activeMissionIndex={activeMissionIndex}
              onlyActive={inVoiceMission}
              onSelectMission={onSelectMission}
            />
          )}
        </GoogleMap>
      </div>

      <div className="orr-map-scrim" aria-hidden="true" />

      <CameraTour
        active={tourActive}
        hasMapProvider
        onStepNeighbourhoods={setTourHoods}
        onFinish={onFinishTour}
      />
    </div>
  );
}

/**
 * Root map wrapper mounting @vis.gl/react-google-maps APIProvider when a browser key is configured.
 *
 * @param props - Map configuration, verified places, corridor feature, selection state, and callbacks.
 * @returns Full-bleed ORR map component.
 */
export function OrrMap(props: OrrMapProps): JSX.Element {
  const placesById = useMemo(() => new globalThis.Map(props.places.map((p) => [p.id, p])), [props.places]);
  if (!props.mapsBrowserKey) {
    return (
      <FallbackCorridorCanvas
        selectedOffice={props.selectedOffice}
        weekPlan={props.weekPlan}
        placesById={placesById}
        activeMissionIndex={props.activeMissionIndex}
        onSelectMission={props.onSelectMission}
        tourActive={props.tourActive}
        onFinishTour={props.onFinishTour}
      />
    );
  }
  return (
    <APIProvider apiKey={props.mapsBrowserKey} libraries={["marker"]} region="IN" language="en">
      <MapStageInner {...props} />
    </APIProvider>
  );
}
