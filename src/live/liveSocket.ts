// WebSocket client with reconnect (doc §6).
// States: connecting → connected → disconnected → reconnecting
// → permanently failed/manual retry.
// After reconnecting, the caller SHOULD refetch REST collections
// to guarantee consistency (events may have been missed).

import { useEffect, useRef, useState } from "react";
import { getLiveSocketUrl } from "../config/api";
import {
  normalizeAdminEvent,
  validateLiveEvent,
  type LiveAction,
  type LiveEntity,
  type LiveEvent,
} from "./liveEvents";
import { getReconnectDelay } from "./reconnect";
import { useTournamentStore } from "../state/store";
import { handleInvalidateEntity, handleLiveEvent } from "./liveSync";

export type SocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed";

const MAX_ATTEMPTS_BEFORE_FAILED = 10;

export class LiveSocket {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private closedByUser = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private url: string,
    private onEvent: (e: LiveEvent) => void,
    private onStatus: (s: SocketStatus) => void,
    private onReconnect: () => void,
    private onAdminInvalidate?: (
      entity: LiveEntity,
      action: LiveAction,
      id: string,
    ) => void,
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
      // Refetch after reconnect: guarantees consistency.
      if (wasReconnect) this.onReconnect();
    };

    ws.onmessage = (msg) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(msg.data));
      } catch {
        // Invalid JSON event: ignore + log, keep socket alive.
        console.warn("[live] Ignoring non-JSON event");
        return;
      }
      const event = validateLiveEvent(raw);
      if (event) {
        this.onEvent(event);
        return;
      }
      // Admin/teacher format carries no payload — invalidate + refetch.
      const admin = normalizeAdminEvent(raw);
      if (admin) {
        this.onAdminInvalidate?.(admin.entity, admin.action, admin.id);
        return;
      }
      console.warn("[live] Ignoring invalid event", raw);
    };

    ws.onclose = () => {
      if (this.closedByUser) {
        this.onStatus("disconnected");
        return;
      }
      // Exponential backoff then manual retry state.
      if (this.attempt >= MAX_ATTEMPTS_BEFORE_FAILED) {
        this.onStatus("failed");
        return;
      }
      const delay = getReconnectDelay(this.attempt);
      this.attempt += 1;
      this.onStatus("reconnecting");
      this.timer = setTimeout(() => this.open(), delay);
    };

    ws.onerror = () => {
      // onclose follows onerror; backoff handled there.
    };
  }
}

// React hook wiring the socket to the tournament store.
export function useLiveSocket(opts?: {
  url?: string;
  onReconnect?: () => void;
}) {
  const store = useTournamentStore();
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const socketRef = useRef<LiveSocket | null>(null);
  const reconnectRef = useRef(opts?.onReconnect);
  reconnectRef.current = opts?.onReconnect;
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    const url = opts?.url ?? getLiveSocketUrl();
    const socket = new LiveSocket(
      url,
      (event) => {
        void handleLiveEvent(event, storeRef.current);
      },
      (s) => setStatus(s),
      () => reconnectRef.current?.(),
      (entity, action, id) => {
        void handleInvalidateEntity(entity, action, id, storeRef.current);
      },
    );
    socketRef.current = socket;
    socket.connect();
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    retry: () => socketRef.current?.retry(),
  };
}
