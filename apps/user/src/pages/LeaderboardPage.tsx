import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGames, getGroups, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";
import { useTournamentData } from "../components/public-ui";

export function LeaderboardPage() {
  const store = useTournamentStore();
  const { state } = useTournamentData();
  const [rows, setRows] = useState<Array<{ id: string; name: string; wins: number; played: number; points: number; group: string; cls: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [games, teams, groups] = await Promise.all([getGames(), getTeams(), getGroups()]);
        if (c) return;
        store.setGames(games);
        store.setTeams(teams);
        store.setGroups(groups);
        const gById = new Map(groups.map((g) => [g.groupId, g.name]));
        const table = teams.map((t) => {
          let wins = 0;
          let played = 0;
          let points = 0;
          for (const g of games) {
            if (g.status !== "FINISHED") continue;
            if (g.teamAId !== t.teamId && g.teamBId !== t.teamId) continue;
            played += 1;
            points += g.teamAId === t.teamId ? g.scoreA : g.scoreB;
            if ((g.teamAId === t.teamId && g.scoreA > g.scoreB) || (g.teamBId === t.teamId && g.scoreB > g.scoreA)) wins += 1;
          }
          return { id: t.teamId, name: t.name, wins, played, points, group: gById.get(t.groupId) ?? t.groupId, cls: t.class };
        });
        table.sort((a, b) => b.wins - a.wins || b.points - a.points || a.name.localeCompare(b.name));
        setRows(table);
        setError(null);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load leaderboard.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [store, attempt]);

  if (loading) return <p role="status">Loading leaderboard…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );

  return (
    <section aria-label="Leaderboard" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Wertung</div>
          <h1>Leaderboard</h1>
        </div>
      </div>
      <div className="card">
        <div className="leaderboard">
          {rows.length === 0 ? <div className="empty">No leaderboard entries yet.</div> : null}
          {rows.map((r, i) => (
            <div className="leader" key={r.id}>
              <div className="rank">{i + 1}</div>
              <div>
                <div className="leader-name">
                  <Link to={`/teams/${encodeURIComponent(r.id)}`}>{r.name}</Link>
                </div>
                <div className="leader-sub">
                  Gruppe {r.group} · {r.cls} · {r.played} played · {r.points} Punkte
                </div>
              </div>
              <div className="points" aria-label={`${r.wins} wins, ${r.points} Punkte`}>
                {r.wins}
                <span className="points-sub">{r.points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
