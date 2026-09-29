import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LiveSocket, type SocketStatus } from "./liveSocket";
import { getLiveSocketUrl } from "../config/api";
import { handleInvalidateEntity, handleLiveEvent } from "./liveSync";
import {
  useTournamentStore,
  type TournamentStore,
} from "../state/store";
import { getGames } from "../api/gamesApi";
import { getGroups } from "../api/groupsApi";
import { getTeams } from "../api/teamsApi";
import { getFields } from "../api/fieldsApi";
import { getRounds } from "../api/roundsApi";

// Single app-wide live connection (WS /ws/live).
// Mounted once in App so every page receives events without navigation.
// Each valid event upserts exactly one entity by ID via
// store.applyLiveEvent: only the changed value re-renders, no page
// reload, no loading spinner, selection/scroll/focus are preserved.
const LiveStatusContext = createContext<{
  status: SocketStatus;
  retry: () => void;
}>({ status: "connecting", retry: () => {} });

export function useLiveStatus() {
  return useContext(LiveStatusContext);
}

// Silent consistency refetch after reconnect (events may have been
// missed). Writes straight into the store: no loading flags, so the
// visible list never flashes — changed rows just swap values.
async function refreshTournamentSilent(store: TournamentStore) {
  const [games, teams, fields, rounds, groups] = await Promise.all([
    getGames(),
    getTeams(),
    getFields(),
    getRounds(),
    getGroups(),
  ]);
  // Replace collections wholesale: server is the source of truth.
  // Each setter emits once; React diffs by key and updates only
  // changed rows in place.
  store.setGames(games);
  store.setTeams(teams);
  store.setFields(fields);
  store.setRounds(rounds);
  store.setGroups(groups);
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const store = useTournamentStore();
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const socketRef = useRef<LiveSocket | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const doSilentRefresh = useCallback(async () => {
    try {
      await refreshTournamentSilent(storeRef.current);
    } catch {
      // Reconnect refetch is best-effort: the socket stays alive and
      // the next valid event still applies. Never show a page-wide
      // error for a background sync.
    }
  }, []);
  const refreshRef = useRef(doSilentRefresh);
  refreshRef.current = doSilentRefresh;

  useEffect(() => {
    const socket = new LiveSocket(
      getLiveSocketUrl(),
      (event) => {
        // Backend sent an event → fetch fresh info via API, then the
        // upsert step updates cache + UI for exactly that entity.
        void handleLiveEvent(event, storeRef.current);
      },
      (s) => setStatus(s),
      () => {
        void refreshRef.current();
      },
      (entity, action, id) => {
        // Admin format: no payload, invalidate + refetch via REST.
        void handleInvalidateEntity(entity, action, id, storeRef.current);
      },
    );
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const retry = useCallback(() => {
    socketRef.current?.retry();
    // Also run a silent REST sync so the screen is correct even if
    // the socket stays down.
    void refreshRef.current();
  }, []);

  const value = useMemo(() => ({ status, retry }), [status, retry]);

  return (
    <LiveStatusContext.Provider value={value}>
      {children}
    </LiveStatusContext.Provider>
  );
}
