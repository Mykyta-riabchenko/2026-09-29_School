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

  useEffect(() => {
    if (!id) return;
    const decoded = decodeURIComponent(id);
    let cancelled = false;
    (async () => {
      try {
        const [g, teams, fields, rounds, groups] = await Promise.all([
          getGameById(decoded),
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
      } catch (e) {
        if (!cancelled) {
          const cached = store.getSnapshot().games.get(decoded) ?? null;
          if (cached) setGame(cached);
          else setError(e instanceof Error ? e.message : "Failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, store]);

  const live = game ? (state.games.get(game.gameId) ?? game) : null;
  if (error) return <p role="alert">{error}</p>;
  if (!live) return <p>Loading game…</p>;
  return (
    <section aria-label="Game details">
      <Link to="/games">Back to games</Link>
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
