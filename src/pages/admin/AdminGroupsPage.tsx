import { useMemo, useState } from "react";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState, useTournamentStore } from "../../state/store";
import {
  createTeacherGroup,
  updateTeacherGroup,
  deleteTeacherGroup,
} from "../../api/teacher/groups";
import { TeacherApiError } from "../../api/teacher/errors";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import type { Id } from "../../domain/group";

// Group administration (admin doc §16). 409 shows the API message
// because teams may still reference the group.
export function AdminGroupsPage() {
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

  const groups = useMemo(
    () =>
      [...state.groups.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [state.groups],
  );

  function openCreate() {
    setEditingId(null);
    setName("");
    setFormError(null);
    setCreating(true);
  }
  function openEdit(id: Id) {
    const g = state.groups.get(id);
    if (!g) return;
    setEditingId(id);
    setName(g.name);
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
        store.upsertGroup(await updateTeacherGroup(editingId, name.trim()));
      } else {
        store.upsertGroup(await createTeacherGroup(name.trim()));
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
      await deleteTeacherGroup(deletingId);
      store.removeGroup(deletingId);
      setDeletingId(null);
    } catch (e) {
      if (e instanceof TeacherApiError && e.isNotFound) {
        store.removeGroup(deletingId);
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
      <section className="page page--with-bottom-nav" aria-label="Admin groups">
        <LoadingState label="Loading groups…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin groups">
        <ErrorState message={error ?? "Could not load groups."} onRetry={retry} />
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin groups">
      <header className="page-header">
        <h1 className="text-page-title">Groups</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>+ Create Group</Button>
      </header>
      <div className="page-content">
        {groups.length === 0 ? (
          <EmptyState title="No groups" hint="There are no groups yet." />
        ) : (
          <article className="resource-card">
            <div className="resource-card-head">
              <div>
                <div className="resource-title">Groups</div>
                <div className="resource-meta">Tournament groups</div>
              </div>
              <span className="count-badge">
                {groups.length} {groups.length === 1 ? "group" : "groups"}
              </span>
            </div>
            <div className="resource-list">
              {groups.map((g) => (
                <div key={g.groupId} className="resource-list-item">
                  <div className="resource-icon" aria-hidden="true">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="grow">
                    <strong>{g.name}</strong>
                    <div className="resource-meta">
                      {state.teams.size > 0
                        ? `${[...state.teams.values()].filter((t) => t.groupId === g.groupId).length} teams`
                        : "No teams"}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(g.groupId)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => { setDeletingId(g.groupId); setDeleteError(null); }}>Delete</Button>
                </div>
              ))}
            </div>
          </article>
        )}
        {creating ? (
          <div className="card" role="dialog" aria-label={editingId ? "Edit group" : "Create group"}>
            <label className="field"><span className="label">Name</span><input aria-label="Name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            {formError ? <p role="alert" className="text-body">{formError}</p> : null}
            <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} loading={saving}>{editingId ? "Save" : "Create Group"}</Button>
            </div>
          </div>
        ) : null}
        {deletingId ? (
          <ConfirmDialog
            title="Delete group?"
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
