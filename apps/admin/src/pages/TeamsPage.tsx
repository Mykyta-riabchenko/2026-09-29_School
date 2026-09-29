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

  if (status === "loading") return <p>Loading teams…</p>;
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
    try {
      await createTeam({ groupId, class: cls, name });
      setName("");
      setCls("");
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  return (
    <section aria-label="Manage teams">
      <h1>Teams</h1>
      <form onSubmit={(e) => void onCreate(e)}>
        <input aria-label="Team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input aria-label="Team class" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Class" />
        <select aria-label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Group</option>
          {[...state.groups.values()].map((g) => (
            <option key={g.groupId} value={g.groupId}>
              {g.name}
            </option>
          ))}
        </select>
        <button type="submit">Create</button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      <ul>
        {[...state.teams.values()].map((t) => (
          <li key={t.teamId}>
            {t.name} · {t.class} · {state.groups.get(t.groupId)?.name ?? t.groupId}{" "}
            <button
              type="button"
              onClick={() => {
                const next = window.prompt("Rename team", t.name);
                if (next) void updateTeam(t.teamId, { groupId: t.groupId, class: t.class, name: next }).then(() => refresh());
              }}
            >
              Rename
            </button>{" "}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete team?")) void deleteTeam(t.teamId).then(() => refresh());
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
