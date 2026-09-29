import { useMemo } from "react";
import { useGamesOverview } from "../features/games/useGames";
import { useSortedRounds, useTournamentState } from "../state/store";
import { useOnlineStatus } from "../state/cache";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";

// Rounds page: page head with "<n> rounds" badge, grid of round cards
// with Completed / Live / Planned counters from the explicit game
// lifecycle status (admin doc §13). Games without a status count as
// planned; display state is never inferred from scores alone.
export function RoundsPage() {
  const { status, error, stale, reload } = useGamesOverview(null);
  const rounds = useSortedRounds();
  const state = useTournamentState();
  const online = useOnlineStatus();
  const showOffline = stale || (!online && rounds.length > 0);

  const counts = useMemo(() => {
    const map = new Map<
      string,
      { total: number; ended: number; live: number; waiting: number }
    >();
    for (const g of state.games.values()) {
      const entry = map.get(g.roundId) ?? {
        total: 0,
        ended: 0,
        live: 0,
        waiting: 0,
      };
      entry.total += 1;
      if (g.status === "COMPLETED") entry.ended += 1;
      else if (g.status === "LIVE") entry.live += 1;
      else entry.waiting += 1;
      map.set(g.roundId, entry);
    }
    return map;
  }, [state.games]);

  if (status === "loading" && rounds.length === 0 && state.games.size === 0)
    return (
      <section className="page" aria-label="Rounds">
        <LoadingState label="Loading rounds…" />
      </section>
    );
  if (status === "error" && rounds.length === 0 && state.games.size === 0)
    return (
      <section className="page" aria-label="Rounds">
        <ErrorState
          message={error ?? "Could not load rounds."}
          onRetry={() => void reload()}
        />
      </section>
    );

  return (
    <section id="rounds" className="page" aria-label="Rounds">
      <div className="page-head">
        <div>
          <h1>Rounds</h1>
          <p className="sub">Tournament progress by round</p>
        </div>
        <span className="badge">
          {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
        </span>
      </div>
      {showOffline ? (
        <OfflineBanner message={error} onRetry={() => void reload()} />
      ) : null}
      {rounds.length === 0 ? (
        <EmptyState
          title="No rounds"
          hint="There are no rounds yet. Check back later."
        />
      ) : (
        <div id="roundsGrid" className="grid">
          {rounds.map((r) => {
            const c = counts.get(r.roundId) ?? {
              total: 0,
              ended: 0,
              live: 0,
              waiting: 0,
            };
            return (
              <article key={r.roundId} className="card group-card">
                <div className="group-title">
                  <h2>Round {r.number}</h2>
                  <span className="badge">
                    {c.total} {c.total === 1 ? "game" : "games"}
                  </span>
                </div>
                <div className="team-list">
                  <div className="team-row">
                    <span>Completed</span>
                    <b>{c.ended}</b>
                  </div>
                  <div className="team-row">
                    <span>Live</span>
                    <b>{c.live}</b>
                  </div>
                  <div className="team-row">
                    <span>Planned</span>
                    <b>{c.waiting}</b>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
