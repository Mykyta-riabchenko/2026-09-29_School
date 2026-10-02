# ATIW Volleyballturnier – Frontend

Two independent React frontends for the volleyball tournament, plus a local
test server. Both sites talk to a backend over REST (and the public site
additionally over WebSocket for live updates).

| Site  | Frontend         | Backend API      | Notes                          |
| ----- | ---------------- | ---------------- | ------------------------------ |
| User  | `:5173` (public) | `:8080` (read)   | Scores, bracket, courts. Read-only. |
| Admin | `:5174`          | `:8081` (manage) | Teams, games, scoring, generation.  |

## Prerequisites

- Node.js 18+ and npm (`node --version`, `npm --version`)
- A backend: either the real backend or the built-in test server (below)

## Install (from scratch)

```powershell
cd 2026-09-22_Project
npm install
```

One install at the repo root covers both sites.

## Run everything with the test server

The test server mimics the real backend (REST + live socket) and persists
its data to `test-server/data/db.json`. Serve it on **both** API ports so
each site reaches it at its default URL:

```powershell
# Terminal 1 – backend on :8080 and :8081
$env:TEST_SERVER_PORTS = "8080,8081"
npm run test-server

# Terminal 2 – public site
npm run dev:user      # http://localhost:5173

# Terminal 3 – admin site
npm run dev:admin      # http://localhost:5174
```

Without `TEST_SERVER_PORTS` the test server listens on `:4000` only, which
neither site uses by default. Reset the test data by stopping the server,
deleting `test-server/data/db.json`, and starting it again (it reseeds).

## Connect to the real backend

Each site has exactly one setting — its backend base URL:

- User: `apps/user/src/config.ts` (default `http://localhost:8080`)
- Admin: `apps/admin/src/config.ts` (default `http://localhost:8081`)

Override it per site without touching code, via env var or a gitignored
`.env` file next to the app (`apps/user/.env`, `apps/admin/.env`):

```powershell
# One-off (PowerShell)
$env:VITE_API_BASE_URL = "http://<host>:<port>"
npm run dev:user   # or dev:admin
```

```
# Persistent – apps/user/.env (same for admin)
VITE_API_BASE_URL=http://<host>:<port>
```

Rules:

- User → public **read** API, Admin → management API. Never cross them.
- **Restart the dev server** after changing the URL (it is baked in at startup).
- The user site derives its live socket from the same URL (`http` → `ws` + `/ws/live`).

### Real backend without CORS headers (proxy mode)

If the backend answers correctly via curl but the browser blocks requests
(CORS errors in the console), run the dev server as a same-origin proxy:

```
# apps/admin/.env (user site needs only the first two lines)
VITE_API_BASE_URL=
VITE_PROXY_PUBLIC_TARGET=http://<host>:<public-port>
VITE_PROXY_ADMIN_TARGET=http://<host>:<admin-port>
```

An empty `VITE_API_BASE_URL` makes the app call relative `/api/…` URLs,
which Vite forwards to the real backend — the browser never touches it
directly, so CORS disappears. Admin reads go to the public target,
writes and `/start`|`/end` go to the admin target.

## Scripts

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev:user`   | Public site on `:5173`                |
| `npm run dev:admin`  | Admin site on `:5174`                 |
| `npm run test-server`| Test backend (`:4000`, or `TEST_SERVER_PORTS`) |
| `npm test`           | Full test suite (vitest)              |
| `npm run build:user` / `build:admin` | Production builds to `dist/user`, `dist/admin` |

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| `CORS Missing Allow Origin` in console | Backend lacks CORS headers → use proxy mode above, or enable CORS backend-side |
| `404` on `/api/…` | Wrong backend port, or the backend does not implement that route — verify with `Invoke-RestMethod http://<host>:<port>/api/groups` (curl bypasses CORS) |
| `EADDRINUSE` on start | Port already taken — stop the old process: `Get-NetTCPConnection -LocalPort 5173,5174,8080,8081 -State Listen` |
| Changed URL has no effect | Dev server was not restarted after editing `.env` |
| Live badge shows offline | WebSocket unreachable — data still loads over REST; check `/ws/live` on the backend |
| `Expected array` alert | Backend answered in an unexpected shape — check the response body; generation/start/end still apply optimistically |

## Layout

```
apps/user/      Public site (port 5173, API :8080)
apps/admin/     Admin site (port 5174, API :8081)
packages/contracts/  Shared backend contract (types + mappers)
test-server/    Local fake backend (REST + /ws/live, JSON persistence)
tests/          Vitest suite (incl. frontend-separation checks)
Doku/           UI design references (v6 is source of truth)
```
