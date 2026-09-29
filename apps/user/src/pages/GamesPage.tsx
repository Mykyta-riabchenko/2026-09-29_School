import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFields, getGames, getRounds, getTeams, getGroups } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";
import { statusLabel } from "../components/status";

export function GamesPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roundId, setRoundId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [games, teams, fields, rounds, groups] = await Promise.all([
          getGames(),
          getTeams(),
          getFields(),
          getRounds(),
          getGroups(),
        ]);
        if (cancelled) return;
        store.setGames(games);
        store.setTeams(teams);
        store.setFields(fields);
        store.setRounds(rounds);
        store.setGroups(groups);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const q = query.trim().toLowerCase();
  const games = [...state.games.values()].filter((g) => {
    if (roundId && g.roundId !== roundId) return false;
    if (!q) return true;
    const a = state.teams.get(g.teamAId)?.name ?? "";
    const b = state.teams.get(g.teamBId)?.name ?? "";
    return `${a} ${b}`.toLowerCase().includes(q);
  });

  if (loading) return <p>Loading games…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <section aria-label="Games">
      <h1>Games</h1>
      <input aria-label="Search teams" placeholder="Search teams..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <select aria-label="Filter by round" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
        <option value="">All rounds</option>
        {[...state.rounds.values()].map((r) => (
          <option key={r.roundId} value={r.roundId}>
            Round {r.number}
          </option>
        ))}
      </select>
      <ul>
        {games.map((g) => (
          <li key={g.gameId}>
            <Link to={`/games/${encodeURIComponent(g.gameId)}`}>
              {state.teams.get(g.teamAId)?.name ?? g.teamAId} {g.scoreA} : {g.scoreB}{" "}
              {state.teams.get(g.teamBId)?.name ?? g.teamBId} · {statusLabel(g.status)}
            </Link>
          </li>
        ))}
      </ul>
      {games.length === 0 ? <p>No games found.</p> : null}
    </section>
  );
}
