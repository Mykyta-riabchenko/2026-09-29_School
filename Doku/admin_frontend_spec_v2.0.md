# Volleyball Tournament — Admin Frontend Specification v2.0

## Purpose
Separate admin/teacher application for tournament CRUD and live scoring. The public application is read-only and runs separately.

## Deployment
```text
Public: https://tournament.example.com
Admin:  https://admin.example.com
API:    https://api.example.com
```
Use `VITE_API_BASE_URL`; never hard-code the API URL in components.

## Canonical TypeScript types
```ts
export type EntityId = string;
export interface Group { groupId: EntityId; name: string; }
export interface Team { teamId: EntityId; groupId: EntityId; class: string; name: string; }
export interface Round { roundId: EntityId; number: number; }
export interface Field { fieldId: EntityId; name: string; }
export interface Game {
  gameId: EntityId; roundId: EntityId; fieldId: EntityId;
  teamAId: EntityId; teamBId: EntityId; refereeTeamId: EntityId;
  scoreA: number | null; scoreB: number | null;
}
```
Teacher request IDs are numbers; response IDs are strings. Convert at the API boundary.

## Game lifecycle
```ts
export type GameState = "NOT_PLAYED" | "IN_PLAY" | "ENDED";
export function getGameState(game: Game): GameState {
  if (game.scoreA == null || game.scoreB == null) return "NOT_PLAYED";
  if (game.scoreA >= 25 || game.scoreB >= 25) return "ENDED";
  return "IN_PLAY";
}
```
`null`/`undefined` score = not played; initiated score below 25 = in play; either score reaching 25 = ended. There is no manual “mark ended” button.

## Required routes
```text
/dashboard
/games
/games/new
/games/:gameId
/games/:gameId/score
/teams
/teams/:teamId
/groups
/rounds
/fields
```

## Games page
Search by team, filter by round/field/state, create/open/score/edit/delete. Show round, field, referee and derived state. Never show a manual end action.

## Create game
Fields: round, field, Team A, Team B, referee team, initial score A/B.
```json
{"roundId":1,"fieldId":1,"teamAId":1,"teamBId":2,"refereeTeamId":3,"scoreA":0,"scoreB":0}
```
Validate all references, Team A != Team B, referee differs from both, scores >= 0. Backend remains authoritative.

## Score page
`/games/:gameId/score` must work on phone, tablet, desktop and large screens. Use large touch targets:
```css
.scoreButton { min-width:68px; min-height:68px; border-radius:12px; font-size:28px; font-weight:800; }
```
Decrement with `Math.max(0, score - 1)`.

## Score persistence
Current API uses full-object `PUT /api/teacher/games/{id}`. Serialize writes for one game:
```text
click -> optimistic UI -> queue PUT -> wait -> next queued operation
```
Do not send uncontrolled parallel PUTs. Recommended future endpoint: `POST /api/teacher/games/{id}/score` with `{team:"A",delta:1}` for atomic scoring.

## Fields page
Show every field, current game if any, score and derived state. Distinguish occupied and free fields. Provide edit/delete; open current game.

## Groups, teams and rounds
Groups: CRUD, alphabetical order. Teams: group/class/name, alphabetical by name. Rounds: numeric ordering, not lexical ordering. Use `class: string`, never `clazz` internally.

## Delete behaviour
Confirm destructive actions. `204` removes locally; `404` reloads; `409` preserves the item and displays the backend message.

## WebSocket
`WS /ws/live`. Events contain `entity`, `operation`, `entityId`. Supported entities: GROUP, TEAM, ROUND, FIELD, GAME. Operations: CREATE, UPDATE, DELETE. Treat WebSocket as invalidation/notification only; re-fetch authoritative REST data. After reconnect, perform a REST reload because missed events are not replayed.

## Project structure
```text
src/api/{client,errors,groups,teams,rounds,fields,games,live}.ts
src/components/{Button,Card,Badge,ConfirmDialog,Select,GameCard,ScoreControl,Navigation}
src/features/{dashboard,games,teams,groups,rounds,fields}
src/hooks/{useGames,useTeams,useWebSocket,useScoreQueue}
src/config/runtime.ts
src/types/{api,domain}.ts
src/styles/
```
Comment only non-obvious main logic such as score queueing and WebSocket reconciliation.

## Responsive requirements
Support approximately 360px+, 768px+, 1280px+ and 1920px+. Avoid horizontal overflow. Keep score controls touch-friendly.

## Acceptance checklist
- CRUD groups/teams/rounds/fields/games
- referee team on games
- dedicated score page
- increment/decrement, never below zero
- serialized rapid scoring
- automatic end at 25, no end button
- fields show current games
- WebSocket reconnect + REST reload
- configurable API URL
- phone/desktop/large-screen support
