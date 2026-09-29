import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGames, getGroups, getTeamById, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";
import { statusLabel } from "../components/status";
import type { Team } from "../../../../packages/contracts/src/index";

export function TeamDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [groupName, setGroupName] = useState("");
  const [record, setRecord] = useState("");
  useEffect(() => {
    if (!id) return;
    const decoded = decodeURIComponent(id);
    let c = false;
    (async () => {
      const [t, groups, games, allTeams] = await Promise.all([
        getTeamById(decoded),
        getGroups(),
        getGames(),
        getTeams(),
      ]);
      if (c) return;
      setTeam(t);
      setGroupName(groups.find((g) => g.groupId === t.groupId)?.name ?? t.groupId);
      store.setGroups(groups);
      store.setTeams(allTeams);
      store.setGames(games);
      const mine = games.filter((g) => g.teamAId === t.teamId || g.teamBId === t.teamId);
      setRecord(`${mine.length} games`);
    })();
    return () => {
      c = true;
    };
  }, [id, store]);
  if (!team) return <p>Loading team…</p>;
  return (
    <section aria-label="Team details">
      <Link to="/teams">Back</Link>
      <h1>{team.name}</h1>
      <p>
        {team.class} · {groupName} · {record}
      </p>
    </section>
  );
}

export function TeamDetailsStatus() {
  return statusLabel("SCHEDULED");
}
