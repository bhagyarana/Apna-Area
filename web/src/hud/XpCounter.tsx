/**
 * Feature: Smoked-Acrylic Topbar XP Odometer & Week Star Cluster (web/src/hud/XpCounter.tsx)
 * Purpose: Renders the zero-padded tabular Anton XP odometer (rolling over 280ms) with muted leading zeros and earned week stars.
 * Inputs: Total accumulated XP and cumulative earned Week One stars.
 * Outputs: Accessible 40px smoked-acrylic HUD cluster in the top-right action bar.
 * Deliberately excludes: Synthetic faux-bolding on Anton or empty low-contrast star slots on unscored stops.
 */
import { useEffect, useRef, useState, type JSX } from "react";

export interface XpCounterProps {
  totalXp: number;
  totalStars: number;
}

/**
 * Splits a zero-padded 5-digit odometer string (for example "00,300") into muted leading zeros and bright active digits.
 *
 * @param value - Non-negative XP integer.
 * @returns Leading zero prefix and significant active suffix whose concatenation equals the 5-digit formatted string.
 */
export function splitOdometerXp(value: number): { leading: string; active: string } {
  const clamped = Math.max(0, Math.min(99_999, Math.round(value)));
  const padded = String(clamped).padStart(5, "0");
  const formatted = `${padded.slice(0, 2)},${padded.slice(2)}`;
  if (clamped === 0) {
    return { leading: "00,00", active: "0" };
  }
  const firstNonZeroIdx = formatted.search(/[1-9]/);
  if (firstNonZeroIdx <= 0) {
    return { leading: "", active: formatted };
  }
  return {
    leading: formatted.slice(0, firstNonZeroIdx),
    active: formatted.slice(firstNonZeroIdx),
  };
}

/**
 * Animates a numeric display value toward target over durationMs using quintic ease-out.
 *
 * @param target - Target integer value.
 * @param durationMs - Roll-up duration in milliseconds.
 * @returns Current interpolated integer value.
 */
export function useRollingNumber(target: number, durationMs = 280): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const startVal = fromRef.current;
    if (startVal === target) return undefined;
    const reduced =
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    if (reduced) {
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const startTime = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - elapsed) ** 5;
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (elapsed < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      fromRef.current = target;
      window.cancelAnimationFrame(rafId);
    };
  }, [target, durationMs]);

  return display;
}

/**
 * Renders the top-right XP odometer and cumulative Week One star badge.
 *
 * @param props - Total XP and cumulative earned stars across Week One.
 * @returns Accessible 40px HUD score pill.
 */
export function XpCounter({ totalXp, totalStars }: XpCounterProps): JSX.Element {
  const animatedXp = useRollingNumber(totalXp, 280);
  const { leading, active } = splitOdometerXp(animatedXp);
  const starNote = totalStars > 0 ? `${totalStars} stars earned` : "0 stars earned";

  return (
    <div
      className="xp-counter-pill"
      role="status"
      aria-label={`${totalXp} Week XP, ${starNote}`}
      data-testid="xp-counter"
    >
      {totalStars > 0 && (
        <span className="xp-star-tally" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.3l1.95 4.08 4.5.62-3.27 3.16.79 4.48L8 11.5l-3.97 2.14.79-4.48L1.55 6l4.5-.62L8 1.3z" />
          </svg>
          <span>{totalStars}</span>
        </span>
      )}
      <div className="xp-odometer-group">
        <span className="xp-odometer-value" data-testid="xp-counter-value">
          <span className="xp-digits-leading">{leading}</span>
          <span className="xp-digits-active">{active}</span>
        </span>
        <span className="xp-odometer-label">XP</span>
      </div>
    </div>
  );
}
