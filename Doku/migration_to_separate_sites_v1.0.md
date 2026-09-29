# Volleyball Tournament — Migration to Separate Public and Admin Sites v1.0

## Objective
Move from one combined admin+client application to separate deployments: a read-only public site and an operational admin/teacher site, both using the same backend.

```text
Public: https://tournament.example.com
Admin:  https://admin.example.com
API:    https://api.example.com
```

## Target responsibilities
Public: landing, games, game details, groups, teams, fields/courts, live information, results and team presentation. It uses only public GET endpoints plus `WS /ws/live`.

Admin: dashboard, CRUD for groups/teams/rounds/fields/games, game creation, dedicated score control and WebSocket synchronization.

## Routes
Public:
```text
/ /games /games/:gameId /groups /groups/:groupId /teams /teams/:teamId /fields
```
Admin:
```text
/ /games /games/new /games/:gameId /games/:gameId/score /groups /teams /rounds /fields
```
Same paths are fine because hosts differ.

## What moves to admin only
Create/edit/delete group, team, round, field and game; score increment/decrement; all teacher API calls. Public retains read-only tournament presentation and live updates.

## API client separation
Public app exposes only `GET` API functions and WebSocket. Admin app may additionally expose `/api/teacher/...` mutations. Do not share an unrestricted API client.

Recommended:
```text
public-app/src/api/public/
admin-app/src/api/public/
admin-app/src/api/teacher/
```

## Shared contracts
Create a small `packages/tournament-contracts` package containing neutral TypeScript types and pure functions:
```text
EntityId, Group, Team, Round, Field, Game, GameState, LiveEvent
```
Keep admin auth, teacher requests, score queue and admin UI out of the shared package.

## Game-state migration
Use score-derived state:
```ts
if (scoreA == null || scoreB == null) return "NOT_PLAYED";
if (scoreA >= 25 || scoreB >= 25) return "ENDED";
return "IN_PLAY";
```
Remove manual ended flags and “Mark as ended” controls from the new system.

## Repository target
```text
apps/public
apps/admin
apps/test-server
packages/tournament-contracts
packages/design-system
packages/shared-utils
```
A multi-repository equivalent is also acceptable.

## Migration phases
### 1. Freeze contract
Confirm REST endpoints, response envelopes, TypeScript models and WebSocket events. Add API tests and deterministic test server.

### 2. Extract contracts
Move neutral domain types and game-state logic to shared contracts.

### 3. Extract public site
Build new public app with Games, Groups, Teams, Fields, landing, game detail and live/team presentation. Keep it read-only.

### 4. Extract admin site
Build dashboard, CRUD screens, game creation/editing and score page.

### 5. Remove admin from public
Delete admin routes, teacher API client, mutation components and admin navigation from public app. Public must have no write calls.

### 6. Cut over
Deploy public/admin/API separately. Keep old application temporarily for rollback until smoke, scoring, WebSocket, responsive and CRUD tests pass.

## Shared design system
Share tokens and primitives such as Button, Badge, Card, Input, Select, Dialog, typography, spacing, colors and breakpoints. Keep admin-specific ScoreControl/GameEditor and public-specific VolleyballCourt/TeamFightOverlay separate.

Suggested:
```text
packages/design-system/{tokens.css,typography.css,buttons.css,forms.css,cards.css,responsive.css}
```

## WebSocket migration
Both sites may connect to `WS /ws/live`. Treat events as invalidation notifications, not state. Re-fetch REST data after an event and after reconnect. Missed events are not replayed.

## CORS and environments
API must allow both frontend origins. Public normally needs GET/OPTIONS; admin needs GET/POST/PUT/DELETE/OPTIONS. Development can use separate localhost ports. Keep API and WS URLs in environment configuration.

## Security boundary
The separation must exist in source and deployment, not only in hidden buttons. Public code should not import teacher mutation modules. Backend authorization must eventually protect `/api/teacher/...`; current no-auth behaviour should not be mistaken for security.

## SEO
Public landing/pages should have title, description, Open Graph, canonical URLs, robots and sitemap. Admin should normally be `noindex` and not part of the public sitemap.

## Analytics
Keep public visitor analytics separate from admin/operator analytics. Do not mix score-operation events with public page-view metrics.

## Caching
Use REST initial load plus WebSocket invalidation. Avoid long-lived caching for live game data. Admin mutations should immediately invalidate/update query state.

## Deep links
Both deployments must support direct routes such as:
```text
https://tournament.example.com/teams/123
https://admin.example.com/games/17/score
```
Configure the web server to return the SPA entry point for frontend routes.

## Rollback
Keep the old combined site available during migration. Rollback should be a deployment/DNS switch, not a code rewrite.

## Acceptance criteria
- separate public/admin deployments
- public is read-only
- admin has full CRUD and score page
- shared contracts isolated
- configurable API URL
- automatic game end at 25
- WebSocket works on both
- test server and endpoint tests exist
- responsive public/admin layouts
- SEO configured for public
- admin excluded from indexing
