// Admin live helpers (admin doc §19–§21).
// WS /ws/live carries TOURNAMENT_DATA_CHANGED events with uppercase
// entity/operation; the receiver invalidates and refetches via REST
// because missed events are never replayed. Reconnect uses exponential
// backoff (1s, 2s, 4s, 8s, …) then a full REST reload.
export {
  normalizeAdminEvent,
  validateLiveEvent,
  LIVE_EVENT_TYPES,
  type InvalidateEvent,
  type LiveEvent,
} from "../live/liveEvents";
export { getLiveSocketUrl } from "../config/api";
export { getReconnectDelay } from "../live/reconnect";
