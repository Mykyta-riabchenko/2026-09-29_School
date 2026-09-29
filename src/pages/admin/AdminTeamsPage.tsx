import { useMemo, useState } from "react";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState, useTournamentStore } from "../../state/store";
import {
  createTeacherTeam,
  updateTeacherTeam,
  deleteTeacherTeam,
} from "../../api/teacher/teams";
import { TeacherApiError } from "../../api/teacher/errors";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import type { Id } from "../../domain/group";

// Team administration (admin doc §15): create/edit/delete, move between
// groups, search. Wire property is `class`.
export function AdminTeamsPage() {
  const { status, error, retry } = useAdminData();
  const state = useTournamentState();
  const store = useTournamentStore();

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<Id | null>(null);
  const [creating, setCreating] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [klass, setKlass] = useState("");
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
  const teams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.teams.values()]
      .filter(
        (t) =>
          (groupFilter === "all" || t.groupId === groupFilter) &&
          (q.length === 0 || t.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [state.teams, query, groupFilter]);

  function initials(name: string): string {
    const parts = name.split(/[\s.]+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
    return letters.join("") || "?";
  }

  function openCreate() {
    setEditingId(null);
    setGroupId(groups[0]?.groupId ?? "");
    setKlass("");
    setName("");
    setFormError(null);
    setCreating(true);
  }
  function openEdit(id: Id) {
    const t = state.teams.get(id);
    if (!t) return;
    setEditingId(id);
    setGroupId(t.groupId);
    setKlass(t.class);
    setName(t.name);
    setFormError(null);
    setCreating(true);
  }

  async function submit() {
    if (!name.trim() || !klass.trim() || !groupId) {
      setFormError("Group, class and name are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        store.upsertTeam(await updateTeacherTeam(editingId, { groupId, class: klass.trim(), name: name.trim() }));
      } else {
        store.upsertTeam(await createTeacherTeam({ groupId, class: klass.trim(), name: name.trim() }));
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
      await deleteTeacherTeam(deletingId);
      store.removeTeam(deletingId);
      setDeletingId(null);
    } catch (e) {
      if (e instanceof TeacherApiError && e.isNotFound) {
        store.removeTeam(deletingId);
        setDeletingId(null);
      } else {
        // 409 → referenced by a game: keep and show the message.
        setDeleteError(e instanceof Error ? e.message : "Delete failed.");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin teams">
        <LoadingState label="Loading teams…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin teams">
        <ErrorState message={error ?? "Could not load teams."} onRetry={retry} />
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin teams">
      <header className="page-header">
        <h1 className="text-page-title">Teams</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>+ Create Team</Button>
      </header>
      <div className="page-content">
        <div className="resource-toolbar">
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input className="input" type="search" placeholder="Search teams..." aria-label="Search teams" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="select" style={{ maxWidth: 180 }} aria-label="Filter by group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="all">All groups</option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.name}</option>
            ))}
          </select>
        </div>
        {teams.length === 0 ? (
          <EmptyState title="No teams" hint="No teams match the selected filters." />
        ) : (
          <div className="list" aria-label="Teams">
            {teams.map((t) => (
              <div key={t.teamId} className="list-row">
                <div className="avatar" aria-hidden="true">{initials(t.name)}</div>
                <div className="grow">
                  <strong>{t.name}</strong>
                  <div className="muted small">
                    {state.groups.get(t.groupId)?.name ?? t.groupId} · Class {t.class}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openEdit(t.teamId)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => { setDeletingId(t.teamId); setDeleteError(null); }}>Delete</Button>
              </div>
            ))}
          </div>
        )}
        {creating ? (
          <div className="card" role="dialog" aria-label={editingId ? "Edit team" : "Create team"}>
            <div className="form-grid">
              <label className="field"><span className="label">Name</span><input aria-label="Name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="field"><span className="label">Group</span><select className="select" aria-label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                {groups.map((g) => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
              </select></label>
              <label className="field"><span className="label">Class</span><input aria-label="Class" className="input" value={klass} onChange={(e) => setKlass(e.target.value)} /></label>
            </div>
            {formError ? <p role="alert" className="text-body">{formError}</p> : null}
            <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} loading={saving}>{editingId ? "Save" : "Create Team"}</Button>
            </div>
          </div>
        ) : null}
        {deletingId ? (
          <ConfirmDialog
            title="Delete team?"
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
