import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// User/public site (spec §1). Independent dev server on :5173.
// Separate deployment artifact in dist/user (spec §2, §11).
// Dev proxy for runs against a real backend: same-origin /api + /ws/live
// are forwarded to VITE_PROXY_TARGET (else :8080), so the browser never
// hits backend CORS. Use with VITE_API_BASE_URL="" (relative URLs).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8080";
  return {
    root: here,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: true },
        "/ws/live": {
          target: proxyTarget.replace(/^http/, "ws"),
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: { outDir: resolve(here, "../../dist/user"), emptyOutDir: true },
    envPrefix: "VITE_",
  };
});
