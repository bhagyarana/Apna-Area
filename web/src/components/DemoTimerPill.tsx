/**
 * Feature: Subtle Presenter Timer Pill for ?demo=1 (web/src/components/DemoTimerPill.tsx)
 * Purpose: Displays a quiet tabular 00:00 / 03:00 clock when ?demo=1 is present in the URL without preselecting any state.
 * Inputs: URL query string (?demo=1).
 * Outputs: 40px smoked-acrylic timer button (click to reset) or null in normal player sessions.
 * Deliberately excludes: Preselecting offices, mocking responses, or altering gameplay state.
 */
import { useCallback, useEffect, useState, type JSX } from "react";

function isDemoQueryEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Renders a subtle 3-minute presenter timer pill in the topbar strictly when ?demo=1 is active.
 *
 * @returns Accessible timer button or null when ?demo=1 is absent.
 */
export function DemoTimerPill(): JSX.Element | null {
  const [enabled] = useState<boolean>(isDemoQueryEnabled);
  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1_000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [enabled, startedAtMs]);

  const handleReset = useCallback(() => {
    setStartedAtMs(Date.now());
    setElapsedSec(0);
  }, []);

  if (!enabled) {
    return null;
  }

  const toneClass =
    elapsedSec >= 165
      ? "demo-timer-pill demo-timer-danger"
      : elapsedSec >= 140
        ? "demo-timer-pill demo-timer-warn"
        : "demo-timer-pill";

  return (
    <button
      type="button"
      className={toneClass}
      onClick={handleReset}
      aria-label={`Demo timer ${formatClock(elapsedSec)} of 03:00. Activate to reset clock.`}
      title="Click to reset 3-minute presenter timer"
      data-testid="demo-timer-pill"
    >
      <span className="demo-timer-dot" aria-hidden="true" />
      <span>{formatClock(elapsedSec)} / 03:00</span>
    </button>
  );
}
