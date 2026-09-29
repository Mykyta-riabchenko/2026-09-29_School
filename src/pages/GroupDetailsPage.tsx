import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGroupById } from "../api/groupsApi";
import type { Group } from "../domain/group";
import { ApiError } from "../api/client";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";
import { useTournamentState } from "../state/store";
import type { Team } from "../domain/team";

// Group details — shared design system group-card language: page head with
// the group name, one card with team rows. Team rows are display-only;
// the fight-arena pop-up opens only from a clicked game (Games page,
// Fields page).
export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const state = useTournamentState();

  useEffect(() => {
    if (!id) {
      setStatus("not-found");
      return;
    }
    const decodedId = decodeURIComponent(id);
    let cancelled = false;
    (async () => {
      try {
        // IDs are opaque: forward unchanged.
        const g = await getGroupById(decodedId);
        if (!cancelled) {
          setGroup(g);
          setError(null);
          setStale(false);
          setStatus("ready");
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === "RESOURCE_NOT_FOUND") {
          // 404 means "does not exist" — but the persistent cache may
          // still hold it (deleted server-side). Prefer the live
          // answer, yet show the cached copy rather than nothing.
          const cached = state.groups.get(decodedId);
          if (cached) {
            setGroup(cached);
            setStale(true);
            setError("Group no longer exists on the server.");
            setStatus("ready");
          } else {
            setStatus("not-found");
          }
        } else {
          // Connection lost: fall back to the cached group.
          const cached = state.groups.get(decodedId);
          if (cached) {
            setGroup(cached);
            setError(e instanceof Error ? e.message : "Failed to load group");
            setStale(true);
            setStatus("ready");
          } else {
            setStatus("error");
            setError(e instanceof Error ? e.message : "Failed to load group");
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // state.groups is read inside, but must not retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const groupNameOf = (team: Team) =>
    state.groups.get(team.groupId)?.name ?? team.groupId;

  if (status === "loading" && !group)
    return (
      <section className="page" aria-label="Group details">
        <LoadingState label="Loading group…" />
      </section>
    );
  if (status === "not-found")
    return (
      <section className="page" aria-label="Group details">
        <ErrorState notFound message="Group not found." />
      </section>
    );
  if (status === "error" && !group)
    return (
      <section className="page" aria-label="Group details">
        <ErrorState
          message={error ?? "Could not load group."}
          onRetry={() => window.location.reload()}
        />
      </section>
    );
  if (!group)
    return (
      <section className="page" aria-label="Group details">
        <EmptyState title="No group" hint="This group does not exist." />
      </section>
    );

  // Prefer the live store value so WS group.updated renames appear
  // instantly in place without reload (same pattern as GameDetailsPage).
  const liveGroup = state.groups.get(group.groupId) ?? group;
  const teams = [...state.teams.values()]
    .filter((t) => t.groupId === liveGroup.groupId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="page" aria-label="Group details">
      <div className="page-head">
        <div>
          <h1>{liveGroup.name}</h1>
          <p className="sub">Teams organised by tournament group</p>
        </div>
        <span className="badge">
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </span>
      </div>
      {stale ? <OfflineBanner message={error} /> : null}
      {teams.length === 0 ? (
        <EmptyState title="No teams" hint="No teams in this group yet." />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <article className="card group-card">
            <div className="group-title">
              <h2>{liveGroup.name}</h2>
              <span className="badge">
                {teams.length} {teams.length === 1 ? "team" : "teams"}
              </span>
            </div>
            <div className="team-list">
              {teams.map((t) => (
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
        </div>
      )}
    </section>
  );
}
