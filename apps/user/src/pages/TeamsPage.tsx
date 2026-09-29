import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGroups, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";

export function TeamsPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let c = false;
    (async () => {
      const [teams, groups] = await Promise.all([getTeams(), getGroups()]);
      if (c) return;
      store.setTeams(teams);
      store.setGroups(groups);
      setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [store]);
  if (loading) return <p>Loading teams…</p>;
  const q = query.trim().toLowerCase();
  const visible = [...state.teams.values()].filter((t) => !q || t.name.toLowerCase().includes(q));
  return (
    <section aria-label="Teams">
      <h1>Teams</h1>
      <input aria-label="Search teams" placeholder="Search teams..." value={query} onChange={(e) => setQuery(e.target.value)} />
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
