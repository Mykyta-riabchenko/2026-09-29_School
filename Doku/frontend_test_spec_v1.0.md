# Volleyball Tournament — Frontend Test Specification v1.0

## Purpose
Automated, integration, manual and end-to-end tests for the separated public and admin applications.

## Test server
Run `npm run test-server`, normally on `http://localhost:9090`. It must implement the same REST and WebSocket contract and seed deterministic data: groups A/B/C; several teams; rounds 1–4; fields 1–4; games in NOT_PLAYED, IN_PLAY and ENDED states. Include 0:0, 24:24 and 25:21 boundary cases.

Support development-only scenarios: `success`, `bad-request`, `not-found`, `conflict`, `server-error`, `network-delay`. Optional `POST /__test__/broadcast` emits a live event. Never deploy these controls to production.

## API endpoint tests
### Groups
Create: valid→201, blank→400, >10 chars→400, duplicate→409. Update: valid→200, missing/non-numeric ID→404, duplicate→409. Delete: unused→204, missing→404, referenced→409.

### Teams
Create: valid→201, unknown group→400, blank class/name→400. Update: valid and move group→200, missing→404. Delete: unused→204, referenced by game→409.

### Rounds
Positive unique integer→201; zero/negative→400; duplicate→409; missing→404; referenced delete→409.

### Fields
Valid→201; blank→400; duplicate→409; update→200; missing→404; unused delete→204; referenced delete→409.

### Games
Valid create→201. Invalid create→400 for unknown references, same Team A/B, referee equal to either playing team, negative/non-integer score or missing required value. Valid update→200; missing→404. Existing delete→204; missing→404.

## Envelope tests
Success create/update must unwrap `{data: ...}`. `204` must not parse JSON. Errors must become typed `ApiError(status, code, message)` from `{error:{code,message}}`.

## Game-state unit tests
```text
null:null      -> NOT_PLAYED
0:0            -> IN_PLAY
13:11          -> IN_PLAY
24:24          -> IN_PLAY
25:24          -> ENDED
24:25          -> ENDED
25:21          -> ENDED
```
No separate manual status is required.

## Score UI tests
- A +: `10:12 -> 11:12`
- B +: `10:12 -> 10:13`
- A -: `10:12 -> 9:12`
- zero protection: `0:0 -> 0:0` after decrement
- five rapid A+ clicks: `0:0 -> 5:0`
- `24:21 + A -> 25:21`, state becomes ENDED and no end button appears

## Score persistence tests
Because current scoring uses full-object PUT, verify same-game requests are serialized. A sequence `+A,+A,+B,-A` from `10:10` must end at `11:11`. Test failure: optimistic change visible, error shown, retry/reload available, no silent loss.

## Games page tests
Verify loading/empty states, team search, round/field/state filters, round/field/referee display, open/score/edit/delete actions and deterministic sorting.

## Fields page tests
Every field displays its name and current game when one exists. Free fields show no active game; occupied fields show current teams, score and state.

## Groups/teams tests
Groups and teams sort alphabetically. Teams show group/class/name. Public team/group views are read-only.

## WebSocket tests
Connect; GAME CREATE/UPDATE/DELETE; TEAM/GROUP/ROUND/FIELD UPDATE; disconnect/reconnect. After reconnect perform REST reload because missed events are not replayed.

## Public read-only tests
Public site may GET data and connect to WebSocket but must never send teacher POST/PUT/DELETE requests or expose admin CRUD controls.

## Responsive tests
Run at 360x800, 390x844, 768x1024, 1280x800 and 1920x1080. Verify no overflow, readable text, usable navigation, cards and touch-friendly score controls.

## Manual smoke test
1. Open admin. 2. Create group. 3. Create three teams. 4. Create round. 5. Create field. 6. Create game. 7. Open score page. 8. Increment/decrement. 9. Reach 25. 10. Verify automatic ENDED and no end button. 11. Open public site and verify live score. 12. Update a team and verify WebSocket refresh. 13. Delete test game.

## Regression checklist
API success/error envelopes; 400/404/409/500; CRUD; scoring; zero protection; rapid scoring; automatic end; WebSocket reconnect; public/admin separation; responsive layouts; test-server error scenarios.
