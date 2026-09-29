import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGames, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";

export function LeaderboardPage() {
  const store = useTournamentStore();
  const [rows, setRows] = useState<Array<{ id: string; name: string; wins: number; played: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [games, teams] = await Promise.all([getGames(), getTeams()]);
        if (c) return;
        store.setGames(games);
        store.setTeams(teams);
        const table = teams.map((t) => {
          let wins = 0;
          let played = 0;
          for (const g of games) {
            if (g.status !== "FINISHED") continue;
            if (g.teamAId !== t.teamId && g.teamBId !== t.teamId) continue;
            played += 1;
            if ((g.teamAId === t.teamId && g.scoreA > g.scoreB) || (g.teamBId === t.teamId && g.scoreB > g.scoreA)) wins += 1;
          }
          return { id: t.teamId, name: t.name, wins, played };
        });
        table.sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
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
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );
  return (
    <section aria-label="Leaderboard">
      <h1>Leaderboard</h1>
      {rows.length === 0 ? <p>No leaderboard entries yet.</p> : null}
      <ol>
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/teams/${encodeURIComponent(r.id)}`}>{r.name}</Link> · {r.wins} wins / {r.played} played
          </li>
        ))}
      </ol>
    </section>
  );
}
