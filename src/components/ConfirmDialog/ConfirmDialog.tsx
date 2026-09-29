import type { ReactNode } from "react";
import { Button } from "../Button/Button";

// Destructive-action confirmation (shared design system modal pattern).
// Never delete immediately: Cancel is the safe default, the danger
// action is explicit. On 409 the backend message is shown inline so
// the conflict is explained instead of silently failing.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
  pending = false,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <div className="confirm-backdrop">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog__actions">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
