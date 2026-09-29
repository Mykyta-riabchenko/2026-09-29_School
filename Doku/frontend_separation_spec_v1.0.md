# Frontend Separation Specification v1.0

## Purpose

The Volleyball Tournament frontend is **two independent sites**:

``` text
User/Public Site                    Admin Site
http://localhost:5173              http://localhost:5174
        |                                   |
        v                                   v
Public API :8080                    Admin API :8081
read-only + WebSocket               CRUD + lifecycle + generation
```

This is a hard architectural boundary. Do **not** build one SPA
containing both public and admin routes.

## 1. Two applications

Required:

``` text
apps/
  user/
  admin/
```

Each application has its own:

-   entry point;
-   router;
-   API client;
-   environment file;
-   development server;
-   build command;
-   landing page;
-   deployment artifact.

They must be runnable independently.

``` bash
npm run dev:user
npm run dev:admin

npm run build:user
npm run build:admin
```

Recommended local URLs:

``` text
User:  http://localhost:5173
Admin: http://localhost:5174
```

The exact frontend ports may be changed, but they must remain different.

## 2. Production separation

Deploy separate site identities, for example:

``` text
https://tournament.example.com
https://admin.tournament.example.com
```

Do not use:

``` text
https://tournament.example.com/admin
```

as the target architecture.

The admin site must have its own root `/` and its own landing/dashboard.

## 3. User/Public frontend

The user application is **read-only**.

It may:

-   display games;
-   display live games;
-   display fields/courts;
-   display groups;
-   display teams;
-   display leaderboards;
-   display game/team details;
-   connect to the live WebSocket.

It must never:

-   create;
-   update;
-   delete;
-   start;
-   finish;
-   score;
-   generate games.

The user frontend uses only:

``` text
http://localhost:8080
```

It must not call the admin backend on `:8081`.

### Public landing

`/` is the public tournament landing.

It should contain the tournament presentation, such as:

-   current round;
-   live games;
-   fields/courts;
-   groups;
-   leaderboard;
-   public navigation.

There must be no admin controls, even hidden behind CSS.

### Public WebSocket

Only the user frontend owns:

``` text
ws://localhost:8080/ws/live
```

Startup:

1.  Load initial data through REST.
2.  Connect to WebSocket.
3.  On `TOURNAMENT_DATA_CHANGED`, re-fetch affected public data.
4.  Update the UI.

After a disconnect, reconnect and perform a normal REST reload because
missed events are not replayed.

## 4. Admin frontend

The admin application is the tournament management application.

It may:

-   create/update/delete groups;
-   create/update/delete teams;
-   create/update/delete rounds;
-   create/update/delete fields;
-   create/update/delete games;
-   update scores;
-   start games;
-   finish games;
-   generate games;
-   operate the score-control page.

The admin frontend uses:

``` text
http://localhost:8081
```

Administrative CRUD endpoints are under:

``` text
/api/admin/...
```

Lifecycle endpoints:

``` text
POST /api/games/{id}/start
POST /api/games/{id}/end
```

Generation endpoints:

``` text
POST /api/admin/rounds/{id}/generate-games/round-robin
POST /api/admin/rounds/{id}/generate-games/knockout
POST /api/admin/rounds/{id}/generate-games/consolation
```

These admin operations exist on port `8081`.

### Admin landing

The admin application's `/` is an administration dashboard.

It may show:

-   current round;
-   live/upcoming games;
-   free/occupied fields;
-   groups;
-   teams;
-   quick management actions;
-   game-generation actions.

This is not the public landing.

## 5. Game status

Status is explicit backend data:

``` text
SCHEDULED
RUNNING
FINISHED
```

**Never infer status from scores.**

Do not implement:

``` text
score > 0      => RUNNING
score >= 25    => FINISHED
```

Scores and status are independent.

Lifecycle:

``` text
SCHEDULED --start--> RUNNING --end--> FINISHED
```

The admin UI must provide **Finish Game**.

There is no automatic score-based ending and no public finish control.

## 6. Score page

The score page exists only in the admin application.

Keep the documented score workflow:

-   score display;
-   score controls;
-   optimistic UI;
-   serialized PUT queue;
-   retry/reload handling;
-   disabled controls after finish;
-   explicit Finish Game confirmation.

The public site only displays the resulting state.

## 7. Environment configuration

User:

``` env
VITE_API_BASE_URL=http://localhost:8080
```

Admin:

``` env
VITE_API_BASE_URL=http://localhost:8081
```

Use separate `.env.example` files.

Do not scatter hardcoded backend URLs through components.

## 8. Recommended project structure

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

Shared packages may contain pure TypeScript contracts/enums and pure
utilities.

Do not put admin pages, public pages, routing, score state, WebSocket
ownership, or API clients into shared application code.

## 9. Route ownership

Example user routes:

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

Example admin routes:

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

These route trees belong to different applications. There is no `/admin`
route inside the user application.

## 10. Required separation tests

The test suite must prove:

1.  `npm run dev:user` works without the admin application.
2.  `npm run dev:admin` works without the user application.
3.  User API calls target `:8080`.
4.  Admin API calls target `:8081`.
5.  Admin endpoints called on `:8080` are rejected.
6.  Public-only endpoints called on `:8081` are rejected.
7.  User code has no admin write calls.
8.  Only user code initializes `/ws/live`.
9.  Status comes from backend `status`; no score-based status derivation
    exists.
10. User and admin builds are separate and do not bundle the other
    application's pages.

## 11. Definition of done

The architecture is complete only when:

``` text
User frontend  != Admin frontend
User build     != Admin build
User router    != Admin router
User API       != Admin API
User landing   != Admin landing
User deployment != Admin deployment
```

The user site is read-only.

The admin site contains all write/control functionality.

Older `/api/teacher/...` contracts and score-derived completion behavior
must not be reintroduced.

## Source-of-truth backend boundary

Current backend contract:

``` text
Public / student API: http://localhost:8080
Admin API:            http://localhost:8081
Public WebSocket:     ws://localhost:8080/ws/live
```

The public API is read-only; the admin API performs modifications.
