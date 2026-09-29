import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGroupById, getTeams } from "../api/client";
import { useTournamentStore } from "../state/store";
import type { Group, Team } from "../../../../packages/contracts/src/index";

export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    // useParams already decodes; use raw id to avoid double-decode errors.
    const lookupId = id;
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [g, all] = await Promise.all([getGroupById(lookupId), getTeams()]);
        if (c) return;
        setGroup(g);
        setTeams(all.filter((t) => t.groupId === g.groupId));
        store.setGroups([g]);
        store.setTeams(all);
        setError(null);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load group.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id, store, attempt]);
  if (loading) return <p role="status">Loading group…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
        <p>
          <Link to="/groups">Back to groups</Link>
        </p>
      </div>
    );
  if (!group) return <p role="status">Loading group…</p>;
  return (
    <section aria-label="Group details">
      <Link to="/groups" aria-label="Back to groups">
        Back
      </Link>
      <h1>{group.name}</h1>
      {teams.length === 0 ? (
        <p>No teams in this group yet.</p>
      ) : (
        <ul>
          {teams.map((t) => (
            <li key={t.teamId}>
              <Link to={`/teams/${encodeURIComponent(t.teamId)}`}>{t.name}</Link> · {t.class}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
