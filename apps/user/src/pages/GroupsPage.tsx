import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGroups, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";

export function GroupsPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    (async () => {
      const [groups, teams] = await Promise.all([getGroups(), getTeams()]);
      if (c) return;
      store.setGroups(groups);
      store.setTeams(teams);
      setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [store]);
  if (loading) return <p>Loading groups…</p>;
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
