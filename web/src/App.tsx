/**
 * Feature: Phase 0 ORR Neon Dusk Shell
 * Purpose: Renders the themed landing shell, Apna Area wordmark, tagline, and live health indicator.
 * Inputs: None (Phase 1 wires interactive ORR map and office picker into this shell).
 * Outputs: Accessible root React view matching Design.md tokens and reduced-motion rules.
 * Deliberately excludes: Feature logic, Gemini calls, or mock mission data.
 */
import type { JSX } from "react";
import { HealthBadge } from "./components/HealthBadge";

/**
 * Root application component for the Apna Area shell.
 *
 * @returns Full-viewport ORR Neon Dusk shell view.
 */
export function App(): JSX.Element {
  return (
    <div className="shell-stage">
      <svg
        className="corridor-backdrop"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M140 790 Q 510 640, 760 455 T 1290 135"
          fill="none"
          stroke="rgba(255, 79, 160, 0.16)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d="M140 790 Q 510 640, 760 455 T 1290 135"
          fill="none"
          stroke="#FF4FA0"
          strokeWidth="3.5"
          strokeDasharray="8 12"
          strokeLinecap="round"
        />
        <circle cx="760" cy="455" r="8" fill="#FFD24A" />
        <circle cx="760" cy="455" r="22" fill="rgba(255, 210, 74, 0.16)" />
      </svg>

      <header className="shell-topbar">
        <div className="wordmark" data-testid="wordmark">
          <span className="wordmark-pip" aria-hidden="true" />
          <span>Apna Area</span>
        </div>
        <HealthBadge />
      </header>

      <main className="shell-hero">
        <span className="eyebrow-flag">Outer Ring Road · Marathahalli to Silk Board</span>
        <h1 className="hero-headline">Apna Area</h1>
        <p className="hero-tagline" data-testid="tagline">
          Play your first week before it happens.
        </p>
      </main>

      <footer className="shell-footer">
        Verified Bengaluru places · Real-time voice · Human in control
      </footer>
    </div>
  );
}
