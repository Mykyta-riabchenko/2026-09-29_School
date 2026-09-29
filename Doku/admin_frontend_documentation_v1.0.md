# Volleyball Tournament — Admin Frontend Specification

**Version:** 1.0  
**Application:** Separate admin/teacher web application  
**API:** `/api/teacher/...`  
**Primary purpose:** tournament setup, game creation and reliable live score operation.

## 1. Scope

The admin application runs on a separate host/IP from the public tournament frontend.

It must allow administrators to:

- create, edit and delete groups
- create, edit and delete teams
- create, edit and delete rounds
- create, edit and delete fields
- create, edit and delete games
- open a dedicated score-control page
- increment/decrement scores quickly
- observe live changes through WebSocket
- recover after network/WebSocket failures

The admin application should be optimised for phone, tablet, desktop and large displays.

---

## 2. Deployment and API configuration

The backend URL must be configurable and must not be hard-coded inside components.

```env
VITE_API_BASE_URL=http://localhost:8080
```

Production example:

```env
VITE_API_BASE_URL=https://api.example.com
```

Use one configuration module:

```ts
// src/config/runtime.ts
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
```

No React component may contain an API IP or URL.

The admin site may run at a separate address such as:

```text
https://admin.example.com
```

while the public site runs at:

```text
https://tournament.example.com
```

---

## 3. Canonical TypeScript models

Use string IDs internally because API responses use string IDs.

```ts
export type EntityId = string;

export interface Group {
  groupId: EntityId;
  name: string;
}

export interface Team {
  teamId: EntityId;
  groupId: EntityId;
  class: string;
  name: string;
}

export interface Round {
  roundId: EntityId;
  number: number;
}

export interface Field {
  fieldId: EntityId;
  name: string;
}

export interface Game {
  gameId: EntityId;
  roundId: EntityId;
  fieldId: EntityId;
  teamAId: EntityId;
  teamBId: EntityId;
  refereeTeamId: EntityId;
  scoreA: number;
  scoreB: number;
}
```

Teacher request IDs remain numbers:

```ts
export interface CreateGameRequest {
  roundId: number;
  fieldId: number;
  teamAId: number;
  teamBId: number;
  refereeTeamId: number;
  scoreA: number;
  scoreB: number;
}
```

---

## 4. API client

All teacher API calls must be isolated from UI code.

```text
src/api/
├── client.ts
├── errors.ts
├── groups.ts
├── teams.ts
├── rounds.ts
├── fields.ts
├── games.ts
└── live.ts
```

Example:

```ts
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Request failed",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json();
  return body.data;
}
```

The API layer should expose:

```ts
getGroups()
getGroup(id)
createGroup(name)
updateGroup(id, name)
deleteGroup(id)

getTeams()
getTeam(id)
createTeam(input)
updateTeam(id, input)
deleteTeam(id)

getRounds()
getRound(id)
createRound(number)
updateRound(id, number)
deleteRound(id)

getFields()
getField(id)
createField(name)
updateField(id, name)
deleteField(id)

getGames()
getGame(id)
createGame(input)
updateGame(id, input)
deleteGame(id)
```

---

# 5. Required admin pages

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
/settings
```

Priority order:

1. Games
2. Score screen
3. Fields
4. Dashboard
5. Teams
6. Groups
7. Rounds
8. Settings

---

# 6. Dashboard

Show:

- current round
- live games
- upcoming games
- free fields
- occupied fields
- number of teams
- number of groups

Example:

```text
Current Round: 3

LIVE GAMES       FREE FIELDS
4                2

UPCOMING
Field 1   Team A vs Team B
Field 2   Team C vs Team D
```

The dashboard is primarily read-only.

---

# 7. Games page

The Games page is the main administration screen.

Required functionality:

- search by team name
- filter by round
- filter by field
- filter by status/display state
- open game
- open score screen
- edit game
- delete game
- create game

Recommended layout:

```text
Games                              [ + Create Game ]

Search teams...

Round [ All ]   Field [ All ]   Status [ All ]

LIVE
Team A       13 : 11       Team B       Field 1
                              [ Score ]

PLANNED
Team C        - : -        Team D       Field 2
                              [ Score ]
```

Default sort:

1. round number ascending
2. field name ascending
3. game ID ascending

---

# 8. Create game

The form must contain:

```text
Round
Field
Team A
Team B
Referee Team
Initial Score A
Initial Score B
```

Default scores:

```text
0 : 0
```

Validation:

- every reference is required
- Team A != Team B
- referee != Team A
- referee != Team B
- scores are integers >= 0

The frontend should filter invalid referee choices:

```ts
const refereeOptions = teams.filter(
  team => team.teamId !== teamAId && team.teamId !== teamBId,
);
```

The backend remains authoritative.

Create request:

```json
{
  "roundId": 1,
  "fieldId": 1,
  "teamAId": 1,
  "teamBId": 2,
  "refereeTeamId": 3,
  "scoreA": 0,
  "scoreB": 0
}
```

On `201`, use `response.data`.

After successful creation:

```text
Game created successfully.

[ Open Score ]
[ Back to Games ]
```

---

# 9. Dedicated score page

URL:

```text
/games/:gameId/score
```

This is the most important admin workflow.

The score page must work well on:

- phone
- tablet
- laptop
- desktop
- large screen

Recommended visual hierarchy:

```text
← Back                         LIVE   Field 1

Round 3

BLOCKBUSTERS 12A       NETZ-GIGANTEN 11B

      13                     11

   [ − ] [ + ]            [ − ] [ + ]

Referee: IT-SPikers 12c

             [ Finish Game ]
```

On narrow screens, teams may stack vertically.

---

# 10. Score controls

Increment:

```ts
scoreA = scoreA + 1;
```

Decrement:

```ts
scoreA = Math.max(0, scoreA - 1);
```

Never allow a negative score.

Recommended control:

```css
.score-button {
  min-width: 68px;
  min-height: 68px;
  border-radius: 12px;
  font-size: 28px;
  font-weight: 800;
}

@media (min-width: 768px) {
  .score-button {
    min-width: 80px;
    min-height: 80px;
  }
}
```

Controls must have large touch targets.

---

# 11. Critical score-update requirement

The current Teacher API updates a game with a complete:

```text
PUT /api/teacher/games/{id}
```

This creates a race-condition risk during rapid scoring.

Example:

```text
score = 10

click +
click +
click +
```

Do NOT send three uncontrolled parallel PUT requests.

The admin frontend must serialize updates for the same game:

```text
click
 ↓
optimistic UI update
 ↓
queue operation
 ↓
PUT complete game
 ↓
wait
 ↓
next queued operation
```

A failed operation must not disappear silently.

The UI should show a retry state.

---

# 12. Recommended backend scoring endpoint

For production live scoring, add:

```text
POST /api/teacher/games/{id}/score
```

Request:

```json
{
  "team": "A",
  "delta": 1
}
```

or:

```json
{
  "team": "B",
  "delta": -1
}
```

Response:

```json
{
  "data": {
    "gameId": "17",
    "scoreA": 19,
    "scoreB": 21
  }
}
```

Rules:

- `team` is `A` or `B`
- `delta` is normally `1` or `-1`
- resulting score cannot be negative
- update is atomic
- successful operation emits `GAME / UPDATE`

This endpoint is recommended because it makes rapid scoring safe without full-object replacement.

Until it exists, use a serialized PUT queue.

---

# 13. Recommended game lifecycle endpoints

The current API has no explicit game status.

For reliable administration, add:

```text
POST /api/teacher/games/{id}/start
POST /api/teacher/games/{id}/finish
```

Recommended model extension:

```ts
status: "SCHEDULED" | "LIVE" | "COMPLETED";
startedAt?: string;
completedAt?: string;
```

Do not infer live/completed state from scores alone.

Finish confirmation:

```text
Finish this game?

Team A       25
Team B       21

[ Cancel ] [ Finish Game ]
```

After finish:

- score controls are disabled
- final score remains visible
- game becomes completed
- WebSocket update is broadcast

---

# 14. Fields administration

Fields page must support:

```text
Create
Edit
Delete
View assigned games
Open active game
```

Example:

```text
Field 1    LIVE
Team A 13 : 11 Team B
[ Open Game ]

Field 2    FREE
[ Edit ] [ Delete ]
```

If delete returns `409`, preserve the field and show the backend message.

Never silently reassign games.

---

# 15. Team administration

Fields:

```text
Group
Class
Name
```

The property is exactly:

```ts
class: string;
```

Do not use `clazz` internally.

Team page should allow:

- create
- edit
- delete
- move between groups
- search

---

# 16. Group administration

Group page:

```text
Group A
Group B
Group C

[ + Create Group ]
```

Create/edit requires:

```text
Name
```

Delete requires confirmation.

A `409 CONFLICT` should show the API message because teams may still reference the group.

---

# 17. Round administration

Create:

```text
Number [ 6 ]
```

Rules:

- integer
- > 0
- unique

Display numerically:

```text
1
2
3
10
11
```

not lexicographically:

```text
1
10
11
2
3
```

---

# 18. Delete behaviour

Never immediately delete a destructive resource.

Use:

```text
Delete Field 3?

This action cannot be undone.

[ Cancel ] [ Delete ]
```

API results:

```text
204 → remove from local state
404 → reload because resource is already gone
409 → keep item and show dependency/conflict message
```

---

# 19. WebSocket

Connect:

```text
WS /ws/live
```

Event:

```json
{
  "type": "TOURNAMENT_DATA_CHANGED",
  "entity": "GAME",
  "operation": "UPDATE",
  "entityId": 17
}
```

Entities:

```text
GROUP
TEAM
ROUND
FIELD
GAME
```

Operations:

```text
CREATE
UPDATE
DELETE
```

Handling:

```ts
switch (event.entity) {
  case "GAME":
    invalidateGame(event.entityId);
    break;

  case "TEAM":
    invalidateTeams();
    break;

  case "GROUP":
    invalidateGroups();
    break;

  case "ROUND":
    invalidateRounds();
    break;

  case "FIELD":
    invalidateFields();
    break;
}
```

---

# 20. WebSocket reconnect

When disconnected:

```text
Live connection lost
```

Use exponential backoff:

```text
1s
2s
4s
8s
...
```

After reconnect:

1. reconnect WebSocket
2. reload affected/all current data
3. do not assume missed events were replayed

Events sent while disconnected are not replayed by the backend.

---

# 21. Avoiding score rollback

A score page must not replace a newer local score with an older response/event.

Recommended state model:

```text
confirmed server state
+
pending local operations
=
displayed score
```

For the initial PUT implementation, serialize operations.

For the recommended atomic score endpoint, the server response becomes authoritative immediately.

---

# 22. API error handling

Create one typed error:

```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
```

Rules:

| HTTP | Behaviour |
|---|---|
| 400 | show validation error |
| 404 | reload/remove stale item |
| 409 | show conflict and preserve form |
| 500 | show retryable server error |
| network failure | show offline/retry state |

Prefer:

```text
response.error.message
```

over generic error text.

---

# 23. Loading and duplicate submission

Mutation buttons must enter a loading state:

```text
[ Create Game ]
        ↓
[ Creating... ]
```

Disable duplicate form submission.

Score buttons are different: they may remain usable while a queue is active, but writes for one game must be serialized.

---

# 24. Optimistic score UI

The operator should see the score change immediately.

```ts
function incrementTeamA() {
  setScore(prev => ({
    ...prev,
    scoreA: prev.scoreA + 1,
  }));

  enqueueScoreUpdate("A", 1);
}
```

If saving fails:

```text
Could not save score.

The change was not confirmed by the server.

[ Retry ] [ Reload Game ]
```

Never report success when the server returned an error.

---

# 25. Suggested project structure

```text
src/
├── api/
│   ├── client.ts
│   ├── errors.ts
│   ├── groups.ts
│   ├── teams.ts
│   ├── rounds.ts
│   ├── fields.ts
│   ├── games.ts
│   └── live.ts
│
├── components/
│   ├── Button/
│   ├── Card/
│   ├── Badge/
│   ├── ConfirmDialog/
│   ├── ErrorMessage/
│   ├── LoadingState/
│   ├── Select/
│   ├── TeamSelector/
│   ├── GameCard/
│   ├── ScoreControl/
│   └── Navigation/
│
├── features/
│   ├── dashboard/
│   ├── games/
│   │   ├── GameList/
│   │   ├── GameForm/
│   │   ├── GameDetails/
│   │   └── ScorePage/
│   ├── teams/
│   ├── groups/
│   ├── rounds/
│   └── fields/
│
├── hooks/
│   ├── useGames.ts
│   ├── useTeams.ts
│   ├── useWebSocket.ts
│   └── useScoreQueue.ts
│
├── config/
│   └── runtime.ts
│
├── types/
│   ├── api.ts
│   └── domain.ts
│
└── styles/
```

Comment only main logic:

```ts
// The Teacher API currently uses full-object PUTs.
// Queueing prevents rapid score clicks from overwriting each other.
async function processScoreQueue() {
  ...
}
```

Do not add comments to obvious JSX or trivial assignments.

---

# 26. State management

Use one shared server-state/cache layer.

Conceptually:

```text
REST GET
   ↓
query cache
   ↓
components

mutation
   ↓
update/invalidate cache
   ↓
components

WebSocket
   ↓
invalidate affected query
   ↓
REST GET
   ↓
cache
```

TanStack Query or an equivalent library is recommended if the project already permits it.

Do not maintain independent copies of the same game in multiple components.

---

# 27. Manual test server

A separate local test server is required.

Start:

```bash
npm run test-server
```

Example:

```text
http://localhost:9090
```

Configure:

```env
VITE_API_BASE_URL=http://localhost:9090
```

The test server must implement the same REST and WebSocket contract as the real backend.

It should contain deterministic data.

Example:

```text
Groups:
A
B
C

Teams:
Blockbusters 12a
Netz-Giganten 11b
IT-Spikers 12c
Smash Devils 10b
Aufschlag-Asse 13

Rounds:
1
2
3
4

Fields:
Field 1
Field 2
Field 3
Field 4

Games:
one live
one planned
one completed
```

---

# 28. Test-server failure scenarios

The test server should reproduce:

```text
201 Created
200 OK
204 No Content
400 Bad Request
404 Not Found
409 Conflict
500 Internal Error
network delay
```

Recommended development-only header:

```text
X-Test-Scenario: conflict
```

Possible values:

```text
success
bad-request
not-found
conflict
server-error
network-delay
```

Never enable these test controls in production.

---

# 29. Test-server WebSocket

Expose:

```text
WS /ws/live
```

For manual testing, optionally provide development-only:

```text
POST /__test__/broadcast
```

Request:

```json
{
  "entity": "GAME",
  "operation": "UPDATE",
  "entityId": 17
}
```

This allows a developer to verify that the admin UI reacts to external changes.

The test-only endpoint must never be deployed with the production backend.

---

# 30. Automated endpoint tests

Every API client method requires tests.

### Groups

Create:

```text
valid → 201
blank → 400
>10 chars → 400
duplicate → 409
```

Update:

```text
valid → 200
missing URL ID → 404
duplicate → 409
```

Delete:

```text
unused → 204
missing → 404
referenced → 409
```

### Teams

Create:

```text
valid → 201
unknown group → 400
blank class → 400
blank name → 400
```

Update:

```text
valid → 200
move group → 200
missing → 404
```

Delete:

```text
unused → 204
referenced by game → 409
```

### Rounds

Test:

```text
positive integer → success
zero → 400
negative → 400
duplicate → 409
missing → 404
referenced → 409
```

### Fields

Test:

```text
valid → 201
blank → 400
duplicate → 409
valid update → 200
missing → 404
unused delete → 204
referenced delete → 409
```

### Games

Valid create → `201`.

Invalid create → `400` for:

```text
teamA == teamB
referee == teamA
referee == teamB
unknown round
unknown field
unknown team
negative score
non-integer score
missing required value
```

Update:

```text
valid → 200
missing game → 404
```

Delete:

```text
existing → 204
missing → 404
```

---

# 31. Score-page UI tests

### Increment A

```text
10 : 12
click A +
→ 11 : 12
```

### Increment B

```text
10 : 12
click B +
→ 10 : 13
```

### Decrement

```text
10 : 12
click A -
→ 9 : 12
```

### Zero protection

```text
0 : 0
click A -
→ 0 : 0
```

### Rapid clicks

```text
0 : 0
click A + five times
→ 5 : 0
```

Verify that five intended operations reach the backend correctly.

### Failure

Simulate `PUT → 500`.

Expected:

- optimistic change appears
- error is visible
- failed operation is not silently lost
- retry is possible
- reload is possible

---

# 32. WebSocket tests

Test:

```text
connect
disconnect
reconnect
GAME CREATE
GAME UPDATE
GAME DELETE
TEAM UPDATE
GROUP UPDATE
ROUND UPDATE
FIELD UPDATE
```

Expected:

```text
GAME UPDATE
→ refresh game

GAME DELETE
→ remove/reload game

TEAM UPDATE
→ refresh team-dependent views

FIELD UPDATE
→ refresh field-dependent views
```

After reconnect, perform a REST reload because missed events are not replayed.

---

# 33. Create-game UI tests

Valid:

```text
Round 1
Field 1
Team A
Team B
Referee Team C
0
0
```

Expected:

```text
POST → 201
game appears
```

Invalid:

```text
Team A = Team B
```

Expected:

```text
invalid form
```

Invalid:

```text
Referee = Team A
```

Expected:

```text
invalid form
```

The UI should prevent these choices where possible, but backend validation remains mandatory.

---

# 34. Manual smoke test

A complete manual test should be:

```text
1. Open admin application.
2. Dashboard loads.
3. Create a group.
4. Create three teams.
5. Create a round.
6. Create a field.
7. Create a game.
8. Open the score page.
9. Increment Team A five times.
10. Increment Team B three times.
11. Decrement Team A once.
12. Verify final score.
13. Open public frontend.
14. Verify public frontend receives the update.
15. Finish the game.
16. Verify score controls are disabled.
17. Delete the test game.
```

---

# 35. Security preparation

The current API has no authentication.

Still keep authentication isolated:

```text
src/auth/
├── authClient.ts
├── authState.ts
└── RequireAdmin.tsx
```

Do not implement fake security by hiding routes.

Future authentication should be added at the API/client layer and route guard.

---

# 36. Recommended API additions

The existing API is sufficient for basic CRUD, but these additions are strongly recommended:

```text
POST /api/teacher/games/{id}/score
POST /api/teacher/games/{id}/start
POST /api/teacher/games/{id}/finish
GET  /api/teacher/games/{id}/score-events
```

Optional dashboard aggregation:

```text
GET /api/teacher/dashboard
```

Example:

```json
{
  "data": {
    "currentRound": {},
    "liveGames": [],
    "upcomingGames": [],
    "fields": [],
    "statistics": {}
  }
}
```

---

# 37. Acceptance criteria

### CRUD

- [ ] groups create/edit/delete
- [ ] teams create/edit/delete
- [ ] rounds create/edit/delete
- [ ] fields create/edit/delete
- [ ] games create/edit/delete

### Games

- [ ] search
- [ ] round filter
- [ ] field filter
- [ ] status filter
- [ ] game details
- [ ] referee visible
- [ ] score screen accessible

### Scoring

- [ ] increment
- [ ] decrement
- [ ] never below zero
- [ ] rapid clicks safe
- [ ] failed updates visible
- [ ] retry available
- [ ] phone layout
- [ ] desktop layout
- [ ] large-screen layout

### Synchronisation

- [ ] WebSocket connects
- [ ] reconnect works
- [ ] REST reload after reconnect
- [ ] external game update refreshes UI
- [ ] public frontend receives game changes

### Errors

- [ ] 400
- [ ] 404
- [ ] 409
- [ ] 500
- [ ] network failure

### Deployment

- [ ] separate admin host/IP
- [ ] configurable API URL
- [ ] no hard-coded backend URL in components
- [ ] test server available
- [ ] test server can simulate API errors
- [ ] test server can emit WebSocket events

---

# 38. Operational architecture

The key workflow is:

```text
             ADMIN FRONTEND
                   |
        +----------+----------+
        |                     |
     REST API              WebSocket
        |                     |
        v                     v
             BACKEND
                |
       +--------+--------+
       |                 |
 Public Frontend    Admin Frontend
```

For scoring:

```text
Games
  ↓
Open Game
  ↓
Score Page
  ↓
Large + / − controls
  ↓
Optimistic UI
  ↓
Serialized PUT
     OR
Atomic score endpoint
  ↓
Backend
  ↓
GAME / UPDATE
  ↓
WebSocket
  ↓
Public + Admin clients
```

The score workflow is the highest-priority operational feature. Its implementation must favour reliability and immediate feedback over unnecessary visual complexity.
