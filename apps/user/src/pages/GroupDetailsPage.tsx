import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGroupById, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";
import type { Group, Team } from "../../../../packages/contracts/src/index";

export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    if (!id) return;
    const decoded = decodeURIComponent(id);
    let c = false;
    (async () => {
      const [g, all] = await Promise.all([getGroupById(decoded), getTeams()]);
      if (c) return;
      setGroup(g);
      setTeams(all.filter((t) => t.groupId === g.groupId));
      store.setGroups([g]);
      store.setTeams(all);
    })();
    return () => {
      c = true;
    };
  }, [id, store]);
  if (!group) return <p>Loading group…</p>;
  return (
    <section aria-label="Group details">
      <Link to="/groups">Back</Link>
      <h1>{group.name}</h1>
      <ul>
        {teams.map((t) => (
          <li key={t.teamId}>
            <Link to={`/teams/${encodeURIComponent(t.teamId)}`}>{t.name}</Link> · {t.class}
          </li>
        ))}
      </ul>
    </section>
  );
}
