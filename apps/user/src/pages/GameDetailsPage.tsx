import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getFields, getGameById, getGroups, getRounds, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";
import { StatusBadge, statusText } from "../components/public-ui";

// Game details as fullscreen VS page (v6 vs-screen idea, fixed: always
// closable, keyboard accessible, backed by the real API).
export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  const state = useTournamentState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const lookupId = id;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [g, teams, fields, rounds, groups] = await Promise.all([
          getGameById(lookupId),
          getTeams(),
          getFields(),
          getRounds(),
          getGroups(),
        ]);
        if (cancelled) return;
        store.setTeams(teams);
        store.setFields(fields);
        store.setRounds(rounds);
        store.setGroups(groups);
        store.upsertGame(g);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          const cached = store.getSnapshot().games.get(lookupId) ?? null;
          if (!cached) setError(e instanceof Error ? e.message : "Failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, store, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/games");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate]);

  const live = id ? (state.games.get(id) ?? null) : null;
  if (loading) return <p role="status">Loading game…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
        <p>
          <Link to="/games">Back to games</Link>
        </p>
      </div>
    );
  if (!live) return <p role="status">Loading game…</p>;

  const a = state.teams.get(live.teamAId);
  const b = state.teams.get(live.teamBId);
  const field = state.fields.get(live.fieldId);
  const round = state.rounds.get(live.roundId);
  const ref = state.teams.get(live.refereeTeamId);

  return (
    <div className="vs-screen open" role="dialog" aria-modal="true" aria-label={`${a?.name ?? live.teamAId} gegen ${b?.name ?? live.teamBId}`}>
      <div className="vs-left" aria-hidden="true" />
      <div className="vs-right" aria-hidden="true" />
      <div className="vs-net" aria-hidden="true" />
      <div className="vs-content">
        <button type="button" className="vs-close" onClick={() => navigate("/games")} aria-label="Zurück zu Spielen">
          ×
        </button>
        <div className="vs-status">
          <span
            className={
              live.status === "RUNNING"
                ? "vs-status-pill is-live"
                : live.status === "FINISHED"
                  ? "vs-status-pill is-finished"
                  : "vs-status-pill is-scheduled"
            }
          >
            {live.status === "RUNNING" ? "● LIVE" : live.status === "FINISHED" ? "ABGESCHLOSSEN" : "GEPLANT"}
          </span>
        </div>
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <StatusBadge status={live.status} />
        </div>
        <div className="vs-main">
          <div className="vs-team left">
            <div className="vs-name">{a?.name ?? live.teamAId}</div>
            <div className="vs-class">{a?.class ?? ""}</div>
            <div className="vs-score">{live.scoreA}</div>
          </div>
          <div className="vs-center">
            <div>
              <span className="vs-versus-pill">VS</span>
            </div>
            <div>
              <span className="vs-field">
                {field?.name ?? live.fieldId} · Runde {round?.number ?? live.roundId}
              </span>
            </div>
          </div>
          <div className="vs-team right">
            <div className="vs-name">{b?.name ?? live.teamBId}</div>
            <div className="vs-class">{b?.class ?? ""}</div>
            <div className="vs-score">{live.scoreB}</div>
          </div>
        </div>
        <div className="vs-meta">
          {statusText(live.status)}
          {ref ? ` · Schiri: ${ref.name}` : ""}
        </div>
      </div>
    </div>
  );
}
