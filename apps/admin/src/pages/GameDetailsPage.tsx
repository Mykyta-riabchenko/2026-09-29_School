import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useAdminData();
  const state = useAdminState();
  const decoded = id ? decodeURIComponent(id) : "";
  const game = decoded ? (state.games.get(decoded) ?? null) : null;
  if (status === "loading" && !game) return <p>Loading game…</p>;
  if (!game) return <p>Game not found.</p>;
  return (
    <section aria-label="Game">
      <Link to="/games">Back</Link>
      <h1>
        {state.teams.get(game.teamAId)?.name ?? game.teamAId} vs {state.teams.get(game.teamBId)?.name ?? game.teamBId}
      </h1>
      <p>
        {game.scoreA} : {game.scoreB} · {game.status}
      </p>
      <p>
        <Link to={`/games/${encodeURIComponent(game.gameId)}/score`}>Open score control</Link>
      </p>
    </section>
  );
}
