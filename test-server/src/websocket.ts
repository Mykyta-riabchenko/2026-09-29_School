// WebSocket hub for the local test server (WS /ws/live).
// Broadcasts entity lifecycle events and exposes a dev console
// for manually emitting events (doc §13: game.created, game.updated,
// game.deleted, team.updated, field.updated, group.updated, ...).

import type { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function attachWebSocket(server: WebSocketServer) {
  wss = server;
  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });
}

export function broadcast(type: string, entity: string, data: unknown) {
  const payload = JSON.stringify({ type, entity, data });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
  console.log(`[ws] broadcast ${type}`, data);
}

// Admin-format broadcast (admin doc §29): identity-only trigger, the
// client refetches via REST. Also exposed via POST /__test__/broadcast.
export function broadcastAdmin(
  entity: "GROUP" | "TEAM" | "ROUND" | "FIELD" | "GAME",
  operation: "CREATE" | "UPDATE" | "DELETE",
  entityId: string | number,
) {
  const payload = JSON.stringify({
    type: "TOURNAMENT_DATA_CHANGED",
    entity,
    operation,
    entityId,
  });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
  console.log(`[ws] broadcast TOURNAMENT_DATA_CHANGED ${entity} ${operation}`, entityId);
}

// Readable dev commands typed into the test-server console.
export function handleDevCommand(line: string) {
  const cmd = line.trim();
  if (cmd === "game.updated") {
    broadcast("game.updated", "game", {
      gameId: "game_01",
      roundId: "round_01",
      fieldId: "field_01",
      teamAId: "team_01",
      teamBId: "team_02",
      refereeTeamId: "team_03",
      scoreA: 3,
      scoreB: 1,
    });
  } else if (cmd === "game.created") {
    broadcast("game.created", "game", {
      gameId: `game_${Date.now()}`,
      roundId: "round_01",
      fieldId: "field_01",
      teamAId: "team_01",
      teamBId: "team_04",
      refereeTeamId: "team_05",
      scoreA: 0,
      scoreB: 0,
    });
  } else if (cmd === "game.deleted") {
    broadcast("game.deleted", "game", { gameId: "game_01" });
  } else if (cmd === "team.updated") {
    broadcast("team.updated", "team", {
      teamId: "team_01",
      class: "U18",
      name: "Team Alpha (live)",
      groupId: "g_01",
    });
  } else if (cmd === "field.updated") {
    broadcast("field.updated", "field", {
      fieldId: "field_01",
      name: "Main Field (live)",
    });
  } else if (cmd === "group.updated") {
    broadcast("group.updated", "group", {
      groupId: "g_01",
      name: "Group A (live)",
    });
  } else if (cmd === "round.updated") {
    broadcast("round.updated", "round", {
      roundId: "round_01",
      number: 1,
    });
  } else if (cmd.length > 0) {
    console.log(
      "[ws] unknown command. Try: game.created, game.updated, game.deleted, team.updated, field.updated, group.updated, round.updated",
    );
  }
}
