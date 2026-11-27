/**
 * Feature: ORR 2D Vector Map Canvas & Asymmetric Camera Glide Controller
 * Purpose: Renders the dark @vis.gl/react-google-maps vector map restricted to ORR_BBOX, coordinate-anchored pins, and viewport-aware camera glides.
 * Inputs: Public Maps config, verified places, corridor GeoJSON, selected office, and tour state.
 * Outputs: Full-bleed interactive map stage with resilient fallback canvas.
 * Deliberately excludes: Legacy google.maps.Marker, nested interactive controls, or geolocation prompts.
 */
import { useEffect, useState, type JSX } from "react";
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  ColorScheme,
  Map,
  useApiLoadingStatus,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  DEFAULT_MAP_ID,
  ORR_DEFAULT_CENTER,
  type BoundingBox,
  type GeoJSONLineStringFeature,
  type VerifiedPlace,
} from "@apna-area/shared";
import { CorridorLayer } from "./CorridorLayer";
import { CameraTour } from "./CameraTour";
import { FallbackCorridorCanvas } from "./FallbackCorridorCanvas";

export interface OrrMapProps {
  mapsBrowserKey: string;
  mapId: string;
  orrBbox: BoundingBox;
  places: readonly VerifiedPlace[];
  corridor: GeoJSONLineStringFeature;
  selectedOffice: VerifiedPlace | null;
  onSelectOffice: (placeId: string) => void;
  tourActive: boolean;
  onFinishTour: () => void;
}

const OVERVIEW_CAMERA = { lat: 12.942, lng: 77.653, zoom: 12.45 };

function computeFramedCenter(target: VerifiedPlace): { lat: number; lng: number; zoom: number } {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  if (isMobile) {
    return { lat: target.lat - 0.0055, lng: target.lng, zoom: 14.6 };
  }
  return { lat: target.lat, lng: target.lng - 0.0085, zoom: 14.9 };
}

function CameraGlideController({
  target,
  tourActive,
}: {
  target: VerifiedPlace | null;
  tourActive: boolean;
}): null {
  const map = useMap();

  useEffect(() => {
    if (!map || tourActive) {
      return;
    }

    if (!target) {
      map.moveCamera({
        center: { lat: OVERVIEW_CAMERA.lat, lng: OVERVIEW_CAMERA.lng },
        zoom: OVERVIEW_CAMERA.zoom,
      });
      return;
    }

    const framed = computeFramedCenter(target);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      map.moveCamera({
        center: { lat: framed.lat, lng: framed.lng },
        zoom: framed.zoom,
      });
      return;
    }

    const startCenter = map.getCenter();
    const fromLat = startCenter?.lat() ?? ORR_DEFAULT_CENTER.lat;
    const fromLng = startCenter?.lng() ?? ORR_DEFAULT_CENTER.lng;
    const fromZoom = map.getZoom() ?? OVERVIEW_CAMERA.zoom;
    const durationMs = 900;
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
  }, [map, target, tourActive]);

  return null;
}

function MapStageInner({
  mapId,
  orrBbox,
  places,
  corridor,
  selectedOffice,
  onSelectOffice,
  tourActive,
  onFinishTour,
}: Omit<OrrMapProps, "mapsBrowserKey">): JSX.Element {
  const status = useApiLoadingStatus();
  const [tourHoods, setTourHoods] = useState<readonly string[]>([]);
  const techParks = places.filter((p) => p.category === "tech_park");

  if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
    return (
      <FallbackCorridorCanvas
        selectedOffice={selectedOffice}
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
    >
      <div className="orr-map-canvas-grade">
        <Map
          mapId={mapId || DEFAULT_MAP_ID}
          colorScheme={ColorScheme.DARK}
          defaultCenter={{ lat: OVERVIEW_CAMERA.lat, lng: OVERVIEW_CAMERA.lng }}
          defaultZoom={OVERVIEW_CAMERA.zoom}
          restriction={{
            latLngBounds: orrBbox,
            strictBounds: false,
          }}
          clickableIcons={false}
          disableDefaultUI
          gestureHandling="greedy"
          internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
        >
          <CorridorLayer corridor={corridor} />
          <CameraGlideController target={selectedOffice} tourActive={tourActive} />

          {techParks.map((park) => {
            const isSelected = selectedOffice?.id === park.id;
            const isTourSpotlight = Boolean(tourActive && tourHoods.includes(park.neighbourhood));
            const pinClass = isSelected
              ? "map-pin map-pin-selected"
              : isTourSpotlight
                ? "map-pin map-pin-spotlight"
                : "map-pin";

            return (
              <AdvancedMarker
                key={park.id}
                position={{ lat: park.lat, lng: park.lng }}
                zIndex={isSelected ? 30 : isTourSpotlight ? 20 : 5}
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
        </Map>
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
 * @param props - Map configuration, verified world dataset, selection state, and tour callbacks.
 * @returns Full-bleed ORR map component.
 */
export function OrrMap(props: OrrMapProps): JSX.Element {
  if (!props.mapsBrowserKey) {
    return (
      <FallbackCorridorCanvas
        selectedOffice={props.selectedOffice}
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
