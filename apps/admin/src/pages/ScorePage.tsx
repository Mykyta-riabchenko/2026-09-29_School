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
export function ScorePage() {
  const { status } = useAdminData();
  const { id } = useParams<{ id: string }>();
  const gameId = id ? decodeURIComponent(id) : "";
  const state = useAdminState();
  const store = useAdminStore();
  const queue = useScoreQueue(gameId);
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const game = gameId ? (state.games.get(gameId) ?? null) : null;
  const finished = game?.status === "FINISHED";

  if (status === "loading" && !game) return <p>Loading game…</p>;
  if (!game) return <p>Game not found.</p>;

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

  return (
    <section aria-label="Score">
      <Link to="/games">Back</Link>
      <h1>
        {teamA} vs {teamB}
      </h1>
      <p>
        {queue.scoreA} : {queue.scoreB} · {game.status}
      </p>
      <div>
        <button type="button" aria-label="Decrement Team A" disabled={finished} onClick={queue.decrementA}>
          -A
        </button>{" "}
        <button type="button" aria-label="Increment Team A" disabled={finished} onClick={queue.incrementA}>
          +A
        </button>{" "}
        <button type="button" aria-label="Decrement Team B" disabled={finished} onClick={queue.decrementB}>
          -B
        </button>{" "}
        <button type="button" aria-label="Increment Team B" disabled={finished} onClick={queue.incrementB}>
          +B
        </button>
      </div>
      {finished ? <p>Final score. Score controls are disabled.</p> : <button type="button" onClick={() => setConfirming(true)}>Finish Game</button>}
      {queue.pendingCount > 0 || queue.saving ? <p role="status">Saving… {queue.pendingCount} pending</p> : null}
      {queue.error ? (
        <div role="alert">
          <p>
            Could not save score. {queue.error}
          </p>
          <button type="button" onClick={queue.retry}>
            Retry
          </button>{" "}
          <button type="button" onClick={queue.reload}>
            Reload Game
          </button>
        </div>
      ) : null}
      {confirming ? (
        <div role="dialog" aria-label="Finish this game?">
          <p>
            Finish this game? {teamA} {queue.scoreA} : {queue.scoreB} {teamB}
            {finishError ? ` ${finishError}` : ""}
          </p>
          <button type="button" disabled={finishing} onClick={() => setConfirming(false)}>
            Cancel
          </button>{" "}
          <button type="button" disabled={finishing} onClick={() => void confirmFinish()}>
            {finishing ? "Finishing…" : "Finish Game"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
