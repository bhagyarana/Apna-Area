/**
 * Feature: Five-Step Week One Progress Bar (web/src/hud/WeekProgressBar.tsx)
 * Purpose: Provides keyboard-accessible 5-day mission navigation (Monday to Friday) using @ui-sdk/react Toolbar roving focus.
 * Inputs: Verified WeekPlan, active mission index, completed mission stars map, and mission selection callback.
 * Outputs: Smoked-acrylic 5-pill progress bar with non-colour check cues for completed stops and pink active pill.
 * Deliberately excludes: Colour-only completion state or mouse-only tabs.
 */
import type { JSX } from "react";
import { Toolbar, ToolbarButton } from "@ui-sdk/react/toolbar";
import type { WeekPlan } from "@apna-area/shared";

export interface WeekProgressBarProps {
  weekPlan: WeekPlan;
  activeMissionIndex: number;
  completedMissions?: Readonly<Record<string, 1 | 2 | 3>>;
  inVoiceMission?: boolean;
  onSelectMission: (index: number) => void;
}

const SHORT_DAY: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

/**
 * Renders the 5-step Week One navigation track with Arrow-key roving focus and accessible completion state.
 *
 * @param props - Active WeekPlan, selected mission index, completed mission map, and selection callback.
 * @returns Accessible horizontal toolbar of mission pills.
 */
export function WeekProgressBar({
  weekPlan,
  activeMissionIndex,
  completedMissions = {},
  inVoiceMission = false,
  onSelectMission,
}: WeekProgressBarProps): JSX.Element {
  return (
    <nav
      aria-label="Week One missions"
      className={inVoiceMission ? "week-bar-shell week-bar-in-mission" : "week-bar-shell"}
      data-testid="week-progress-bar"
    >
      <Toolbar orientation="horizontal" loop className="week-bar-toolbar">
        {weekPlan.missions.map((mission, idx) => {
          const isActive = idx === activeMissionIndex;
          const earnedStars = completedMissions[mission.id];
          const isDone = Boolean(earnedStars);
          const shortDay = SHORT_DAY[mission.day] ?? mission.day.slice(0, 3);
          const pillClass = isActive
            ? "week-step-pill week-step-pill-active"
            : isDone
              ? "week-step-pill week-step-pill-done"
              : "week-step-pill";
          const ariaLabel = isDone
            ? `Stop ${idx + 1}, ${mission.day}, completed with ${earnedStars} of 3 stars`
            : `Stop ${idx + 1}, ${mission.day}`;
          return (
            <ToolbarButton
              key={mission.id}
              type="button"
              className={pillClass}
              aria-current={isActive ? "step" : undefined}
              aria-label={ariaLabel}
              data-testid={`week-step-${idx + 1}`}
              onClick={() => onSelectMission(idx)}
            >
              <span className="week-step-num" aria-hidden="true">
                {isDone && !isActive ? "✓" : idx + 1}
              </span>
              <span className="week-step-day" aria-hidden="true">{shortDay}</span>
            </ToolbarButton>
          );
        })}
      </Toolbar>
    </nav>
  );
}
