import { useState } from "react";
import { createTeam, deleteTeam, updateTeam } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function TeamsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");
  const [groupId, setGroupId] = useState("");
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === "loading") return <p role="status">Loading teams…</p>;
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
    if (!name.trim() || !cls.trim() || !groupId) {
      setOpError("Name, class and group are required.");
      return;
    }
    setSaving(true);
    try {
      await createTeam({ groupId, class: cls.trim(), name: name.trim() });
      setName("");
      setCls("");
      setGroupId("");
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onRename(teamId: string, currentName: string, currentGroupId: string, currentClass: string) {
    const next = window.prompt("Rename team", currentName);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      setOpError("Team name is required.");
      return;
    }
    try {
      await updateTeam(teamId, { groupId: currentGroupId, class: currentClass, name: trimmed });
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Rename failed.");
    }
  }

  async function onDelete(teamId: string) {
    if (!window.confirm("Delete team?")) return;
    try {
      await deleteTeam(teamId);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const teams = [...state.teams.values()];

  return (
    <section aria-label="Manage teams">
      <h1>Teams</h1>
      <form onSubmit={(e) => void onCreate(e)}>
        <input aria-label="Team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        <input aria-label="Team class" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Class" required />
        <select aria-label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
          <option value="">Group</option>
          {[...state.groups.values()].map((g) => (
            <option key={g.groupId} value={g.groupId}>
              {g.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      {teams.length === 0 ? <p>No teams yet. Create the first team above.</p> : null}
      <ul>
        {teams.map((t) => (
          <li key={t.teamId}>
            {t.name} · {t.class} · {state.groups.get(t.groupId)?.name ?? t.groupId}{" "}
            <button type="button" onClick={() => void onRename(t.teamId, t.name, t.groupId, t.class)}>
              Rename
            </button>{" "}
            <button type="button" onClick={() => void onDelete(t.teamId)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
