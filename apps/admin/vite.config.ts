import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Admin site (spec §1). Independent dev server on :5174.
// Separate deployment artifact in dist/admin (spec §2, §11).
// Dev proxy for runs against a real backend: same-origin /api is
// forwarded to VITE_PROXY_TARGET (else :8081), so the browser never
// hits backend CORS. Use with VITE_API_BASE_URL="" (relative URLs).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8081";
  return {
    root: here,
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: true },
      },
    },
    build: { outDir: resolve(here, "../../dist/admin"), emptyOutDir: true },
    envPrefix: "VITE_",
  };
});
