/**
 * Feature: Resilient Fallback Corridor Canvas
 * Purpose: Renders a styled SVG Outer Ring Road stage when a Maps browser key is absent or offline so keyboard selection and mission pins stay functional.
 * Inputs: Optional selectedOffice, weekPlan, placesById, activeMissionIndex, and tour callbacks.
 * Outputs: Full-viewport ORR Neon Dusk fallback canvas with office and staggered mission pins.
 * Deliberately excludes: Calling Google Maps hooks outside <APIProvider>.
 */
import type { JSX } from "react";
import { DIRECTOR_CONFIG, type VerifiedPlace, type WeekPlan } from "@apna-area/shared";
import { CameraTour } from "./CameraTour";

export interface FallbackCorridorCanvasProps {
  selectedOffice: VerifiedPlace | null;
  weekPlan?: WeekPlan | null;
  placesById?: ReadonlyMap<string, VerifiedPlace>;
  activeMissionIndex?: number;
  onSelectMission?: (index: number) => void;
  tourActive: boolean;
  onTourNeighbourhoodsChange?: (labels: readonly string[]) => void;
  onFinishTour: () => void;
}

const FALLBACK_PIN_POSITIONS: ReadonlyArray<{ right: string; top: string }> = [
  { right: "38%", top: "30%" },
  { right: "26%", top: "39%" },
  { right: "34%", top: "51%" },
  { right: "20%", top: "61%" },
  { right: "42%", top: "68%" },
];

/**
 * Renders the offline/keyless ORR corridor stage with office and mission pin badges.
 *
 * @param props - Selected office, optional WeekPlan, and tour lifecycle callbacks.
 * @returns Fallback vector corridor element.
 */
export function FallbackCorridorCanvas({
  selectedOffice,
  weekPlan,
  placesById,
  activeMissionIndex = 0,
  onSelectMission,
  tourActive,
  onTourNeighbourhoodsChange,
  onFinishTour,
}: FallbackCorridorCanvasProps): JSX.Element {
  return (
    <div className="orr-map-container fallback-corridor-stage" data-testid="orr-map-stage">
      <svg
        className="corridor-backdrop"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M140 790 Q 510 640, 760 455 T 1290 135"
          fill="none"
          stroke="rgba(255, 79, 160, 0.18)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M140 790 Q 510 640, 760 455 T 1290 135"
          fill="none"
          stroke="var(--accent-pink)"
          strokeWidth="3.5"
          strokeDasharray="8 12"
          strokeLinecap="round"
        />
        {selectedOffice && (
          <>
            <circle cx="940" cy="420" r="24" fill="rgba(255, 210, 74, 0.2)" />
            <circle cx="940" cy="420" r="8" fill="var(--accent-yellow)" />
          </>
        )}
      </svg>

      {selectedOffice && (
        <div className="fallback-pin-badge" data-testid="selected-office-pin">
          <span className="map-pin-ground map-pin-ground-active" aria-hidden="true" />
          <span>{selectedOffice.name}</span>
        </div>
      )}

      {weekPlan &&
        placesById &&
        weekPlan.missions.map((mission, idx) => {
          const place = placesById.get(mission.placeId);
          if (!place) {
            return null;
          }
          const pos = FALLBACK_PIN_POSITIONS[idx] ?? { right: "28%", top: "48%" };
          const isActive = idx === activeMissionIndex;
          return (
            <div
              key={mission.id}
              className="mission-pin-anchor"
              style={{
                position: "fixed",
                right: pos.right,
                top: pos.top,
                animationDelay: `${idx * DIRECTOR_CONFIG.pinStaggerMs}ms`,
              }}
            >
              <button
                type="button"
                className={isActive ? "mission-pin mission-pin-active" : "mission-pin"}
                data-testid={`mission-pin-${idx + 1}`}
                aria-pressed={isActive}
                onClick={() => onSelectMission?.(idx)}
              >
                <span className="mission-pin-num">{idx + 1}</span>
                <span className="mission-pin-name">{place.name}</span>
              </button>
            </div>
          );
        })}

      <CameraTour
        active={tourActive}
        hasMapProvider={false}
        onStepNeighbourhoods={onTourNeighbourhoodsChange}
        onFinish={onFinishTour}
      />
    </div>
  );
}
