import { useNavigate } from "react-router-dom";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState } from "../../state/store";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";

// Admin dashboard (admin doc §6): current round, live games, upcoming
// games, free/occupied fields, team and group counts. Read-only.
// Lifecycle display state comes ONLY from the explicit game status
// (admin doc §13) — never inferred from scores alone.
export function AdminDashboardPage() {
  const { status, error, retry } = useAdminData();
  const state = useTournamentState();
  const navigate = useNavigate();

  if (status === "loading") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin dashboard">
        <LoadingState label="Loading dashboard…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Admin dashboard">
        <ErrorState message={error ?? "Could not load dashboard."} onRetry={retry} />
      </section>
    );
  }

  const games = [...state.games.values()];
  const rounds = [...state.rounds.values()].sort((a, b) => a.number - b.number);
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const liveGames = games.filter((g) => g.status === "LIVE");
  const upcomingGames = games.filter((g) => g.status !== "LIVE" && g.status !== "COMPLETED");
  const occupiedFieldIds = new Set(liveGames.map((g) => g.fieldId));
  const freeFields = [...state.fields.values()].filter((f) => !occupiedFieldIds.has(f.fieldId));
  const occupiedFields = [...state.fields.values()].filter((f) => occupiedFieldIds.has(f.fieldId));

  const teamName = (id: string) => state.teams.get(id)?.name ?? id;
  const fieldName = (id: string) => state.fields.get(id)?.name ?? id;

  const stats: Array<[string, string]> = [
    [currentRound ? `Round ${currentRound.number}` : "—", "Current Round"],
    [String(liveGames.length), "Live games"],
    [String(upcomingGames.length), "Upcoming games"],
    [String(freeFields.length), "Free fields"],
    [String(occupiedFields.length), "Occupied fields"],
    [String(state.teams.size), "Teams"],
    [String(state.groups.size), "Groups"],
  ];

  const actions: Array<[string, string]> = [
    ["Manage Games", "/admin/games"],
    ["Manage Teams", "/admin/teams"],
    ["Manage Groups", "/admin/groups"],
    ["Manage Fields", "/admin/fields"],
    ["Manage Rounds", "/admin/rounds"],
  ];

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin dashboard">
      <header className="page-header">
        <h1 className="text-page-title">Dashboard</h1>
        <Badge variant="brand">Administration</Badge>
      </header>
      <div className="page-content">
        <div className="admin-panel">
          {stats.map(([value, caption]) => (
            <div key={caption} className="admin-stat">
              <div className="value">{value}</div>
              <div className="caption">{caption}</div>
            </div>
          ))}
        </div>
        <h2 className="text-section-title">Live games</h2>
        {liveGames.length === 0 ? (
          <p className="text-body">No live games right now.</p>
        ) : (
          <ul className="card-grid" aria-label="Live games">
            {liveGames.map((g) => (
              <li key={g.gameId} className="card card--compact">
                {teamName(g.teamAId)} {g.scoreA} : {g.scoreB} {teamName(g.teamBId)} ·{" "}
                {fieldName(g.fieldId)}
              </li>
            ))}
          </ul>
        )}
        <h2 className="text-section-title">Upcoming games</h2>
        {upcomingGames.length === 0 ? (
          <p className="text-body">No upcoming games.</p>
        ) : (
          <ul className="card-grid" aria-label="Upcoming games">
            {upcomingGames.slice(0, 6).map((g) => (
              <li key={g.gameId} className="card card--compact">
                {fieldName(g.fieldId)} · {teamName(g.teamAId)} vs {teamName(g.teamBId)}
              </li>
            ))}
          </ul>
        )}
        <h2 className="text-section-title">Admin actions</h2>
        <div className="btn-row">
          {actions.map(([label, to], i) => (
            <Button
              key={to}
              variant={i === 0 ? "primary" : "secondary"}
              onClick={() => navigate(to)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
