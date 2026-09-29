// Public live sync (spec §3). Only the user app owns ws://.../ws/live.
// Flow: load initial data via REST, connect socket, on
// TOURNAMENT_DATA_CHANGED re-fetch affected public data, update UI.
// After a disconnect, reconnect and do a normal REST reload because
// missed events are not replayed.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getLiveSocketUrl } from "../config";
import { getFields, getGames, getGroups, getRounds, getTeams } from "../api/client";
import { useTournamentStore, type TournamentStore } from "../state/store";

export type SocketStatus = "connecting" | "connected" | "reconnecting" | "failed" | "disconnected";

export function getReconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 15000);
}

interface InvalidateMsg {
  entity: string;
  operation: string;
  entityId: string | number;
}

function parseInvalidate(raw: unknown): InvalidateMsg | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (v.type !== "TOURNAMENT_DATA_CHANGED") return null;
  if (typeof v.entity !== "string" || typeof v.operation !== "string") return null;
  if (typeof v.entityId !== "string" && typeof v.entityId !== "number") return null;
  return { entity: v.entity, operation: v.operation, entityId: v.entityId };
}

async function reloadAll(store: TournamentStore) {
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

class LiveSocket {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private closedByUser = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private url: string,
    private onInvalidate: () => void,
    private onStatus: (s: SocketStatus) => void,
    private onReconnectReload: () => void,
  ) {}
  connect() {
    this.closedByUser = false;
    this.attempt = 0;
    this.open();
  }
  disconnect() {
    this.closedByUser = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }
  retry() {
    this.attempt = 0;
    this.open();
  }
  private open() {
    this.onStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      const wasReconnect = this.attempt > 0;
      this.attempt = 0;
      this.onStatus("connected");
      if (wasReconnect) this.onReconnectReload();
    };
    ws.onmessage = (msg) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(msg.data));
      } catch {
        return;
      }
      const inv = parseInvalidate(raw);
      if (inv) {
        this.onInvalidate();
        return;
      }
    };
    ws.onclose = () => {
      if (this.closedByUser) {
        this.onStatus("disconnected");
        return;
      }
      if (this.attempt >= 10) {
        this.onStatus("failed");
        return;
      }
      const delay = getReconnectDelay(this.attempt);
      this.attempt += 1;
      this.onStatus("reconnecting");
      this.timer = setTimeout(() => this.open(), delay);
    };
  }
}

const LiveStatusCtx = createContext<{ status: SocketStatus; retry: () => void }>({
  status: "connecting",
  retry: () => {},
});

export function useLiveStatus() {
  return useContext(LiveStatusCtx);
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const store = useTournamentStore();
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const socketRef = useRef<LiveSocket | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const doReload = useCallback(async () => {
    try {
      await reloadAll(storeRef.current);
    } catch {
      // best-effort background sync
    }
  }, []);
  const reloadRef = useRef(doReload);
  reloadRef.current = doReload;

  useEffect(() => {
    const socket = new LiveSocket(
      getLiveSocketUrl(),
      () => {
        void reloadRef.current();
      },
      (s) => setStatus(s),
      () => {
        void reloadRef.current();
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
    void reloadRef.current();
  }, []);

  const value = useMemo(() => ({ status, retry }), [status, retry]);
  return React.createElement(LiveStatusCtx.Provider, { value }, children);
}
