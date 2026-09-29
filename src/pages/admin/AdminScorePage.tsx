import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../../features/admin/useAdminData";
import { useScoreQueue } from "../../features/admin/scoreQueue";
import { useTournamentState, useTournamentStore } from "../../state/store";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { Badge, GameStatusBadge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { Score } from "../../components/Score/Score";
import { showToast } from "../../components/Toast/Toast";
import { useLiveStatus } from "../../live/LiveProvider";
import { finishTeacherGame } from "../../api/teacher/games";

// Dedicated score page (admin doc §9–§11): large touch-friendly
// + / − controls for phone, tablet, laptop, desktop and large screens.
// Optimistic UI + serialized PUT queue (never parallel PUTs for one
// game); failed ops stay visible with retry/reload (admin doc §24).
// Finishing uses the recommended POST .../finish lifecycle endpoint
// (admin doc §13) with confirmation; after finish the controls are
// disabled and the final score stays visible.
export function AdminScorePage() {
  const { status } = useAdminData();
  const { gameId: rawId } = useParams<{ gameId: string }>();
  const gameId = rawId ? decodeURIComponent(rawId) : "";
  const state = useTournamentState();
  const store = useTournamentStore();
  const live = useLiveStatus();
  const queue = useScoreQueue(gameId);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const game = gameId ? (state.games.get(gameId) ?? null) : null;
  const finished = game?.status === "COMPLETED";

  if (status === "loading" && !game) {
    return (
      <section className="page page--with-bottom-nav" aria-label="Score">
        <LoadingState label="Loading game…" />
      </section>
    );
  }
  if (!game) {
    return (
      <section className="page page--with-bottom-nav" aria-label="Score">
        <ErrorState notFound message="Game not found." />
      </section>
    );
  }

  async function confirmFinish() {
    if (!game) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const saved = await finishTeacherGame(game.gameId);
      store.upsertGame(saved);
      showToast("Game finished", "The final score was saved.");
      setConfirmingFinish(false);
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : "Finish failed.");
    } finally {
      setFinishing(false);
    }
  }

  const teamA = state.teams.get(game.teamAId);
  const teamB = state.teams.get(game.teamBId);
  const referee = state.teams.get(game.refereeTeamId);
  const field = state.fields.get(game.fieldId);
  const round = state.rounds.get(game.roundId);

  return (
    <section className="page page--with-bottom-nav" aria-label="Score">
      <header className="page-header">
        <Link to="/admin/games">← Back</Link>
        <GameStatusBadge status={game.status} />
      </header>
      <div className="page-content">
        <div className="score-board">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
            <div>
              <strong>{round ? `Round ${round.number}` : "Game"}</strong>
              <div className="muted small">
                {field?.name ?? game.fieldId} · Referee: {referee?.name ?? game.refereeTeamId}
              </div>
            </div>
            <Badge variant="neutral">Game #{game.gameId}</Badge>
          </div>
          <div className="score-grid">
            <div className="team-score">
              <div className="team-name">{teamA?.name ?? game.teamAId}</div>
              <div className="score" aria-label={`${teamA?.name ?? "Team A"} score`}>
                {queue.scoreA}
              </div>
              <div className="score-controls">
                <button
                  type="button"
                  className="score-button"
                  aria-label="Decrement Team A"
                  disabled={finished}
                  onClick={queue.decrementA}
                >
                  −
                </button>
                <button
                  type="button"
                  className="score-button"
                  aria-label="Increment Team A"
                  disabled={finished}
                  onClick={queue.incrementA}
                >
                  +
                </button>
              </div>
            </div>
            <div className="vs">VS</div>
            <div className="team-score">
              <div className="team-name">{teamB?.name ?? game.teamBId}</div>
              <div className="score" aria-label={`${teamB?.name ?? "Team B"} score`}>
                {queue.scoreB}
              </div>
              <div className="score-controls">
                <button
                  type="button"
                  className="score-button"
                  aria-label="Decrement Team B"
                  disabled={finished}
                  onClick={queue.decrementB}
                >
                  −
                </button>
                <button
                  type="button"
                  className="score-button"
                  aria-label="Increment Team B"
                  disabled={finished}
                  onClick={queue.incrementB}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          {finished ? (
            <p className="text-body">Final score. Score controls are disabled.</p>
          ) : (
            <div style={{ marginTop: 16 }}>
              <Button
                variant="primary"
                onClick={() => { setFinishError(null); setConfirmingFinish(true); }}
              >
                Finish Game
              </Button>
            </div>
          )}
          {queue.pendingCount > 0 || queue.saving ? (
            <p className="text-body" role="status">
              Saving… {queue.pendingCount} pending
            </p>
          ) : null}
          {queue.error ? (
            <div role="alert">
              <p className="text-body">
                Could not save score. The change was not confirmed by the
                server. {queue.error}
              </p>
              <Button variant="secondary" size="sm" onClick={queue.retry}>
                Retry
              </Button>{" "}
              <Button variant="secondary" size="sm" onClick={queue.reload}>
                Reload Game
              </Button>
            </div>
          ) : null}
          <div style={{ marginTop: 12 }}>
            <Score scoreA={queue.scoreA} scoreB={queue.scoreB} />
          </div>
          <p className="muted small">
            {live.status === "connected" ? "Live" : "Not live"} · confirmed by
            server, pending taps kept on top
          </p>
        </div>
      </div>
      {confirmingFinish ? (
        <ConfirmDialog
          title="Finish this game?"
          message={`${teamA?.name ?? game.teamAId} ${queue.scoreA} : ${queue.scoreB} ${teamB?.name ?? game.teamBId}${finishError ? ` ${finishError}` : ""}`}
          onCancel={() => { if (!finishing) setConfirmingFinish(false); }}
          onConfirm={() => void confirmFinish()}
          pending={finishing}
          confirmLabel="Finish Game"
        />
      ) : null}
    </section>
  );
}
