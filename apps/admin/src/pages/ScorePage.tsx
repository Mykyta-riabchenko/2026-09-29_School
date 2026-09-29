import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { endGame } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useScoreQueue } from "../hooks/useScoreQueue";
import { useAdminState, useAdminStore } from "../state/store";

// Score-control page (spec §6). Exists only in the admin app.
// Optimistic UI, serialized PUT queue, retry/reload handling,
// disabled controls after finish, explicit Finish Game confirmation.
// Status is read from backend `status`; FINISHED disables editing.
// v6 count-screen design (fixed: always closable, real backend).
export function ScorePage() {
  const { status, error, retry } = useAdminData();
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? "";
  const state = useAdminState();
  const store = useAdminStore();
  const queue = useScoreQueue(gameId);
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const game = gameId ? (state.games.get(gameId) ?? null) : null;
  const finished = game?.status === "FINISHED";
  const busy = queue.saving || queue.pendingCount > 0 || finishing;

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

  async function confirmFinish() {
    const current = gameId ? (state.games.get(gameId) ?? null) : null;
    if (!current) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const saved = await endGame(current.gameId);
      store.upsertGame(saved);
      setConfirming(false);
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : "Finish failed.");
    } finally {
      setFinishing(false);
    }
  }

  const teamA = state.teams.get(game.teamAId)?.name ?? game.teamAId;
  const teamB = state.teams.get(game.teamBId)?.name ?? game.teamBId;
  const field = state.fields.get(game.fieldId)?.name ?? game.fieldId;
  const round = state.rounds.get(game.roundId);
  const ref = state.teams.get(game.refereeTeamId)?.name ?? game.refereeTeamId;

  return (
    <div className="count-screen" role="dialog" aria-modal="true" aria-label={`Zählung ${teamA} gegen ${teamB}`}>
      <div className="count-inner">
        <div className="count-top">
          <Link to="/games" className="btn count-back" aria-label="Back to games">
            ← Zurück
          </Link>
          <span>
            Runde {round?.number ?? "?"} · {game.status}
            {game.status === "FINISHED" ? " · FINISHED" : ""}
          </span>
        </div>
        <div className="count-meta">
          <span className="live-pill">● LIVE · ZÄHLUNG</span>
          <div className="count-field">{field}</div>
          <div style={{ color: "#b9cde8" }}>Schiri: {ref}</div>
        </div>
        <div className="scoreboard">
          <div className="count-team">
            <div className="name" aria-label={`${teamA} score`}>
              {teamA}
            </div>
            <div className="score" aria-label={`${teamA} score`}>
              {queue.scoreA}
            </div>
          </div>
          <div className="count-vs">VS</div>
          <div className="count-team">
            <div className="name" aria-label={`${teamB} score`}>
              {teamB}
            </div>
            <div className="score" aria-label={`${teamB} score`}>
              {queue.scoreB}
            </div>
          </div>
        </div>
        <div className="count-controls">
          <button type="button" className="score-btn a-plus" aria-label="Increment Team A" disabled={finished || busy} onClick={queue.incrementA}>
            ＋1 Team A
          </button>
          <button type="button" className="score-btn b-plus" aria-label="Increment Team B" disabled={finished || busy} onClick={queue.incrementB}>
            ＋1 Team B
          </button>
          <button type="button" className="score-btn a-minus" aria-label="Decrement Team A" disabled={finished || busy} onClick={queue.decrementA}>
            −1 Team A
          </button>
          <button type="button" className="score-btn b-minus" aria-label="Decrement Team B" disabled={finished || busy} onClick={queue.decrementB}>
            −1 Team B
          </button>
          <div className="finish-zone">
            {finished ? (
              <p role="status" style={{ background: "rgba(255,255,255,.12)", borderColor: "rgba(255,255,255,.2)", color: "#fff" }}>
                Final score {queue.scoreA}:{queue.scoreB}. Score controls are disabled. Status: FINISHED.
              </p>
            ) : (
              <button type="button" className="finish-btn" disabled={confirming || finishing} onClick={() => setConfirming(true)}>
                ✓ Finish Game
              </button>
            )}
          </div>
        </div>
        {queue.pendingCount > 0 || queue.saving ? (
          <p role="status" style={{ background: "rgba(255,255,255,.12)", borderColor: "rgba(255,255,255,.2)", color: "#fff" }}>
            Saving… {queue.pendingCount} pending
          </p>
        ) : null}
        {queue.error ? (
          <div role="alert" style={{ marginTop: 12 }}>
            <p>Could not save score. {queue.error}</p>
            <button type="button" className="btn" onClick={queue.retry}>
              Retry
            </button>{" "}
            <button type="button" className="btn" onClick={queue.reload}>
              Reload Game
            </button>
          </div>
        ) : null}
        {confirming ? (
          <div role="dialog" aria-label="Finish this game?" aria-modal="true" className="modal-back" onClick={() => setConfirming(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h2 style={{ color: "var(--ink)" }}>Finish this game?</h2>
                <button type="button" className="close" onClick={() => setConfirming(false)} aria-label="Abbrechen">
                  ×
                </button>
              </div>
              <p className="muted">
                Finish this game? {teamA} {queue.scoreA} : {queue.scoreB} {teamB}
                {finishError ? ` ${finishError}` : ""}
              </p>
              <div className="form-actions">
                <button type="button" className="btn" disabled={finishing} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
                <button type="button" className="btn danger" disabled={finishing} onClick={() => void confirmFinish()}>
                  {finishing ? "Finishing…" : "Finish Game"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="count-foot">Punkte werden sofort gespeichert (optimistisch + Warteschlange).</div>
      </div>
    </div>
  );
}
