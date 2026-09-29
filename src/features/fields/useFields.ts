import { useEffect, useState } from "react";
import { getFields } from "../../api/fieldsApi";
import { getGames } from "../../api/gamesApi";
import { getRounds } from "../../api/roundsApi";
import { getTeams } from "../../api/teamsApi";
import { ApiError } from "../../api/client";
import {
  useTournamentStore,
  hydrateStoreFromCache,
} from "../../state/store";

export interface FieldsOverviewResult {
  status: "loading" | "ready" | "error";
  error: string | null;
  // True when the visible courts come from the persistent cache
  // because the live request failed (connection lost).
  stale: boolean;
  retry: () => void;
}

// Loads everything the Fields / live-courts screen needs: fields,
// games (grouped per court), plus team/round lookups for names.
export function useFieldsOverview(): FieldsOverviewResult {
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
        const [fields, games, teams, rounds] = await Promise.all([
          getFields(),
          getGames(),
          getTeams(),
          getRounds(),
        ]);
        if (cancelled) return;
        store.setFields(fields);
        store.setGames(games);
        store.setTeams(teams);
        store.setRounds(rounds);
        setError(null);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        // Server is the source of truth: on failure, restore the last
        // known good snapshot as a stale offline fallback.
        hydrateStoreFromCache(store);
        if (store.getSnapshot().fields.size > 0) {
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
