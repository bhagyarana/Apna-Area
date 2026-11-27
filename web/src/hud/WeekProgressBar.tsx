/**
 * Feature: Five-Step Week One Progress Bar (web/src/hud/WeekProgressBar.tsx)
 * Purpose: Provides keyboard-accessible 5-day mission navigation (Monday to Friday) using @ui-sdk/react Toolbar roving focus.
 * Inputs: Verified WeekPlan, active mission index, and mission selection callback.
 * Outputs: Smoked-acrylic 5-pill progress bar with tabular numbering.
 * Deliberately excludes: Hardcoded mission counts or mouse-only tabs.
 */
import type { JSX } from "react";
import { Toolbar, ToolbarButton } from "@ui-sdk/react/toolbar";
import type { WeekPlan } from "@apna-area/shared";

export interface WeekProgressBarProps {
  weekPlan: WeekPlan;
  activeMissionIndex: number;
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
 * Renders the 5-step Week One navigation track with Arrow-key roving focus.
 *
 * @param props - Active WeekPlan, selected mission index, and selection callback.
 * @returns Accessible horizontal toolbar of mission pills.
 */
export function WeekProgressBar({
  weekPlan,
  activeMissionIndex,
  onSelectMission,
}: WeekProgressBarProps): JSX.Element {
  return (
    <nav aria-label="Week One missions" className="week-bar-shell" data-testid="week-progress-bar">
      <Toolbar orientation="horizontal" loop className="week-bar-toolbar">
        {weekPlan.missions.map((mission, idx) => {
          const isActive = idx === activeMissionIndex;
          const shortDay = SHORT_DAY[mission.day] ?? mission.day.slice(0, 3);
          return (
            <ToolbarButton
              key={mission.id}
              type="button"
              className={isActive ? "week-step-pill week-step-pill-active" : "week-step-pill"}
              aria-current={isActive ? "step" : undefined}
              data-testid={`week-step-${idx + 1}`}
              onClick={() => onSelectMission(idx)}
            >
              <span className="week-step-num">{idx + 1}</span>
              <span className="week-step-day">{shortDay}</span>
            </ToolbarButton>
          );
        })}
      </Toolbar>
    </nav>
  );
}
