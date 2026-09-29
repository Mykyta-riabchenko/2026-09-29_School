# Frontend Documentation – Tournament Application

**Version:** 0.2  
**Status:** Frontend/backend contract draft – updated from project discussion  
**Source material:** supplied ER diagram, REST/WebSocket endpoint list, and agreed patches

---

## 1. Purpose

This document is the implementation contract for the tournament frontend.

It defines:

- canonical domain data and TypeScript types
- JSON API response formats
- REST endpoint behaviour
- live WebSocket events
- sorting and filtering behaviour
- loading, empty, error and reconnect states
- button styles and interaction states
- responsive behaviour for phone, desktop and large screens
- frontend project structure
- automated API/component/E2E tests
- a local test server with realistic test data
- manual switching between the real backend and the local test server
- commenting conventions

### Contract language

- **MUST** = required
- **SHOULD** = recommended
- **MAY** = optional
- **TBD** = must be agreed before production implementation

---

# 2. Domain model

The frontend uses the following entities.

| Entity | Canonical frontend name | Required identity |
|---|---|---|
| Gruppe | `Group` | `groupId` |
| Runde | `Round` | `roundId` |
| Team | `Team` | `teamId` |
| Feld | `Field` | `fieldId` |
| Spiel | `Game` | `gameId` |

### Game relationships

A `Game`:

- MUST have exactly one `round`
- MUST have exactly one `field`
- MUST have exactly two participating teams: `teamA` and `teamB`
- MUST have exactly one referee
- the referee MUST also be represented by a `Team`
- MUST therefore contain a reference to a third `Team` for the referee
- MUST have two score values
- MUST be filterable by round

The referee is a team, not a separate `Referee` entity.

The frontend should treat the referee as a normal `Team` reference while displaying it separately as the referee role.

### ID behaviour

The API IDs are encoded identifiers rather than direct database IDs.

For the frontend they MUST behave exactly like normal stable IDs:

- IDs are opaque.
- The frontend MUST NOT decode, parse or calculate IDs.
- IDs MUST NOT be used for sorting.
- IDs MUST be used for identity, lookup, React keys and cache keys.
- IDs received from the API MUST be sent back unchanged when used in API paths.

The canonical TypeScript representation is `string` because encoded IDs are opaque.

---

# 3. Canonical TypeScript types

All frontend names are **English** and use **camelCase**.

```ts
export type Id = string;

export interface Group {
  groupId: Id;
  name: string;
}

export interface Round {
  roundId: Id;
  number: number;
}

export interface Team {
  teamId: Id;
  class: string;
  name: string;
  groupId: Id;
}

export interface Field {
  fieldId: Id;
  name: string;
}

export interface Game {
  gameId: Id;
  roundId: Id;
  fieldId: Id;
  teamAId: Id;
  teamBId: Id;
  refereeTeamId: Id;
  scoreA: number;
  scoreB: number;
}
```

### Domain invariants

```ts
// A valid game always references:
// - one round
// - one field
// - two participating teams
// - one referee team
// - two scores
```

A frontend validation layer SHOULD verify references and required properties at the API boundary.

### API-to-frontend mapping

The API may use its own wire representation, but the application layer MUST expose the canonical types above.

For example, if a backend response contains legacy/database-oriented names, the API client maps them once:

```ts
function mapGameResponse(raw: unknown): Game {
  // Validate and map the API contract at the boundary.
  // UI components must only receive the canonical Game type.
  throw new Error("implementation");
}
```

UI components MUST NOT contain backend-specific property names.

---

# 4. JSON response convention

The API uses **JSON**.

## Collection response

```json
{
  "data": []
}
```

## Single-resource response

```json
{
  "data": {}
}
```

## Error response

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Game not found",
    "details": {}
  }
}
```

The exact `details` content may vary.

### HTTP status handling

| Status | Meaning | Frontend behaviour |
|---|---|---|
| `200` | Success | Parse and render |
| `400` | Invalid request/filter | Show request/filter error |
| `404` | Resource does not exist | Show not-found state |
| `500` | Server failure | Show retryable error |
| Network failure | No response | Show network/offline state |

---

# 5. REST API contract

## 5.1 `GET /api/groups`

Returns all groups.

### Response

```json
{
  "data": [
    {
      "groupId": "g_01",
      "name": "Group A"
    }
  ]
}
```

### Requirements

- Response MUST be JSON.
- `data` MUST be an array.
- Every group MUST have a stable `groupId`.
- Groups MUST be displayed alphabetically by `name`, from lower to higher (ascending A → Z).
- The frontend MUST NOT assume API ordering.
- Empty `data` MUST produce an empty state.

### Tests

1. `200` with multiple groups.
2. All returned objects contain `groupId` and `name`.
3. Frontend sorts names ascending.
4. Duplicate names do not break rendering.
5. Empty array renders empty state.
6. `500` renders retryable error state.
7. Network failure renders network state.

---

## 5.2 `GET /api/groups/{id}`

Returns one group.

### Response

```json
{
  "data": {
    "groupId": "g_01",
    "name": "Group A"
  }
}
```

### Tests

- valid ID returns `200`
- returned `groupId` matches the requested encoded ID
- `404` renders not-found state
- encoded IDs are passed unchanged
- malformed JSON is handled as an API error

---

## 5.3 `GET /api/matches` → canonical frontend resource: `games`

The public endpoint remains `/api/matches` unless the backend contract is later changed. The frontend calls the returned resource a `Game`.

Returns all games.

### Response

```json
{
  "data": [
    {
      "gameId": "game_01",
      "roundId": "round_01",
      "fieldId": "field_01",
      "teamAId": "team_01",
      "teamBId": "team_02",
      "refereeTeamId": "team_03",
      "scoreA": 2,
      "scoreB": 1
    }
  ]
}
```

### Requirements

Every game MUST have:

- `gameId`
- `roundId`
- `fieldId`
- `teamAId`
- `teamBId`
- `refereeTeamId`
- `scoreA`
- `scoreB`

The frontend MUST NOT render a game as valid if any required relationship is missing.

The referee is a `Team` reference and is displayed as the referee team.

### Tests

- `200` returns valid games
- every game has a round
- every game has a field
- every game has exactly two participant team IDs
- every game has a referee team ID
- score values are numbers
- game IDs are treated as opaque strings
- invalid/missing required relationships are rejected at the API boundary
- empty result renders empty state

---

## 5.4 `GET /api/matches/{id}`

Returns one game.

### Response

```json
{
  "data": {
    "gameId": "game_01",
    "roundId": "round_01",
    "fieldId": "field_01",
    "teamAId": "team_01",
    "teamBId": "team_02",
    "refereeTeamId": "team_03",
    "scoreA": 2,
    "scoreB": 1
  }
}
```

### Tests

- valid encoded ID returns `200`
- requested ID is preserved unchanged
- `404` renders not-found
- game invariant validation runs
- no DB ID decoding occurs in frontend

---

## 5.5 `GET /api/matches/filter/{filter}`

Returns games matching the requested filter.

### Required use case

Games MUST be filterable by round so that the frontend can show all games belonging to a selected round.

Example:

```http
GET /api/matches/filter/round_01
```

### Contract

The filter value is opaque to the frontend and MUST be URL encoded.

The backend MUST document the supported filter syntax. Until that syntax is fixed, the frontend MUST isolate it in:

```ts
getGamesByFilter(filter: string)
```

The frontend MUST NOT duplicate backend filter parsing rules.

### Tests

- valid round filter returns only matching games
- encoded filter values are URL encoded
- empty result is handled
- invalid filter returns documented `400` or empty result according to backend contract
- `500` is retryable

---

## 5.6 `GET /api/teams`

Returns all participating teams.

### Response

```json
{
  "data": [
    {
      "teamId": "team_01",
      "class": "U18",
      "name": "Team Alpha",
      "groupId": "group_01"
    }
  ]
}
```

### Requirements

- `class` MUST be a string.
- Teams MUST be displayed alphabetically by `name`, ascending A → Z.
- `groupId` identifies the team’s group.
- A team can also be referenced as a game's referee.

### Tests

- valid response
- `class` is accepted as a string
- alphabetical ascending sorting
- team can be used as `teamA`, `teamB` and `refereeTeam`
- empty result
- server error
- network error

---

## 5.7 `GET /api/teams/{id}`

Returns one team.

### Response

```json
{
  "data": {
    "teamId": "team_01",
    "class": "U18",
    "name": "Team Alpha",
    "groupId": "group_01"
  }
}
```

### Tests

- valid encoded ID returns `200`
- ID is treated as opaque
- `404` renders not-found
- required fields are validated

---

# 6. Live WebSocket API

## `WS /ws/live`

The WebSocket provides live updates without a page reload.

The WebSocket MUST send entity lifecycle events.

## Event naming

The canonical event names are:

```text
group.created
group.updated
group.deleted

round.created
round.updated
round.deleted

team.created
team.updated
team.deleted

field.created
field.updated
field.deleted

game.created
game.updated
game.deleted
```

### Event format

Created and updated:

```json
{
  "type": "game.updated",
  "entity": "game",
  "data": {
    "gameId": "game_01",
    "roundId": "round_01",
    "fieldId": "field_01",
    "teamAId": "team_01",
    "teamBId": "team_02",
    "refereeTeamId": "team_03",
    "scoreA": 3,
    "scoreB": 1
  }
}
```

Deleted:

```json
{
  "type": "game.deleted",
  "entity": "game",
  "data": {
    "gameId": "game_01"
  }
}
```

The same pattern applies to groups, rounds, teams and fields.

### Frontend event behaviour

#### `.created`

The frontend MUST:

1. validate the object
2. add it to the relevant cache/store
3. re-apply sorting/filtering
4. update visible UI without page reload

#### `.updated`

The frontend MUST:

1. validate the object
2. replace the existing object by its ID
3. re-apply sorting/filtering
4. update all screens using that object

For example, a `game.updated` score change MUST update the scoreboard immediately.

#### `.deleted`

The frontend MUST:

1. read the deleted object's ID
2. remove it from the relevant cache/store
3. remove it from visible lists
4. update related screens

### WebSocket connection states

The UI MUST support:

- connecting
- connected
- disconnected
- reconnecting
- permanently failed/manual retry

Recommended reconnect strategy:

```text
1s → 2s → 4s → 8s → 16s → max 30s
```

After reconnecting, the frontend SHOULD refetch the affected REST collections to guarantee consistency.

### WebSocket tests

- connection opens
- `game.created` inserts a game
- `game.updated` changes scores immediately
- `game.deleted` removes the game
- team update refreshes team references
- field update refreshes field display
- group update refreshes group display
- invalid event is ignored and logged
- connection loss triggers reconnect
- reconnect triggers consistency refetch
- multiple events are applied in order
- deleted objects no longer appear in active lists

---

# 7. Sorting and filtering

## Alphabetical sorting

Where lists are displayed by name, the default order is:

**ascending alphabetical order, A → Z.**

Use locale-aware comparison rather than ID ordering:

```ts
items.sort((a, b) =>
  a.name.localeCompare(b.name, undefined, {
    sensitivity: "base",
  }),
);
```

Sorting MUST NOT mutate shared cached state. Prefer derived/sorted selectors.

### Games

Games are primarily grouped/filtered by round.

A game view SHOULD show:

1. selected round
2. field
3. Team A vs Team B
4. referee
5. score

---

# 8. UI behaviour

## Loading

Every API-backed screen MUST provide a loading state.

Avoid replacing the entire application with a spinner for small background updates.

## Empty

Examples:

- no groups
- no teams
- no games in selected round
- no fields

Empty states SHOULD explain what is empty and what the user can do next.

## Error

Errors MUST:

- be visible
- not crash the application
- provide retry where retry is meaningful
- distinguish not-found from server/network failure

## Live update

Normal WebSocket updates SHOULD update the UI without:

- full page reload
- losing current selection
- losing scroll position
- resetting unrelated filters

---

# 9. Responsive design

The application MUST be usable on:

1. **Phone**
2. **Desktop/computer**
3. **Large screen / big screen**

The layout MUST be responsive rather than being three separate applications.

## Phone

- single-column layout
- touch-friendly controls
- no horizontal scrolling for normal content
- game cards can stack vertically
- tables SHOULD transform into cards where necessary

## Desktop

- multi-column layouts MAY be used
- side navigation/filter panels MAY remain visible
- games can use denser rows/cards

## Big screen

Designed for viewing tournament information from a distance.

- large readable typography
- high-contrast scores
- game/round information visible from a distance
- avoid interaction controls dominating display-only screens
- auto-refresh through WebSocket

Exact breakpoints and typography sizes should be taken from the final design system.

---

# 10. Buttons and controls

The frontend MUST use shared button components rather than styling individual buttons ad hoc.

Recommended variants:

```ts
type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost";
```

Required states:

```text
default
hover
focus-visible
active
disabled
loading
```

### Button rules

- Primary = main action on a screen.
- Secondary = supporting action.
- Danger = destructive action.
- Ghost = low-emphasis action.
- Disabled buttons MUST remain visually distinguishable from enabled buttons.
- Keyboard focus MUST be visible.
- Touch targets SHOULD be at least 44 × 44 CSS pixels.

Example:

```tsx
<Button
  variant="primary"
  loading={isLoading}
  onClick={handleRetry}
>
  Retry
</Button>
```

Exact colours, border radius, typography, shadows and spacing are **TBD until the final Figma design is agreed**.

---

# 11. Frontend project structure

Recommended React + TypeScript structure:

```text
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/
│
├── api/
│   ├── client.ts
│   ├── groupsApi.ts
│   ├── gamesApi.ts
│   ├── teamsApi.ts
│   ├── fieldsApi.ts
│   └── roundsApi.ts
│
├── config/
│   └── api.ts
│
├── domain/
│   ├── group.ts
│   ├── round.ts
│   ├── team.ts
│   ├── field.ts
│   └── game.ts
│
├── live/
│   ├── liveSocket.ts
│   ├── liveEvents.ts
│   └── reconnect.ts
│
├── components/
│   ├── Button/
│   ├── LoadingState/
│   ├── ErrorState/
│   ├── EmptyState/
│   ├── GroupList/
│   ├── TeamList/
│   ├── GameList/
│   └── Score/
│
├── features/
│   ├── groups/
│   ├── games/
│   └── teams/
│
├── pages/
│   ├── GroupsPage.tsx
│   ├── GroupDetailsPage.tsx
│   ├── GamesPage.tsx
│   ├── GameDetailsPage.tsx
│   └── TeamsPage.tsx
│
├── state/
│   └── store.ts
│
├── styles/
│   ├── globals.css
│   └── tokens.css
│
└── main.tsx

test-server/
├── src/
│   ├── server.ts
│   ├── websocket.ts
│   ├── fixtures/
│   │   ├── groups.json
│   │   ├── rounds.json
│   │   ├── teams.json
│   │   ├── fields.json
│   │   └── games.json
│   └── data/
│       └── store.ts
└── package.json

tests/
├── api/
├── components/
├── integration/
└── e2e/
```

---

# 12. Backend URL configuration

The backend URL MUST be manually configurable in code as requested.

Recommended single source of truth:

```ts
// src/config/api.ts
export const API_BASE_URL = "http://localhost:8080";
```

All API clients MUST use this value.

Do not hard-code the backend URL in individual API functions or components.

Example:

```ts
export async function getGames(): Promise<Game[]> {
  const response = await fetch(`${API_BASE_URL}/api/matches`);
  // ...
}
```

To manually test against the local test server, change only:

```ts
export const API_BASE_URL = "http://localhost:4000";
```

The rest of the frontend code MUST remain unchanged.

The production deployment may later move this value to environment configuration, but the current requirement is a manual code change.

---

# 13. Local test server

A local test server is REQUIRED for manual frontend testing.

Its purpose is to let frontend developers run the UI without a real backend.

## Requirements

The test server MUST provide:

```text
GET /api/groups
GET /api/groups/:id

GET /api/matches
GET /api/matches/:id
GET /api/matches/filter/:filter

GET /api/teams
GET /api/teams/:id
```

It MUST also provide:

```text
WS /ws/live
```

## Test data

Fixtures MUST contain enough data to test:

- multiple groups
- multiple rounds
- multiple fields
- at least several teams
- games with different rounds
- games on different fields
- games with different scores
- games where a team is used as referee
- alphabetical ordering
- empty collections
- not-found responses

Example fixture:

```json
{
  "gameId": "game_01",
  "roundId": "round_01",
  "fieldId": "field_01",
  "teamAId": "team_01",
  "teamBId": "team_02",
  "refereeTeamId": "team_03",
  "scoreA": 2,
  "scoreB": 1
}
```

## WebSocket manual testing

The test server SHOULD expose a simple development mechanism for emitting events.

Example internal development commands:

```text
game.created
game.updated
game.deleted
team.updated
field.updated
group.updated
round.updated
```

This allows a developer to verify that the UI changes without reloading.

## Test server commands

Recommended:

```bash
npm run test-server
```

or:

```bash
npm run dev:test-server
```

The exact command can be chosen during implementation.

---

# 14. Automated tests

The project MUST have three levels of tests.

## 14.1 API contract tests

Use a test HTTP server or mocked server to verify every endpoint.

Minimum matrix:

| Endpoint | 200 | Empty | 400 | 404 | 500 | Invalid JSON |
|---|---:|---:|---:|---:|---:|---:|
| `/api/groups` | ✓ | ✓ | — | — | ✓ | ✓ |
| `/api/groups/:id` | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/api/matches` | ✓ | ✓ | — | — | ✓ | ✓ |
| `/api/matches/:id` | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/api/matches/filter/:filter` | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| `/api/teams` | ✓ | ✓ | — | — | ✓ | ✓ |
| `/api/teams/:id` | ✓ | — | ✓ | ✓ | ✓ | ✓ |

## 14.2 Component tests

Test:

- loading state
- empty state
- error state
- group list
- team list
- game list
- score display
- referee display
- field display
- round filtering
- button states
- responsive class/layout behaviour where practical

## 14.3 WebSocket tests

Test all 15 lifecycle events:

```text
group.created
group.updated
group.deleted

round.created
round.updated
round.deleted

team.created
team.updated
team.deleted

field.created
field.updated
field.deleted

game.created
game.updated
game.deleted
```

Also test:

- disconnect
- reconnect
- invalid event
- duplicate update
- update after deletion
- REST consistency refresh after reconnect

---

# 15. Example API test

Using Vitest + MSW:

```ts
it("loads games from the API", async () => {
  server.use(
    http.get(`${API_BASE_URL}/api/matches`, () => {
      return HttpResponse.json({
        data: [
          {
            gameId: "game_01",
            roundId: "round_01",
            fieldId: "field_01",
            teamAId: "team_01",
            teamBId: "team_02",
            refereeTeamId: "team_03",
            scoreA: 2,
            scoreB: 1,
          },
        ],
      });
    }),
  );

  const games = await getGames();

  expect(games).toHaveLength(1);
  expect(games[0].gameId).toBe("game_01");
});
```

## Example alphabetical sorting test

```ts
it("sorts teams alphabetically by name", () => {
  const teams = [
    { teamId: "3", name: "Zeta", class: "U18", groupId: "g1" },
    { teamId: "1", name: "Alpha", class: "U18", groupId: "g1" },
    { teamId: "2", name: "Beta", class: "U18", groupId: "g1" },
  ];

  const result = sortTeamsByName(teams);

  expect(result.map(team => team.name)).toEqual([
    "Alpha",
    "Beta",
    "Zeta",
  ]);
});
```

## Example WebSocket test

```ts
it("updates a game when game.updated is received", async () => {
  socket.receive({
    type: "game.updated",
    entity: "game",
    data: {
      gameId: "game_01",
      roundId: "round_01",
      fieldId: "field_01",
      teamAId: "team_01",
      teamBId: "team_02",
      refereeTeamId: "team_03",
      scoreA: 4,
      scoreB: 2,
    },
  });

  expect(getGame("game_01")?.scoreA).toBe(4);
});
```

---

# 16. Accessibility

The frontend MUST:

- support keyboard navigation
- provide visible `focus-visible` states
- use semantic buttons/links
- provide accessible names
- not rely only on colour to communicate state
- maintain sufficient text/background contrast
- support touch input on phones
- avoid flashing/rapid animations that make live updates difficult to read

Live score updates SHOULD be announced appropriately for users relying on assistive technology, without causing excessive announcements.

---

# 17. Performance

The frontend SHOULD:

- avoid unnecessary REST refetches for every small UI interaction
- update cached objects directly when safe
- debounce user-entered filters
- avoid rendering unnecessary large lists
- keep WebSocket processing lightweight
- preserve the current view during live updates

Large-screen scoreboard views should prioritise stable rendering and readability over decorative animation.

---

# 18. Error and validation boundary

All external data MUST be considered untrusted.

Validation belongs at the API/WebSocket boundary.

The UI should only receive validated canonical types:

```text
HTTP/WebSocket
      ↓
transport validation
      ↓
API mapping
      ↓
canonical domain types
      ↓
state/store
      ↓
components
```

Components MUST NOT contain transport parsing logic.

---

# 19. Comments and code documentation

Code MUST be commented, but comments should not be excessive.

### Comment main logic

Comments SHOULD explain:

- non-obvious business rules
- WebSocket reconnection logic
- API mapping decisions
- sorting/filtering rules
- cache consistency rules
- complex responsive behaviour
- reasons for workarounds

Do not comment obvious code such as:

```ts
// Increment i
i++;
```

Prefer:

```ts
// After reconnect, refetch the collection because events may have
// been missed while the socket was disconnected.
await refreshGames();
```

---

# 20. Definition of Done

A frontend feature is complete only when:

### API

- endpoint contract is implemented
- JSON response is validated
- loading/error/empty states exist
- endpoint tests exist

### Domain

- canonical English camelCase types are used
- encoded IDs are treated as opaque
- game invariants are enforced

### Live updates

- created/updated/deleted events work
- reconnect works
- stale data is reconciled

### UI

- phone layout works
- desktop layout works
- big-screen layout works
- keyboard accessibility works
- button states are implemented

### Testing

- API tests pass
- component tests pass
- WebSocket tests pass
- manual test server works
- manual test data covers normal and edge cases

### Code quality

- API URL has one configuration location
- components do not contain API transport logic
- main business logic is commented
- backend-specific names are isolated in the API layer

---

# 21. Remaining contract decisions

The following should be confirmed before implementation is considered final:

1. Exact JSON response envelope: current proposal is `{ data: ... }`.
2. Exact backend wire field names if they differ from canonical frontend names.
3. Exact syntax of `/api/matches/filter/{filter}`.
4. Exact WebSocket event payload for all entities.
5. Exact visual design tokens from Figma:
   - colours
   - font family
   - font sizes
   - spacing
   - border radius
   - shadows
   - button dimensions
   - responsive breakpoints
6. Whether game score values can ever be `null`.
7. Whether a referee team is always distinct from Team A and Team B. The current domain model assumes it is a separate third team.
8. Whether group/round/field detail endpoints will include related objects or only the base object.

Once these are agreed, this document can be promoted from **v0.2 draft** to an implementation-ready frontend specification.
