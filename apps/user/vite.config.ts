import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// User/public site (spec §1). Independent dev server on :5173.
// Separate deployment artifact in dist/user (spec §2, §11).
export default defineConfig({
  root: here,
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: resolve(here, "../../dist/user"), emptyOutDir: true },
  envPrefix: "VITE_",
});
