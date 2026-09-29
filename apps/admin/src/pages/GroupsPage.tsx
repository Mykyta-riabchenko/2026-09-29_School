import { useState } from "react";
import { createGroup, deleteGroup, updateGroup } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function GroupsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [name, setName] = useState("");
  const [opError, setOpError] = useState<string | null>(null);

  if (status === "loading") return <p>Loading groups…</p>;
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
      await createGroup(name);
      setName("");
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  return (
    <section aria-label="Manage groups">
      <h1>Groups</h1>
      <form onSubmit={(e) => void onCreate(e)}>
        <input aria-label="Group name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New group" />
        <button type="submit">Create</button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      <ul>
        {[...state.groups.values()].map((g) => (
          <li key={g.groupId}>
            {g.name}{" "}
            <button
              type="button"
              onClick={() => {
                const next = window.prompt("Rename group", g.name);
                if (next) void updateGroup(g.groupId, next).then(() => refresh());
              }}
            >
              Rename
            </button>{" "}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete group?")) void deleteGroup(g.groupId).then(() => refresh());
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
