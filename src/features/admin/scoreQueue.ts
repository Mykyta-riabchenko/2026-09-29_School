import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateTeacherGame } from "../../api/teacher/games";
import { TeacherApiError } from "../../api/teacher/errors";
import { getGameById } from "../../api/gamesApi";
import {
  useTournamentStore,
  useTournamentState,
} from "../../state/store";
import type { Id } from "../../domain/group";

export type ScoreTeam = "A" | "B";

interface ScoreOp {
  team: ScoreTeam;
  delta: 1 | -1;
}

// Serialized score queue (admin doc §11, §21, §24).
//
// The Teacher API updates a game with a complete PUT, so rapid clicks
// must never fly as parallel PUTs (race → lost points). Flow:
//
//   click → optimistic UI update → queue op → PUT complete game →
//   wait → next queued op
//
// State model: displayed = confirmed server state + pending local ops.
// A WS GAME UPDATE arriving mid-queue only moves `confirmed` (via the
// store); pending deltas are re-applied on top, so the display never
// rolls back (§21). Scores never go below zero.
export interface ScoreQueue {
  scoreA: number;
  scoreB: number;
  pendingCount: number;
  saving: boolean;
  error: string | null;
  incrementA: () => void;
  decrementA: () => void;
  incrementB: () => void;
  decrementB: () => void;
  retry: () => void;
  reload: () => void;
}

export function useScoreQueue(gameId: Id): ScoreQueue {
  const store = useTournamentStore();
  const state = useTournamentState();
  const confirmed = state.games.get(gameId) ?? null;

  const queueRef = useRef<ScoreOp[]>([]);
  const busyRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const storeRef = useRef(store);
  storeRef.current = store;

  // Pending deltas summed per team (read during render only).
  const pendingA = useMemo(
    () => queueRef.current.reduce((s, o) => s + (o.team === "A" ? o.delta : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, gameId],
  );
  const pendingB = useMemo(
    () => queueRef.current.reduce((s, o) => s + (o.team === "B" ? o.delta : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, gameId],
  );

  const baseA = confirmed?.scoreA ?? 0;
  const baseB = confirmed?.scoreB ?? 0;
  const scoreA = Math.max(0, baseA + pendingA);
  const scoreB = Math.max(0, baseB + pendingB);
  const pendingCount = queueRef.current.length;
  const saving = busyRef.current && pendingCount > 0;

  // Drain the queue one op per PUT. Each PUT carries the complete game
  // with the head op applied to the latest confirmed state, chained on
  // the previous success — never parallel for the same game. Rapid
  // clicks therefore reach the backend as sequential PUTs (1,2,3…).
  const pump = useCallback(async () => {
    if (busyRef.current) return;
    const run = async () => {
      busyRef.current = true;
      bump();
      try {
        for (;;) {
          const head = queueRef.current[0];
          if (!head) break;
          const snap = storeRef.current.getSnapshot();
          const current = snap.games.get(gameId);
          if (!current) break;
          const targetA =
            head.team === "A"
              ? Math.max(0, (current.scoreA ?? 0) + head.delta)
              : (current.scoreA ?? 0);
          const targetB =
            head.team === "B"
              ? Math.max(0, (current.scoreB ?? 0) + head.delta)
              : (current.scoreB ?? 0);
          try {
            const saved = await updateTeacherGame(current.gameId, {
              roundId: current.roundId,
              fieldId: current.fieldId,
              teamAId: current.teamAId,
              teamBId: current.teamBId,
              refereeTeamId: current.refereeTeamId,
              scoreA: targetA,
              scoreB: targetB,
            });
            // Server response is authoritative: replace confirmed and
            // drop the op this PUT covered.
            storeRef.current.upsertGame(saved);
            queueRef.current = queueRef.current.slice(1);
            setError(null);
          } catch (e) {
            // Failed op stays queued (never silently lost); UI shows
            // retry. The loop stops until the operator retries.
            setError(
              e instanceof TeacherApiError
                ? `${e.code}: ${e.message}`
                : e instanceof Error
                  ? e.message
                  : "Could not save score.",
            );
            break;
          } finally {
            bump();
          }
        }
      } finally {
        busyRef.current = false;
        bump();
      }
    };
    void run();
  }, [gameId, bump]);

  const enqueue = useCallback(
    (team: ScoreTeam, delta: 1 | -1) => {
      setError(null);
      // Zero protection on the displayed value (confirmed + pending).
      const snap = storeRef.current.getSnapshot();
      const current = snap.games.get(gameId);
      const pend = queueRef.current.reduce(
        (s, o) => s + (o.team === team ? o.delta : 0),
        0,
      );
      const cur = team === "A" ? (current?.scoreA ?? 0) : (current?.scoreB ?? 0);
      if (cur + pend + delta < 0) return;
      queueRef.current = [...queueRef.current, { team, delta }];
      bump();
      void pump();
    },
    [gameId, pump, bump],
  );

  const retry = useCallback(() => {
    setError(null);
    void pump();
  }, [pump]);

  const reload = useCallback(() => {
    // Operator chose server truth: refetch confirmed and drop pending.
    void (async () => {
      try {
        const fresh = await getGameById(gameId);
        queueRef.current = [];
        setError(null);
        storeRef.current.upsertGame(fresh);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not reload game.",
        );
      } finally {
        bump();
      }
    })();
  }, [gameId, bump]);

  // Drop queue state when switching games.
  useEffect(() => {
    queueRef.current = [];
    busyRef.current = false;
    setError(null);
  }, [gameId]);

  return {
    scoreA,
    scoreB,
    pendingCount,
    saving,
    error,
    incrementA: () => enqueue("A", 1),
    decrementA: () => enqueue("A", -1),
    incrementB: () => enqueue("B", 1),
    decrementB: () => enqueue("B", -1),
    retry,
    reload,
  };
}
