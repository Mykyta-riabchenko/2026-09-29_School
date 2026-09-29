import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGameById, getTeams, getFields, getRounds, getGroups } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";
import { statusLabel } from "../components/status";
import type { Game } from "../../../../packages/contracts/src/index";

export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  const state = useTournamentState();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    // useParams already decodes; keep raw id to avoid double-decode errors on `%`.
    const lookupId = id;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [g, teams, fields, rounds, groups] = await Promise.all([
          getGameById(lookupId),
          getTeams(),
          getFields(),
          getRounds(),
          getGroups(),
        ]);
        if (cancelled) return;
        setGame(g);
        store.setTeams(teams);
        store.setFields(fields);
        store.setRounds(rounds);
        store.setGroups(groups);
        store.upsertGame(g);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          const cached = store.getSnapshot().games.get(lookupId) ?? null;
          if (cached) {
            setGame(cached);
            setError(null);
          } else setError(e instanceof Error ? e.message : "Failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, store, attempt]);

  const live = game ? (state.games.get(game.gameId) ?? game) : null;
  if (loading) return <p role="status">Loading game…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
        <p>
          <Link to="/games">Back to games</Link>
        </p>
      </div>
    );
  if (!live) return <p role="status">Loading game…</p>;
  return (
    <section aria-label="Game details">
      <Link to="/games" aria-label="Back to games">
        Back to games
      </Link>
      <h1>
        {state.teams.get(live.teamAId)?.name ?? live.teamAId} vs {state.teams.get(live.teamBId)?.name ?? live.teamBId}
      </h1>
      <p>
        {live.scoreA} : {live.scoreB} · {statusLabel(live.status)}
      </p>
      <p>
        Field: {state.fields.get(live.fieldId)?.name ?? live.fieldId} · Round:{" "}
        {state.rounds.get(live.roundId) ? `Round ${state.rounds.get(live.roundId)!.number}` : live.roundId}
      </p>
    </section>
  );
}
