import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGames, getGroups, getTeamById, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";
import { StatusBadge } from "../components/public-ui";
import { statusLabel } from "../components/status";
import type { Game, Team } from "../../../../packages/contracts/src/index";

export function TeamDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [groupName, setGroupName] = useState("");
  const [mine, setMine] = useState<Game[]>([]);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
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
        setMine(games.filter((g) => g.teamAId === t.teamId || g.teamBId === t.teamId));
        setTeamNames(new Map(allTeams.map((x) => [x.teamId, x.name])));
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
        <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
        <p>
          <Link to="/teams">Back to teams</Link>
        </p>
      </div>
    );
  if (!team) return <p role="status">Loading team…</p>;

  return (
    <section aria-label="Team details" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Team</div>
          <h1>{team.name}</h1>
          <p className="muted">
            {team.class} · Gruppe {groupName} · {mine.length} games · {statusLabel("SCHEDULED")}
          </p>
          <div className="team-actions">
            <Link to="/teams" aria-label="Back to teams" className="btn btn-sm">
              ← Alle Teams
            </Link>
            <Link to={`/tree?highlight=${encodeURIComponent(team.teamId)}`} className="btn btn-sm primary">
              Im Turnierbaum markieren →
            </Link>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="section-head">
          <h2>Spiele von {team.name}</h2>
          <small>{mine.length}</small>
        </div>
        <div className="schedule-list">
          {mine.length === 0 ? <div className="empty">Noch keine Spiele.</div> : null}
          {mine.map((g) => (
            <Link
              key={g.gameId}
              to={`/games/${encodeURIComponent(g.gameId)}`}
              className="schedule-item"
              style={{ textDecoration: "none" }}
            >
              <div className="schedule-round">
                {g.teamAId === team.teamId ? team.name : (teamNames.get(g.teamAId) ?? g.teamAId)} vs{" "}
                {g.teamBId === team.teamId ? team.name : (teamNames.get(g.teamBId) ?? g.teamBId)}
                <div className="schedule-sub">
                  {g.scoreA}:{g.scoreB}
                </div>
              </div>
              <div className="schedule-teams">
                <b>
                  {g.teamAId === team.teamId ? team.name : (teamNames.get(g.teamAId) ?? g.teamAId)}
                </b>
                <br />
                {g.teamBId === team.teamId ? team.name : (teamNames.get(g.teamBId) ?? g.teamBId)}
              </div>
              <div className="schedule-score">
                {g.scoreA}:{g.scoreB}
                <div style={{ marginTop: 5 }}>
                  <StatusBadge status={g.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeamDetailsStatus() {
  return statusLabel("SCHEDULED");
}
