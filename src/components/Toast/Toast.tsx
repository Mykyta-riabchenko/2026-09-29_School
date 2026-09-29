import { useCallback, useEffect, useState } from "react";

// Toast notifications (shared design system feedback pattern).
// Usage: showToast("Game saved", "The score was confirmed.") renders a
// floating toast for ~3s. Mount <Toaster/> once near the app shell.

export interface ToastItem {
  id: number;
  title: string;
  message?: string;
  error?: boolean;
}

let nextId = 1;
type Listener = (items: ToastItem[]) => void;
const listeners = new Set<Listener>();
let items: ToastItem[] = [];

function emit() {
  for (const l of listeners) l([...items]);
}

export function showToast(title: string, message?: string, error = false) {
  const id = nextId++;
  items = [...items, { id, title, message, error }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 3200);
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>(items);
  useEffect(() => {
    const listener = (next: ToastItem[]) => setToasts(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const dismiss = useCallback((id: number) => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={t.error ? "toast toast--error" : "toast"}>
          <div aria-hidden="true">{t.error ? "!" : "✓"}</div>
          <div>
            <strong>{t.title}</strong>
            {t.message ? <span>{t.message}</span> : null}
          </div>
          <button
            type="button"
            className="text-action"
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
