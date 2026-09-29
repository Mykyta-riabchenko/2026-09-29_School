import { Link, useNavigate } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

// Administration dashboard (spec §4). This is not the public landing.
// Shows current round, live/upcoming games, free/occupied fields,
// groups, teams, quick management actions, game-generation entry.
export function DashboardPage() {
  const { status, error, retry } = useAdminData();
  const state = useAdminState();
  const navigate = useNavigate();

  if (status === "loading") return <p role="status">Loading dashboard…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error ?? "Could not load dashboard."}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );

  const games = [...state.games.values()];
  const rounds = [...state.rounds.values()].sort((a, b) => a.number - b.number);
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const liveGames = games.filter((g) => g.status === "RUNNING");
  const upcomingGames = games.filter((g) => g.status === "SCHEDULED");
  const occupied = new Set(liveGames.map((g) => g.fieldId));
  const freeFields = [...state.fields.values()].filter((f) => !occupied.has(f.fieldId));
  const occupiedFields = [...state.fields.values()].filter((f) => occupied.has(f.fieldId));
  const teamName = (id: string) => state.teams.get(id)?.name ?? id;
  const fieldName = (id: string) => state.fields.get(id)?.name ?? id;

  return (
    <section aria-label="Admin dashboard">
      <h1>Administration dashboard</h1>
      <ul>
        <li>Current Round: {currentRound ? `Round ${currentRound.number}` : "—"}</li>
        <li>Live games: {liveGames.length}</li>
        <li>Upcoming games: {upcomingGames.length}</li>
        <li>Free fields: {freeFields.length}</li>
        <li>Occupied fields: {occupiedFields.length}</li>
        <li>Teams: {state.teams.size}</li>
        <li>Groups: {state.groups.size}</li>
      </ul>
      <h2>Live games</h2>
      {liveGames.length === 0 ? (
        <p>No live games right now.</p>
      ) : (
        <ul>
          {liveGames.map((g) => (
            <li key={g.gameId}>
              <Link to={`/games/${encodeURIComponent(g.gameId)}`}>
                {teamName(g.teamAId)} {g.scoreA} : {g.scoreB} {teamName(g.teamBId)}
              </Link>{" "}
              · {fieldName(g.fieldId)} ·{" "}
              <Link to={`/games/${encodeURIComponent(g.gameId)}/score`}>Open score</Link>
            </li>
          ))}
        </ul>
      )}
      <h2>Upcoming games</h2>
      {upcomingGames.length === 0 ? (
        <p>No upcoming games.</p>
      ) : (
        <ul>
          {upcomingGames.slice(0, 6).map((g) => (
            <li key={g.gameId}>
              <Link to={`/games/${encodeURIComponent(g.gameId)}`}>
                {fieldName(g.fieldId)} · {teamName(g.teamAId)} vs {teamName(g.teamBId)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2>Quick management actions</h2>
      <div>
        <button type="button" onClick={() => navigate("/games")}>
          Manage Games
        </button>{" "}
        <button type="button" onClick={() => navigate("/teams")}>
          Manage Teams
        </button>{" "}
        <button type="button" onClick={() => navigate("/groups")}>
          Manage Groups
        </button>{" "}
        <button type="button" onClick={() => navigate("/fields")}>
          Manage Fields
        </button>{" "}
        <button type="button" onClick={() => navigate("/rounds")}>
          Manage Rounds + Generate Games
        </button>
      </div>
    </section>
  );
}
