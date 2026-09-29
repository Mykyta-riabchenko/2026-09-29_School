import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState } from "../../state/store";
import { formatScore } from "../../domain/game";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { GameStatusBadge } from "../../components/Badge/Badge";
import { Score } from "../../components/Score/Score";

export function AdminGameDetailsPage() {
  const { status } = useAdminData();
  const { gameId: rawId } = useParams<{ gameId: string }>();
  const state = useTournamentState();
  const game = rawId ? state.games.get(decodeURIComponent(rawId)) ?? null : null;

  if (status === "loading" && !game) {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin game">
        <LoadingState label="Loading game…" />
      </section>
    );
  }
  if (!game) {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin game">
        <ErrorState notFound message="Game not found." />
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin game">
      <header className="page-header">
        <Link to="/admin/games">← Back</Link>
        <GameStatusBadge status={game.status} />
      </header>
      <div className="page-content">
        <p className="text-body">
          {state.rounds.get(game.roundId) ? `Round ${state.rounds.get(game.roundId)!.number}` : "Game"} ·{" "}
          {state.fields.get(game.fieldId)?.name ?? game.fieldId}
        </p>
        <p className="text-body">
          {state.teams.get(game.teamAId)?.name ?? game.teamAId} {formatScore(game.scoreA)} : {formatScore(game.scoreB)}{" "}
          {state.teams.get(game.teamBId)?.name ?? game.teamBId}
        </p>
        <p className="text-body">
          Referee: {state.teams.get(game.refereeTeamId)?.name ?? game.refereeTeamId}
        </p>
        <Score scoreA={game.scoreA} scoreB={game.scoreB} />
        <Link to={`/admin/games/${encodeURIComponent(game.gameId)}/score`}>Open Score</Link>{" "}
        <Link to={`/admin/games/${encodeURIComponent(game.gameId)}/edit`}>Edit</Link>
      </div>
    </section>
  );
}
