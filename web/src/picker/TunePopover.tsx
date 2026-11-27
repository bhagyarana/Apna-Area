/**
 * Feature: Progressive-Disclosure Preferences Popover ("Tune")
 * Purpose: Hides secondary housing budget-band and language-comfort settings behind one accessible @ui-sdk/react Popover.
 * Inputs: Current budgetBand, languageComfort, enabledLanguages from /api/config, and change handlers.
 * Outputs: Accessible floating preferences popover that closes on Escape or outside click.
 * Deliberately excludes: Stating unverified rupee rent claims or enabling languages turned off in shared/config.ts.
 */
import type { JSX } from "react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { SlidersHorizontalIcon } from "@hugeicons/core-free-icons";
import type { BudgetBand, LanguageCode, LanguageComfort } from "@apna-area/shared";

export interface TunePopoverProps {
  budgetBand: BudgetBand;
  languageComfort: LanguageComfort;
  enabledLanguages: readonly LanguageCode[];
  onChangeBudget: (band: BudgetBand) => void;
  onChangeLanguageComfort: (comfort: LanguageComfort) => void;
}

const BUDGET_OPTIONS: ReadonlyArray<{ value: BudgetBand; label: string; hint: string }> = [
  { value: "15_20k", label: "Shared PG or coliving", hint: "Walkable feeder lanes" },
  { value: "20_30k", label: "Private room in 2-3 BHK", hint: "Balanced commute & space" },
  { value: "30k_plus", label: "1 BHK or gated society", hint: "Quieter residential pockets" },
];

/**
 * Renders the compact "Tune" trigger and accessible settings popover in the top utility bar.
 *
 * @param props - Active preferences, enabled languages, and change handlers.
 * @returns Accessible Popover component.
 */
export function TunePopover({
  budgetBand,
  languageComfort,
  enabledLanguages,
  onChangeBudget,
  onChangeLanguageComfort,
}: TunePopoverProps): JSX.Element {
  const hindiAvailable = enabledLanguages.includes("hi");
  const comfortShort =
    hindiAvailable && languageComfort === "hi"
      ? " · HI"
      : hindiAvailable && languageComfort === "en_hi"
        ? " · HI+EN"
        : hindiAvailable
          ? " · EN"
          : "";

  return (
    <Popover>
      <PopoverTrigger className="tune-trigger" data-testid="tune-trigger">
        <HugeiconsIcon icon={SlidersHorizontalIcon} size={16} aria-hidden="true" />
        <span>Tune{comfortShort}</span>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" sideOffset={10} className="tune-popover">
        <div className="tune-header">
          <PopoverTitle className="tune-title">First-week setup</PopoverTitle>
          <PopoverClose className="tune-close" aria-label="Close setup">
            Done
          </PopoverClose>
        </div>

        <fieldset className="tune-group">
          <legend className="tune-legend">Home style preference</legend>
          <div className="tune-options">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={
                  budgetBand === opt.value ? "tune-option tune-option-active" : "tune-option"
                }
                aria-pressed={budgetBand === opt.value}
                onClick={() => onChangeBudget(opt.value)}
              >
                <span className="tune-option-label">{opt.label}</span>
                <span className="tune-option-hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {hindiAvailable && (
          <fieldset className="tune-group">
            <legend className="tune-legend">Comfort language</legend>
            <div className="tune-row">
              {(
                [
                  { value: "en", label: "English" },
                  { value: "hi", label: "Hindi" },
                  { value: "en_hi", label: "Hindi + English" },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  className={
                    languageComfort === lang.value ? "tune-chip tune-chip-active" : "tune-chip"
                  }
                  aria-pressed={languageComfort === lang.value}
                  onClick={() => onChangeLanguageComfort(lang.value)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </PopoverContent>
    </Popover>
  );
}
