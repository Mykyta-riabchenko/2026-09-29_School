import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Admin site (spec §1). Independent dev server on :5174.
// Separate deployment artifact in dist/admin (spec §2, §11).
export default defineConfig({
  root: here,
  plugins: [react()],
  server: { port: 5174 },
  build: { outDir: resolve(here, "../../dist/admin"), emptyOutDir: true },
  envPrefix: "VITE_",
});
