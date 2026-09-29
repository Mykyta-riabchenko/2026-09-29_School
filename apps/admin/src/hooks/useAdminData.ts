import { useCallback, useEffect, useState } from "react";
import { getFields, getGames, getGroups, getRounds, getTeams } from "../api/client";
import { useAdminStore, type AdminStore } from "../state/store";

export async function refreshAdminData(store: AdminStore): Promise<void> {
  const [games, teams, fields, rounds, groups] = await Promise.all([
    getGames(),
    getTeams(),
    getFields(),
    getRounds(),
    getGroups(),
  ]);
  store.setGames(games);
  store.setTeams(teams);
  store.setFields(fields);
  store.setRounds(rounds);
  store.setGroups(groups);
}

export function useAdminData() {
  const store = useAdminStore();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        await refreshAdminData(store);
        if (cancelled) return;
        setError(null);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const refresh = useCallback(() => refreshAdminData(store), [store]);
  return { status, error, retry, refresh };
}
