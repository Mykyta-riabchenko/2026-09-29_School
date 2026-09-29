import { Link } from "react-router-dom";
import { groupNameOf, useTournamentData } from "../components/public-ui";

export function GroupsPage() {
  const { state, loading, error, retry } = useTournamentData();
  if (loading) return <p role="status">Loading groups…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  const groups = [...state.groups.values()];
  if (groups.length === 0) {
    return (
      <section aria-label="Groups" className="view">
        <div className="head">
          <div>
            <div className="eyebrow">Gruppen</div>
            <h1>Groups</h1>
            <p className="muted">No groups yet.</p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Groups" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Gruppen</div>
          <h1>Groups</h1>
        </div>
      </div>
      <div className="team-list" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {groups.map((g) => {
          const n = [...state.teams.values()].filter((t) => t.groupId === g.groupId).length;
          return (
            <Link key={g.groupId} to={`/groups/${encodeURIComponent(g.groupId)}`} className="card team-card" style={{ textDecoration: "none" }}>
              <span className="badge scheduled">Gruppe {groupNameOf(state, g.groupId)}</span>
              <h2>{g.name}</h2>
              <div className="muted">{n} teams</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
