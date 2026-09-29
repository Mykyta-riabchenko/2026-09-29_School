import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGames, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";

export function LeaderboardPage() {
  const store = useTournamentStore();
  const [rows, setRows] = useState<Array<{ id: string; name: string; wins: number; played: number }>>([]);
  useEffect(() => {
    let c = false;
    (async () => {
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
    })();
    return () => {
      c = true;
    };
  }, [store]);
  return (
    <section aria-label="Leaderboard">
      <h1>Leaderboard</h1>
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
