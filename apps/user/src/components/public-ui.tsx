// Shared v6 public UI helpers. Backend is source of truth; status comes
// from `status` only (SCHEDULED/RUNNING/FINISHED), never derived from scores.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFields, getGames, getGroups, getRounds, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";
import type { Game } from "../../../../packages/contracts/src/index";

export function StatusBadge({ status }: { status: Game["status"] }) {
  if (status === "RUNNING") return <span className="badge live">● LIVE</span>;
  if (status === "FINISHED") return <span className="badge finished">ABGESCHLOSSEN</span>;
  return <span className="badge scheduled">GEPLANT</span>;
}

export function statusText(status: Game["status"]): string {
  if (status === "RUNNING") return "Live-Spiel";
  if (status === "FINISHED") return "Spiel beendet";
  return "Geplantes Spiel";
}

// Load all public collections once (live socket keeps them fresh afterwards).
export function useTournamentData() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [games, teams, fields, rounds, groups] = await Promise.all([
          getGames(),
          getTeams(),
          getFields(),
          getRounds(),
          getGroups(),
        ]);
        if (cancelled) return;
        store.setGames(games);
        store.setTeams(teams);
        store.setFields(fields);
        store.setRounds(rounds);
        store.setGroups(groups);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, attempt]);

  return { state, loading, error, retry: () => setAttempt((a) => a + 1) };
}

export function teamNameOf(state: ReturnType<typeof useTournamentState>, id: string): string {
  return state.teams.get(id)?.name ?? "Unbekannt";
}
export function teamClassOf(state: ReturnType<typeof useTournamentState>, id: string): string {
  return state.teams.get(id)?.class ?? "";
}
export function fieldNameOf(state: ReturnType<typeof useTournamentState>, id: string): string {
  return state.fields.get(id)?.name ?? "Feld ?";
}
export function roundOf(state: ReturnType<typeof useTournamentState>, id: string) {
  return state.rounds.get(id);
}
export function groupNameOf(state: ReturnType<typeof useTournamentState>, id: string): string {
  return state.groups.get(id)?.name ?? "?";
}

// Fullscreen VS overlay (v6 vs-screen, fixed): dialog with Esc/backdrop close,
// semantic buttons, no hidden-close trap like the reference.
export function VsOverlay({ gameId, onClose }: { gameId: string | null; onClose: () => void }) {
  const { state } = useTournamentData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!gameId) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [gameId, onClose]);

  if (!gameId) return null;
  const g = state.games.get(gameId);
  if (!g) return null;
  const a = state.teams.get(g.teamAId);
  const b = state.teams.get(g.teamBId);
  const field = state.fields.get(g.fieldId);
  const round = state.rounds.get(g.roundId);
  const ref = state.teams.get(g.refereeTeamId);

  return (
    <div
      className="vs-screen open"
      role="dialog"
      aria-modal="true"
      aria-label={`${a?.name ?? g.teamAId} gegen ${b?.name ?? g.teamBId}`}
      onClick={onClose}
    >
      <div className="vs-left" aria-hidden="true" />
      <div className="vs-right" aria-hidden="true" />
      <div className="vs-net" aria-hidden="true" />
      <div className="vs-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vs-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <div className="vs-status">
          <span
            className={
              g.status === "RUNNING"
                ? "vs-status-pill is-live"
                : g.status === "FINISHED"
                  ? "vs-status-pill is-finished"
                  : "vs-status-pill is-scheduled"
            }
          >
            {g.status === "RUNNING" ? "● LIVE" : g.status === "FINISHED" ? "ABGESCHLOSSEN" : "GEPLANT"}
          </span>
        </div>
        <div className="vs-main">
          <div className="vs-team left">
            <div className="vs-name">{a?.name ?? "Unbekannt"}</div>
            <div className="vs-class">{a?.class ?? ""}</div>
            <div className="vs-score" aria-label={`Punkte ${a?.name ?? "A"}: ${g.scoreA}`}>
              {g.scoreA}
            </div>
          </div>
          <div className="vs-center">
            <div>
              <span className="vs-versus-pill">VS</span>
            </div>
            <div>
              <span className="vs-field">
                {field?.name ?? "Feld ?"} · Runde {round?.number ?? "?"}
              </span>
            </div>
          </div>
          <div className="vs-team right">
            <div className="vs-name">{b?.name ?? "Unbekannt"}</div>
            <div className="vs-class">{b?.class ?? ""}</div>
            <div className="vs-score" aria-label={`Punkte ${b?.name ?? "B"}: ${g.scoreB}`}>
              {g.scoreB}
            </div>
          </div>
        </div>
        <div className="vs-meta">
          {statusText(g.status)}
          {ref ? ` · Schiri: ${ref.name}` : ""} ·{" "}
          <button
            type="button"
            className="btn"
            style={{ minHeight: 32, padding: "4px 10px", marginLeft: 8 }}
            onClick={() => navigate(`/games/${encodeURIComponent(g.gameId)}`)}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
