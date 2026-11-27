/**
 * Feature: Phase 5 Survival Kit Peak Screen (web/src/kit/SurvivalKit.tsx)
 * Purpose: Presents the "YOU'RE READY FOR MONDAY." 3-card Survival Kit (Routes API commutes, TTS phrasebook, checklist), mobile section switcher, and ConfirmSheet gate.
 * Inputs: Selected VerifiedPlace office, optional WeekPlan, persisted PlayerPreferences, and close/toggle callbacks.
 * Outputs: Bounded 3-column desktop / segmented mobile Survival Kit stage with focus-trapped ConfirmSheet.
 * Deliberately excludes: Unconfirmed window.open calls or unconfirmed file downloads.
 */
import { useCallback, useEffect, useRef, useState, type JSX, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import type { NeighbourhoodCommute, VerifiedPlace, WeekPlan } from "@apna-area/shared";
import type { PlayerPreferences } from "../state/sessionStore";
import { ChecklistCard } from "./ChecklistCard";
import { CommuteCard } from "./CommuteCard";
import { ConfirmSheet } from "./ConfirmSheet";
import { downloadSurvivalKitPng } from "./exportKitPng";
import { PhrasebookCard } from "./PhrasebookCard";
import { useSurvivalKitData } from "./useSurvivalKitData";

export interface SurvivalKitProps {
  office: VerifiedPlace;
  weekPlan: WeekPlan | null;
  prefs: PlayerPreferences;
  onToggleChecklist: (itemId: string) => void;
  onBackToMap: () => void;
}

type MobileSectionTab = "commute" | "phrases" | "checklist";

type PendingExitIntent =
  | { kind: "maps"; areaName: string; mapsUri: string; triggerEl: HTMLElement }
  | { kind: "download"; triggerEl: HTMLElement };

/**
 * Renders the Survival Kit emotional peak screen with sub-420ms entrance choreography and ConfirmSheet exit control.
 *
 * @param props - Verified office, optional WeekPlan, player preferences, and navigation callbacks.
 * @returns Survival Kit stage and ConfirmSheet gate.
 */
export function SurvivalKit({
  office,
  weekPlan,
  prefs,
  onToggleChecklist,
  onBackToMap,
}: SurvivalKitProps): JSX.Element {
  const { kit, loading, errorMessage, retry } = useSurvivalKitData({
    officePlaceId: office.id,
    budgetBand: prefs.budgetBand,
    recommendedNeighbourhoods: weekPlan?.recommendedNeighbourhoods,
    missionStars: prefs.missionStars,
    learnedPhraseIds: prefs.learnedPhraseIds,
  });

  const [mobileTab, setMobileTab] = useState<MobileSectionTab>("commute");
  const [pendingExit, setPendingExit] = useState<PendingExitIntent | null>(null);
  const lastExitRef = useRef<PendingExitIntent | null>(null);

  if (pendingExit !== null) {
    lastExitRef.current = pendingExit;
  }

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (
        ev.key === "Escape" &&
        !ev.defaultPrevented &&
        pendingExit === null &&
        !document.querySelector('[data-testid="confirm-sheet"]')
      ) {
        ev.preventDefault();
        onBackToMap();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBackToMap, pendingExit]);

  const handleTabKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    const order: readonly MobileSectionTab[] = ["commute", "phrases", "checklist"];
    const idx = order.indexOf(mobileTab);
    let nextIdx = idx;
    if (ev.key === "ArrowRight") nextIdx = (idx + 1) % order.length;
    else if (ev.key === "ArrowLeft") nextIdx = (idx - 1 + order.length) % order.length;
    else if (ev.key === "Home") nextIdx = 0;
    else if (ev.key === "End") nextIdx = order.length - 1;
    else return;
    ev.preventDefault();
    const nextTab = order[nextIdx]!;
    setMobileTab(nextTab);
    document.querySelector<HTMLButtonElement>(`[data-testid="kit-tab-${nextTab}"]`)?.focus();
  };

  const handleConfirmExit = useCallback(() => {
    const active = pendingExit;
    if (!active) return;
    setPendingExit(null);
    if (active.kind === "maps") {
      window.open(active.mapsUri, "_blank", "noopener,noreferrer");
    } else if (active.kind === "download" && kit) {
      downloadSurvivalKitPng({
        kit,
        checkedIds: prefs.checkedChecklistIds,
        totalXp: prefs.totalXp,
      });
    }
  }, [kit, pendingExit, prefs.checkedChecklistIds, prefs.totalXp]);

  const displayExit = pendingExit ?? lastExitRef.current;
  const isMapsExit = displayExit?.kind === "maps";
  const readyCount = kit
    ? kit.checklist.filter((item) => prefs.checkedChecklistIds.includes(item.id)).length
    : 0;

  return (
    <div className="kit-stage" data-testid="survival-kit">
      <section className="kit-hero-bar" aria-label="Survival Kit header">
        <div className="kit-hero-copy">
          <p className="kit-hero-kicker">First-week survival kit · {office.name}</p>
          <h1 className="kit-hero-headline" data-testid="kit-hero-headline">
            YOU&apos;RE READY FOR MONDAY.
          </h1>
          <p className="kit-hero-subtitle">
            Weekday Outer Ring Road commutes, polite Kannada audio cards, and your move-in checklist.
          </p>
        </div>

        <div className="kit-hero-actions">
          <button
            type="button"
            className="mission-secondary-btn kit-back-btn"
            onClick={onBackToMap}
            data-testid="kit-back-to-map-btn"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
            <span>Back to map</span>
          </button>
          <button
            type="button"
            className="primary-cta-btn kit-save-cta"
            disabled={!kit || loading}
            onClick={(ev) => setPendingExit({ kind: "download", triggerEl: ev.currentTarget })}
            data-testid="save-kit-btn"
          >
            <HugeiconsIcon icon={Download01Icon} size={16} aria-hidden="true" />
            <span>Save my kit</span>
          </button>
        </div>
      </section>

      {kit && !loading && !errorMessage && (
        <div
          className="kit-mobile-tabs"
          role="tablist"
          aria-label="Survival Kit sections"
          onKeyDown={handleTabKeyDown}
        >
          {(
            [
              { id: "commute", label: `Commutes (${kit.neighbourhoods.length})` },
              { id: "phrases", label: `Phrases (${kit.phrases.length})` },
              { id: "checklist", label: `Checklist (${readyCount}/${kit.checklist.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              tabIndex={mobileTab === tab.id ? 0 : -1}
              aria-selected={mobileTab === tab.id}
              className={
                mobileTab === tab.id ? "kit-mobile-tab kit-mobile-tab-active" : "kit-mobile-tab"
              }
              onClick={() => setMobileTab(tab.id)}
              data-testid={`kit-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {errorMessage ? (
        <div className="kit-error-card" role="alert" data-testid="kit-error-banner">
          <p>{errorMessage}</p>
          <button type="button" className="primary-cta-btn kit-retry-btn" onClick={retry}>
            Retry
          </button>
        </div>
      ) : loading || !kit ? (
        <div className="kit-grid" aria-busy="true" data-testid="kit-loading-skeleton">
          {[1, 2, 3].map((slot) => (
            <div key={slot} className="kit-card kit-skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="kit-grid">
          <CommuteCard
            neighbourhoods={kit.neighbourhoods}
            officeName={kit.office.name}
            mobileHidden={mobileTab !== "commute"}
            onRequestOpenMaps={(area: NeighbourhoodCommute, triggerEl: HTMLElement) =>
              setPendingExit({
                kind: "maps",
                areaName: area.areaName,
                mapsUri: area.mapsDirectionsUri,
                triggerEl,
              })
            }
          />
          <PhrasebookCard
            phrases={kit.phrases}
            starterPhraseIds={kit.starterPhraseIds}
            languageComfort={prefs.languageComfort}
            mobileHidden={mobileTab !== "phrases"}
          />
          <ChecklistCard
            items={kit.checklist}
            checkedIds={prefs.checkedChecklistIds}
            budgetBand={prefs.budgetBand}
            mobileHidden={mobileTab !== "checklist"}
            onToggleItem={onToggleChecklist}
          />
        </div>
      )}

      <ConfirmSheet
        open={pendingExit !== null}
        eyebrow={isMapsExit ? "External link · Google Maps" : "Local file · Saved on device"}
        title={isMapsExit ? "Open this route in Google Maps?" : "Download your Survival Kit?"}
        targetBadge={
          isMapsExit
            ? `google.com/maps · ${displayExit.areaName} to ${office.name}`
            : "apna-area-survival-kit.png · 1200 x 675 summary card"
        }
        description={
          isMapsExit
            ? `Opens google.com/maps in a new tab with directions from ${displayExit.areaName} to ${office.name}. Nothing else is shared.`
            : "Saves a PNG summary card to your device. No account or upload is used."
        }
        confirmLabel={isMapsExit ? "Open Google Maps" : "Download PNG"}
        confirmKind={isMapsExit ? "maps" : "download"}
        returnFocusEl={displayExit?.triggerEl ?? null}
        onConfirm={handleConfirmExit}
        onCancel={() => setPendingExit(null)}
      />
    </div>
  );
}
