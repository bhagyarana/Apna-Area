/**
 * Feature: Verified ORR Office Picker (T1.4)
 * Purpose: Asks one primary question ("Which office are you joining?") using @ui-sdk/react Combobox and Toolbar, then transitions into a Destination Card with a primary Week One CTA.
 * Inputs: Verified tech parks from places.json, selected office, and selection/clear callbacks.
 * Outputs: Smoked-acrylic instrument card supporting mouse, touch, Arrow keys, Enter, and Cmd/Ctrl+K.
 * Deliberately excludes: Duplicate echoed labels or unverified free-text locations outside data/orr/places.json.
 */
import { useEffect, useMemo, useRef, type JSX } from "react";
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
  savedOfficeId?: string | null;
  hasError?: boolean;
  onSelectOffice: (placeId: string) => void;
  onClearOffice: () => void;
  onBuildWeek: () => void;
  placesReady: boolean;
}

const FEATURED_TECH_PARK_IDS: readonly string[] = [
  "ChIJY1us488TrjsReWn3vhpi6LQ", // RMZ Ecoworld (Bellandur)
  "ChIJZWmag6ATrjsRWXHDopfvwVc", // RMZ Ecospace (Bellandur)
  "ChIJ4VFw06gTrjsRBi6R59JUG0Q", // Embassy TechVillage (Devarabisanahalli)
  "ChIJ7-Cgk7MTrjsRpYr_lkVDiM8", // Prestige Tech Park (Kadubeesanahalli)
  "ChIJnfXMnosTrjsRVroH9vLgbkw", // Cessna Business Park (Kadubeesanahalli)
  "ChIJh9_I9A0TrjsRj_uXAthQcWg", // Vaishnavi Tech Park (Sarjapur Road Junction)
];

function formatCleanAddress(addr: string): string {
  return addr
    .replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s+/i, "")
    .replace(/Manyata Tech Park 3,\s*/i, "")
    .replace(/Cessna Business Park Security Room,\s*Prestige Site Office,\s*/i, "")
    .replace(/Prestige Platina-2,\s*/i, "")
    .replace(/PRESTIGE TECH PARK,\s*/i, "")
    .replace(/ECOSPACE BUSINESS PARK,\s*1b,\s*/i, "")
    .replace(/\s*&,\s*/g, ", ")
    .replace(/(^|,\s*)([a-z])/g, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

/** Renders the primary ORR office selection card with Cmd/Ctrl+K shortcut and 6 curated chips. */
export function OfficePicker({
  techParks,
  selectedOffice,
  savedOfficeId = null,
  hasError = false,
  onSelectOffice,
  onClearOffice,
  onBuildWeek,
  placesReady,
}: OfficePickerProps): JSX.Element {
  const controller = useMemo(() => createComboboxController<string, false>(), []);
  const buildBtnRef = useRef<HTMLButtonElement | null>(null);
  const userPickedRef = useRef(false);
  const pendingCtrlKRef = useRef(false);

  const suggestedChips = useMemo(() => {
    const byId = new Map(techParks.map((p) => [p.id, p]));
    const picked: VerifiedPlace[] = [];
    for (const id of FEATURED_TECH_PARK_IDS) {
      const hit = byId.get(id);
      if (hit) picked.push(hit);
    }
    for (const park of techParks) {
      if (picked.length >= 6) break;
      if (!picked.some((p) => p.id === park.id)) picked.push(park);
    }
    return picked;
  }, [techParks]);

  useEffect(() => {
    if (selectedOffice && userPickedRef.current) {
      userPickedRef.current = false;
      window.requestAnimationFrame(() => buildBtnRef.current?.focus());
    }
  }, [selectedOffice]);

  useEffect(() => {
    if (placesReady && pendingCtrlKRef.current && !selectedOffice) {
      pendingCtrlKRef.current = false;
      controller.focus();
      controller.setOpen(true);
    }
  }, [controller, placesReady, selectedOffice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!placesReady) {
          pendingCtrlKRef.current = true;
          return;
        }
        if (selectedOffice) {
          onClearOffice();
          window.setTimeout(() => { controller.focus(); controller.setOpen(true); }, 0);
        } else {
          controller.focus();
          controller.setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controller, placesReady, selectedOffice, onClearOffice]);

  if (!placesReady && savedOfficeId && !hasError) {
    return (
      <section className="picker-card picker-card-compact" aria-busy="true" data-testid="office-loading-card">
        <span className="eyebrow-track">Outer Ring Road · Loading saved destination</span>
        <div className="office-chip-skeleton" />
        <span className="sr-only" data-testid="tagline">Play your first week before it happens.</span>
      </section>
    );
  }

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
          <button type="button" className="change-office-btn" onClick={onClearOffice} aria-label="Switch office">
            Switch
          </button>
        </div>

        <h1 className="hero-headline">{selectedOffice.name}</h1>
        <p className="selected-office-address">{formatCleanAddress(selectedOffice.shortAddress)}</p>

        <button
          ref={buildBtnRef}
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
          if (nextId) { userPickedRef.current = true; onSelectOffice(nextId); }
        }}
        autoHighlight="always"
        disabled={!placesReady || techParks.length === 0}
      >
        <div className="combobox-field">
          <HugeiconsIcon icon={Search01Icon} size={18} className="combobox-search-icon" aria-hidden="true" />
          <ComboboxInput
            className="combobox-input"
            data-testid="office-combobox-input"
            placeholder={
              techParks.length > 0
                ? "Type a tech park or corridor area..."
                : hasError
                  ? "Verified places unavailable right now"
                  : "Verified ORR places loading..."
            }
            aria-label="Search verified Outer Ring Road tech parks"
          />
          <kbd className="combobox-kbd" aria-hidden="true">Ctrl K</kbd>
        </div>

        <ComboboxContent side="bottom" align="start" sideOffset={8} className="combobox-popup">
          <ComboboxList className="combobox-list">
            {techParks.map((park) => (
              <ComboboxItem key={park.id} value={park.id} label={park.name} className="combobox-item" data-testid={`combobox-option-${park.id}`}>
                <HugeiconsIcon icon={Building03Icon} size={16} aria-hidden="true" />
                <div className="combobox-item-copy">
                  <ComboboxItemText className="combobox-item-title" />
                  <span className="combobox-item-sub">{park.neighbourhood}</span>
                </div>
              </ComboboxItem>
            ))}
          </ComboboxList>
          <ComboboxEmpty className="combobox-empty">No verified ORR tech park matches that search.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {suggestedChips.length > 0 ? (
        <Toolbar orientation="horizontal" loop aria-label="Suggested Outer Ring Road tech parks" className="chip-toolbar">
          {suggestedChips.map((park) => (
            <ToolbarButton
              key={park.id}
              type="button"
              className="office-chip"
              data-testid={`chip-${park.id}`}
              onClick={() => { userPickedRef.current = true; onSelectOffice(park.id); }}
            >
              <span>{park.name}</span>
              <span className="office-chip-hood">{park.neighbourhood}</span>
            </ToolbarButton>
          ))}
        </Toolbar>
      ) : !placesReady && !hasError ? (
        <div className="chip-toolbar" aria-hidden="true" data-testid="office-chip-skeletons">
          {[1, 2, 3, 4, 5, 6].map((slot) => (
            <div key={slot} className="office-chip-skeleton" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
