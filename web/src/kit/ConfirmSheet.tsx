/**
 * Feature: Human-in-Control Focus-Trapped Confirm Sheet (web/src/kit/ConfirmSheet.tsx)
 * Purpose: Gates every external navigation (Google Maps route) and device file download (Survival Kit PNG) behind an explicit @ui-sdk/react AlertDialog.
 * Inputs: Open flag, eyebrow/title/description/targetBadge/labels, returnFocusEl, and confirm/cancel callbacks.
 * Outputs: Modal focus-trapped alertdialog (centered on desktop with Esc hint, flush docked bottom sheet on mobile).
 * Deliberately excludes: Auto-redirecting or closing silently on accidental backdrop clicks.
 */
import type { JSX } from "react";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@ui-sdk/react/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, Download01Icon, Location01Icon } from "@hugeicons/core-free-icons";

export interface ConfirmSheetProps {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  targetBadge: string;
  confirmLabel: string;
  confirmKind: "maps" | "download";
  cancelLabel?: string;
  returnFocusEl?: HTMLElement | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Renders an accessible @ui-sdk/react AlertDialog confirming any action that leaves the app or downloads a file.
 *
 * @param props - Dialog copy, scannable target badge, open state, trigger return element, and confirm/cancel handlers.
 * @returns Focus-trapped modal Confirm Sheet.
 */
export function ConfirmSheet({
  open,
  eyebrow,
  title,
  description,
  targetBadge,
  confirmLabel,
  confirmKind,
  cancelLabel = "Cancel",
  returnFocusEl,
  onConfirm,
  onCancel,
}: ConfirmSheetProps): JSX.Element {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <AlertDialogBackdrop className="confirm-backdrop" data-testid="confirm-sheet-backdrop" />
      <AlertDialogContent
        className="confirm-sheet"
        data-testid="confirm-sheet"
        finalFocus={returnFocusEl ?? "trigger"}
      >
        <div className="confirm-sheet-grabber" aria-hidden="true" />
        <div className="confirm-header-row">
          <span className="confirm-eyebrow">{eyebrow}</span>
          <span className="confirm-esc-hint" aria-hidden="true">
            Esc
          </span>
        </div>

        <AlertDialogTitle className="confirm-title" data-testid="confirm-sheet-title">
          {title}
        </AlertDialogTitle>

        <div className="confirm-target-chip" data-testid="confirm-sheet-target">
          <HugeiconsIcon
            icon={confirmKind === "maps" ? Location01Icon : Download01Icon}
            size={14}
            aria-hidden="true"
          />
          <span>{targetBadge}</span>
        </div>

        <AlertDialogDescription className="confirm-body" data-testid="confirm-sheet-body">
          {description}
        </AlertDialogDescription>

        <div className="confirm-actions">
          <AlertDialogClose
            className="confirm-cancel-btn"
            data-testid="confirm-sheet-cancel"
            value="cancel"
          >
            {cancelLabel}
          </AlertDialogClose>
          <AlertDialogClose
            className="primary-cta-btn confirm-primary-btn"
            data-testid="confirm-sheet-confirm"
            value="confirm"
            action={onConfirm}
          >
            <span>{confirmLabel}</span>
            <HugeiconsIcon
              icon={confirmKind === "maps" ? ArrowUpRight01Icon : Download01Icon}
              size={15}
              aria-hidden="true"
            />
          </AlertDialogClose>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
