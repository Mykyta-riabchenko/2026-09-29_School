import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGameById } from "../api/gamesApi";
import type { Game } from "../domain/game";
import { formatScore } from "../domain/game";
import { ApiError } from "../api/client";
import { LoadingState } from "../components/LoadingState/LoadingState";
import { ErrorState } from "../components/ErrorState/ErrorState";
import { OfflineBanner } from "../components/OfflineBanner/OfflineBanner";
import { useTournamentState } from "../state/store";
import {
  toPublicStatus,
  publicStatusLabel,
} from "../components/public/publicHelpers";

// Game details — shared design system fight-arena look (same visual language
// as the team modal): title bar, blue/red score arena, stats row.
// Read-only; scores update live from the store.
export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
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
        const g = await getGameById(decodedId);
        if (!cancelled) {
          setGame(g);
          setStale(false);
          setStatus("ready");
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === "RESOURCE_NOT_FOUND") {
          setStatus("not-found");
        } else {
          // Connection lost: fall back to the cached game so the
          // scoreboard stays visible offline.
          const cached = state.games.get(decodedId);
          if (cached) {
            setGame(cached);
            setStale(true);
            setStatus("ready");
          } else {
            setStatus("error");
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Prefer live store value so score updates appear instantly.
  const liveGame =
    game != null ? (state.games.get(game.gameId) ?? game) : null;

  if (status === "loading" && !liveGame)
    return (
      <section className="page" aria-label="Game details">
        <LoadingState label="Loading game…" />
      </section>
    );
  if (status === "not-found")
    return (
      <section className="page" aria-label="Game details">
        <ErrorState notFound message="Game not found." />
      </section>
    );
  if (status === "error" || !liveGame)
    return (
      <section className="page" aria-label="Game details">
        <ErrorState
          message="Could not load game."
          onRetry={() => window.location.reload()}
        />
      </section>
    );

  const teamA = state.teams.get(liveGame.teamAId);
  const teamB = state.teams.get(liveGame.teamBId);
  const referee = state.teams.get(liveGame.refereeTeamId);
  const field = state.fields.get(liveGame.fieldId);
  const round = state.rounds.get(liveGame.roundId);
  const s = toPublicStatus(liveGame);
  const groupNameOf = (teamId: string) => {
    const t = state.teams.get(teamId);
    if (!t) return "";
    return `${state.groups.get(t.groupId)?.name ?? t.groupId} · ${t.class}`;
  };

  return (
    <section className="page" aria-label="Game details">
      <div className="page-head">
        <div>
          <h1>Game</h1>
          <p className="sub">
            {round ? `Round ${round.number}` : "Game"} ·{" "}
            {field?.name ?? liveGame.fieldId}
          </p>
        </div>
        <span className="badge">Read only</span>
      </div>
      {stale ? <OfflineBanner /> : null}
      <div className="team-modal" style={{ width: "100%" }}>
        <div className="fight-title">
          {`${round ? `Round ${round.number}` : "Game"} · ${publicStatusLabel(s)}`}
        </div>
        <div className="score-arena">
          <div className="fighter blue">
            <div className="fighter-name">
              {teamA?.name ?? liveGame.teamAId}
            </div>
            <div className="fighter-class">
              {groupNameOf(liveGame.teamAId)}
            </div>
            <div className="big-score">{formatScore(liveGame.scoreA)}</div>
          </div>
          <div className="versus">VS</div>
          <div className="fighter red">
            <div className="fighter-name">
              {teamB?.name ?? liveGame.teamBId}
            </div>
            <div className="fighter-class">
              {groupNameOf(liveGame.teamBId)}
            </div>
            <div className="big-score">{formatScore(liveGame.scoreB)}</div>
          </div>
        </div>
        <div className="team-stats">
          <div className="stat">
            <b>{publicStatusLabel(s)}</b>
            <span>Status</span>
          </div>
          <div className="stat">
            <b>{field?.name ?? liveGame.fieldId}</b>
            <span>Field</span>
          </div>
          <div className="stat">
            <b>{round ? `Round ${round.number}` : liveGame.roundId}</b>
            <span>Round</span>
          </div>
          <div className="stat">
            <b>{referee?.name ?? liveGame.refereeTeamId}</b>
            <span>Referee team</span>
          </div>
        </div>
      </div>
    </section>
  );
}
