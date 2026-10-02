import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupNameOf, useTournamentData } from "../components/public-ui";
import { matchesQuery } from "../components/search";

export function TeamsPage() {
  const { state, loading, error, retry } = useTournamentData();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("ALL");
  const navigate = useNavigate();

  const visible = useMemo(() => {
    return [...state.teams.values()].filter(
      (t) =>
        matchesQuery(t.name, query) &&
        (groupId === "ALL" || t.groupId === groupId),
    );
  }, [state, query, groupId]);

  if (loading) return <p role="status">Loading teams…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      </div>
    );

  return (
    <section aria-label="Teams" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Teilnehmer</div>
          <h1>Mannschaften</h1>
        </div>
        <div className="controls">
          <input
            className="input"
            placeholder="Team suchen …"
            aria-label="Teams suchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="select" aria-label="Gruppe filtern" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="ALL">Alle Gruppen</option>
            {[...state.groups.values()].map((g) => (
              <option key={g.groupId} value={g.groupId}>
                Gruppe {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="team-list" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {visible.length === 0 ? <div className="card empty">Kein Team gefunden.</div> : null}
        {visible.map((t) => {
          let played = 0;
          let wins = 0;
          let points = 0;
          for (const g of state.games.values()) {
            if (g.status !== "FINISHED") continue;
            if (g.teamAId !== t.teamId && g.teamBId !== t.teamId) continue;
            played += 1;
            points += g.teamAId === t.teamId ? g.scoreA : g.scoreB;
            if ((g.teamAId === t.teamId && g.scoreA > g.scoreB) || (g.teamBId === t.teamId && g.scoreB > g.scoreA)) wins += 1;
          }
          return (
            <button
              key={t.teamId}
              type="button"
              className="card team-card"
              onClick={() => navigate(`/tree?highlight=${encodeURIComponent(t.teamId)}`)}
              aria-label={`${t.name} im Turnierbaum ansehen`}
            >
              <span className="badge scheduled">Gruppe {groupNameOf(state, t.groupId)}</span>
              <h2>{t.name}</h2>
              <div className="muted">
                {t.class} · {played} Spiele · {wins} Siege · {points} Punkte
              </div>
              <div className="stats stats-3">
                <div className="mini">
                  <b>{played}</b>
                  <span>Spiele</span>
                </div>
                <div className="mini">
                  <b>{wins}</b>
                  <span>Siege</span>
                </div>
                <div className="mini">
                  <b>{points}</b>
                  <span>Punkte</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
