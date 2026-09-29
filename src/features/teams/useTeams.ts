import { useEffect, useState } from "react";
import { getTeams } from "../../api/teamsApi";
import type { Team } from "../../domain/team";
import { ApiError } from "../../api/client";
import {
  useTournamentStore,
  hydrateStoreFromCache,
} from "../../state/store";

export interface TeamsResult {
  status: "loading" | "ready" | "error";
  error: string | null;
  // True when showing persistent cached data after a failed fetch.
  stale: boolean;
  retry: () => void;
}

export function useTeams(): TeamsResult {
  const store = useTournamentStore();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setStale(false);
      try {
        const teams: Team[] = await getTeams();
        if (cancelled) return;
        store.setTeams(teams);
        setError(null);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        // Server is the source of truth: on failure, restore the last
        // known good snapshot as a stale offline fallback.
        hydrateStoreFromCache(store);
        if (store.getSnapshot().teams.size > 0) {
          setError(
            e instanceof ApiError ? `${e.code}: ${e.message}` : "Failed to load",
          );
          setStale(true);
          setStatus("ready");
        } else {
          setStatus("error");
          setError(
            e instanceof ApiError ? `${e.code}: ${e.message}` : "Failed to load",
          );
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [store, attempt]);

  return { status, error, stale, retry: () => setAttempt((a) => a + 1) };
}
