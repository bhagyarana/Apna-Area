/**
 * Feature: Staggered Week One Mission Map Markers (web/src/map/MissionMarkers.tsx)
 * Purpose: Renders numbered 1..5 mission AdvancedMarkers onto the ORR vector map with a 60ms stagger and smooth reduced-motion fallback.
 * Inputs: Active WeekPlan, verified places lookup, active mission index, and selection callback.
 * Outputs: Coordinate-anchored mission pins above the ORR corridor spline.
 * Deliberately excludes: Unverified coordinates or legacy google.maps.Marker usage.
 */
import type { JSX } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { DIRECTOR_CONFIG, type VerifiedPlace, type WeekPlan } from "@apna-area/shared";

export interface MissionMarkersProps {
  weekPlan: WeekPlan;
  placesById: ReadonlyMap<string, VerifiedPlace>;
  activeMissionIndex: number;
  onlyActive?: boolean;
  onSelectMission: (index: number) => void;
}

/**
 * Renders the 5 numbered Week One mission pins with 60ms staggered drop choreography.
 *
 * @param props - Verified WeekPlan, place map, active index, and click handler.
 * @returns Fragment of AdvancedMarker elements for all verified mission stops.
 */
export function MissionMarkers({
  weekPlan,
  placesById,
  activeMissionIndex,
  onlyActive = false,
  onSelectMission,
}: MissionMarkersProps): JSX.Element {
  return (
    <>
      {weekPlan.missions.map((mission, index) => {
        if (onlyActive && index !== activeMissionIndex) {
          return null;
        }
        const place = placesById.get(mission.placeId);
        if (!place) {
          return null;
        }
        const isActive = index === activeMissionIndex;
        const delayMs = index * DIRECTOR_CONFIG.pinStaggerMs;

        return (
          <AdvancedMarker
            key={mission.id}
            position={{ lat: place.lat, lng: place.lng }}
            zIndex={isActive ? 45 : 25 + index}
          >
            <div
              className="mission-pin-anchor"
              style={{ animationDelay: `${delayMs}ms` }}
            >
              <button
                type="button"
                className={isActive ? "mission-pin mission-pin-active" : "mission-pin"}
                data-testid={`mission-pin-${index + 1}`}
                aria-pressed={isActive}
                aria-label={`Mission ${index + 1}, ${mission.day}: ${place.name}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectMission(index)}
              >
                <span className="mission-pin-num">{index + 1}</span>
                <span className="mission-pin-name">{place.name}</span>
              </button>
              <span className="map-pin-stem" aria-hidden="true" />
              <span
                className={
                  isActive ? "map-pin-ground map-pin-ground-active" : "map-pin-ground mission-pin-ground"
                }
                aria-hidden="true"
              />
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
