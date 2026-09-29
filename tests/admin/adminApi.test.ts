import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import { API_BASE_URL as RUNTIME_URL } from "../../src/config/runtime";
import { apiRequest } from "../../src/api/client";
import { ApiError } from "../../src/api/errors";
import {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
} from "../../src/api/groups";
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
} from "../../src/api/teams";
import {
  getRounds,
  getRound,
  createRound,
  updateRound,
  deleteRound,
} from "../../src/api/rounds";
import {
  getFields,
  getField,
  createField,
  updateField,
  deleteField,
} from "../../src/api/fields";
import {
  getGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
} from "../../src/api/games";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const gameInput = {
  roundId: "1",
  fieldId: "1",
  teamAId: "1",
  teamBId: "2",
  refereeTeamId: "3",
  scoreA: 0,
  scoreB: 0,
};
const gameRow = { ...gameInput, gameId: "g1" };

describe("runtime config (admin doc §2, frontend doc §12)", () => {
  it("backend URL is configurable with localhost default, single source", () => {
    expect(RUNTIME_URL).toBe(
      process.env.VITE_API_BASE_URL ?? "http://localhost:4000",
    );
    expect(API_BASE_URL).toBe(RUNTIME_URL);
  });
});

describe("apiRequest (admin doc §4)", () => {
  it("201 create returns response.data", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/groups`, () =>
        HttpResponse.json({ data: { groupId: "g1", name: "A" } }, { status: 201 }),
      ),
    );
    await expect(
      apiRequest("/api/teacher/groups", { method: "POST", body: "{}" }),
    ).resolves.toEqual({ groupId: "g1", name: "A" });
  });

  it("204 delete resolves undefined", async () => {
    server.use(
      http.delete(
        `${API_BASE_URL}/api/teacher/groups/x`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(
      apiRequest("/api/teacher/groups/x", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("errors throw ApiError(status, code, message) with backend message", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/groups`, () =>
        HttpResponse.json(
          { error: { code: "CONFLICT", message: "Group already exists" } },
          { status: 409 },
        ),
      ),
    );
    const e = (await apiRequest("/api/teacher/groups", {
      method: "POST",
      body: "{}",
    }).catch((x) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(409);
    expect(e.code).toBe("CONFLICT");
    expect(e.message).toBe("Group already exists");
  });
});

describe("flat admin API (admin doc §4)", () => {
  it("groups: read via public GET, write via teacher POST/PUT/DELETE", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () =>
        HttpResponse.json({ data: [{ groupId: "g1", name: "B" }] }),
      ),
      http.get(`${API_BASE_URL}/api/groups/:id`, () =>
        HttpResponse.json({ data: { groupId: "g1", name: "B" } }),
      ),
      http.post(`${API_BASE_URL}/api/teacher/groups`, () =>
        HttpResponse.json({ data: { groupId: "g9", name: "N" } }, { status: 201 }),
      ),
      http.put(`${API_BASE_URL}/api/teacher/groups/:id`, () =>
        HttpResponse.json({ data: { groupId: "g1", name: "R" } }),
      ),
      http.delete(
        `${API_BASE_URL}/api/teacher/groups/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    expect((await getGroups())[0].name).toBe("B");
    expect((await getGroup("g1")).groupId).toBe("g1");
    expect((await createGroup("N")).groupId).toBe("g9");
    expect((await updateGroup("g1", "R")).name).toBe("R");
    await expect(deleteGroup("g1")).resolves.toBeUndefined();
  });

  it("teams: CRUD incl. group move", async () => {
    const row = { teamId: "t1", class: "U18", name: "A", groupId: "1" };
    server.use(
      http.get(`${API_BASE_URL}/api/teams`, () =>
        HttpResponse.json({ data: [row] }),
      ),
      http.get(`${API_BASE_URL}/api/teams/:id`, () =>
        HttpResponse.json({ data: row }),
      ),
      http.post(`${API_BASE_URL}/api/teacher/teams`, () =>
        HttpResponse.json({ data: { ...row, teamId: "t9" } }, { status: 201 }),
      ),
      http.put(`${API_BASE_URL}/api/teacher/teams/:id`, () =>
        HttpResponse.json({ data: { ...row, groupId: "2" } }),
      ),
      http.delete(
        `${API_BASE_URL}/api/teacher/teams/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    expect((await getTeams())[0].teamId).toBe("t1");
    expect((await getTeam("t1")).class).toBe("U18");
    expect((await createTeam({ groupId: "1", class: "U18", name: "A" })).teamId).toBe("t9");
    expect((await updateTeam("t1", { groupId: "2", class: "U18", name: "A" })).groupId).toBe("2");
    await expect(deleteTeam("t1")).resolves.toBeUndefined();
  });

  it("rounds: CRUD with positive integers", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/rounds`, () =>
        HttpResponse.json({ data: [{ roundId: "r1", number: 1 }] }),
      ),
      http.get(`${API_BASE_URL}/api/rounds/:id`, () =>
        HttpResponse.json({ data: { roundId: "r1", number: 1 } }),
      ),
      http.post(`${API_BASE_URL}/api/teacher/rounds`, () =>
        HttpResponse.json({ data: { roundId: "r9", number: 9 } }, { status: 201 }),
      ),
      http.put(`${API_BASE_URL}/api/teacher/rounds/:id`, () =>
        HttpResponse.json({ data: { roundId: "r1", number: 7 } }),
      ),
      http.delete(
        `${API_BASE_URL}/api/teacher/rounds/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    expect((await getRounds())[0].number).toBe(1);
    expect((await getRound("r1")).number).toBe(1);
    expect((await createRound(9)).number).toBe(9);
    expect((await updateRound("r1", 7)).number).toBe(7);
    await expect(deleteRound("r1")).resolves.toBeUndefined();
  });

  it("fields: CRUD", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/fields`, () =>
        HttpResponse.json({ data: [{ fieldId: "f1", name: "Hall" }] }),
      ),
      http.get(`${API_BASE_URL}/api/fields/:id`, () =>
        HttpResponse.json({ data: { fieldId: "f1", name: "Hall" } }),
      ),
      http.post(`${API_BASE_URL}/api/teacher/fields`, () =>
        HttpResponse.json({ data: { fieldId: "f9", name: "New" } }, { status: 201 }),
      ),
      http.put(`${API_BASE_URL}/api/teacher/fields/:id`, () =>
        HttpResponse.json({ data: { fieldId: "f1", name: "Renamed" } }),
      ),
      http.delete(
        `${API_BASE_URL}/api/teacher/fields/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    expect((await getFields())[0].name).toBe("Hall");
    expect((await getField("f1")).fieldId).toBe("f1");
    expect((await createField("New")).fieldId).toBe("f9");
    expect((await updateField("f1", "Renamed")).name).toBe("Renamed");
    await expect(deleteField("f1")).resolves.toBeUndefined();
  });

  it("games: read via /api/games, write via teacher endpoints", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({ data: [gameRow] }),
      ),
      http.get(`${API_BASE_URL}/api/games/:id`, () =>
        HttpResponse.json({ data: gameRow }),
      ),
      http.post(`${API_BASE_URL}/api/teacher/games`, () =>
        HttpResponse.json({ data: gameRow }, { status: 201 }),
      ),
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, () =>
        HttpResponse.json({ data: { ...gameRow, scoreA: 5 } }),
      ),
      http.delete(
        `${API_BASE_URL}/api/teacher/games/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    expect((await getGames())[0].gameId).toBe("g1");
    expect((await getGame("g1")).scoreA).toBe(0);
    expect((await createGame(gameInput)).gameId).toBe("g1");
    expect((await updateGame("g1", { ...gameInput, scoreA: 5, scoreB: 3 })).scoreA).toBe(5);
    await expect(deleteGame("g1")).resolves.toBeUndefined();
  });
});
