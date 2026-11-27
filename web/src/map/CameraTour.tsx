/**
 * Feature: Skippable ORR Corridor Camera Tour (T1.4b)
 * Purpose: Flies the camera smoothly along 4 eastern ORR anchors from Marathahalli to Silk Board on first visit, highlighting all matching corridor pins.
 * Inputs: Active flag, optional Google Map camera driver flag, neighbourhood list callback, and onFinish callback.
 * Outputs: Floating neighbourhood callout pill with 4-step progress bar + skip hint while touring.
 * Deliberately excludes: Calling useMap() outside an active <APIProvider> tree or running under prefers-reduced-motion.
 */
import { useEffect, useState, type JSX } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface TourStop {
  label: string;
  matchNeighbourhoods: readonly string[];
  subtitle: string;
  lat: number;
  lng: number;
}

const TOUR_STOPS: readonly TourStop[] = [
  {
    label: "Marathahalli",
    matchNeighbourhoods: ["Marathahalli"],
    subtitle: "Northern gateway of the eastern tech corridor",
    lat: 12.9569,
    lng: 77.7011,
  },
  {
    label: "Kadubeesanahalli",
    matchNeighbourhoods: ["Kadubeesanahalli", "Devarabisanahalli"],
    subtitle: "Prestige, Cessna & Embassy TechVillage stretch",
    lat: 12.9365,
    lng: 77.691,
  },
  {
    label: "Bellandur",
    matchNeighbourhoods: ["Bellandur", "Sarjapur Road Junction"],
    subtitle: "EcoWorld, Ecospace & morning darshini lanes",
    lat: 12.9245,
    lng: 77.6795,
  },
  {
    label: "Agara & Silk Board",
    matchNeighbourhoods: ["Agara & HSR Layout", "Silk Board"],
    subtitle: "HSR Layout edge, lake walk & southern junction",
    lat: 12.9182,
    lng: 77.638,
  },
];

const TOUR_DURATION_MS = 8_800;
const EMPTY_HOODS: readonly string[] = [];

export interface CameraTourProps {
  active: boolean;
  hasMapProvider?: boolean;
  onStepNeighbourhoods?: (labels: readonly string[]) => void;
  onFinish: () => void;
}

function MapCameraFlightSync({ stepProgress }: { stepProgress: number }): null {
  const map = useMap();

  useEffect(() => {
    if (!map) {
      return;
    }
    const scaled = stepProgress * (TOUR_STOPS.length - 1);
    const idx = Math.min(TOUR_STOPS.length - 2, Math.floor(scaled));
    const localT = scaled - idx;
    const eased = 1 - Math.pow(1 - localT, 3);
    const from = TOUR_STOPS[idx] ?? TOUR_STOPS[0]!;
    const to = TOUR_STOPS[idx + 1] ?? TOUR_STOPS[TOUR_STOPS.length - 1]!;

    map.moveCamera({
      center: {
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
      },
      zoom: 13.7,
    });
  }, [map, stepProgress]);

  return null;
}

/**
 * Animates an 8.8-second corridor tour and emits all active neighbourhoods so every stop pin highlights in sync.
 *
 * @param props - Active state, provider flag, neighbourhood list callback, and completion callback.
 * @returns Floating tour HUD when active, or null.
 */
export function CameraTour({
  active,
  hasMapProvider = false,
  onStepNeighbourhoods,
  onFinish,
}: CameraTourProps): JSX.Element | null {
  const [progress, setProgress] = useState(0);

  const stepIndex = Math.min(
    TOUR_STOPS.length - 1,
    Math.floor(progress * TOUR_STOPS.length),
  );
  const stop = TOUR_STOPS[stepIndex] ?? TOUR_STOPS[0]!;

  useEffect(() => {
    if (!active) {
      onStepNeighbourhoods?.(EMPTY_HOODS);
      return;
    }
    onStepNeighbourhoods?.(stop.matchNeighbourhoods);
  }, [active, stop, onStepNeighbourhoods]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      onFinish();
      return;
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFinish();
      }
    };
    window.addEventListener("keydown", handleKey);

    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const nextP = Math.min(1, (now - start) / TOUR_DURATION_MS);
      setProgress(nextP);
      if (nextP < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        onFinish();
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.cancelAnimationFrame(rafId);
    };
  }, [active, onFinish]);

  if (!active) {
    return null;
  }

  return (
    <div
      className="tour-overlay"
      onClick={onFinish}
      role="region"
      aria-label="Outer Ring Road corridor tour"
    >
      {hasMapProvider && <MapCameraFlightSync stepProgress={progress} />}

      <div className="tour-pill" data-testid="tour-pill">
        <div className="tour-progress-row" aria-hidden="true">
          {TOUR_STOPS.map((s, i) => (
            <span
              key={s.label}
              className={
                i < stepIndex
                  ? "tour-dot tour-dot-done"
                  : i === stepIndex
                    ? "tour-dot tour-dot-active"
                    : "tour-dot"
              }
            />
          ))}
        </div>
        <span className="tour-step-count">
          STOP {stepIndex + 1} OF {TOUR_STOPS.length} · OUTER RING ROAD
        </span>
        <strong className="tour-stop-name">{stop.label}</strong>
        <span className="tour-stop-sub">{stop.subtitle}</span>
      </div>

      <button
        type="button"
        className="tour-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          onFinish();
        }}
        data-testid="skip-tour"
      >
        Skip tour · Esc
      </button>
    </div>
  );
}
