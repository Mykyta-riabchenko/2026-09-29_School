import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";
import { AdminStatusBadge } from "../components/ui";

export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { status, error, retry } = useAdminData();
  const state = useAdminState();
  const navigate = useNavigate();
  const decoded = id ?? "";
  const game = decoded ? (state.games.get(decoded) ?? null) : null;

  if (status === "loading" && !game) return <p role="status">Loading game…</p>;
  if (status === "error" && !game)
    return (
      <div>
        <p role="alert">{error ?? "Could not load game."}</p>
        <button type="button" className="btn" onClick={retry}>
          Retry
        </button>
        <p>
          <Link to="/games">Back to games</Link>
        </p>
      </div>
    );
  if (!game) return <p role="alert">Game not found.</p>;

  return (
    <section aria-label="Game" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Spiel</div>
          <h1>
            {state.teams.get(game.teamAId)?.name ?? game.teamAId} vs {state.teams.get(game.teamBId)?.name ?? game.teamBId}
          </h1>
          <p>
            <Link to="/games" aria-label="Back to games" className="btn btn-sm">
              ← Alle Spiele
            </Link>
          </p>
        </div>
        {game.status !== "FINISHED" ? (
          <button type="button" className="btn primary" onClick={() => navigate(`/games/${encodeURIComponent(game.gameId)}/score`)}>
            Zählen öffnen
          </button>
        ) : null}
      </div>
      <div className="card">
        <div className="section-head">
          <h2>
            {game.scoreA} : {game.scoreB}
          </h2>
          <AdminStatusBadge status={game.status} />
        </div>
        <p className="muted">
          Field: {state.fields.get(game.fieldId)?.name ?? game.fieldId} · Round:{" "}
          {state.rounds.get(game.roundId) ? `Round ${state.rounds.get(game.roundId)!.number}` : game.roundId} · Referee:{" "}
          {state.teams.get(game.refereeTeamId)?.name ?? game.refereeTeamId}
        </p>
        <p style={{ marginTop: 12 }}>
          <Link className="btn" to={`/games/${encodeURIComponent(game.gameId)}/score`}>
            Open score control
          </Link>
        </p>
      </div>
    </section>
  );
}
