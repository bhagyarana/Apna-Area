/**
 * Feature: Resilient Fallback Corridor Canvas
 * Purpose: Renders a styled SVG Outer Ring Road stage when a Maps browser key is absent or offline so keyboard selection stays functional.
 * Inputs: Optional selectedOffice, tourActive flag, and onFinishTour callback.
 * Outputs: Full-viewport ORR Neon Dusk fallback canvas.
 * Deliberately excludes: Calling Google Maps hooks outside <APIProvider>.
 */
import type { JSX } from "react";
import type { VerifiedPlace } from "@apna-area/shared";
import { CameraTour } from "./CameraTour";

export interface FallbackCorridorCanvasProps {
  selectedOffice: VerifiedPlace | null;
  tourActive: boolean;
  onTourNeighbourhoodsChange?: (labels: readonly string[]) => void;
  onFinishTour: () => void;
}

/**
 * Renders the offline/keyless ORR corridor stage and mounts the non-provider tour overlay.
 *
 * @param props - Selected office and tour lifecycle callbacks.
 * @returns Fallback vector corridor element.
 */
export function FallbackCorridorCanvas({
  selectedOffice,
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

      <CameraTour
        active={tourActive}
        hasMapProvider={false}
        onStepNeighbourhoods={onTourNeighbourhoodsChange}
        onFinish={onFinishTour}
      />
    </div>
  );
}
