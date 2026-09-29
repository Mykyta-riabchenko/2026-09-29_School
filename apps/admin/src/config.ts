// Admin site runtime config (spec §7). Single source of truth.
// All admin API calls target :8081. No hardcoded URLs in components.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
