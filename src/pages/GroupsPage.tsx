import { useMemo } from "react";
import { useGroups } from "../features/groups/useGroups";
import { useGamesOverview } from "../features/games/useGames";
import { useSortedGroups, useTournamentState } from "../state/store";
import { useOnlineStatus } from "../state/cache";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";
import type { Team } from "../domain/team";

// Groups page — exact copy of the shared design system Groups section:
// page head with "<n> groups" badge, 3-column grid of group cards with
// team rows. Team rows are display-only; the fight-arena pop-up opens
// only from a clicked game (Games page, Fields page).
export function GroupsPage() {
  const groupsQuery = useGroups();
  // Teams so group cards can list their teams.
  const overview = useGamesOverview(null);
  const groups = useSortedGroups();
  const state = useTournamentState();
  const online = useOnlineStatus();

  const teamsByGroup = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const t of state.teams.values()) {
      const list = map.get(t.groupId) ?? [];
      list.push(t);
      map.set(t.groupId, list);
    }
    for (const list of map.values())
      list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [state.teams]);

  const groupNameOf = (team: Team) =>
    state.groups.get(team.groupId)?.name ?? team.groupId;

  const loading =
    (groupsQuery.status === "loading" || overview.status === "loading") &&
    groups.length === 0;
  const failed =
    (groupsQuery.status === "error" || overview.status === "error") &&
    groups.length === 0;
  const showOffline =
    groupsQuery.stale ||
    overview.stale ||
    (!online && groups.length > 0);
  const offlineMessage = groupsQuery.error ?? overview.error;

  if (loading)
    return (
      <section className="page" aria-label="Groups">
        <LoadingState label="Loading groups…" />
      </section>
    );
  if (groupsQuery.status === "not-found")
    return (
      <section className="page" aria-label="Groups">
        <ErrorState notFound message="Group not found." />
      </section>
    );
  if (failed)
    return (
      <section className="page" aria-label="Groups">
        <ErrorState
          message={offlineMessage ?? "Could not load groups."}
          onRetry={() => {
            groupsQuery.retry();
            void overview.reload();
          }}
        />
      </section>
    );

  return (
    <section id="groups" className="page" aria-label="Groups">
      <div className="page-head">
        <div>
          <h1>Groups</h1>
          <p className="sub">Teams organised by tournament group</p>
        </div>
        <span className="badge">
          {groups.length} {groups.length === 1 ? "group" : "groups"}
        </span>
      </div>
      {showOffline ? (
        <OfflineBanner
          message={offlineMessage}
          onRetry={() => {
            groupsQuery.retry();
            void overview.reload();
          }}
        />
      ) : null}
      {groups.length === 0 ? (
        <EmptyState
          title="No groups"
          hint="There are no groups yet. Check back later."
        />
      ) : (
        <div id="groupsGrid" className="grid">
          {groups.map((g) => {
            const list = teamsByGroup.get(g.groupId) ?? [];
            return (
              <article key={g.groupId} className="card group-card">
                <div className="group-title">
                  <h2>{g.name}</h2>
                  <span className="badge">
                    {list.length} {list.length === 1 ? "team" : "teams"}
                  </span>
                </div>
                <div className="team-list">
                  {list.map((t) => (
                    <div key={t.teamId} className="team-row">
                      <div>
                        <div className="team-name">{t.name}</div>
                        <div className="team-class">{t.class}</div>
                      </div>
                      <span className="badge">{groupNameOf(t)}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
