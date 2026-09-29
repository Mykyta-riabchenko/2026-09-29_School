// Local test server (frontend doc §13, admin doc §27) — run with:
//   npm run test-server     (or npm run dev:test-server for watch)
// Serves the REST contract + WS /ws/live with fixture data so the
// frontend can be tested without the real backend.
//
// Configure the frontend with:
//   VITE_API_BASE_URL=http://localhost:4000
// (or TEST_SERVER_PORT=9090 npm run test-server for the admin doc
// example port — the port is configurable via TEST_SERVER_PORT).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createInterface } from "node:readline";
import { WebSocketServer } from "ws";
import {
  groups,
  rounds,
  teams,
  fields,
  games,
  findById,
} from "./data/store.js";
import { attachWebSocket, broadcastAdmin, handleDevCommand } from "./websocket.js";

const PORT = Number(process.env.TEST_SERVER_PORT ?? 4000);

function json(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function notFound(res: ServerResponse, message: string) {
  json(res, 404, {
    error: { code: "RESOURCE_NOT_FOUND", message, details: {} },
  });
}

function badRequest(res: ServerResponse, message: string) {
  json(res, 400, {
    error: { code: "BAD_REQUEST", message, details: {} },
  });
}

function conflict(res: ServerResponse, message: string) {
  json(res, 409, {
    error: { code: "CONFLICT", message, details: {} },
  });
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let text = "";
    req.on("data", (chunk) => {
      text += String(chunk);
    });
    req.on("end", () => {
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(null);
      }
    });
  });
}

let teacherSeq = 100;

// Dev-only failure injection (admin doc §28): force a status on teacher
// mutations via `X-Test-Scenario: success|bad-request|not-found|
// conflict|server-error|network-delay`. Never present in production.
// network-delay holds the response ~800ms so loading states can be
// verified manually.
function forcedScenario(req: IncomingMessage): string | null {
  const h = req.headers["x-test-scenario"];
  return typeof h === "string" && h.length > 0 ? h : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyScenario(
  res: ServerResponse,
  scenario: string | null,
): boolean {
  if (!scenario || scenario === "success") return false;
  if (scenario === "conflict") {
    conflict(res, "Forced conflict");
    return true;
  }
  if (scenario === "bad-request") {
    badRequest(res, "Forced bad request");
    return true;
  }
  if (scenario === "not-found") {
    notFound(res, "Forced not found");
    return true;
  }
  if (scenario === "server-error") {
    json(res, 500, {
      error: { code: "SERVER_ERROR", message: "Forced failure", details: {} },
    });
    return true;
  }
  return false;
}

async function teacherRouter(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  path: string,
): Promise<boolean> {
  // Dev-only broadcast trigger (admin doc §29).
  if (path === "/__test__/broadcast" && req.method === "POST") {
    const body = (await readBody(req)) as Record<string, unknown>;
    const entity = String(body.entity ?? "").toUpperCase();
    const operation = String(body.operation ?? "").toUpperCase();
    const entityId = body.entityId as string | number;
    if (
      ["GROUP", "TEAM", "ROUND", "FIELD", "GAME"].includes(entity) &&
      ["CREATE", "UPDATE", "DELETE"].includes(operation) &&
      (typeof entityId === "string" || typeof entityId === "number")
    ) {
      broadcastAdmin(
        entity as "GAME",
        operation as "UPDATE",
        entityId,
      );
      return json(res, 200, { data: { ok: true } }), true;
    }
    return badRequest(res, "Invalid broadcast"), true;
  }

  if (!path.startsWith("/api/teacher/")) return false;
  if (req.method === "OPTIONS") return false;

  const scenario = forcedScenario(req);
  const body = (await readBody(req)) as Record<string, unknown>;
  if (body === null) return badRequest(res, "Malformed JSON"), true;
  if (scenario === "network-delay") await sleep(800);
  if (applyScenario(res, scenario)) return true;

  // Groups
  if (path === "/api/teacher/groups" && req.method === "POST") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest(res, "Name is required"), true;
    if (name.length > 10) return badRequest(res, "Name too long"), true;
    if (groups.some((g) => g.name === name)) {
      return conflict(res, "Group already exists"), true;
    }
    const row = { groupId: `g_new_${teacherSeq++}`, name };
    groups.push(row);
    broadcastAdmin("GROUP", "CREATE", row.groupId);
    return json(res, 201, { data: row }), true;
  }
  const groupIdMatch = path.match(/^\/api\/teacher\/groups\/(.+)$/);
  if (groupIdMatch) {
    const row = findById(groups, "groupId", decodeURIComponent(groupIdMatch[1]));
    if (!row) return notFound(res, "Group not found"), true;
    if (req.method === "PUT") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return badRequest(res, "Name is required"), true;
      if (groups.some((g) => g !== row && g.name === name)) {
        return conflict(res, "Group already exists"), true;
      }
      row.name = name;
      broadcastAdmin("GROUP", "UPDATE", row.groupId);
      return json(res, 200, { data: row }), true;
    }
    if (req.method === "DELETE") {
      if (teams.some((t) => t.groupId === row.groupId)) {
        return conflict(res, "Group still has teams"), true;
      }
      groups.splice(groups.indexOf(row), 1);
      broadcastAdmin("GROUP", "DELETE", row.groupId);
      res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return true;
    }
    return false;
  }

  // Teams
  if (path === "/api/teacher/teams" && req.method === "POST") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const klass = typeof body.class === "string" ? body.class.trim() : "";
    const groupId = String(body.groupId ?? "");
    if (!name || !klass) return badRequest(res, "Class and name are required"), true;
    if (!findById(groups, "groupId", groupId)) {
      return badRequest(res, "Unknown group"), true;
    }
    const row = { teamId: `team_new_${teacherSeq++}`, class: klass, name, groupId };
    teams.push(row);
    broadcastAdmin("TEAM", "CREATE", row.teamId);
    return json(res, 201, { data: row }), true;
  }
  const teamIdMatch = path.match(/^\/api\/teacher\/teams\/(.+)$/);
  if (teamIdMatch) {
    const row = findById(teams, "teamId", decodeURIComponent(teamIdMatch[1]));
    if (!row) return notFound(res, "Team not found"), true;
    if (req.method === "PUT") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const klass = typeof body.class === "string" ? body.class.trim() : "";
      const groupId = String(body.groupId ?? "");
      if (!name || !klass) return badRequest(res, "Class and name are required"), true;
      if (!findById(groups, "groupId", groupId)) {
        return badRequest(res, "Unknown group"), true;
      }
      row.name = name;
      row.class = klass;
      row.groupId = groupId;
      broadcastAdmin("TEAM", "UPDATE", row.teamId);
      return json(res, 200, { data: row }), true;
    }
    if (req.method === "DELETE") {
      if (
        games.some(
          (g) =>
            g.teamAId === row.teamId ||
            g.teamBId === row.teamId ||
            g.refereeTeamId === row.teamId,
        )
      ) {
        return conflict(res, "Team is referenced by a game"), true;
      }
      teams.splice(teams.indexOf(row), 1);
      broadcastAdmin("TEAM", "DELETE", row.teamId);
      res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return true;
    }
    return false;
  }

  // Rounds
  if (path === "/api/teacher/rounds" && req.method === "POST") {
    const number = body.number;
    if (!Number.isInteger(number) || (number as number) <= 0) {
      return badRequest(res, "Number must be a positive integer"), true;
    }
    if (rounds.some((r) => r.number === number)) {
      return conflict(res, "Round already exists"), true;
    }
    const row = { roundId: `round_new_${teacherSeq++}`, number: number as number };
    rounds.push(row);
    broadcastAdmin("ROUND", "CREATE", row.roundId);
    return json(res, 201, { data: row }), true;
  }
  const roundIdMatch = path.match(/^\/api\/teacher\/rounds\/(.+)$/);
  if (roundIdMatch) {
    const row = findById(rounds, "roundId", decodeURIComponent(roundIdMatch[1]));
    if (!row) return notFound(res, "Round not found"), true;
    if (req.method === "PUT") {
      const number = body.number;
      if (!Number.isInteger(number) || (number as number) <= 0) {
        return badRequest(res, "Number must be a positive integer"), true;
      }
      if (rounds.some((r) => r !== row && r.number === number)) {
        return conflict(res, "Round already exists"), true;
      }
      row.number = number as number;
      broadcastAdmin("ROUND", "UPDATE", row.roundId);
      return json(res, 200, { data: row }), true;
    }
    if (req.method === "DELETE") {
      if (games.some((g) => g.roundId === row.roundId)) {
        return conflict(res, "Round still has games"), true;
      }
      rounds.splice(rounds.indexOf(row), 1);
      broadcastAdmin("ROUND", "DELETE", row.roundId);
      res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return true;
    }
    return false;
  }

  // Fields
  if (path === "/api/teacher/fields" && req.method === "POST") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest(res, "Name is required"), true;
    if (fields.some((f) => f.name === name)) {
      return conflict(res, "Field already exists"), true;
    }
    const row = { fieldId: `field_new_${teacherSeq++}`, name };
    fields.push(row);
    broadcastAdmin("FIELD", "CREATE", row.fieldId);
    return json(res, 201, { data: row }), true;
  }
  const fieldIdMatch = path.match(/^\/api\/teacher\/fields\/(.+)$/);
  if (fieldIdMatch) {
    const row = findById(fields, "fieldId", decodeURIComponent(fieldIdMatch[1]));
    if (!row) return notFound(res, "Field not found"), true;
    if (req.method === "PUT") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return badRequest(res, "Name is required"), true;
      if (fields.some((f) => f !== row && f.name === name)) {
        return conflict(res, "Field already exists"), true;
      }
      row.name = name;
      broadcastAdmin("FIELD", "UPDATE", row.fieldId);
      return json(res, 200, { data: row }), true;
    }
    if (req.method === "DELETE") {
      if (games.some((g) => g.fieldId === row.fieldId)) {
        return conflict(res, "Field still has games"), true;
      }
      fields.splice(fields.indexOf(row), 1);
      broadcastAdmin("FIELD", "DELETE", row.fieldId);
      res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return true;
    }
    return false;
  }

  // Games (full-object writes; numeric request IDs accepted as strings).
  // Scores are integers >= 0 (admin doc §8, §30); null is rejected.
  const checkGameBody = ():
    | { ok: true; value: Record<string, string | number> }
    | { ok: false } => {
    const roundId = String(body.roundId ?? "");
    const fieldId = String(body.fieldId ?? "");
    const teamAId = String(body.teamAId ?? "");
    const teamBId = String(body.teamBId ?? "");
    const refereeTeamId = String(body.refereeTeamId ?? "");
    const scoreA = body.scoreA;
    const scoreB = body.scoreB;
    if (!roundId || !fieldId || !teamAId || !teamBId || !refereeTeamId) {
      return { ok: false };
    }
    if (teamAId === teamBId || refereeTeamId === teamAId || refereeTeamId === teamBId) {
      return { ok: false };
    }
    if (
      !Number.isInteger(scoreA) ||
      (scoreA as number) < 0 ||
      !Number.isInteger(scoreB) ||
      (scoreB as number) < 0
    ) {
      return { ok: false };
    }
    if (
      !findById(rounds, "roundId", roundId) ||
      !findById(fields, "fieldId", fieldId) ||
      !findById(teams, "teamId", teamAId) ||
      !findById(teams, "teamId", teamBId) ||
      !findById(teams, "teamId", refereeTeamId)
    ) {
      return { ok: false };
    }
    return {
      ok: true,
      value: { roundId, fieldId, teamAId, teamBId, refereeTeamId, scoreA: scoreA as number, scoreB: scoreB as number },
    };
  };

  if (path === "/api/teacher/games" && req.method === "POST") {
    const checked = checkGameBody();
    if (!checked.ok) return badRequest(res, "Invalid game"), true;
    const row = { gameId: `game_new_${teacherSeq++}`, ...checked.value };
    games.push(row as (typeof games)[number]);
    broadcastAdmin("GAME", "CREATE", row.gameId);
    return json(res, 201, { data: row }), true;
  }
  const gameIdMatch = path.match(/^\/api\/teacher\/games\/([^/]+)$/);
  if (gameIdMatch) {
    const row = findById(games, "gameId", decodeURIComponent(gameIdMatch[1]));
    if (!row) return notFound(res, "Game not found"), true;
    if (req.method === "PUT") {
      const checked = checkGameBody();
      if (!checked.ok) return badRequest(res, "Invalid game"), true;
      Object.assign(row, checked.value);
      broadcastAdmin("GAME", "UPDATE", row.gameId);
      return json(res, 200, { data: row }), true;
    }
    if (req.method === "DELETE") {
      games.splice(games.indexOf(row), 1);
      broadcastAdmin("GAME", "DELETE", row.gameId);
      res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return true;
    }
    return false;
  }

  // Recommended lifecycle endpoints (admin doc §13):
  // POST /api/teacher/games/{id}/start|finish. Sets the explicit
  // game status and broadcasts GAME UPDATE.
  const lifecycleMatch = path.match(
    /^\/api\/teacher\/games\/([^/]+)\/(start|finish)$/,
  );
  if (lifecycleMatch && req.method === "POST") {
    const row = findById(games, "gameId", decodeURIComponent(lifecycleMatch[1]));
    if (!row) return notFound(res, "Game not found"), true;
    (row as { status?: string }).status =
      lifecycleMatch[2] === "start" ? "LIVE" : "COMPLETED";
    broadcastAdmin("GAME", "UPDATE", row.gameId);
    return json(res, 200, { data: row }), true;
  }

  return notFound(res, "Unknown teacher endpoint"), true;
}

function router(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Test-Scenario",
    });
    res.end();
    return;
  }

  // Forced error hooks for manual testing (?fail=500 / ?badjson=1).
  if (url.searchParams.get("fail") === "500") {
    json(res, 500, {
      error: { code: "SERVER_ERROR", message: "Forced failure", details: {} },
    });
    return;
  }
  if (url.searchParams.get("badjson") === "1") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("{not-json");
    return;
  }

  // Groups
  if (path === "/api/groups" && req.method === "GET") {
    if (url.searchParams.get("empty") === "1") return json(res, 200, { data: [] });
    return json(res, 200, { data: groups });
  }
  const groupMatch = path.match(/^\/api\/groups\/(.+)$/);
  if (groupMatch && req.method === "GET") {
    const row = findById(groups, "groupId", decodeURIComponent(groupMatch[1]));
    if (!row) return notFound(res, "Group not found");
    return json(res, 200, { data: row });
  }

  // Matches (= games). Real backend uses /api/games;
  // keep /api/matches as an alias for backwards compatibility.
  if (
    (path === "/api/matches" || path === "/api/games") &&
    req.method === "GET"
  ) {
    if (url.searchParams.get("empty") === "1") return json(res, 200, { data: [] });
    return json(res, 200, { data: games });
  }
  const filterMatch = path.match(/^\/api\/(?:matches|games)\/filter\/(.+)$/);
  if (filterMatch && req.method === "GET") {
    const filter = decodeURIComponent(filterMatch[1]);
    // Until backend syntax is fixed the test server treats the
    // filter as a roundId (the required round use case, doc §5.5).
    if (filter === "invalid") {
      return json(res, 400, {
        error: { code: "BAD_REQUEST", message: "Invalid filter", details: {} },
      });
    }
    return json(res, 200, {
      data: games.filter((g) => g.roundId === filter),
    });
  }
  const matchMatch = path.match(/^\/api\/(?:matches|games)\/(.+)$/);
  if (matchMatch && req.method === "GET") {
    const row = findById(games, "gameId", decodeURIComponent(matchMatch[1]));
    if (!row) return notFound(res, "Game not found");
    return json(res, 200, { data: row });
  }

  // Teams
  if (path === "/api/teams" && req.method === "GET") {
    if (url.searchParams.get("empty") === "1") return json(res, 200, { data: [] });
    return json(res, 200, { data: teams });
  }
  const teamMatch = path.match(/^\/api\/teams\/(.+)$/);
  if (teamMatch && req.method === "GET") {
    const row = findById(teams, "teamId", decodeURIComponent(teamMatch[1]));
    if (!row) return notFound(res, "Team not found");
    return json(res, 200, { data: row });
  }

  // Extra lookups used by the frontend (fields/rounds).
  if (path === "/api/fields" && req.method === "GET") {
    return json(res, 200, { data: fields });
  }
  if (path === "/api/rounds" && req.method === "GET") {
    return json(res, 200, { data: rounds });
  }

  // Teacher CRUD (admin app). Async: reads the JSON body.
  if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
    void teacherRouter(req, res, url, path);
    return;
  }

  return notFound(res, "Unknown endpoint");
}

const server = createServer(router);
const wss = new WebSocketServer({ server, path: "/ws/live" });
attachWebSocket(wss);

server.listen(PORT, () => {
  console.log(`[test-server] REST on http://localhost:${PORT}`);
  console.log(`[test-server] WS on ws://localhost:${PORT}/ws/live`);
  console.log(
    "[test-server] Dev commands: game.created, game.updated, game.deleted, team.updated, field.updated, group.updated, round.updated",
  );
});

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", (line) => handleDevCommand(line));
