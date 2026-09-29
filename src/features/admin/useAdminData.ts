import { useCallback, useEffect, useState } from "react";
import { getGames } from "../../api/gamesApi";
import { getGroups } from "../../api/groupsApi";
import { getTeams } from "../../api/teamsApi";
import { getFields } from "../../api/fieldsApi";
import { getRounds } from "../../api/roundsApi";
import {
  useTournamentStore,
  type TournamentStore,
} from "../../state/store";

// Shared loader for admin pages: fetches every collection once (server
// is the source of truth) and replaces the store. Admin mutations then
// upsert single entities, so all screens — public and admin — update
// silently through the same store.
export interface AdminDataResult {
  status: "loading" | "ready" | "error";
  error: string | null;
  retry: () => void;
  refresh: () => Promise<void>;
}

export async function refreshAdminData(store: TournamentStore): Promise<void> {
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

export function useAdminData(): AdminDataResult {
  const store = useTournamentStore();
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
