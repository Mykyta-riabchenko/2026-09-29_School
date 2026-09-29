// Backend URL configuration (admin doc §2 + frontend doc §12).
// Single source of truth — no React component may contain an API IP or URL.
//
//   VITE_API_BASE_URL=http://localhost:8080   (local backend, default)
//   VITE_API_BASE_URL=http://localhost:4000   (local test server, `npm run test-server`)
//   VITE_API_BASE_URL=https://api.example.com (production)
//
// The admin app may run on a separate host (e.g. https://admin.example.com)
// while the public app runs on https://tournament.example.com; both read
// the backend address from this module only.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
