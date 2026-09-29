import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminApiError, getGameById, saveGameScore } from "../api/client";
import { useAdminState, useAdminStore } from "../state/store";
import type { Id } from "../../../../packages/contracts/src/index";

// Serialized score queue (spec §6).
// click -> optimistic UI -> queue op -> PUT complete game -> wait -> next.
// Same-game requests are serialized, never parallel. Failed ops stay
// queued with retry/reload. Controls are disabled after FINISHED.
// Status comes from backend `status`; no score inspection here.
export type ScoreTeam = "A" | "B";

interface ScoreOp {
  team: ScoreTeam;
  delta: 1 | -1;
}

export function useScoreQueue(gameId: Id) {
  const store = useAdminStore();
  const state = useAdminState();
  const confirmed = state.games.get(gameId) ?? null;

  const queueRef = useRef<ScoreOp[]>([]);
  const busyRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const storeRef = useRef(store);
  storeRef.current = store;

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

  const pump = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    bump();
    try {
      for (;;) {
        const head = queueRef.current[0];
        if (!head) break;
        const snap = storeRef.current.getSnapshot();
        const current = snap.games.get(gameId);
        if (!current) break;
        const targetA = head.team === "A" ? Math.max(0, current.scoreA + head.delta) : current.scoreA;
        const targetB = head.team === "B" ? Math.max(0, current.scoreB + head.delta) : current.scoreB;
        try {
          const saved = await saveGameScore(current.gameId, {
            roundId: current.roundId,
            fieldId: current.fieldId,
            teamAId: current.teamAId,
            teamBId: current.teamBId,
            refereeTeamId: current.refereeTeamId,
            scoreA: targetA,
            scoreB: targetB,
          });
          storeRef.current.upsertGame(saved);
          queueRef.current = queueRef.current.slice(1);
          setError(null);
        } catch (e) {
          setError(e instanceof AdminApiError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : "Could not save score.");
          break;
        } finally {
          bump();
        }
      }
    } finally {
      busyRef.current = false;
      bump();
    }
  }, [gameId, bump]);

  const enqueue = useCallback(
    (team: ScoreTeam, delta: 1 | -1) => {
      setError(null);
      const snap = storeRef.current.getSnapshot();
      const current = snap.games.get(gameId);
      const finished = current?.status === "FINISHED";
      if (finished) return;
      const pend = queueRef.current.reduce((s, o) => s + (o.team === team ? o.delta : 0), 0);
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
    void (async () => {
      try {
        const fresh = await getGameById(gameId);
        queueRef.current = [];
        setError(null);
        storeRef.current.upsertGame(fresh);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reload game.");
      } finally {
        bump();
      }
    })();
  }, [gameId, bump]);

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
