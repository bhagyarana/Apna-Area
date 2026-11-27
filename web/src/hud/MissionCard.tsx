/**
 * Feature: Smoked-Acrylic Week One Mission Card (web/src/hud/MissionCard.tsx)
 * Purpose: Presents the active mission's story context, verified Google Maps destination provenance, fictional NPC brief, and stop-by-stop navigation.
 * Inputs: Active WeekPlan, active mission index, verified office + place records, feature flags, and navigation callbacks.
 * Outputs: Compact smoked-acrylic mission HUD card with hover/focus/click place_id provenance disclosure.
 * Deliberately excludes: Unverified place claims, invented prices, or redundant week-level blurbs.
 */
import { useState, type JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Location01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import type { NpcRole, VerifiedPlace, WeekPlan } from "@apna-area/shared";
import { primeUserGestureAudioContext } from "../live/audioUnlock";

export interface MissionCardProps {
  weekPlan: WeekPlan;
  activeMissionIndex: number;
  office: VerifiedPlace;
  missionPlace: VerifiedPlace | undefined;
  replayed: boolean;
  enableVoiceNpcs: boolean;
  onSelectMission: (index: number) => void;
  onSwitchOffice: () => void;
  onStartVoiceMission?: (missionId: string) => void;
}

const ROLE_LABELS: Record<NpcRole, string> = {
  auto_driver: "Auto driver",
  darshini_owner: "Darshini counter host",
  pg_owner: "PG manager",
  transit_helper: "BMTC commuter",
  office_buddy: "Office teammate",
};

function haversineKmClient(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return (2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

/**
 * Renders the active Week One mission card with verified place provenance and stop controls.
 *
 * @param props - Active WeekPlan, selected mission index, resolved places, and callbacks.
 * @returns Accessible smoked-acrylic mission card.
 */
export function MissionCard({
  weekPlan,
  activeMissionIndex,
  office,
  missionPlace,
  replayed,
  enableVoiceNpcs,
  onSelectMission,
  onSwitchOffice,
  onStartVoiceMission,
}: MissionCardProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const showPlaceId = hovered || focused || pinned;

  const mission = weekPlan.missions[activeMissionIndex] ?? weekPlan.missions[0]!;
  const distanceKm = missionPlace
    ? haversineKmClient(office.lat, office.lng, missionPlace.lat, missionPlace.lng)
    : "0.0";
  const nextIndex = (activeMissionIndex + 1) % weekPlan.missions.length;
  const nextMission = weekPlan.missions[nextIndex]!;
  const showHoodSuffix =
    missionPlace &&
    !missionPlace.name.toLowerCase().includes(missionPlace.neighbourhood.toLowerCase());

  return (
    <section
      className="picker-card mission-card"
      aria-label={`Mission ${activeMissionIndex + 1}: ${mission.title}`}
      data-testid="mission-card"
    >
      {replayed && (
        <div className="replay-banner" role="status" data-testid="replayed-banner">
          Replayed from an earlier run
        </div>
      )}

      <div className="destination-header">
        <span className="meter-flag-pill">
          <svg
            className="meter-flag-svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 10.5V2M2.5 2.2H9.2L7.7 4.5L9.2 6.8H2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            STOP {activeMissionIndex + 1} OF 5 · {mission.day.toUpperCase()}
          </span>
        </span>
        <button
          type="button"
          className="change-office-btn"
          onClick={onSwitchOffice}
          data-testid="mission-switch-office-btn"
        >
          Switch office
        </button>
      </div>

      <h1 className="mission-title">{mission.title}</h1>

      {missionPlace && (
        <div className="mission-place-row">
          <div className="mission-place-inline">
            <span className="mission-place-main">
              <HugeiconsIcon icon={Location01Icon} size={15} aria-hidden="true" />
              <span>{missionPlace.name}</span>
              {showHoodSuffix && (
                <span className="mission-place-hood">· {missionPlace.neighbourhood}</span>
              )}
            </span>

            <button
              type="button"
              className="provenance-pill"
              data-testid="mission-provenance"
              aria-expanded={showPlaceId}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") {
                  setPinned(false);
                  setFocused(false);
                }
              }}
              onClick={() => setPinned((prev) => !prev)}
            >
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={13} aria-hidden="true" />
              <span>Verified · {distanceKm} km from office</span>
            </button>
          </div>

          {showPlaceId && (
            <div className="provenance-tooltip" role="status" data-testid="provenance-tooltip">
              <span>Place ID: {missionPlace.id}</span>
              <span>{missionPlace.shortAddress}</span>
            </div>
          )}
        </div>
      )}

      <p className="mission-why-story" data-testid="mission-why-matters">
        {mission.whyItMatters}
      </p>

      <div className="mission-objective-box">
        <div className="mission-npc-row">
          <span className="mission-npc-name">
            {mission.npcFirstName} · {ROLE_LABELS[mission.npcRole]}
          </span>
          <span className="mission-npc-fictional">Fictional character</span>
        </div>
        <p className="mission-objective-text">{mission.objective}</p>
      </div>

      <div className="mission-nav-row">
        <button
          type="button"
          className="mission-secondary-btn"
          disabled={activeMissionIndex === 0}
          onClick={() => onSelectMission(Math.max(0, activeMissionIndex - 1))}
          aria-label="Previous mission stop"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
          <span>Prev</span>
        </button>

        {enableVoiceNpcs && onStartVoiceMission ? (
          <>
            <button
              type="button"
              className="primary-cta-btn mission-primary-cta"
              onClick={() => {
                primeUserGestureAudioContext();
                onStartVoiceMission(mission.id);
              }}
              data-testid="start-mission-cta"
            >
              <HugeiconsIcon icon={Mic01Icon} size={16} aria-hidden="true" />
              <span>Talk with {mission.npcFirstName}</span>
            </button>
            <button
              type="button"
              className="mission-secondary-btn"
              onClick={() => onSelectMission(nextIndex)}
              aria-label={`Skip to ${nextMission.day}`}
              data-testid="next-mission-cta"
            >
              <span>Next</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="primary-cta-btn mission-primary-cta"
            onClick={() => onSelectMission(nextIndex)}
            data-testid="next-mission-cta"
          >
            <span>
              {activeMissionIndex < weekPlan.missions.length - 1
                ? `Next stop · ${nextMission.day}`
                : "Review from Monday"}
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
