import { useMemo, useState } from "react";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState, useTournamentStore } from "../../state/store";
import {
  createTeacherField,
  updateTeacherField,
  deleteTeacherField,
} from "../../api/teacher/fields";
import { TeacherApiError } from "../../api/teacher/errors";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import type { Id } from "../../domain/group";

// Fields administration (admin doc §14): create/edit/delete, assigned
// games, open active game. 409 keeps the field and shows the message;
// games are never silently reassigned.
export function AdminFieldsPage() {
  const { status, error, retry } = useAdminData();
  const state = useTournamentState();
  const store = useTournamentStore();

  const [editingId, setEditingId] = useState<Id | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fields = useMemo(
    () =>
      [...state.fields.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [state.fields],
  );
  const gamesByField = useMemo(() => {
    const map = new Map<Id, number>();
    for (const g of state.games.values()) {
      map.set(g.fieldId, (map.get(g.fieldId) ?? 0) + 1);
    }
    return map;
  }, [state.games]);

  function openCreate() {
    setEditingId(null);
    setName("");
    setFormError(null);
    setCreating(true);
  }
  function openEdit(id: Id) {
    const f = state.fields.get(id);
    if (!f) return;
    setEditingId(id);
    setName(f.name);
    setFormError(null);
    setCreating(true);
  }

  async function submit() {
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        store.upsertField(await updateTeacherField(editingId, name.trim()));
      } else {
        store.upsertField(await createTeacherField(name.trim()));
      }
      setCreating(false);
    } catch (e) {
      setFormError(
        e instanceof TeacherApiError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTeacherField(deletingId);
      store.removeField(deletingId);
      setDeletingId(null);
    } catch (e) {
      if (e instanceof TeacherApiError && e.isNotFound) {
        store.removeField(deletingId);
        setDeletingId(null);
      } else {
        setDeleteError(e instanceof Error ? e.message : "Delete failed.");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin fields">
        <LoadingState label="Loading fields…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin fields">
        <ErrorState message={error ?? "Could not load fields."} onRetry={retry} />
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin fields">
      <header className="page-header">
        <h1 className="text-page-title">Fields</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>+ Create Field</Button>
      </header>
      <div className="page-content">
        {fields.length === 0 ? (
          <EmptyState title="No fields" hint="No courts have been set up yet." />
        ) : (
          <article className="resource-card">
            <div className="resource-card-head">
              <div>
                <div className="resource-title">Fields</div>
                <div className="resource-meta">Courts and game allocation</div>
              </div>
              <span className="count-badge">
                {fields.length} {fields.length === 1 ? "court" : "courts"}
              </span>
            </div>
            <div className="resource-list">
              {fields.map((f) => {
                const count = gamesByField.get(f.fieldId) ?? 0;
                return (
                  <div key={f.fieldId} className="resource-list-item">
                    <div className="resource-icon" aria-hidden="true">
                      {f.name.replace(/[^0-9]/g, "").slice(0, 2) || f.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="grow">
                      <strong>{f.name}</strong>
                      <div className="resource-meta">
                        {count > 0 ? `${count} ${count === 1 ? "game" : "games"} scheduled` : "Free"}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(f.fieldId)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => { setDeletingId(f.fieldId); setDeleteError(null); }}>Delete</Button>
                  </div>
                );
              })}
            </div>
          </article>
        )}
        {creating ? (
          <div className="card" role="dialog" aria-label={editingId ? "Edit field" : "Create field"}>
            <label className="field"><span className="label">Name</span><input aria-label="Name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            {formError ? <p role="alert" className="text-body">{formError}</p> : null}
            <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} loading={saving}>{editingId ? "Save" : "Create Field"}</Button>
            </div>
          </div>
        ) : null}
        {deletingId ? (
          <ConfirmDialog
            title={`Delete ${state.fields.get(deletingId)?.name ?? "field"}?`}
            message={deleteError ? `This action cannot be undone. ${deleteError}` : "This action cannot be undone."}
            onCancel={() => { if (!deleting) setDeletingId(null); }}
            onConfirm={() => void confirmDelete()}
            pending={deleting}
          />
        ) : null}
      </div>
    </section>
  );
}
