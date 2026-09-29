import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteGame, endGame, startGame } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState, useAdminStore } from "../state/store";
import { AdminStatusBadge, ConfirmDialog } from "../components/ui";

export function GamesPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const store = useAdminStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("ALL");
  const [roundId, setRoundId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (status === "loading") return <p role="status">Loading games…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={retry}>
          Retry
        </button>
      </div>
    );

  const teamName = (id: string) => state.teams.get(id)?.name ?? id;
  const fieldName = (id: string) => state.fields.get(id)?.name ?? id;
  const roundNum = (id: string) => state.rounds.get(id)?.number ?? "?";

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

  async function onDeleteConfirmed() {
    if (!deleteId) return;
    setPendingId(deleteId);
    try {
      await deleteGame(deleteId);
      setDeleteId(null);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setPendingId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const games = [...state.games.values()].filter((g) => {
    if (roundId !== "ALL" && g.roundId !== roundId) return false;
    if (statusFilter !== "ALL" && g.status !== statusFilter) return false;
    if (groupId !== "ALL") {
      const ga = state.teams.get(g.teamAId)?.groupId;
      const gb = state.teams.get(g.teamBId)?.groupId;
      if (ga !== groupId && gb !== groupId) return false;
    }
    if (!q) return true;
    return `${teamName(g.teamAId)} ${teamName(g.teamBId)} ${fieldName(g.fieldId)} Runde ${roundNum(g.roundId)}`.toLowerCase().includes(q);
  });

  return (
    <section aria-label="Manage games" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Spielverwaltung</div>
          <h1>Spiele</h1>
          <p className="muted">Spiele suchen, starten und zählen.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => navigate("/games/create")}>
          ＋ Spiel
        </button>
      </div>
      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <input className="search" placeholder="Team, Feld oder Runde …" aria-label="Spiele suchen" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select" aria-label="Gruppe filtern" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="ALL">Alle Gruppen</option>
            {[...state.groups.values()].map((g) => (
              <option key={g.groupId} value={g.groupId}>
                Gruppe {g.name}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Runde filtern" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
            <option value="ALL">Alle Runden</option>
            {[...state.rounds.values()]
              .sort((a, b) => a.number - b.number)
              .map((r) => (
                <option key={r.roundId} value={r.roundId}>
                  Runde {r.number}
                </option>
              ))}
          </select>
          <select className="select" aria-label="Status filtern" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Alle Status</option>
            <option value="SCHEDULED">Geplant</option>
            <option value="RUNNING">Live</option>
            <option value="FINISHED">Fertig</option>
          </select>
        </div>
        {actionError ? <p role="alert">{actionError}</p> : null}
        {games.length === 0 ? (
          <div className="empty">Keine Spiele. Lege oben ein neues Spiel an.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Spiel</th>
                  <th>Runde / Feld</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.gameId}>
                    <td>
                      <b>{teamName(g.teamAId)}</b>
                      <br />
                      {teamName(g.teamBId)}
                    </td>
                    <td>
                      Runde {roundNum(g.roundId)}
                      <br />
                      {fieldName(g.fieldId)}
                    </td>
                    <td>
                      <AdminStatusBadge status={g.status} />
                    </td>
                    <td>
                      <b>
                        {g.scoreA}:{g.scoreB}
                      </b>
                    </td>
                    <td>
                      <div className="actions">
                        {g.status !== "FINISHED" ? (
                          g.status === "RUNNING" ? (
                            <button type="button" className="btn primary" disabled={pendingId === g.gameId} onClick={() => navigate(`/games/${encodeURIComponent(g.gameId)}/score`)}>
                              {pendingId === g.gameId ? "…" : "Zählen"}
                            </button>
                          ) : (
                            <button type="button" className="btn primary" disabled={pendingId === g.gameId} onClick={() => void onStart(g.gameId)}>
                              {pendingId === g.gameId ? "Working…" : "Start"}
                            </button>
                          )
                        ) : null}
                        {g.status === "RUNNING" ? (
                          <button type="button" className="btn" disabled={pendingId === g.gameId} onClick={() => void onEnd(g.gameId)}>
                            Finish
                          </button>
                        ) : null}
                        <button type="button" className="btn" onClick={() => navigate(`/games/${encodeURIComponent(g.gameId)}`)}>
                          Öffnen
                        </button>
                        <button type="button" className="btn danger" disabled={pendingId === g.gameId} onClick={() => setDeleteId(g.gameId)}>
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deleteId ? (
        <ConfirmDialog
          title="Spiel löschen?"
          message="Dieses Spiel wird endgültig gelöscht."
          confirmLabel="Löschen"
          pending={pendingId === deleteId}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void onDeleteConfirmed()}
        />
      ) : null}
    </section>
  );
}
