import { useState } from "react";
import { createGroup, deleteGroup, updateGroup } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function GroupsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [name, setName] = useState("");
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === "loading") return <p role="status">Loading groups…</p>;
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
      setOpError("Group name is required.");
      return;
    }
    setSaving(true);
    try {
      await createGroup(trimmed);
      setName("");
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onRename(id: string, current: string) {
    const next = window.prompt("Rename group", current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      setOpError("Group name is required.");
      return;
    }
    try {
      await updateGroup(id, trimmed);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Rename failed.");
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete group?")) return;
    try {
      await deleteGroup(id);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const groups = [...state.groups.values()];

  return (
    <section aria-label="Manage groups">
      <h1>Groups</h1>
      <form onSubmit={(e) => void onCreate(e)}>
        <input aria-label="Group name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New group" required />
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      {groups.length === 0 ? <p>No groups yet. Create the first group above.</p> : null}
      <ul>
        {groups.map((g) => (
          <li key={g.groupId}>
            {g.name}{" "}
            <button type="button" onClick={() => void onRename(g.groupId, g.name)}>
              Rename
            </button>{" "}
            <button type="button" onClick={() => void onDelete(g.groupId)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
