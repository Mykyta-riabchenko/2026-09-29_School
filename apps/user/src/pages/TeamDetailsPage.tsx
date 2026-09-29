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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    // useParams already decodes; use raw id to avoid double-decode errors.
    const lookupId = id;
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [t, groups, games, allTeams] = await Promise.all([
          getTeamById(lookupId),
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
        setError(null);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load team.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id, store, attempt]);
  if (loading) return <p role="status">Loading team…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
        <p>
          <Link to="/teams">Back to teams</Link>
        </p>
      </div>
    );
  if (!team) return <p role="status">Loading team…</p>;
  return (
    <section aria-label="Team details">
      <Link to="/teams" aria-label="Back to teams">
        Back
      </Link>
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
