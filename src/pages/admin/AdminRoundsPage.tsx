import { useMemo, useState } from "react";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState, useTournamentStore } from "../../state/store";
import {
  createTeacherRound,
  updateTeacherRound,
  deleteTeacherRound,
} from "../../api/teacher/rounds";
import { TeacherApiError } from "../../api/teacher/errors";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import type { Id } from "../../domain/group";

// Round administration (admin doc §17): positive unique integers,
// displayed numerically (1,2,3,10 — never lexicographic).
export function AdminRoundsPage() {
  const { status, error, retry } = useAdminData();
  const state = useTournamentState();
  const store = useTournamentStore();

  const [editingId, setEditingId] = useState<Id | null>(null);
  const [creating, setCreating] = useState(false);
  const [number, setNumber] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rounds = useMemo(
    () => [...state.rounds.values()].sort((a, b) => a.number - b.number),
    [state.rounds],
  );

  function openCreate() {
    setEditingId(null);
    setNumber((rounds[rounds.length - 1]?.number ?? 0) + 1);
    setFormError(null);
    setCreating(true);
  }
  function openEdit(id: Id) {
    const r = state.rounds.get(id);
    if (!r) return;
    setEditingId(id);
    setNumber(r.number);
    setFormError(null);
    setCreating(true);
  }

  async function submit() {
    if (!Number.isInteger(number) || number <= 0) {
      setFormError("Number must be a positive integer.");
      return;
    }
    if (rounds.some((r) => r.number === number && r.roundId !== editingId)) {
      setFormError("Round number must be unique.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        store.upsertRound(await updateTeacherRound(editingId, number));
      } else {
        store.upsertRound(await createTeacherRound(number));
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
      await deleteTeacherRound(deletingId);
      store.removeRound(deletingId);
      setDeletingId(null);
    } catch (e) {
      if (e instanceof TeacherApiError && e.isNotFound) {
        store.removeRound(deletingId);
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
      <section className="page page--with-bottom-nav" aria-label="Admin rounds">
        <LoadingState label="Loading rounds…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin rounds">
        <ErrorState message={error ?? "Could not load rounds."} onRetry={retry} />
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin rounds">
      <header className="page-header">
        <h1 className="text-page-title">Rounds</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>+ Create Round</Button>
      </header>
      <div className="page-content">
        {rounds.length === 0 ? (
          <EmptyState title="No rounds" hint="No rounds yet." />
        ) : (
          <article className="resource-card">
            <div className="resource-card-head">
              <div>
                <div className="resource-title">Rounds</div>
                <div className="resource-meta">Tournament progression</div>
              </div>
              <span className="count-badge">
                {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
              </span>
            </div>
            <div className="resource-list">
              {rounds.map((r) => (
                <div key={r.roundId} className="resource-list-item">
                  <div className="resource-icon" aria-hidden="true">{r.number}</div>
                  <div className="grow">
                    <strong>Round {r.number}</strong>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(r.roundId)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => { setDeletingId(r.roundId); setDeleteError(null); }}>Delete</Button>
                </div>
              ))}
            </div>
          </article>
        )}
        {creating ? (
          <div className="card" role="dialog" aria-label={editingId ? "Edit round" : "Create round"}>
            <label className="field"><span className="label">Number</span><input aria-label="Number" className="input" type="number" min={1} step={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} /></label>
            {formError ? <p role="alert" className="text-body">{formError}</p> : null}
            <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} loading={saving}>{editingId ? "Save" : "Create Round"}</Button>
            </div>
          </div>
        ) : null}
        {deletingId ? (
          <ConfirmDialog
            title="Delete round?"
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
