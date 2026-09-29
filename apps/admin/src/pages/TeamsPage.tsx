import { useMemo, useState } from "react";
import { createTeam, deleteTeam, updateTeam } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";
import { ConfirmDialog, Modal } from "../components/ui";

export function TeamsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [modal, setModal] = useState<{ id: string | null; name: string; cls: string; groupId: string } | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.teams.values()].filter(
      (t) => (!q || `${t.name} ${t.class}`.toLowerCase().includes(q)) && (groupFilter === "ALL" || t.groupId === groupFilter),
    );
  }, [state, query, groupFilter]);

  if (status === "loading") return <p role="status">Loading teams…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={retry}>
          Retry
        </button>
      </div>
    );

  async function onSave() {
    if (!modal) return;
    if (!modal.name.trim() || !modal.cls.trim() || !modal.groupId) {
      setOpError("Name, class and group are required.");
      return;
    }
    setSaving(true);
    try {
      if (modal.id) await updateTeam(modal.id, { groupId: modal.groupId, class: modal.cls.trim(), name: modal.name.trim() });
      else await createTeam({ groupId: modal.groupId, class: modal.cls.trim(), name: modal.name.trim() });
      setModal(null);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!deleteId) return;
    try {
      await deleteTeam(deleteId);
      setDeleteId(null);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const defaultGroup = [...state.groups.values()][0]?.groupId ?? "";

  return (
    <section aria-label="Manage teams" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">CRUD</div>
          <h1>Teams</h1>
          <p className="muted">Teams als kompakte Liste verwalten.</p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => { setOpError(null); setModal({ id: null, name: "", cls: "", groupId: defaultGroup }); }}
        >
          ＋ Team
        </button>
      </div>
      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <input className="search" placeholder="Team oder Klasse suchen …" aria-label="Teams suchen" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select" aria-label="Gruppe filtern" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="ALL">Alle Gruppen</option>
            {[...state.groups.values()].map((g) => (
              <option key={g.groupId} value={g.groupId}>
                Gruppe {g.name}
              </option>
            ))}
          </select>
        </div>
        {opError ? <p role="alert">{opError}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Klasse</th>
                <th>Gruppe</th>
                <th>Spiele</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">Kein Team.</div>
                  </td>
                </tr>
              ) : null}
              {rows.map((t) => {
                const games = [...state.games.values()].filter((g) => g.teamAId === t.teamId || g.teamBId === t.teamId).length;
                return (
                  <tr key={t.teamId}>
                    <td>{t.name}</td>
                    <td>{t.class}</td>
                    <td>Gruppe {state.groups.get(t.groupId)?.name ?? t.groupId}</td>
                    <td>{games}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => { setOpError(null); setModal({ id: t.teamId, name: t.name, cls: t.class, groupId: t.groupId }); }}
                        >
                          Bearbeiten
                        </button>
                        <button type="button" className="btn danger" onClick={() => setDeleteId(t.teamId)}>
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {modal ? (
        <Modal title={modal.id ? "Team bearbeiten" : "Neues Team"} onClose={() => setModal(null)}>
          <div className="form">
            <label>
              Teamname
              <input aria-label="Team name" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
            </label>
            <label>
              Klasse
              <input aria-label="Team class" value={modal.cls} onChange={(e) => setModal({ ...modal, cls: e.target.value })} />
            </label>
            <label>
              Gruppe
              <select aria-label="Group" value={modal.groupId} onChange={(e) => setModal({ ...modal, groupId: e.target.value })}>
                {[...state.groups.values()].map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    Gruppe {g.name}
                  </option>
                ))}
              </select>
            </label>
            {opError ? <p role="alert">{opError}</p> : null}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn primary" disabled={saving} onClick={() => void onSave()}>
                {saving ? "Saving…" : "Speichern"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      {deleteId ? (
        <ConfirmDialog
          title="Team löschen?"
          message="Team wirklich löschen? Nur möglich, wenn es keinem Spiel zugeordnet ist."
          confirmLabel="Löschen"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void onDeleteConfirmed()}
        />
      ) : null}
    </section>
  );
}
