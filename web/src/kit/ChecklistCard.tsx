/**
 * Feature: Survival Kit "Your First-Week Checklist" Card (web/src/kit/ChecklistCard.tsx)
 * Purpose: Renders 6 hairline-divided checklist items tailored to budgetBand, grouping active tasks above completed tasks for clean top-down scan rhythm.
 * Inputs: ChecklistItem array, checkedChecklistIds array, budgetBand, mobile visibility flag, and onToggleItem callback.
 * Outputs: Accessible un-boxed checklist column persisted in localStorage.
 * Deliberately excludes: Nested sub-card borders or server accounts.
 */
import type { JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import type { BudgetBand, ChecklistItem } from "@apna-area/shared";

export interface ChecklistCardProps {
  items: readonly ChecklistItem[];
  checkedIds: readonly string[];
  budgetBand: BudgetBand;
  mobileHidden?: boolean;
  onToggleItem: (itemId: string) => void;
}

const STYLE_LABELS: Record<BudgetBand, string> = {
  "15_20k": "PG & co-living checks",
  "20_30k": "Shared flat checks",
  "30k_plus": "Gated society checks",
};

/**
 * Renders the 6-item interactive Week One checklist with active tasks grouped above completed tasks.
 *
 * @param props - Tailored checklist items, checked IDs, budget band, mobile tab visibility, and toggle callback.
 * @returns Accessible Checklist column card.
 */
export function ChecklistCard({
  items,
  checkedIds,
  budgetBand,
  mobileHidden = false,
  onToggleItem,
}: ChecklistCardProps): JSX.Element {
  const remaining = items.filter((item) => !checkedIds.includes(item.id));
  const completed = items.filter((item) => checkedIds.includes(item.id));

  const handleToggleAndFocus = (itemId: string): void => {
    onToggleItem(itemId);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-testid="kit-check-${itemId}"]`)?.focus();
    });
  };

  const renderRow = (item: ChecklistItem, checked: boolean): JSX.Element => (
    <button
      key={item.id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={checked ? "kit-check-row kit-check-row-done" : "kit-check-row"}
      onClick={() => handleToggleAndFocus(item.id)}
      data-testid={`kit-check-${item.id}`}
    >
      <span
        className={checked ? "kit-check-box kit-check-box-done" : "kit-check-box"}
        aria-hidden="true"
      >
        {checked && <HugeiconsIcon icon={Tick02Icon} size={12} />}
      </span>
      <span className="kit-check-copy">
        <span className="kit-check-label">{item.label}</span>
        {!checked && <span className="kit-check-detail">{item.detail}</span>}
      </span>
    </button>
  );

  return (
    <section
      className={mobileHidden ? "kit-card kit-col-mobile-hidden" : "kit-card"}
      aria-labelledby="kit-checklist-heading"
      data-testid="kit-checklist-card"
    >
      <div className="kit-card-header">
        <div>
          <h2 id="kit-checklist-heading" className="kit-card-title">
            Your first-week checklist
          </h2>
          <p className="kit-card-sub">{STYLE_LABELS[budgetBand]} · Saved in browser</p>
        </div>
        <span className="kit-card-meta" data-testid="kit-checklist-progress">
          {completed.length} of {items.length} ready
        </span>
      </div>

      <div className="kit-divider-list" role="group" aria-label="First-week tasks">
        {remaining.length > 0 && (
          <div className="kit-group-block">
            <span className="kit-group-label">To do · {remaining.length}</span>
            {remaining.map((item) => renderRow(item, false))}
          </div>
        )}
        {completed.length > 0 && (
          <div className="kit-group-block">
            <span className="kit-group-label kit-group-label-teal">
              Completed · {completed.length}
            </span>
            {completed.map((item) => renderRow(item, true))}
          </div>
        )}
      </div>
    </section>
  );
}
