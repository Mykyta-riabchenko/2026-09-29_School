# IMPLEMENTATION PROMPT --- SPLIT USER AND ADMIN INTO TWO SITES

Implement the Volleyball Tournament frontend as **two independent
frontend applications**.

## HARD REQUIREMENTS

Create:

``` text
apps/user
apps/admin
```

Do NOT create one SPA with `/admin`.

The applications must have:

``` text
USER
frontend: http://localhost:5173
backend:  http://localhost:8080
role:     read-only

ADMIN
frontend: http://localhost:5174
backend:  http://localhost:8081
role:     CRUD + lifecycle + generation
```

The exact frontend ports can be changed, but they must remain separate.

## START COMMANDS

Provide:

``` bash
npm run dev:user
npm run dev:admin
npm run build:user
npm run build:admin
```

Starting one application must not require the other.

## USER APPLICATION

The user application is strictly read-only.

Allowed:

-   GET public tournament data;
-   games;
-   fields/courts;
-   groups;
-   teams;
-   leaderboards;
-   game/team details;
-   public live WebSocket.

Forbidden:

-   POST/PUT/DELETE administrative operations;
-   score editing;
-   start;
-   finish;
-   game generation;
-   admin forms.

Do not hide admin functionality with CSS.

Do not add an `/admin` route.

Do not import admin modules.

Use:

``` env
VITE_API_BASE_URL=http://localhost:8080
```

Only the user application connects to:

``` text
ws://localhost:8080/ws/live
```

On WebSocket events, re-fetch affected public data. On reconnect,
perform a REST reload.

The user `/` is a public tournament landing page.

## ADMIN APPLICATION

The admin application is separate.

Allowed:

-   group CRUD;
-   team CRUD;
-   round CRUD;
-   field CRUD;
-   game CRUD;
-   score updates;
-   start game;
-   finish game;
-   round-robin generation;
-   knockout generation;
-   consolation generation;
-   score-control page.

Use:

``` env
VITE_API_BASE_URL=http://localhost:8081
```

Admin CRUD paths are `/api/admin/...`.

Lifecycle:

``` text
POST /api/games/{id}/start
POST /api/games/{id}/end
```

Generation:

``` text
POST /api/admin/rounds/{id}/generate-games/round-robin
POST /api/admin/rounds/{id}/generate-games/knockout
POST /api/admin/rounds/{id}/generate-games/consolation
```

The admin `/` is an administration dashboard.

## GAME STATUS --- DO NOT CHANGE THIS

Use the backend field:

``` text
SCHEDULED
RUNNING
FINISHED
```

Never derive status from score.

Never implement:

``` text
score > 0 -> RUNNING
score >= 25 -> FINISHED
```

Lifecycle is:

``` text
SCHEDULED -> RUNNING -> FINISHED
```

The admin score page has an explicit **Finish Game** action.

The user page has no such action.

## PROJECT STRUCTURE

Use:

``` text
apps/
  user/
    src/
      api/
      components/
      pages/
      layouts/
      hooks/
      state/
      styles/
      main.tsx
    .env.example
    package.json

  admin/
    src/
      api/
      components/
      pages/
      layouts/
      hooks/
      state/
      styles/
      main.tsx
    .env.example
    package.json

packages/
  contracts/
    src/
```

Shared code is limited to pure contracts/types/utilities. Do not share
application pages, routers, admin state, score state, or API clients in
a way that breaks the boundary.

## ROUTING

User owns its own routes:

``` text
/
/games
/games/:id
/fields
/groups
/groups/:id
/teams
/teams/:id
/leaderboard
```

Admin owns its own routes:

``` text
/
/games
/games/create
/games/:id
/games/:id/score
/groups
/teams
/rounds
/fields
```

These are different routers in different applications.

## TESTS

Add tests for:

-   user starts without admin;
-   admin starts without user;
-   user targets only `:8080`;
-   admin targets only `:8081`;
-   wrong-port calls are rejected;
-   user contains no write operations;
-   only user owns the public WebSocket;
-   status is read from backend;
-   no score-derived status logic exists;
-   user build excludes admin pages;
-   admin build excludes user-only application pages.

## PRODUCTION

Deploy as separate sites, for example:

``` text
https://tournament.example.com
https://admin.tournament.example.com
```

Do not deploy admin at `/admin` inside the public application.

## DO NOT REINTRODUCE OLD CONTRACTS

Do not reintroduce:

``` text
/api/teacher/...
```

Do not reintroduce automatic score-based game completion.

Do not combine admin and public functionality into one application.

## FINAL ACCEPTANCE TEST

This must work:

``` bash
npm run dev:user
```

and independently:

``` bash
npm run dev:admin
```

The final architecture must be:

``` text
                 BACKEND
              /                         /                      PUBLIC :8080      ADMIN :8081
             |                |
             v                v
        USER SITE          ADMIN SITE
        :5173              :5174
        READ ONLY          WRITE/CONTROL
```

Do not consider the implementation complete until this boundary is
explicit in code, configuration, routing, tests, development commands,
and deployment configuration.
