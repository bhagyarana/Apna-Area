/**
 * Feature: Verified ORR Office Picker (T1.4)
 * Purpose: Asks one primary question ("Which office are you joining?") using @ui-sdk/react Combobox and Toolbar, then transitions into a Destination Card with a primary Week One CTA.
 * Inputs: Verified tech parks from places.json, selected office, and selection/clear callbacks.
 * Outputs: Smoked-acrylic instrument card supporting mouse, touch, Arrow keys, Enter, and Cmd/Ctrl+K.
 * Deliberately excludes: Duplicate echoed labels or unverified free-text locations outside data/orr/places.json.
 */
import { useEffect, useMemo, type JSX } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemText,
  ComboboxList,
  createComboboxController,
} from "@ui-sdk/react/combobox";
import { Toolbar, ToolbarButton } from "@ui-sdk/react/toolbar";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Building03Icon, Location01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import type { VerifiedPlace } from "@apna-area/shared";

export interface OfficePickerProps {
  techParks: readonly VerifiedPlace[];
  selectedOffice: VerifiedPlace | null;
  onSelectOffice: (placeId: string) => void;
  onClearOffice: () => void;
  onBuildWeek: () => void;
  placesReady: boolean;
}

function formatCleanAddress(addr: string): string {
  return addr.replace(/(^|,\s*)([a-z])/g, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Renders the primary ORR office selection card with Cmd/Ctrl+K shortcut and 6 quick-pick chips.
 *
 * @param props - Verified tech parks, active selection, and callbacks.
 * @returns Accessible office picker or compact destination summary card.
 */
export function OfficePicker({
  techParks,
  selectedOffice,
  onSelectOffice,
  onClearOffice,
  onBuildWeek,
  placesReady,
}: OfficePickerProps): JSX.Element {
  const controller = useMemo(() => createComboboxController<string, false>(), []);
  const suggestedChips = useMemo(() => techParks.slice(0, 6), [techParks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (selectedOffice) {
          onClearOffice();
          window.setTimeout(() => {
            controller.focus();
            controller.setOpen(true);
          }, 0);
        } else {
          controller.focus();
          controller.setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controller, selectedOffice, onClearOffice]);

  if (selectedOffice) {
    return (
      <section
        className="picker-card picker-card-compact"
        aria-label="Selected office destination"
        data-testid="selected-office-card"
      >
        <div className="destination-header">
          <span className="selected-office-badge">
            <HugeiconsIcon icon={Location01Icon} size={14} aria-hidden="true" />
            <span>YOUR OFFICE · {selectedOffice.neighbourhood.toUpperCase()}</span>
          </span>
          <button
            type="button"
            className="change-office-btn"
            onClick={onClearOffice}
            aria-label="Switch office"
          >
            Switch
          </button>
        </div>

        <h1 className="hero-headline">{selectedOffice.name}</h1>
        <p className="selected-office-address">{formatCleanAddress(selectedOffice.shortAddress)}</p>

        <button
          type="button"
          className="primary-cta-btn"
          onClick={onBuildWeek}
          data-testid="build-week-cta"
        >
          <span>Build my first week</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
        </button>

        <span className="sr-only" data-testid="tagline">
          Play your first week before it happens.
        </span>
      </section>
    );
  }

  return (
    <section className="picker-card" aria-labelledby="office-question-heading">
      <span className="eyebrow-track">Outer Ring Road · Marathahalli to Silk Board</span>

      <h1 id="office-question-heading" className="hero-headline">
        Which office are you joining?
      </h1>

      <p className="picker-subtitle" data-testid="tagline">
        Play your first week before it happens.
      </p>

      <Combobox<string, false>
        controller={controller}
        value={null}
        onValueChange={(nextId) => {
          if (nextId) {
            onSelectOffice(nextId);
          }
        }}
        autoHighlight="always"
        disabled={!placesReady || techParks.length === 0}
      >
        <div className="combobox-field">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            className="combobox-search-icon"
            aria-hidden="true"
          />
          <ComboboxInput
            className="combobox-input"
            data-testid="office-combobox-input"
            placeholder={
              techParks.length > 0
                ? "Type a tech park or corridor area..."
                : "Verified ORR places loading..."
            }
            aria-label="Search verified Outer Ring Road tech parks"
          />
          <kbd className="combobox-kbd" aria-hidden="true">
            Ctrl K
          </kbd>
        </div>

        <ComboboxContent side="bottom" align="start" sideOffset={8} className="combobox-popup">
          <ComboboxList className="combobox-list">
            {techParks.map((park) => (
              <ComboboxItem
                key={park.id}
                value={park.id}
                label={park.name}
                className="combobox-item"
                data-testid={`combobox-option-${park.id}`}
              >
                <HugeiconsIcon icon={Building03Icon} size={16} aria-hidden="true" />
                <div className="combobox-item-copy">
                  <ComboboxItemText className="combobox-item-title" />
                  <span className="combobox-item-sub">{park.neighbourhood}</span>
                </div>
              </ComboboxItem>
            ))}
          </ComboboxList>
          <ComboboxEmpty className="combobox-empty">
            No verified ORR tech park matches that search.
          </ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {suggestedChips.length > 0 && (
        <Toolbar
          orientation="horizontal"
          loop
          aria-label="Suggested Outer Ring Road tech parks"
          className="chip-toolbar"
        >
          {suggestedChips.map((park) => (
            <ToolbarButton
              key={park.id}
              type="button"
              className="office-chip"
              data-testid={`chip-${park.id}`}
              onClick={() => onSelectOffice(park.id)}
            >
              <span>{park.name}</span>
              <span className="office-chip-hood">{park.neighbourhood}</span>
            </ToolbarButton>
          ))}
        </Toolbar>
      )}
    </section>
  );
}
