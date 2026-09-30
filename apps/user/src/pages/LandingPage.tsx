import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  StatusBadge,
  VsOverlay,
  fieldNameOf,
  groupNameOf,
  roundOf,
  teamClassOf,
  teamNameOf,
  useTournamentData,
} from "../components/public-ui";

// Public tournament landing (spec §3). Tournament presentation only:
// current round, live games, fields, groups, leaderboard, public nav.
// No management controls exist here.
export function LandingPage() {
  const { state, loading, error, retry } = useTournamentData();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("ALL");
  const [roundId, setRoundId] = useState("ALL");
  const [vsId, setVsId] = useState<string | null>(null);

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.games.values()].filter((g) => {
      if (groupId !== "ALL") {
        const ga = state.teams.get(g.teamAId)?.groupId;
        const gb = state.teams.get(g.teamBId)?.groupId;
        if (ga !== groupId && gb !== groupId) return false;
      }
      if (roundId !== "ALL" && g.roundId !== roundId) return false;
      if (!q) return true;
      const txt =
        `${teamNameOf(state, g.teamAId)} ${teamNameOf(state, g.teamBId)} ${fieldNameOf(state, g.fieldId)} ${roundOf(state, g.roundId)?.number ?? ""}`.toLowerCase();
      return txt.includes(q);
    });
  }, [state, query, groupId, roundId]);

  const liveCount = [...state.games.values()].filter((g) => g.status === "RUNNING").length;

  const [matchFilter, setMatchFilter] = useState<"live" | "planned">("live");

  const leaderboard = useMemo(() => {
    const rows = [...state.teams.values()]
      .filter((t) => groupId === "ALL" || t.groupId === groupId)
      .map((t) => {
        let wins = 0;
        let played = 0;
        let points = 0;
        for (const g of state.games.values()) {
          if (g.status !== "FINISHED") continue;
          if (g.teamAId !== t.teamId && g.teamBId !== t.teamId) continue;
          played += 1;
          points += g.teamAId === t.teamId ? g.scoreA : g.scoreB;
          if ((g.teamAId === t.teamId && g.scoreA > g.scoreB) || (g.teamBId === t.teamId && g.scoreB > g.scoreA)) wins += 1;
        }
        return { team: t, wins, played, points };
      });
    rows.sort((a, b) => b.wins - a.wins || b.points - a.points || a.team.name.localeCompare(b.team.name));
    return rows;
  }, [state, groupId]);

  const upcoming = games.filter((g) => (matchFilter === "live" ? g.status === "RUNNING" : g.status === "SCHEDULED"));

  return (
    <section aria-label="Tournament landing" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Live-Turnier</div>
          <h1>ATIW Volleyballturnier</h1>
        </div>
        <div className="controls">
          <input
            className="input"
            placeholder="Team oder Spiel suchen …"
            aria-label="Team oder Spiel suchen"
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

      {loading ? <p role="status">Loading tournament…</p> : null}
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <button type="button" className="btn" onClick={retry}>
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid g2">
        <div>
          <div className="section-head">
            <h2>Live &amp; geplant</h2>
            <small>{liveCount} live</small>
          </div>
          <div className="seg" role="group" aria-label="Live oder geplant filtern">
            <button type="button" className={matchFilter === "live" ? "active" : ""} aria-pressed={matchFilter === "live"} onClick={() => setMatchFilter("live")}>
              ● Live
            </button>
            <button type="button" className={matchFilter === "planned" ? "active" : ""} aria-pressed={matchFilter === "planned"} onClick={() => setMatchFilter("planned")}>
              Geplant
            </button>
          </div>
          <div className="match-list">
            {upcoming.length === 0 ? <div className="card empty">Keine passenden Spiele.</div> : null}
            {upcoming.map((g) => (
              <button key={g.gameId} type="button" className="card match" onClick={() => setVsId(g.gameId)} aria-label={`${teamNameOf(state, g.teamAId)} gegen ${teamNameOf(state, g.teamBId)} öffnen`}>
                <div className="match-top">
                  <StatusBadge status={g.status} />
                  <span className="match-meta">
                    {fieldNameOf(state, g.fieldId)} · Runde {roundOf(state, g.roundId)?.number ?? "?"}
                  </span>
                </div>
                <div className="versus-rows">
                  <div className="versus-row">
                    <div>
                      <div className="team-name">{teamNameOf(state, g.teamAId)}</div>
                      <div className="team-class">{teamClassOf(state, g.teamAId)}</div>
                    </div>
                    <div className="match-score">{g.scoreA}</div>
                  </div>
                  <div className="divider" />
                  <div className="versus-row">
                    <div>
                      <div className="team-name">{teamNameOf(state, g.teamBId)}</div>
                      <div className="team-class">{teamClassOf(state, g.teamBId)}</div>
                    </div>
                    <div className="match-score">{g.scoreB}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="section-head">
            <h2>Gruppenwertung</h2>
            <Link to="/leaderboard" className="btn btn-sm">
              Alle ansehen →
            </Link>
          </div>
          <div className="card">
            <div className="leaderboard">
              {leaderboard.length === 0 ? <div className="empty">Noch keine Wertung.</div> : null}
              {leaderboard.map(({ team, wins, played, points }, i) => (
                <div className="leader" key={team.teamId}>
                  <div className="rank">{i + 1}</div>
                  <div>
                    <div className="leader-name">
                      <Link to={`/teams/${encodeURIComponent(team.teamId)}`}>{team.name}</Link>
                    </div>
                    <div className="leader-sub">
                      Gruppe {groupNameOf(state, team.groupId)} · {team.class} · {played} Spiele · {points} Punkte
                    </div>
                  </div>
                  <div className="points" aria-label={`${wins} Siege, ${points} Punkte`}>
                    {wins}
                    <span className="points-sub">{points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <VsOverlay gameId={vsId} onClose={() => setVsId(null)} />
    </section>
  );
}
