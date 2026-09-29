import { useDeferredValue, useState } from "react";
import { useTeams } from "../features/teams/useTeams";
import { useGroups } from "../features/groups/useGroups";
import { useTournamentState, useSortedTeams } from "../state/store";
import { useOnlineStatus } from "../state/cache";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";
import type { Team } from "../domain/team";

// Teams page — shared design system Teams section: page head with
// "Read only" badge, 3-column grid of team cards. Team cards are
// display-only; the fight-arena pop-up opens only from a clicked game
// (Games page, Fields page). The search box keeps the list usable with
// many teams and preserves live in-place updates (search text survives
// WS events).
export function TeamsPage() {
  const { status, error, stale, retry } = useTeams();
  useGroups();
  const teams = useSortedTeams();
  const state = useTournamentState();
  const online = useOnlineStatus();
  const showOffline = stale || (!online && teams.length > 0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visibleTeams =
    deferredQuery.length === 0
      ? teams
      : teams.filter((t) => t.name.toLowerCase().includes(deferredQuery));

  const groupNameOf = (team: Team) =>
    state.groups.get(team.groupId)?.name ?? team.groupId;

  if (status === "loading" && teams.length === 0)
    return (
      <section className="page" aria-label="Teams">
        <LoadingState label="Loading teams…" />
      </section>
    );
  if (status === "error" && teams.length === 0)
    return (
      <section className="page" aria-label="Teams">
        <ErrorState
          message={error ?? "Could not load teams."}
          onRetry={retry}
        />
      </section>
    );

  return (
    <section id="teams" className="page" aria-label="Teams">
      <div className="page-head">
        <div>
          <h1>Teams</h1>
          <p className="sub">All participating teams</p>
        </div>
        <span className="badge">Read only</span>
      </div>
      {showOffline ? (
        <OfflineBanner message={error} onRetry={retry} />
      ) : null}
      {teams.length === 0 ? (
        <EmptyState title="No teams" hint="No participating teams yet." />
      ) : (
        <>
          <div className="toolbar" style={{ gridTemplateColumns: "1fr" }}>
            <input
              className="control"
              type="search"
              placeholder="Search teams..."
              aria-label="Search teams"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {visibleTeams.length === 0 ? (
            <EmptyState
              title="No matching teams"
              hint={`Nothing matches “${query.trim()}”.`}
            />
          ) : (
            <div id="teamsGrid" className="grid">
              {visibleTeams.map((t) => (
                <article key={t.teamId} className="card group-card">
                  <div className="group-title">
                    <h2>{t.name}</h2>
                    <span className="badge">{groupNameOf(t)}</span>
                  </div>
                  <div className="team-class">{t.class}</div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
