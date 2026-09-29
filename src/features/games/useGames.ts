import { useCallback, useEffect, useState } from "react";
import { getGames, getGamesByRound } from "../../api/gamesApi";
import { getFields } from "../../api/fieldsApi";
import { getRounds } from "../../api/roundsApi";
import { getTeams } from "../../api/teamsApi";
import { ApiError } from "../../api/client";
import {
  useTournamentStore,
  hydrateStoreFromCache,
  type TournamentStore,
} from "../../state/store";

async function refreshAll(store: TournamentStore) {
  const [games, teams, fields, rounds] = await Promise.all([
    getGames(),
    getTeams(),
    getFields(),
    getRounds(),
  ]);
  store.setGames(games);
  store.setTeams(teams);
  store.setFields(fields);
  store.setRounds(rounds);
}

export interface GamesOverviewResult {
  status: "loading" | "ready" | "error";
  error: string | null;
  // True when the visible games come from the persistent cache
  // because the live request failed (connection lost).
  stale: boolean;
  reload: () => void;
  refreshAll: () => Promise<void>;
}

export function useGamesOverview(
  selectedRoundId: string | null,
): GamesOverviewResult {
  const store = useTournamentStore();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setStale(false);
    try {
      if (selectedRoundId) {
        const games = await getGamesByRound(selectedRoundId);
        store.setGames(games);
        // Lookups still needed for names.
        const [teams, fields] = await Promise.all([
          getTeams(),
          getFields(),
        ]);
        store.setTeams(teams);
        store.setFields(fields);
      } else {
        await refreshAll(store);
      }
      setError(null);
      setStatus("ready");
    } catch (e) {
      const message =
        e instanceof ApiError ? `${e.code}: ${e.message}` : "Failed to load";
      // Server is the source of truth. Only when the fetch fails, restore
      // the last known good snapshot as a stale offline fallback.
      // A successful fetch above already overwrote store + cache.
      hydrateStoreFromCache(store);
      const snapshot = store.getSnapshot();
      if (snapshot.games.size > 0) {
        setError(message);
        setStale(true);
        setStatus("ready");
      } else {
        setStatus("error");
        setError(message);
      }
    }
  }, [store, selectedRoundId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    status,
    error,
    stale,
    reload: () => void load(),
    refreshAll: () => refreshAll(store),
  };
}
