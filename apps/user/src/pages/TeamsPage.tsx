import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGroups, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";

export function TeamsPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [teams, groups] = await Promise.all([getTeams(), getGroups()]);
        if (c) return;
        store.setTeams(teams);
        store.setGroups(groups);
        setError(null);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load teams.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [store, attempt]);
  if (loading) return <p role="status">Loading teams…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );
  const q = query.trim().toLowerCase();
  const visible = [...state.teams.values()].filter((t) => !q || t.name.toLowerCase().includes(q));
  return (
    <section aria-label="Teams">
      <h1>Teams</h1>
      <label>
        Search teams
        <input placeholder="Search teams..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {visible.length === 0 ? <p>No teams found.</p> : null}
      <ul>
        {visible.map((t) => (
          <li key={t.teamId}>
            <Link to={`/teams/${encodeURIComponent(t.teamId)}`}>{t.name}</Link> · {t.class} ·{" "}
            {state.groups.get(t.groupId)?.name ?? t.groupId}
          </li>
        ))}
      </ul>
    </section>
  );
}
