import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteGame, endGame, startGame } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState, useAdminStore } from "../state/store";

export function GamesPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const store = useAdminStore();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (status === "loading") return <p role="status">Loading games…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );

  const teamName = (id: string) => state.teams.get(id)?.name ?? id;

  async function onStart(id: string) {
    setActionError(null);
    setPendingId(id);
    try {
      const saved = await startGame(id);
      store.upsertGame(saved);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Start failed.");
    } finally {
      setPendingId(null);
    }
  }

  async function onEnd(id: string) {
    setActionError(null);
    setPendingId(id);
    try {
      const saved = await endGame(id);
      store.upsertGame(saved);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "End failed.");
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this game?")) return;
    setActionError(null);
    setPendingId(id);
    try {
      await deleteGame(id);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setPendingId(null);
    }
  }

  const games = [...state.games.values()];
  if (games.length === 0) {
    return (
      <section aria-label="Manage games">
        <h1>Games</h1>
        <button type="button" onClick={() => navigate("/games/create")}>
          Create game
        </button>
        <p>No games yet. Create the first game to get started.</p>
      </section>
    );
  }

  return (
    <section aria-label="Manage games">
      <h1>Games</h1>
      <button type="button" onClick={() => navigate("/games/create")}>
        Create game
      </button>
      {actionError ? <p role="alert">{actionError}</p> : null}
      <ul>
        {games.map((g) => (
          <li key={g.gameId}>
            {teamName(g.teamAId)} {g.scoreA}:{g.scoreB} {teamName(g.teamBId)} · {g.status} ·{" "}
            <Link to={`/games/${encodeURIComponent(g.gameId)}`}>Open</Link> ·{" "}
            <Link to={`/games/${encodeURIComponent(g.gameId)}/score`}>Score</Link> ·{" "}
            <button type="button" disabled={pendingId === g.gameId || g.status !== "SCHEDULED"} onClick={() => void onStart(g.gameId)}>
              {pendingId === g.gameId ? "Working…" : "Start"}
            </button>{" "}
            <button type="button" disabled={pendingId === g.gameId || g.status !== "RUNNING"} onClick={() => void onEnd(g.gameId)}>
              {pendingId === g.gameId ? "Working…" : "Finish"}
            </button>{" "}
            <button type="button" disabled={pendingId === g.gameId} onClick={() => void onDelete(g.gameId)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
