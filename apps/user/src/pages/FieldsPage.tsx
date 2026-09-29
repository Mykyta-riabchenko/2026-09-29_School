import { useMemo, useState } from "react";
import { StatusBadge, VsOverlay, fieldNameOf, roundOf, teamNameOf, useTournamentData } from "../components/public-ui";

export function FieldsPage() {
  const { state, loading, error, retry } = useTournamentData();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("ALL");
  const [vsId, setVsId] = useState<string | null>(null);

  const fields = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.fields.values()].filter((f) => {
      const names = [...state.games.values()]
        .filter((g) => g.fieldId === f.fieldId)
        .map((g) => `${teamNameOf(state, g.teamAId)} ${teamNameOf(state, g.teamBId)}`)
        .join(" ");
      return `${f.name} ${names}`.toLowerCase().includes(q);
    });
  }, [state, query]);

  if (loading) return <p role="status">Loading fields…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      </div>
    );

  const visible = fields.filter((f) => {
    if (groupId === "ALL") return true;
    const g = [...state.games.values()].find((x) => x.fieldId === f.fieldId && x.status !== "FINISHED");
    if (!g) return false;
    return state.teams.get(g.teamAId)?.groupId === groupId || state.teams.get(g.teamBId)?.groupId === groupId;
  });

  return (
    <section aria-label="Fields" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Live-Courts</div>
          <h1>Spielfelder</h1>
        </div>
        <div className="controls">
          <input
            className="input"
            placeholder="Feld oder Team suchen …"
            aria-label="Felder suchen"
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
      <div className="court-list">
        {visible.length === 0 ? <div className="card empty">Keine Felder gefunden.</div> : null}
        {visible.map((f) => {
          const g =
            [...state.games.values()].find((x) => x.fieldId === f.fieldId && x.status === "RUNNING") ??
            [...state.games.values()].find((x) => x.fieldId === f.fieldId && x.status === "SCHEDULED") ??
            null;
          return (
            <button
              key={f.fieldId}
              type="button"
              className="card court-card"
              onClick={() => (g ? setVsId(g.gameId) : undefined)}
              disabled={!g}
              aria-label={g ? `${f.name}: ${teamNameOf(state, g.teamAId)} gegen ${teamNameOf(state, g.teamBId)}` : `${f.name}: frei`}
            >
              <div className="court-head">
                <h2>{f.name}</h2>
                {g ? <StatusBadge status={g.status} /> : <span className="badge scheduled">FREI</span>}
              </div>
              <div className="court" aria-hidden="true">
                {g ? (
                  <>
                    <div className="court-side">
                      {teamNameOf(state, g.teamAId)}
                      <div className="court-score">{g.scoreA}</div>
                    </div>
                    <div className="court-side">
                      {teamNameOf(state, g.teamBId)}
                      <div className="court-score">{g.scoreB}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="court-side">FREI</div>
                    <div className="court-side">—</div>
                  </>
                )}
              </div>
              <div className="court-foot">
                {g
                  ? `Runde ${roundOf(state, g.roundId)?.number ?? "?"} · Schiri: ${teamNameOf(state, g.refereeTeamId)} · ${fieldNameOf(state, g.fieldId)}`
                  : "Kein aktives Spiel"}
              </div>
            </button>
          );
        })}
      </div>
      <VsOverlay gameId={vsId} onClose={() => setVsId(null)} />
    </section>
  );
}
