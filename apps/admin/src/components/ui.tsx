import { useEffect } from "react";
import type { Game } from "../../../../packages/contracts/src/index";

export function AdminStatusBadge({ status }: { status: Game["status"] }) {
  if (status === "RUNNING") return <span className="badge live">● LIVE</span>;
  if (status === "FINISHED") return <span className="badge finished">ABGESCHLOSSEN</span>;
  return <span className="badge scheduled">GEPLANT</span>;
}

// Accessible modal (v6 modal-back/modal, fixed: Esc + backdrop close,
// focus on open, no window.prompt/confirm).
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Accessible confirm dialog (replaces window.confirm).
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  pending,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="modal-back" role="presentation" onClick={onCancel}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="close" onClick={onCancel} aria-label="Abbrechen">
            ×
          </button>
        </div>
        <p className="muted">{message}</p>
        <div className="form-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={onCancel} disabled={pending}>
            Abbrechen
          </button>
          <button type="button" className="btn danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Wird gelöscht…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
