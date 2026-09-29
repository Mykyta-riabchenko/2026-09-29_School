import { Link, useNavigate } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";
import { AdminStatusBadge } from "../components/ui";

// Administration dashboard (spec §4). This is not the public landing.
// Shows current round, live/upcoming games, free/occupied fields,
// groups, teams, quick management actions, game-generation entry.
export function DashboardPage() {
  const { status, error, retry } = useAdminData();
  const state = useAdminState();
  const navigate = useNavigate();

  if (status === "loading") return <p role="status">Loading dashboard…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error ?? "Could not load dashboard."}</p>
        <button type="button" className="btn" onClick={retry}>
          Retry
        </button>
      </div>
    );

  const games = [...state.games.values()];
  const rounds = [...state.rounds.values()].sort((a, b) => a.number - b.number);
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const liveGames = games.filter((g) => g.status === "RUNNING");
  const scheduled = games.filter((g) => g.status === "SCHEDULED").length;
  const finished = games.filter((g) => g.status === "FINISHED").length;
  const occupied = new Set(liveGames.map((g) => g.fieldId));
  const freeFields = [...state.fields.values()].filter((f) => !occupied.has(f.fieldId));
  const teamName = (id: string) => state.teams.get(id)?.name ?? id;
  const fieldName = (id: string) => state.fields.get(id)?.name ?? id;

  return (
    <section aria-label="Administration dashboard" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Turnierverwaltung</div>
          <h1>Dashboard</h1>
          <p className="muted">
            Schneller Überblick · Aktuelle Runde: {currentRound ? `Runde ${currentRound.number}` : "—"} · {liveGames.length} live ·{" "}
            {scheduled} geplant · {finished} fertig
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => navigate("/games/create")}>
          ＋ Spiel anlegen
        </button>
      </div>

      <div className="grid g4">
        <div className="stat">
          <b>{state.groups.size}</b>
          <span>Gruppen</span>
        </div>
        <div className="stat">
          <b>{state.teams.size}</b>
          <span>Teams</span>
        </div>
        <div className="stat">
          <b>{state.games.size}</b>
          <span>Spiele</span>
        </div>
        <div className="stat">
          <b>{state.fields.size}</b>
          <span>Felder</span>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Live-Spiele</h2>
            <small>
              <Link to="/games">Alle Spiele</Link>
            </small>
          </div>
          <div className="list">
            {liveGames.length === 0 ? <div className="empty">Keine Live-Spiele.</div> : null}
            {liveGames.map((g) => (
              <div className="list-item" key={g.gameId}>
                <div className="list-main">
                  <div className="list-title">
                    <Link to={`/games/${encodeURIComponent(g.gameId)}`}>
                      {teamName(g.teamAId)} <b>{g.scoreA}:{g.scoreB}</b> {teamName(g.teamBId)}
                    </Link>
                  </div>
                  <div className="list-sub">
                    {fieldName(g.fieldId)} · Runde {state.rounds.get(g.roundId)?.number ?? "?"} · <AdminStatusBadge status={g.status} />
                  </div>
                </div>
                <div className="actions">
                  <button type="button" className="btn primary" onClick={() => navigate(`/games/${encodeURIComponent(g.gameId)}/score`)}>
                    Zählen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Turnierstatus</h2>
          <p className="muted">SCHEDULED → RUNNING → FINISHED (Status kommt vom Backend)</p>
          <div className="grid g2" style={{ marginTop: 12 }}>
            <div className="stat">
              <b>{freeFields.length}</b>
              <span>Freie Felder</span>
            </div>
            <div className="stat">
              <b>{occupied.size}</b>
              <span>Belegte Felder</span>
            </div>
            <div className="stat">
              <b>{scheduled}</b>
              <span>Geplant</span>
            </div>
            <div className="stat">
              <b>{finished}</b>
              <span>Fertig</span>
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => navigate("/games")}>
              Spiele verwalten
            </button>
            <button type="button" className="btn" onClick={() => navigate("/rounds")}>
              Runden + Generieren
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
