import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import { normalizeAdminEvent } from "../../src/live/liveEvents";
import { handleInvalidateEntity, handleRawLiveMessage } from "../../src/live/liveSync";
import { createTournamentStore } from "../../src/state/store";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const game = {
  gameId: "17",
  roundId: "r1",
  fieldId: "f1",
  teamAId: "t1",
  teamBId: "t2",
  refereeTeamId: "t3",
  scoreA: 19,
  scoreB: 21,
};

describe("admin WS format (admin doc §19, §32)", () => {
  it("parses TOURNAMENT_DATA_CHANGED GAME UPDATE", () => {
    expect(
      normalizeAdminEvent({
        type: "TOURNAMENT_DATA_CHANGED",
        entity: "GAME",
        operation: "UPDATE",
        entityId: 17,
      }),
    ).toEqual({ entity: "game", action: "updated", id: "17" });
  });

  it("rejects unknown entity/operation/missing id", () => {
    expect(
      normalizeAdminEvent({ type: "TOURNAMENT_DATA_CHANGED", entity: "FOO", operation: "UPDATE", entityId: 1 }),
    ).toBeNull();
    expect(
      normalizeAdminEvent({ type: "TOURNAMENT_DATA_CHANGED", entity: "GAME", operation: "MERGE", entityId: 1 }),
    ).toBeNull();
    expect(
      normalizeAdminEvent({ type: "TOURNAMENT_DATA_CHANGED", entity: "GAME", operation: "UPDATE" }),
    ).toBeNull();
    expect(normalizeAdminEvent({ type: "game.updated", entity: "game", data: {} })).toBeNull();
  });

  it("GAME UPDATE → refresh single game via REST", async () => {
    let hits = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/matches/:id`, () => {
        hits += 1;
        return HttpResponse.json({ data: game });
      }),
    );
    const store = createTournamentStore();
    store.setGames([{ ...game, scoreA: 0, scoreB: 0 }]);
    await handleInvalidateEntity("game", "updated", "17", store);
    expect(hits).toBe(1);
    expect(store.getGame("17")).toMatchObject({ scoreA: 19, scoreB: 21 });
  });

  it("GAME DELETE → remove without REST", async () => {
    const store = createTournamentStore();
    store.setGames([game]);
    await handleInvalidateEntity("game", "deleted", "17", store);
    expect(store.getGame("17")).toBeUndefined();
  });

  it("TEAM UPDATE → refresh team-dependent views (collection)", async () => {
    let hits = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/teams`, () => {
        hits += 1;
        return HttpResponse.json({
          data: [{ teamId: "t1", class: "U18", name: "Renamed", groupId: "g1" }],
        });
      }),
    );
    const store = createTournamentStore();
    await handleInvalidateEntity("team", "updated", "t1", store);
    expect(hits).toBe(1);
    expect(store.getSnapshot().teams.get("t1")?.name).toBe("Renamed");
  });

  it("GROUP/ROUND/FIELD UPDATE → refresh their collections", async () => {
    const hits = { groups: 0, rounds: 0, fields: 0 };
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () => {
        hits.groups += 1;
        return HttpResponse.json({ data: [{ groupId: "g1", name: "G" }] });
      }),
      http.get(`${API_BASE_URL}/api/rounds`, () => {
        hits.rounds += 1;
        return HttpResponse.json({ data: [{ roundId: "r1", number: 2 }] });
      }),
      http.get(`${API_BASE_URL}/api/fields`, () => {
        hits.fields += 1;
        return HttpResponse.json({ data: [{ fieldId: "f1", name: "F" }] });
      }),
    );
    const store = createTournamentStore();
    await handleInvalidateEntity("group", "updated", "g1", store);
    await handleInvalidateEntity("round", "updated", "r1", store);
    await handleInvalidateEntity("field", "updated", "f1", store);
    expect(hits).toEqual({ groups: 1, rounds: 1, fields: 1 });
    expect(store.getSnapshot().rounds.get("r1")?.number).toBe(2);
  });

  it("raw handler accepts both formats, ignores garbage", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/matches/:id`, () =>
        HttpResponse.json({ data: game }),
      ),
    );
    const store = createTournamentStore();
    expect(
      await handleRawLiveMessage(
        { type: "TOURNAMENT_DATA_CHANGED", entity: "GAME", operation: "UPDATE", entityId: 17 },
        store,
      ),
    ).toBe(true);
    expect(store.getGame("17")).toBeDefined();
    expect(await handleRawLiveMessage({ nope: 1 }, store)).toBe(false);
    expect(await handleRawLiveMessage("junk", store)).toBe(false);
  });
});
