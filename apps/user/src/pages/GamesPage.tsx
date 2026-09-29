import { useMemo, useState } from "react";
import { StatusBadge, VsOverlay, fieldNameOf, roundOf, teamNameOf, useTournamentData } from "../components/public-ui";

export function GamesPage() {
  const { state, loading, error, retry } = useTournamentData();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("ALL");
  const [roundId, setRoundId] = useState("ALL");
  const [vsId, setVsId] = useState<string | null>(null);

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.games.values()].filter((g) => {
      if (roundId !== "ALL" && g.roundId !== roundId) return false;
      if (groupId !== "ALL") {
        const ga = state.teams.get(g.teamAId)?.groupId;
        const gb = state.teams.get(g.teamBId)?.groupId;
        if (ga !== groupId && gb !== groupId) return false;
      }
      if (!q) return true;
      const txt =
        `${teamNameOf(state, g.teamAId)} ${teamNameOf(state, g.teamBId)} ${fieldNameOf(state, g.fieldId)} Runde ${roundOf(state, g.roundId)?.number ?? ""}`.toLowerCase();
      return txt.includes(q);
    });
  }, [state, query, groupId, roundId]);

  if (loading) return <p role="status">Loading games…</p>;
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
    <section aria-label="Games" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Spielplan</div>
          <h1>Spiele</h1>
        </div>
        <div className="controls">
          <input
            className="input"
            placeholder="Team, Feld oder Runde …"
            aria-label="Spiele suchen"
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
          <select className="select" aria-label="Runde filtern" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
            <option value="ALL">Alle Runden</option>
            {[...state.rounds.values()]
              .sort((a, b) => a.number - b.number)
              .map((r) => (
                <option key={r.roundId} value={r.roundId}>
                  Runde {r.number}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="schedule-list">
          {games.length === 0 ? <div className="empty">Keine Spiele.</div> : null}
          {games.map((g) => (
            <button key={g.gameId} type="button" className="schedule-item" onClick={() => setVsId(g.gameId)}>
              <div className="schedule-round">
                Runde {roundOf(state, g.roundId)?.number ?? "?"}
                <div className="schedule-sub">{fieldNameOf(state, g.fieldId)}</div>
              </div>
              <div className="schedule-teams">
                <b>{teamNameOf(state, g.teamAId)}</b>
                <br />
                {teamNameOf(state, g.teamBId)}
              </div>
              <div className="schedule-score">
                {g.scoreA}:{g.scoreB}
                <div style={{ marginTop: 5 }}>
                  <StatusBadge status={g.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <VsOverlay gameId={vsId} onClose={() => setVsId(null)} />
    </section>
  );
}
