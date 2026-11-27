/**
 * Feature: Root Topbar Chrome Cluster (web/src/hud/TopbarChrome.tsx)
 * Purpose: Renders the wordmark pill, 5-step WeekProgressBar, XP odometer, Phrasebook/Survival Kit trigger, Lyria sound toggle, Tune popover, and Health badge.
 * Inputs: Tour/kit/voice flags, WeekPlan, persisted PlayerPreferences, PublicConfigData, and action callbacks.
 * Outputs: Accessible single-row topbar header aligned on 40px smoked-acrylic pills.
 * Deliberately excludes: Map canvas or modal state.
 */
import type { JSX } from "react";
import type { BudgetBand, LanguageComfort, PublicConfigData, WeekPlan } from "@apna-area/shared";
import { AmbientMuteButton } from "../components/AmbientMuteButton";
import { HealthBadge } from "../components/HealthBadge";
import { TunePopover } from "../picker/TunePopover";
import type { PlayerPreferences } from "../state/sessionStore";
import { PhrasebookPill } from "./PhraseFlyCard";
import { WeekProgressBar } from "./WeekProgressBar";
import { XpCounter } from "./XpCounter";

export interface TopbarChromeProps {
  tourActive: boolean;
  kitOpen: boolean;
  inVoiceMission: boolean;
  weekReady: boolean;
  weekPlan: WeekPlan | null;
  activeMissionIndex: number;
  prefs: PlayerPreferences;
  totalStars: number;
  phrasePulse: boolean;
  canOpenKit: boolean;
  showXpHud: boolean;
  config: PublicConfigData;
  onSelectMission: (idx: number) => void;
  onToggleKit: () => void;
  onToggleMute: () => void;
  onChangeBudget: (band: BudgetBand) => void;
  onChangeLanguageComfort: (comfort: LanguageComfort) => void;
}

/**
 * Renders the Apna Area topbar utility row.
 *
 * @param props - Active HUD flags, player progress, runtime config, and callbacks.
 * @returns Accessible <header className="shell-topbar"> element.
 */
export function TopbarChrome({
  tourActive,
  kitOpen,
  inVoiceMission,
  weekReady,
  weekPlan,
  activeMissionIndex,
  prefs,
  totalStars,
  phrasePulse,
  canOpenKit,
  showXpHud,
  config,
  onSelectMission,
  onToggleKit,
  onToggleMute,
  onChangeBudget,
  onChangeLanguageComfort,
}: TopbarChromeProps): JSX.Element {
  return (
    <header className="shell-topbar">
      <div className="wordmark-pill" data-testid="wordmark">
        <span>Apna Area</span>
      </div>
      {!tourActive && !kitOpen && weekReady && weekPlan && (
        <WeekProgressBar
          weekPlan={weekPlan}
          activeMissionIndex={activeMissionIndex}
          completedMissions={prefs.missionStars}
          inVoiceMission={inVoiceMission}
          onSelectMission={onSelectMission}
        />
      )}
      <div className="topbar-actions">
        {showXpHud && <XpCounter totalXp={prefs.totalXp} totalStars={totalStars} />}
        {!tourActive && !kitOpen && config.enabledLanguages.includes("kn") && (
          <PhrasebookPill
            count={prefs.learnedPhraseIds.length}
            pulse={phrasePulse}
            kitActive={kitOpen}
            onOpenKit={canOpenKit ? onToggleKit : undefined}
          />
        )}
        {!tourActive && config.featureFlags.enableAmbientMusic && (
          <AmbientMuteButton muted={prefs.musicMuted} onToggle={onToggleMute} />
        )}
        {!tourActive && !kitOpen && (
          <TunePopover
            budgetBand={prefs.budgetBand}
            languageComfort={prefs.languageComfort}
            enabledLanguages={config.enabledLanguages}
            onChangeBudget={onChangeBudget}
            onChangeLanguageComfort={onChangeLanguageComfort}
          />
        )}
        {!kitOpen && <HealthBadge />}
      </div>
    </header>
  );
}
