/**
 * Feature: Calibrated Rubric Disclosure & 1-Click Pace Override (web/src/score/WhyChangedDisclosure.tsx)
 * Purpose: Expands in 200ms to show a 2x2 Gemini Decision 1 rubric grid (Objective, Phrase, Tone, Confidence) and player overrides.
 * Inputs: RubricScores, durationMs, fallbackUsed, lowConfidenceFallback, enabled languages, active override mode, and callback.
 * Outputs: Accessible disclosure drawer with transform-scaled bars and checkmark-paired override buttons.
 * Deliberately excludes: Colour-only active override indicators or opaque AI routing.
 */
import { useState, type JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import {
  DECISION_THRESHOLDS,
  type DifficultyOverrideMode,
  type LanguageCode,
  type RubricScores,
} from "@apna-area/shared";

export interface WhyChangedDisclosureProps {
  rubric: RubricScores;
  durationMs: number;
  fallbackUsed: boolean;
  lowConfidenceFallback: boolean;
  enabledLanguages: readonly LanguageCode[];
  overrideMode: DifficultyOverrideMode | null;
  onSelectOverride: (mode: DifficultyOverrideMode) => void;
}

interface BarMetric {
  id: string;
  label: string;
  ratio: number;
  valueText: string;
  isConfidence?: boolean;
}

/**
 * Renders the expandable "Why did this change?" 2x2 rubric drawer and 1-click player override pills.
 *
 * @param props - Calibrated rubric scores, timing metadata, confidence gate status, and override controls.
 * @returns Disclosure trigger and collapsible rubric panel.
 */
export function WhyChangedDisclosure({
  rubric,
  durationMs,
  fallbackUsed,
  lowConfidenceFallback,
  enabledLanguages,
  overrideMode,
  onSelectOverride,
}: WhyChangedDisclosureProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const maxScore = DECISION_THRESHOLDS.rubricMaxScore;
  const hasKannada = enabledLanguages.includes("kn");
  const provenanceNote =
    !fallbackUsed && durationMs >= 20
      ? `Calibrated rubric · ${durationMs} ms`
      : "Calibrated rubric";

  const metrics: BarMetric[] = [
    {
      id: "objective",
      label: "Objective",
      ratio: Math.max(0.05, Math.min(1, rubric.objectiveScore / maxScore)),
      valueText: `${rubric.objectiveScore.toFixed(1)} / 3`,
    },
    {
      id: "phrase",
      label: "Phrase",
      ratio: Math.max(0.05, Math.min(1, rubric.phraseScore / maxScore)),
      valueText: `${rubric.phraseScore.toFixed(1)} / 3`,
    },
    {
      id: "tone",
      label: "Tone",
      ratio: Math.max(0.05, Math.min(1, rubric.toneScore / maxScore)),
      valueText: `${rubric.toneScore.toFixed(1)} / 3`,
    },
    {
      id: "confidence",
      label: "Confidence",
      ratio: Math.max(0.05, Math.min(1, rubric.confidence)),
      valueText: `${Math.round(rubric.confidence * 100)}%`,
      isConfidence: true,
    },
  ];

  return (
    <div className="why-disclosure-box">
      <button
        type="button"
        className="why-disclosure-trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        data-testid="why-changed-toggle"
      >
        <span>Why did this change?</span>
        <span className="why-trigger-right">
          {overrideMode && <span className="why-override-tag">✓ Your pace</span>}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={15}
            aria-hidden="true"
            className={open ? "why-chevron why-chevron-open" : "why-chevron"}
          />
        </span>
      </button>

      {open && (
        <div className="why-disclosure-panel" data-testid="why-changed-panel">
          <div className="rubric-bars-grid">
            {metrics.map((metric) => {
              const barClass = metric.isConfidence
                ? lowConfidenceFallback
                  ? "rubric-bar-fill rubric-bar-fill-steady"
                  : "rubric-bar-fill rubric-bar-fill-confidence"
                : "rubric-bar-fill";
              return (
                <div key={metric.id} className="rubric-bar-row" data-testid={`rubric-row-${metric.id}`}>
                  <div className="rubric-bar-labels">
                    <span className="rubric-bar-name">{metric.label}</span>
                    <span className="rubric-bar-val">{metric.valueText}</span>
                  </div>
                  <div className="rubric-bar-track" aria-hidden="true">
                    <div
                      className={barClass}
                      style={{ transform: `scaleX(${metric.ratio.toFixed(3)})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="override-controls-group">
            <div className="override-header-row">
              <span className="override-caption">You stay in control:</span>
              <span className="override-provenance" data-testid="score-model-tag">{provenanceNote}</span>
            </div>
            <div className="override-btn-row">
              <button
                type="button"
                className={
                  overrideMode === "gentle"
                    ? "override-pill-btn override-pill-active"
                    : "override-pill-btn"
                }
                aria-pressed={overrideMode === "gentle"}
                onClick={() => onSelectOverride("gentle")}
                data-testid="override-gentle-btn"
              >
                {overrideMode === "gentle" ? "✓ Keep gentler pace" : "Keep gentler pace"}
              </button>
              <button
                type="button"
                className={
                  overrideMode === "step_up"
                    ? "override-pill-btn override-pill-active"
                    : "override-pill-btn"
                }
                aria-pressed={overrideMode === "step_up"}
                onClick={() => onSelectOverride("step_up")}
                data-testid="override-step-up-btn"
              >
                {overrideMode === "step_up" ? "✓ " : ""}
                {hasKannada ? "Step up Kannada anyway" : "Step up pace anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
