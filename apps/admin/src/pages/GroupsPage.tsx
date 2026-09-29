import { useState } from "react";
import { createGroup, deleteGroup, updateGroup } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";
import { ConfirmDialog, Modal } from "../components/ui";

export function GroupsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [modal, setModal] = useState<{ id: string | null; name: string } | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (status === "loading") return <p role="status">Loading groups…</p>;
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
      setOpError("Group name is required.");
      return;
    }
    setSaving(true);
    try {
      if (modal.id) await updateGroup(modal.id, trimmed);
      else await createGroup(trimmed);
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
      await deleteGroup(deleteId);
      setDeleteId(null);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const groups = [...state.groups.values()];

  return (
    <section aria-label="Manage groups" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">CRUD</div>
          <h1>Gruppen</h1>
          <p className="muted">Gruppen erstellen, bearbeiten und löschen.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => { setOpError(null); setModal({ id: null, name: "" }); }}>
          ＋ Gruppe
        </button>
      </div>
      <div className="card">
        {opError ? <p role="alert">{opError}</p> : null}
        <div className="list">
          {groups.length === 0 ? <div className="empty">Keine Gruppen.</div> : null}
          {groups.map((g) => {
            const n = [...state.teams.values()].filter((t) => t.groupId === g.groupId).length;
            return (
              <div className="list-item" key={g.groupId}>
                <div className="list-main">
                  <div className="list-title">Gruppe {g.name}</div>
                  <div className="list-sub">{n} Teams</div>
                </div>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => { setOpError(null); setModal({ id: g.groupId, name: g.name }); }}>
                    Bearbeiten
                  </button>
                  <button type="button" className="btn danger" onClick={() => setDeleteId(g.groupId)}>
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {modal ? (
        <Modal title={modal.id ? "Gruppe bearbeiten" : "Neue Gruppe"} onClose={() => setModal(null)}>
          <div className="form">
            <label>
              Name
              <input aria-label="Group name" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="z. B. A" />
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
          title="Gruppe löschen?"
          message="Gruppe wirklich löschen? Nur möglich, wenn keine Teams zugeordnet sind."
          confirmLabel="Löschen"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void onDeleteConfirmed()}
        />
      ) : null}
    </section>
  );
}
