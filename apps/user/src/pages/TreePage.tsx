import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { VsOverlay, teamNameOf, useTournamentData } from "../components/public-ui";

// Turnierbaum — v6 tree design, fixed: filter matches either team side,
// stable round ordering, keyboard-accessible highlight, no CSS nth-hacks.
export function TreePage() {
  const { state, loading, error, retry } = useTournamentData();
  const [params, setParams] = useSearchParams();
  const highlight = params.get("highlight");
  const [groupId, setGroupId] = useState("ALL");
  const [vsId, setVsId] = useState<string | null>(null);

  const rounds = useMemo(() => [...state.rounds.values()].sort((a, b) => a.number - b.number), [state]);

  // Last 4 rounds get final names, earlier ones get bracket fractions
  // (1/16, 1/32, ...) counted back from the final.
  function phaseName(index: number, total: number): string {
    const fromEnd = total - 1 - index;
    const finals = ["Finale", "Halbfinale", "Viertelfinale", "Achtelfinale"];
    if (fromEnd < finals.length) return finals[fromEnd];
    return `1/${2 ** fromEnd}`;
  }

  function setHighlight(id: string) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (next.get("highlight") === id) next.delete("highlight");
      else next.set("highlight", id);
      return next;
    });
  }

  if (loading) return <p role="status">Loading Turnierbaum…</p>;
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
    <section aria-label="Tournament bracket" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Turnierbaum</div>
          <h1>Turnierbaum</h1>
        </div>
        <div className="controls">
          <select className="select" aria-label="Gruppe filtern" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="ALL">Alle Gruppen</option>
            {[...state.groups.values()].map((g) => (
              <option key={g.groupId} value={g.groupId}>
                Gruppe {g.name}
              </option>
            ))}
          </select>
          {highlight ? (
            <button type="button" className="btn" onClick={() => setHighlight(highlight)}>
              Markierung aufheben
            </button>
          ) : null}
        </div>
      </div>
      <div className="card tree-shell">
        <div className="tree-scroll">
          <div className="tree">
            {rounds.map((r, i) => {
              const games = [...state.games.values()].filter((g) => {
                if (g.roundId !== r.roundId) return false;
                if (groupId === "ALL") return true;
                return (
                  state.teams.get(g.teamAId)?.groupId === groupId || state.teams.get(g.teamBId)?.groupId === groupId
                );
              });
              return (
                <div className="round-col" key={r.roundId}>
                  <div className="round-label">
                    <strong>{phaseName(i, rounds.length)}</strong>
                    <span>Runde {r.number}</span>
                  </div>
                  {games.length === 0 ? <div className="empty">Keine Paarung</div> : null}
                  {games.map((g) => (
                    <div key={g.gameId} className="tree-match">
                      {(
                        [
                          { side: g.teamAId, score: g.scoreA, other: g.scoreB },
                          { side: g.teamBId, score: g.scoreB, other: g.scoreA },
                        ] as const
                      ).map((row) => (
                        <button
                          key={row.side}
                          type="button"
                          className={`tree-team ${row.score > row.other ? "winner" : ""} ${highlight === row.side ? "highlight" : ""}`}
                          data-team={row.side}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHighlight(row.side);
                          }}
                          onDoubleClick={() => setVsId(g.gameId)}
                          aria-pressed={highlight === row.side}
                          aria-label={`${teamNameOf(state, row.side)} markieren`}
                        >
                          <span>{teamNameOf(state, row.side)}</span>
                          <span className="tree-score">{row.score}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn"
                        style={{ width: "100%", minHeight: 32, borderRadius: "0 0 12px 12px", border: 0, borderTop: "1px solid var(--line)" }}
                        onClick={() => setVsId(g.gameId)}
                        aria-label={`Spiel ${teamNameOf(state, g.teamAId)} gegen ${teamNameOf(state, g.teamBId)} im VS öffnen`}
                      >
                        VS öffnen
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <VsOverlay gameId={vsId} onClose={() => setVsId(null)} />
    </section>
  );
}
