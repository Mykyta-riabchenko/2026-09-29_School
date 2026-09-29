import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFields, getGames, getGroups, getRounds, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";
import { useLiveStatus } from "../live/live";
import { statusLabel } from "../components/status";
import { sortRoundsByNumber } from "../../../../packages/contracts/src/index";

// Public tournament landing (spec §3). Tournament presentation only:
// current round, live games, fields, groups, leaderboard, public nav.
// No management controls exist here.
export function LandingPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const live = useLiveStatus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [games, teams, fields, rounds, groups] = await Promise.all([
          getGames(),
          getTeams(),
          getFields(),
          getRounds(),
          getGroups(),
        ]);
        if (cancelled) return;
        store.setGames(games);
        store.setTeams(teams);
        store.setFields(fields);
        store.setRounds(rounds);
        store.setGroups(groups);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, attempt]);

  const games = [...state.games.values()];
  const rounds = sortRoundsByNumber([...state.rounds.values()]);
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const liveGames = games.filter((g) => g.status === "RUNNING");
  const leaderboard = [...state.teams.values()]
    .map((t) => {
      let wins = 0;
      let played = 0;
      for (const g of games) {
        if (g.status !== "FINISHED") continue;
        if (g.teamAId !== t.teamId && g.teamBId !== t.teamId) continue;
        played += 1;
        const aWon = g.scoreA > g.scoreB && g.teamAId === t.teamId;
        const bWon = g.scoreB > g.scoreA && g.teamBId === t.teamId;
        if (aWon || bWon) wins += 1;
      }
      return { team: t, wins, played };
    })
    .sort((a, b) => b.wins - a.wins || a.team.name.localeCompare(b.team.name))
    .slice(0, 8);

  const teamName = (id: string) => state.teams.get(id)?.name ?? id;
  const fieldName = (id: string) => state.fields.get(id)?.name ?? id;

  return (
    <section aria-label="Tournament landing">
      <h1>Tournament</h1>
      <p className="live-banner" aria-live="polite">
        <span className={live.status === "connected" ? "live-dot" : "live-dot live-dot--bad"} aria-hidden="true" />
        Live tournament overview. Live: {live.status}{" "}
        {live.status === "failed" || live.status === "disconnected" ? (
          <button type="button" onClick={live.retry}>
            Reconnect
          </button>
        ) : null}
      </p>
      {loading ? (
        <p role="status">Loading tournament…</p>
      ) : null}
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <button type="button" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </div>
      ) : null}
      <h2>Current round</h2>
      <p>{currentRound ? `Round ${currentRound.number}` : "No rounds yet"}</p>
      <h2>Live games</h2>
      {liveGames.length === 0 ? (
        <p>No live games right now.</p>
      ) : (
        <ul>
          {liveGames.map((g) => (
            <li key={g.gameId}>
              <Link to={`/games/${encodeURIComponent(g.gameId)}`}>
                {teamName(g.teamAId)} {g.scoreA} : {g.scoreB} {teamName(g.teamBId)} · {fieldName(g.fieldId)} · {statusLabel(g.status)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2>Fields</h2>
      {[...state.fields.values()].length === 0 ? (
        <p>No fields yet.</p>
      ) : (
        <ul>
          {[...state.fields.values()].map((f) => (
            <li key={f.fieldId}>{f.name}</li>
          ))}
        </ul>
      )}
      <h2>Groups</h2>
      {[...state.groups.values()].length === 0 ? (
        <p>No groups yet.</p>
      ) : (
        <ul>
          {[...state.groups.values()].map((g) => (
            <li key={g.groupId}>
              <Link to={`/groups/${encodeURIComponent(g.groupId)}`}>{g.name}</Link>
            </li>
          ))}
        </ul>
      )}
      <h2>Leaderboard</h2>
      {leaderboard.length === 0 ? (
        <p>No leaderboard entries yet.</p>
      ) : (
        <ul>
          {leaderboard.map(({ team, wins, played }) => (
            <li key={team.teamId}>
              <Link to={`/teams/${encodeURIComponent(team.teamId)}`}>{team.name}</Link> · {wins} wins / {played} played
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Footer">
        <Link to="/games">Games</Link> | <Link to="/fields">Fields</Link> |{" "}
        <Link to="/groups">Groups</Link> | <Link to="/teams">Teams</Link> |{" "}
        <Link to="/leaderboard">Leaderboard</Link>
      </nav>
    </section>
  );
}
