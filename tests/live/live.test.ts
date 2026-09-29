import { describe, it, expect } from "vitest";
import {
  validateLiveEvent,
  LIVE_EVENT_TYPES,
} from "../../src/live/liveEvents";
import { getReconnectDelay } from "../../src/live/reconnect";
import { createTournamentStore } from "../../src/state/store";

const gameData = {
  gameId: "game_01",
  roundId: "round_01",
  fieldId: "field_01",
  teamAId: "team_01",
  teamBId: "team_02",
  refereeTeamId: "team_03",
  scoreA: 2,
  scoreB: 1,
};

describe("WebSocket events (doc §6, §14.3)", () => {
  it("covers all 15 lifecycle events", () => {
    expect(LIVE_EVENT_TYPES).toHaveLength(15);
    for (const prefix of ["group", "round", "team", "field", "game"]) {
      for (const action of ["created", "updated", "deleted"]) {
        expect(LIVE_EVENT_TYPES).toContain(`${prefix}.${action}`);
      }
    }
  });

  it("game.created inserts a game", () => {
    const store = createTournamentStore();
    const event = validateLiveEvent({
      type: "game.created",
      entity: "game",
      data: gameData,
    });
    expect(event).not.toBeNull();
    store.applyLiveEvent(event!);
    expect(store.getGame("game_01")?.scoreA).toBe(2);
  });

  it("updates a game when game.updated is received", () => {
    const store = createTournamentStore();
    store.applyLiveEvent({
      type: "game.created",
      entity: "game",
      data: gameData,
    });
    store.applyLiveEvent({
      type: "game.updated",
      entity: "game",
      data: { ...gameData, scoreA: 4, scoreB: 2 },
    });
    expect(store.getGame("game_01")?.scoreA).toBe(4);
  });

  it("game.deleted removes the game", () => {
    const store = createTournamentStore();
    store.applyLiveEvent({
      type: "game.created",
      entity: "game",
      data: gameData,
    });
    store.applyLiveEvent({
      type: "game.deleted",
      entity: "game",
      data: { gameId: "game_01" },
    });
    expect(store.getGame("game_01")).toBeUndefined();
  });

  it("team update refreshes team references", () => {
    const store = createTournamentStore();
    store.setTeams([
      { teamId: "team_01", class: "U18", name: "Old", groupId: "g1" },
    ]);
    store.applyLiveEvent({
      type: "team.updated",
      entity: "team",
      data: { teamId: "team_01", class: "U18", name: "New", groupId: "g1" },
    });
    expect(store.getSnapshot().teams.get("team_01")?.name).toBe("New");
  });

  it("invalid event is ignored (null) and logged by caller", () => {
    expect(
      validateLiveEvent({ type: "game.bogus", data: {} }),
    ).toBeNull();
    expect(validateLiveEvent({ type: "game.updated", data: { gameId: 1 } })).toBeNull();
    expect(validateLiveEvent("nope")).toBeNull();
  });

  it("duplicate update is idempotent", () => {
    const store = createTournamentStore();
    const ev = {
      type: "game.updated" as const,
      entity: "game" as const,
      data: gameData,
    };
    store.applyLiveEvent(ev);
    store.applyLiveEvent(ev);
    expect(store.getSnapshot().games.size).toBe(1);
  });

  it("update after deletion re-creates the entry", () => {
    const store = createTournamentStore();
    store.applyLiveEvent({
      type: "game.created",
      entity: "game",
      data: gameData,
    });
    store.applyLiveEvent({
      type: "game.deleted",
      entity: "game",
      data: { gameId: "game_01" },
    });
    expect(store.getGame("game_01")).toBeUndefined();
    store.applyLiveEvent({
      type: "game.updated",
      entity: "game",
      data: gameData,
    });
    expect(store.getGame("game_01")).toBeDefined();
  });

  it("reconnect backoff is 1s→2s→4s→8s→16s→max 30s", () => {
    expect([
      getReconnectDelay(0),
      getReconnectDelay(1),
      getReconnectDelay(2),
      getReconnectDelay(3),
      getReconnectDelay(4),
      getReconnectDelay(5),
      getReconnectDelay(99),
    ]).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });
});
