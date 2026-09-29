import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState, useTournamentStore } from "../../state/store";
import { formatScore, type Game, type GameStatus } from "../../domain/game";
import { deleteTeacherGame } from "../../api/teacher/games";
import { TeacherApiError } from "../../api/teacher/errors";
import { showToast } from "../../components/Toast/Toast";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Badge, GameStatusBadge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import type { Id } from "../../domain/group";

type AdminStatusFilter = "all" | GameStatus;

// Main admin screen (admin doc §7): search by team name, filter by
// round / field / status, open / score / edit / delete / create.
// Display state comes ONLY from the explicit game status (admin
// doc §13) — never inferred from scores alone. Default sort:
// round number → field name → game ID.
export function AdminGamesPage() {
  const { status, error, retry } = useAdminData();
  const state = useTournamentState();
  const store = useTournamentStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [roundId, setRoundId] = useState<string>("all");
  const [fieldId, setFieldId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all");
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [deletingPending, setDeletingPending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rounds = useMemo(
    () => [...state.rounds.values()].sort((a, b) => a.number - b.number),
    [state.rounds],
  );
  const fields = useMemo(
    () =>
      [...state.fields.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [state.fields],
  );

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...state.games.values()].filter((g) => {
      if (roundId !== "all" && g.roundId !== roundId) return false;
      if (fieldId !== "all" && g.fieldId !== fieldId) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (q.length > 0) {
        const a = state.teams.get(g.teamAId)?.name.toLowerCase() ?? "";
        const b = state.teams.get(g.teamBId)?.name.toLowerCase() ?? "";
        if (!a.includes(q) && !b.includes(q)) return false;
      }
      return true;
    });
    const roundNo = new Map(rounds.map((r) => [r.roundId, r.number]));
    const fieldName = new Map(fields.map((f) => [f.fieldId, f.name]));
    return list.sort((a, b) => {
      const rn = (roundNo.get(a.roundId) ?? 0) - (roundNo.get(b.roundId) ?? 0);
      if (rn !== 0) return rn;
      const fn = (fieldName.get(a.fieldId) ?? "").localeCompare(
        fieldName.get(b.fieldId) ?? "",
      );
      if (fn !== 0) return fn;
      return a.gameId.localeCompare(b.gameId);
    });
  }, [state.games, state.teams, rounds, fields, query, roundId, fieldId, statusFilter]);

  async function confirmDelete() {
    if (!deleting) return;
    const id: Id = deleting.gameId;
    setDeletingPending(true);
    setDeleteError(null);
    try {
      await deleteTeacherGame(id);
      // 204 → remove locally; store emit updates every screen.
      store.removeGame(id);
      setDeleting(null);
      showToast("Game deleted", "The game was removed.");
    } catch (e) {
      if (e instanceof TeacherApiError && e.isNotFound) {
        // Already gone server-side: reload truth.
        store.removeGame(id);
        setDeleting(null);
      } else {
        setDeleteError(e instanceof Error ? e.message : "Delete failed.");
      }
    } finally {
      setDeletingPending(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin games">
        <LoadingState label="Loading games…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin games">
        <ErrorState message={error ?? "Could not load games."} onRetry={retry} />
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin games">
      <header className="page-header">
        <h1 className="text-page-title">Games</h1>
        <Button variant="primary" size="sm" onClick={() => navigate("/admin/games/new")}>
          + Create Game
        </Button>
      </header>
      <div className="page-content">
        <div className="filterbar">
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              className="input"
              type="search"
              placeholder="Search teams..."
              aria-label="Search teams"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="select" aria-label="Filter by round" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
            <option value="all">All rounds</option>
            {rounds.map((r) => (
              <option key={r.roundId} value={r.roundId}>
                Round {r.number}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Filter by field" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            <option value="all">All fields</option>
            {fields.map((f) => (
              <option key={f.fieldId} value={f.fieldId}>
                {f.name}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AdminStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="SCHEDULED">Planned</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        {games.length === 0 ? (
          <EmptyState title="No games" hint="No games match the current filters." />
        ) : (
          <div className="card-grid" aria-label="Games">
            {games.map((g) => {
              const round = rounds.find((r) => r.roundId === g.roundId);
              const referee = state.teams.get(g.refereeTeamId);
              return (
                <article key={g.gameId} className="game-card">
                  <div className="game-top">
                    <GameStatusBadge status={g.status} />
                    <Badge variant="neutral">
                      {state.fields.get(g.fieldId)?.name ?? g.fieldId}
                    </Badge>
                  </div>
                  <div className="game-body">
                    <strong>
                      {state.teams.get(g.teamAId)?.name ?? g.teamAId}{" "}
                      {formatScore(g.scoreA)} : {formatScore(g.scoreB)}{" "}
                      {state.teams.get(g.teamBId)?.name ?? g.teamBId}
                    </strong>
                    <div className="muted small" style={{ marginTop: 6 }}>
                      {round ? `Round ${round.number}` : "Round —"} · Referee:{" "}
                      {referee?.name ?? g.refereeTeamId}
                    </div>
                  </div>
                  <div className="game-actions">
                    <button type="button" className="text-action" onClick={() => navigate(`/admin/games/${encodeURIComponent(g.gameId)}`)}>
                      Open
                    </button>
                    <button type="button" className="text-action" onClick={() => navigate(`/admin/games/${encodeURIComponent(g.gameId)}/score`)}>
                      Score
                    </button>
                    <button type="button" className="text-action" onClick={() => navigate(`/admin/games/${encodeURIComponent(g.gameId)}/edit`)}>
                      Edit
                    </button>
                    <button type="button" className="text-action danger" onClick={() => { setDeleting(g); setDeleteError(null); }}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {deleting ? (
          <ConfirmDialog
            title="Delete game?"
            message={
              deleteError
                ? `This action cannot be undone. ${deleteError}`
                : "This action cannot be undone."
            }
            onCancel={() => { if (!deletingPending) setDeleting(null); }}
            onConfirm={() => void confirmDelete()}
            pending={deletingPending}
          />
        ) : null}
      </div>
    </section>
  );
}
