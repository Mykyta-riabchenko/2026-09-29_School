import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGroups, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";

export function GroupsPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [groups, teams] = await Promise.all([getGroups(), getTeams()]);
        if (c) return;
        store.setGroups(groups);
        store.setTeams(teams);
        setError(null);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load groups.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [store, attempt]);
  if (loading) return <p role="status">Loading groups…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );
  const groups = [...state.groups.values()];
  if (groups.length === 0) {
    return (
      <section aria-label="Groups">
        <h1>Groups</h1>
        <p>No groups yet.</p>
      </section>
    );
  }
  return (
    <section aria-label="Groups">
      <h1>Groups</h1>
      <ul>
        {[...state.groups.values()].map((g) => (
          <li key={g.groupId}>
            <Link to={`/groups/${encodeURIComponent(g.groupId)}`}>{g.name}</Link> ·{" "}
            {[...state.teams.values()].filter((t) => t.groupId === g.groupId).length} teams
          </li>
        ))}
      </ul>
    </section>
  );
}
