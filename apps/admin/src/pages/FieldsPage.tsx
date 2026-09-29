import { useState } from "react";
import { createField, deleteField, updateField } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";
import { ConfirmDialog, Modal } from "../components/ui";

export function FieldsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [modal, setModal] = useState<{ id: string | null; name: string } | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (status === "loading") return <p role="status">Loading fields…</p>;
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
    const trimmed = modal.name.trim();
    if (!trimmed) {
      setOpError("Field name is required.");
      return;
    }
    setSaving(true);
    try {
      if (modal.id) await updateField(modal.id, trimmed);
      else await createField(trimmed);
      setModal(null);
      setOpError(null);
      await refresh();
    } catch (err: unknown) {
      setOpError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!deleteId) return;
    try {
      await deleteField(deleteId);
      setDeleteId(null);
      setOpError(null);
      await refresh();
    } catch (err: unknown) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const fields = [...state.fields.values()];

  return (
    <section aria-label="Manage fields" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Courts</div>
          <h1>Spielfelder</h1>
          <p className="muted">Felder als sichere, große Liste verwalten.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => { setOpError(null); setModal({ id: null, name: "" }); }}>
          ＋ Feld
        </button>
      </div>
      <div className="card">
        {opError ? <p role="alert">{opError}</p> : null}
        <div className="field-list">
          {fields.length === 0 ? <div className="empty">Keine Felder.</div> : null}
          {fields.map((f, i) => {
            const live = [...state.games.values()].find((g) => g.fieldId === f.fieldId && g.status === "RUNNING");
            const teamA = live ? (state.teams.get(live.teamAId)?.name ?? live.teamAId) : null;
            const teamB = live ? (state.teams.get(live.teamBId)?.name ?? live.teamBId) : null;
            return (
              <div className="list-item field-item" key={f.fieldId}>
                <div className="field-number" aria-hidden="true">
                  {i + 1}
                </div>
                <div>
                  <div className="field-name">{f.name}</div>
                  <div className="field-meta">
                    {live && teamA && teamB ? `LIVE · ${teamA} ${live.scoreA}:${live.scoreB} ${teamB}` : "Bereit für ein Spiel"}
                  </div>
                </div>
                <div className="field-actions">
                  <button type="button" className="btn" onClick={() => { setOpError(null); setModal({ id: f.fieldId, name: f.name }); }}>
                    Bearbeiten
                  </button>
                  <button type="button" className="btn danger" onClick={() => setDeleteId(f.fieldId)}>
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {modal ? (
        <Modal title={modal.id ? "Feld bearbeiten" : "Neues Feld"} onClose={() => setModal(null)}>
          <div className="form">
            <label>
              Feldname
              <input aria-label="Field name" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="Feld 1" />
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
          title="Feld löschen?"
          message="Feld wirklich löschen?"
          confirmLabel="Löschen"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void onDeleteConfirmed()}
        />
      ) : null}
    </section>
  );
}
