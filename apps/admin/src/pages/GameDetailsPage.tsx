import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { status, error, retry } = useAdminData();
  const state = useAdminState();
  const decoded = id ?? "";
  const game = decoded ? (state.games.get(decoded) ?? null) : null;
  if (status === "loading" && !game) return <p role="status">Loading game…</p>;
  if (status === "error" && !game)
    return (
      <div>
        <p role="alert">{error ?? "Could not load game."}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
        <p>
          <Link to="/games">Back to games</Link>
        </p>
      </div>
    );
  if (!game) return <p role="alert">Game not found.</p>;
  return (
    <section aria-label="Game">
      <Link to="/games" aria-label="Back to games">
        Back
      </Link>
      <h1>
        {state.teams.get(game.teamAId)?.name ?? game.teamAId} vs {state.teams.get(game.teamBId)?.name ?? game.teamBId}
      </h1>
      <p>
        {game.scoreA} : {game.scoreB} · {game.status}
      </p>
      <p>
        Field: {state.fields.get(game.fieldId)?.name ?? game.fieldId} · Round:{" "}
        {state.rounds.get(game.roundId) ? `Round ${state.rounds.get(game.roundId)!.number}` : game.roundId} · Referee:{" "}
        {state.teams.get(game.refereeTeamId)?.name ?? game.refereeTeamId}
      </p>
      <p>
        <Link to={`/games/${encodeURIComponent(game.gameId)}/score`}>Open score control</Link>
      </p>
    </section>
  );
}
