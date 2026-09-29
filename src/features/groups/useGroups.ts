import { useEffect, useState } from "react";
import { getGroups } from "../../api/groupsApi";
import type { Group } from "../../domain/group";
import { ApiError } from "../../api/client";
import {
  useTournamentStore,
  hydrateStoreFromCache,
} from "../../state/store";

export type AsyncStatus = "loading" | "ready" | "error" | "not-found";

export interface GroupsResult {
  status: AsyncStatus;
  error: string | null;
  // True when the UI shows persistent cached data because the live
  // REST request failed (connection lost). Pages render the stale
  // list plus an offline banner instead of a full error screen.
  stale: boolean;
  retry: () => void;
}

export function useGroups(): GroupsResult {
  const store = useTournamentStore();
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setStale(false);
      try {
        const groups: Group[] = await getGroups();
        if (cancelled) return;
        store.setGroups(groups);
        setError(null);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === "RESOURCE_NOT_FOUND") {
          setStatus("not-found");
          return;
        }
        // Server is the source of truth. Only when the fetch fails, fall
        // back to the persistent cache (offline mode). A successful fetch
        // above already overwrote both store and cache via setGroups.
        hydrateStoreFromCache(store);
        if (store.getSnapshot().groups.size > 0) {
          setError(e instanceof Error ? e.message : "Failed to load groups");
          setStale(true);
          setStatus("ready");
        } else {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Failed to load groups");
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
