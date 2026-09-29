import { useMemo, useState } from "react";
import type { Game } from "../domain/game";
import { formatScore } from "../domain/game";
import { useFieldsOverview } from "../features/fields/useFields";
import { useGroups } from "../features/groups/useGroups";
import { useTournamentState, useSortedFields } from "../state/store";
import { useOnlineStatus } from "../state/cache";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";
import { TeamModal } from "../components/public/TeamModal";
import type { Team } from "../domain/team";

// Fields page: page head with "<n> courts" badge, grid of field cards.
// A court with an explicit LIVE game shows it as CURRENT GAME;
// otherwise the free state. Display state is never inferred from
// scores alone (admin doc §13).
export function FieldsPage() {
  const { status, error, stale, retry } = useFieldsOverview();
  useGroups();
  const fields = useSortedFields();
  const state = useTournamentState();
  const online = useOnlineStatus();
  const showOffline = stale || (!online && fields.length > 0);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const gamesByField = useMemo(() => {
    const map = new Map<string, Game[]>();
    const games = [...state.games.values()].sort((a, b) =>
      a.gameId.localeCompare(b.gameId),
    );
    for (const game of games) {
      const list = map.get(game.fieldId) ?? [];
      list.push(game);
      map.set(game.fieldId, list);
    }
    return map;
  }, [state.games]);

  if (status === "loading" && fields.length === 0)
    return (
      <section className="page" aria-label="Fields">
        <LoadingState label="Loading fields…" />
      </section>
    );
  if (status === "error" && fields.length === 0)
    return (
      <section className="page" aria-label="Fields">
        <ErrorState
          message={error ?? "Could not load fields."}
          onRetry={retry}
        />
      </section>
    );

  // Live store value so an open pop-up updates in place on WS events.
  const selectedGame =
    selectedGameId != null
      ? (state.games.get(selectedGameId) ?? null)
      : null;

  const groupNameOf = (team: Team) =>
    state.groups.get(team.groupId)?.name ?? team.groupId;

  return (
    <section id="fields" className="page" aria-label="Fields">
      <div className="page-head">
        <div>
          <h1>Fields</h1>
          <p className="sub">Current games on each volleyball court</p>
        </div>
        <span className="badge">
          {fields.length} {fields.length === 1 ? "court" : "courts"}
        </span>
      </div>
      {showOffline ? (
        <OfflineBanner message={error} onRetry={retry} />
      ) : null}
      {fields.length === 0 ? (
        <EmptyState
          title="No fields"
          hint="No courts have been set up yet."
        />
      ) : (
        <div id="fieldsGrid" className="grid field-grid">
          {fields.map((field) => {
            const games = gamesByField.get(field.fieldId) ?? [];
            const live = games.find((g) => g.status === "LIVE");
            if (live) {
              const teamA = state.teams.get(live.teamAId);
              const teamB = state.teams.get(live.teamBId);
              const round = state.rounds.get(live.roundId);
              return (
                <article key={field.fieldId} className="card field-card">
                  <div className="field-head">
                    <h2>{field.name}</h2>
                    <span className="status live">Live</span>
                  </div>
                  <div className="court court--clickable"
                    onClick={() => setSelectedGameId(live.gameId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedGameId(live.gameId);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${teamA?.name ?? live.teamAId} versus ${teamB?.name ?? live.teamBId}, current game`}
                  >
                    <div className="court-status">CURRENT GAME</div>
                    <div className="attack-line"></div>
                    <div className="court-info">
                      <div className="court-teams">
                        {teamA?.name ?? live.teamAId}
                      </div>
                      <div className="court-vs">VS</div>
                      <div className="court-teams">
                        {teamB?.name ?? live.teamBId}
                      </div>
                      <div className="court-score">
                        {formatScore(live.scoreA)} : {formatScore(live.scoreB)}
                      </div>
                    </div>
                  </div>
                  <div className="field-games">
                    <span>
                      {games.length}{" "}
                      {games.length === 1 ? "scheduled game" : "scheduled games"}
                    </span>
                    <span>
                      {round ? `Round ${round.number}` : "Game"}
                    </span>
                  </div>
                </article>
              );
            }
            return (
              <article key={field.fieldId} className="card field-card">
                <div className="field-head">
                  <h2>{field.name}</h2>
                  <span className="badge">
                    {games.length} {games.length === 1 ? "game" : "games"}
                  </span>
                </div>
                <div className="court court-empty">
                  <div className="court-info">
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      No game currently playing
                    </div>
                    <div style={{ marginTop: 7 }}>Court available</div>
                  </div>
                </div>
                <div className="field-games">
                  <span>
                    {games.length}{" "}
                    {games.length === 1 ? "scheduled game" : "scheduled games"}
                  </span>
                  <span>Read only</span>
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
