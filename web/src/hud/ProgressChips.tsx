/**
 * Feature: Live SSE Director Progress Chip Stack (web/src/hud/ProgressChips.tsx)
 * Purpose: Displays real-time server progress steps while Gemini 4 Neon builds and verifies the player's 5-mission Week One.
 * Inputs: Office name, array of received WorldProgressEvents, and user cancel callback.
 * Outputs: Smoked-acrylic status card with teal completion ticks and live polite announcements.
 * Deliberately excludes: Fake timer-driven steps disconnected from server SSE events.
 */
import type { JSX } from "react";
import type { WorldProgressStep } from "@apna-area/shared";

export interface ProgressChipItem {
  step: WorldProgressStep;
  detail: string;
  done: boolean;
}

export interface ProgressChipsProps {
  officeName: string;
  items: readonly ProgressChipItem[];
  onCancel: () => void;
}

/**
 * Renders the vertical stack of live SSE world-generation progress chips.
 *
 * @param props - Target office name, progress steps, and cancel handler.
 * @returns Accessible status card for the generating screen state.
 */
export function ProgressChips({ officeName, items, onCancel }: ProgressChipsProps): JSX.Element {
  return (
    <section
      className="picker-card director-progress-card"
      aria-live="polite"
      aria-label="Building your first week"
      data-testid="director-progress-card"
    >
      <div className="destination-header">
        <span className="eyebrow-track">Building Week One · {officeName}</span>
        <button
          type="button"
          className="change-office-btn"
          onClick={onCancel}
          data-testid="cancel-director-btn"
        >
          Cancel
        </button>
      </div>

      <h2 className="director-progress-title">Mapping your five stops on the corridor</h2>

      <ul className="progress-chip-list" data-testid="progress-chip-list">
        {items.map((item) => (
          <li
            key={item.step}
            className={item.done ? "progress-chip progress-chip-done" : "progress-chip progress-chip-active"}
            data-testid={`progress-chip-${item.step}`}
          >
            <span
              className={item.done ? "progress-chip-dot progress-chip-dot-done" : "progress-chip-dot"}
              aria-hidden="true"
            >
              {item.done ? "✓" : ""}
            </span>
            <span className="progress-chip-text">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
