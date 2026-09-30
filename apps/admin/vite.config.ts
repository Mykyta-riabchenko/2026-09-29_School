import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Admin site (spec §1). Independent dev server on :5174.
// Separate deployment artifact in dist/admin (spec §2, §11).
// Dev proxy for runs against a real backend: reads go to the public API,
// writes + lifecycle go to the management API. The real backend splits
// them the same way (reads :8080, writes :8081), so route by path and
// use VITE_API_BASE_URL="" (relative URLs, no browser CORS).
// Targets: VITE_PROXY_PUBLIC_TARGET (else :8080) for reads,
// VITE_PROXY_ADMIN_TARGET (else :8081) for writes.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, "");
  const publicTarget =
    env.VITE_PROXY_PUBLIC_TARGET || env.VITE_PROXY_TARGET || "http://localhost:8080";
  const managementTarget =
    env.VITE_PROXY_ADMIN_TARGET || env.VITE_PROXY_TARGET || "http://localhost:8081";
  return {
    root: here,
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        "^/api/admin": { target: managementTarget, changeOrigin: true },
        "^/api/games/[^/]+/(start|end)": { target: managementTarget, changeOrigin: true },
        "/api": { target: publicTarget, changeOrigin: true },
      },
    },
    build: { outDir: resolve(here, "../../dist/admin"), emptyOutDir: true },
    envPrefix: "VITE_",
  };
});
