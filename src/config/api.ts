// Public config entry (frontend doc §12).
// Single source of truth for the backend URL. All API clients MUST use
// this value; do not hard-code the backend URL in API functions or
// components. To test against the local test server, set:
//   VITE_API_BASE_URL=http://localhost:4000
// The rest of the frontend code MUST remain unchanged.
export { API_BASE_URL } from "./runtime";

// Derived WebSocket URL for WS /ws/live (frontend doc §6, admin doc §19).
// Converts http(s) -> ws(s) and appends /ws/live.
import { API_BASE_URL } from "./runtime";

export function getLiveSocketUrl(baseUrl: string = API_BASE_URL): string {
  const wsBase = baseUrl.replace(/^http/, "ws");
  return `${wsBase.replace(/\/$/, "")}/ws/live`;
}
