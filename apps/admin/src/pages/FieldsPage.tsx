import { useState } from "react";
import { createField, deleteField, updateField } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function FieldsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [name, setName] = useState("");
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === "loading") return <p role="status">Loading fields…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setOpError("Field name is required.");
      return;
    }
    setSaving(true);
    try {
      await createField(trimmed);
      setName("");
      setOpError(null);
      await refresh();
    } catch (err: unknown) {
      setOpError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onRename(id: string, current: string) {
    const next = window.prompt("Rename field", current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      setOpError("Field name is required.");
      return;
    }
    try {
      await updateField(id, trimmed);
      setOpError(null);
      await refresh();
    } catch (err: unknown) {
      setOpError(err instanceof Error ? err.message : "Rename failed.");
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete field?")) return;
    try {
      await deleteField(id);
      setOpError(null);
      await refresh();
    } catch (err: unknown) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const fields = [...state.fields.values()];

  return (
    <section aria-label="Manage fields">
      <h1>Fields</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onCreate(e);
        }}
      >
        <input aria-label="Field name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New field" required />
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      {fields.length === 0 ? <p>No fields yet. Create the first field above.</p> : null}
      <ul>
        {fields.map((f) => {
          const live = [...state.games.values()].find((g) => g.fieldId === f.fieldId && g.status === "RUNNING");
          return (
            <li key={f.fieldId}>
              {f.name} · {live ? `Occupied (${live.scoreA}:${live.scoreB})` : "Free"}{" "}
              <button type="button" onClick={() => void onRename(f.fieldId, f.name)}>
                Rename
              </button>{" "}
              <button type="button" onClick={() => void onDelete(f.fieldId)}>
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
