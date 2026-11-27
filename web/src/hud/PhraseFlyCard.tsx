/**
 * Feature: Flying Kannada Phrase Mastery Card & Topbar Phrasebook Pill (web/src/hud/PhraseFlyCard.tsx)
 * Purpose: Animates a newly mastered Kannada survival phrase from the Cinema Voice Ribbon into the topbar Phrasebook badge.
 * Inputs: Mastered SurvivalPhrase and Phrasebook count.
 * Outputs: Transform-only 420ms flight card (opacity crossfade under reduced motion) and topbar counter pill.
 * Deliberately excludes: Layout-thrashing top/left animations.
 */
import { useEffect, useState, type CSSProperties, type JSX } from "react";
import type { SurvivalPhrase } from "@apna-area/shared";

export interface PhrasebookPillProps {
  count: number;
  pulse: boolean;
  kitActive?: boolean;
  onOpenKit?: () => void;
}

/**
 * Renders the top-right Phrasebook counter pill (and Survival Kit trigger once a week or office is active).
 *
 * @param props - Count of mastered phrases, active teal pulse flag, and optional Survival Kit toggle.
 * @returns Smoked-acrylic Phrasebook badge or interactive button.
 */
export function PhrasebookPill({
  count,
  pulse,
  kitActive = false,
  onOpenKit,
}: PhrasebookPillProps): JSX.Element {
  const cls = [
    "phrasebook-pill",
    pulse ? "phrasebook-pill-pulse" : "",
    onOpenKit ? "phrasebook-pill-interactive" : "",
    kitActive ? "phrasebook-pill-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onOpenKit) {
    return (
      <button
        type="button"
        className={cls}
        data-testid="phrasebook-pill"
        aria-pressed={kitActive}
        aria-label={`Open Survival Kit, ${count} Kannada survival phrases learned`}
        onClick={onOpenKit}
      >
        <span className="phrasebook-dot" aria-hidden="true" />
        <span>Phrases · {count}</span>
      </button>
    );
  }

  return (
    <div
      className={cls}
      data-testid="phrasebook-pill"
      aria-label={`${count} Kannada survival phrases learned`}
    >
      <span className="phrasebook-dot" aria-hidden="true" />
      <span>Phrases · {count}</span>
    </div>
  );
}

export interface PhraseFlyCardProps {
  phrase: SurvivalPhrase;
}

/**
 * Animates a mastered Kannada phrase card toward the topbar Phrasebook pill over 420ms.
 *
 * @param props - Mastered SurvivalPhrase.
 * @returns Floating flight card that unmounts cleanly after 650ms.
 */
export function PhraseFlyCard({ phrase }: PhraseFlyCardProps): JSX.Element | null {
  const [visible, setVisible] = useState(true);
  const [flightStyle, setFlightStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const target = document.querySelector<HTMLElement>('[data-testid="phrasebook-pill"]');
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 170;
    const rect = target?.getBoundingClientRect();
    const dx = rect ? Math.round(rect.left + rect.width / 2 - startX) : Math.round(window.innerWidth * 0.32);
    const dy = rect ? Math.round(rect.top + rect.height / 2 - startY) : -Math.round(window.innerHeight * 0.72);

    const raf = window.requestAnimationFrame(() => {
      setFlightStyle({
        "--fly-dx": `${dx}px`,
        "--fly-dy": `${dy}px`,
      } as CSSProperties);
    });

    const hideTimer = window.setTimeout(() => setVisible(false), 680);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
    };
  }, [phrase.id]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="phrase-fly-card"
      style={flightStyle}
      data-testid="phrase-fly-card"
      aria-hidden="true"
    >
      <span className="phrase-fly-kn">{phrase.kannada}</span>
      <span className="phrase-fly-rom">{phrase.transliteration}</span>
    </div>
  );
}
