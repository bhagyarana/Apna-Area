/**
 * Feature: Survival Kit "Where to Live" Routes API Commute Card (web/src/kit/CommuteCard.tsx)
 * Purpose: Displays 3 verified ORR residential pockets with Monday 09:00 & 18:30 IST horizontal commute bars, spatial note, and ConfirmSheet-gated Maps links.
 * Inputs: Hydrated NeighbourhoodCommute array, verified office name, mobile visibility flag, and onRequestOpenMaps callback.
 * Outputs: Accessible commute comparison column with calm neutral bars and single-accent fastest mode highlight.
 * Deliberately excludes: Direct window.open calls (all exits route through ConfirmSheet) or price claims.
 */
import type { JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import type { NeighbourhoodCommute } from "@apna-area/shared";

export interface CommuteCardProps {
  neighbourhoods: readonly NeighbourhoodCommute[];
  officeName: string;
  mobileHidden?: boolean;
  onRequestOpenMaps: (area: NeighbourhoodCommute, triggerEl: HTMLElement) => void;
}

interface BarSpec {
  key: string;
  label: string;
  minutes: number | null;
}

function barWidthPercent(minutes: number | null, maxMinutes: number): number {
  if (minutes === null || maxMinutes <= 0) return 0;
  return Math.max(14, Math.min(100, Math.round((minutes / maxMinutes) * 100)));
}

/**
 * Renders the "Where to live" card with real Monday 09:00 & 18:30 IST Google Routes API commute bars.
 *
 * @param props - Verified neighbourhood commutes, target office name, mobile tab visibility, and ConfirmSheet trigger handler.
 * @returns Accessible Where to live column card.
 */
export function CommuteCard({
  neighbourhoods,
  officeName,
  mobileHidden = false,
  onRequestOpenMaps,
}: CommuteCardProps): JSX.Element {
  const allValidMinutes = neighbourhoods.flatMap((n) =>
    [n.morningDriveMin, n.eveningDriveMin, n.twoWheelerMin, n.transitMin].filter(
      (v): v is number => typeof v === "number" && v > 0,
    ),
  );
  const scaleMax = Math.max(45, ...allValidMinutes);

  return (
    <section
      className={mobileHidden ? "kit-card kit-col-mobile-hidden" : "kit-card"}
      aria-labelledby="kit-commute-heading"
      data-testid="kit-commute-card"
    >
      <div className="kit-card-header">
        <div>
          <h2 id="kit-commute-heading" className="kit-card-title">
            Where to live
          </h2>
          <p className="kit-card-sub">Monday 09:00 &amp; 18:30 IST to {officeName}</p>
        </div>
        <span className="kit-card-meta">3 areas</span>
      </div>

      <div className="kit-area-list">
        {neighbourhoods.map((area) => {
          const bars: readonly BarSpec[] = [
            { key: "am_drive", label: "Drive · 09:00", minutes: area.morningDriveMin },
            { key: "pm_drive", label: "Drive · 18:30", minutes: area.eveningDriveMin },
            { key: "two_wheeler", label: "Two-wheeler", minutes: area.twoWheelerMin },
            { key: "transit", label: "BMTC / Transit", minutes: area.transitMin },
          ];
          const areaValid = bars
            .map((b) => b.minutes)
            .filter((v): v is number => typeof v === "number" && v > 0);
          const fastestMin = areaValid.length > 0 ? Math.min(...areaValid) : null;

          return (
            <article
              key={area.neighbourhoodId}
              className="kit-area-item"
              data-testid={`kit-area-${area.neighbourhoodId}`}
            >
              <div className="kit-area-top">
                <div className="kit-area-name-group">
                  <h3 className="kit-area-name">{area.areaName}</h3>
                  <span className="kit-area-distance">{area.distanceKm.toFixed(1)} km</span>
                </div>
                <button
                  type="button"
                  className="kit-maps-link-btn"
                  data-testid={`open-maps-btn-${area.neighbourhoodId}`}
                  aria-label={`Open route from ${area.areaName} to ${officeName} in Google Maps`}
                  onClick={(ev) => onRequestOpenMaps(area, ev.currentTarget)}
                >
                  <span>Directions</span>
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} aria-hidden="true" />
                </button>
              </div>

              <div
                className="commute-bars"
                role="list"
                aria-label={`${area.areaName} weekday travel times`}
              >
                {bars.map((bar) => {
                  const isFastest = fastestMin !== null && bar.minutes === fastestMin;
                  return (
                    <div key={bar.key} className="commute-bar-row" role="listitem">
                      <span className="commute-bar-label">{bar.label}</span>
                      <div className="commute-bar-track" aria-hidden="true">
                        {bar.minutes !== null && (
                          <div
                            className={
                              isFastest
                                ? "commute-bar-fill commute-fill-fastest"
                                : "commute-bar-fill commute-fill-neutral"
                            }
                            style={{ width: `${barWidthPercent(bar.minutes, scaleMax)}%` }}
                          />
                        )}
                      </div>
                      <span
                        className={
                          isFastest ? "commute-bar-value commute-bar-value-fast" : "commute-bar-value"
                        }
                      >
                        {bar.minutes !== null ? `${bar.minutes} min` : "Check live"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="kit-area-oneline">{area.oneLine}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
