// User site runtime config (spec §7). Single source of truth.
// All user API calls target :8080. No other backend is used here.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export function getLiveSocketUrl(baseUrl: string = API_BASE_URL): string {
  const wsBase = baseUrl.replace(/^http/, "ws");
  return `${wsBase.replace(/\/$/, "")}/ws/live`;
}
