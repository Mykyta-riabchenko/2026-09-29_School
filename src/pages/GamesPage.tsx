import { useMemo, useState } from "react";
import { useGamesOverview } from "../features/games/useGames";
import { useGroups } from "../features/groups/useGroups";
import {
  useSortedRounds,
  useSortedFields,
  useTournamentState,
} from "../state/store";
import { useOnlineStatus } from "../state/cache";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";
import { Button } from "../components/Button/Button";
import { formatScore } from "../domain/game";
import { toPublicStatus, publicStatusLabel } from "../components/public/publicHelpers";
import { TeamModal } from "../components/public/TeamModal";
import type { Team } from "../domain/team";
import { useLiveStatus } from "../live/LiveProvider";

// Games page — shared design system Games section
// (style documentation v1.0): page head with "Read only"
// badge, 4-column toolbar (search + round/field/status), 3-column game
// grid. Clicking a game card opens the fight-arena pop-up for that game.
// All filtering is client-side over the live store so WS updates swap
// values in place without reload. The live connection banner stays
// (app-wide WS status + retry); cached data stays visible offline.
export function GamesPage() {
  // Load everything (games + teams + fields + rounds); groups come from
  // the groups hook so referee/team lookups resolve to names.
  const { status, error, stale, reload } = useGamesOverview(null);
  useGroups();
  const rounds = useSortedRounds();
  const fields = useSortedFields();
  const state = useTournamentState();
  const online = useOnlineStatus();
  // App-wide live connection: WS events upsert single entities by ID
  // into the store, so changed values swap silently in place — no page
  // reload, no refetch spinner, selection and scroll are preserved.
  const live = useLiveStatus();

  const [query, setQuery] = useState("");
  const [roundId, setRoundId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...state.games.values()];
    return all.filter((g) => {
      const a = state.teams.get(g.teamAId);
      const b = state.teams.get(g.teamBId);
      const s = toPublicStatus(g);
      if (
        q &&
        !`${a?.name ?? g.teamAId} ${b?.name ?? g.teamBId}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (roundId && g.roundId !== roundId) return false;
      if (fieldId && g.fieldId !== fieldId) return false;
      if (statusFilter && s !== statusFilter) return false;
      return true;
    });
  }, [state.games, state.teams, query, roundId, fieldId, statusFilter]);

  const showOffline = stale || (!online && state.games.size > 0);

  // Live store value so an open pop-up updates in place on WS events.
  const selectedGame =
    selectedGameId != null
      ? (state.games.get(selectedGameId) ?? null)
      : null;

  const groupNameOf = (team: Team) =>
    state.groups.get(team.groupId)?.name ?? team.groupId;

  return (
    <section id="games" className="page" aria-label="Games">
      <div className="page-head">
        <div>
          <h1>Games</h1>
          <p className="sub">Live tournament games and results</p>
        </div>
        <span className="badge">Read only</span>
      </div>
      <div className="toolbar">
        <input
          id="search"
          className="control"
          placeholder="Search teams..."
          aria-label="Search teams"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          id="roundFilter"
          className="control"
          aria-label="Filter by round"
          value={roundId}
          onChange={(e) => setRoundId(e.target.value)}
        >
          <option value="">All rounds</option>
          {rounds.map((r) => (
            <option key={r.roundId} value={r.roundId}>
              Round {r.number}
            </option>
          ))}
        </select>
        <select
          id="fieldFilter"
          className="control"
          aria-label="Filter by field"
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
        >
          <option value="">All fields</option>
          {fields.map((f) => (
            <option key={f.fieldId} value={f.fieldId}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          id="statusFilter"
          className="control"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="live">Live</option>
          <option value="waiting">Planned</option>
          <option value="ended">Completed</option>
        </select>
      </div>
      <div
        className="live-banner"
        role="status"
        aria-label={`Live updates: ${live.status}`}
      >
        <span
          className={
            live.status === "connected"
              ? "live-indicator live-indicator--pulse"
              : "live-indicator"
          }
          aria-hidden="true"
        />
        Live: {live.status}
        {live.status === "failed" ? (
          <Button variant="secondary" size="sm" onClick={() => live.retry()}>
            Retry connection
          </Button>
        ) : null}
      </div>
      {showOffline ? (
        <OfflineBanner message={error} onRetry={() => void reload()} />
      ) : null}
      {status === "loading" && state.games.size === 0 ? (
        <LoadingState label="Loading games…" />
      ) : status === "error" && state.games.size === 0 ? (
        <ErrorState
          message={error ?? "Could not load games."}
          onRetry={() => void reload()}
        />
      ) : games.length === 0 ? (
        <EmptyState
          title="No games in selected round"
          hint="Try another search, filter or check back later."
        />
      ) : (
        <div id="gamesGrid" className="grid">
          {games.map((g) => {
            const a = state.teams.get(g.teamAId);
            const b = state.teams.get(g.teamBId);
            const referee = state.teams.get(g.refereeTeamId);
            const field = state.fields.get(g.fieldId);
            const round = state.rounds.get(g.roundId);
            const s = toPublicStatus(g);
            return (
              <article
                key={g.gameId}
                className="card game-card game-card--clickable"
                onClick={() => setSelectedGameId(g.gameId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedGameId(g.gameId);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${a?.name ?? g.teamAId} versus ${b?.name ?? g.teamBId}, ${publicStatusLabel(s)}`}
              >
                <div className="game-top">
                  <span className={`status ${s}`}>
                    {publicStatusLabel(s)}
                  </span>
                  <span className="field-tag">
                    {field?.name ?? g.fieldId}
                  </span>
                </div>
                <div className="game-body">
                  <div className="team-line">{a?.name ?? g.teamAId}</div>
                  <div className="vs">VS</div>
                  <div className="team-line">{b?.name ?? g.teamBId}</div>
                  <div className="game-score">
                    <span>{formatScore(g.scoreA)}</span>
                    {" : "}
                    <span>{formatScore(g.scoreB)}</span>
                  </div>
                </div>
                <div className="game-meta">
                  <span>
                    {round ? `Round ${round.number}` : "Game"}
                  </span>
                  <span>Referee: {referee?.name ?? g.refereeTeamId}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <TeamModal
        game={selectedGame}
        lookups={{
          teamsById: state.teams,
          fieldsById: state.fields,
          roundsById: state.rounds,
          groupNameOf,
        }}
        onClose={() => setSelectedGameId(null)}
      />
    </section>
  );
}
