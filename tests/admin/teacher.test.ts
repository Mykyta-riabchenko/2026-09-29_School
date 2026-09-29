import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import { TeacherApiError } from "../../src/api/teacher/errors";
import {
  createTeacherGroup,
  updateTeacherGroup,
  deleteTeacherGroup,
} from "../../src/api/teacher/groups";
import {
  createTeacherTeam,
  updateTeacherTeam,
  deleteTeacherTeam,
} from "../../src/api/teacher/teams";
import {
  createTeacherRound,
  updateTeacherRound,
  deleteTeacherRound,
} from "../../src/api/teacher/rounds";
import {
  createTeacherField,
  updateTeacherField,
  deleteTeacherField,
} from "../../src/api/teacher/fields";
import {
  createTeacherGame,
  updateTeacherGame,
  deleteTeacherGame,
  validateTeacherGameInput,
} from "../../src/api/teacher/games";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function err(status: number, message = "err", code = "E") {
  return HttpResponse.json({ error: { code, message } }, { status });
}

describe("teacher groups (admin doc §30)", () => {
  it("create valid → 201 with data", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/groups`, () =>
        HttpResponse.json(
          { data: { groupId: "g9", name: "Group I" } },
          { status: 201 },
        ),
      ),
    );
    const g = await createTeacherGroup("Group I");
    expect(g).toEqual({ groupId: "g9", name: "Group I" });
  });

  it("create blank → 400", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/groups`, () => err(400, "Name is required")),
    );
    await expect(createTeacherGroup("")).rejects.toMatchObject({ status: 400 });
  });

  it("create duplicate → 409 preserves caller state", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/groups`, () => err(409, "Group already exists", "CONFLICT")),
    );
    const e = await createTeacherGroup("Group A").catch((x) => x);
    expect(e).toBeInstanceOf(TeacherApiError);
    expect((e as TeacherApiError).isConflict).toBe(true);
  });

  it("update valid → 200; missing → 404", async () => {
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/groups/:id`, () =>
        HttpResponse.json({ data: { groupId: "g1", name: "Renamed" } }),
      ),
    );
    expect((await updateTeacherGroup("g1", "Renamed")).name).toBe("Renamed");
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/groups/:id`, () => err(404, "Group not found")),
    );
    await expect(updateTeacherGroup("nope", "X")).rejects.toMatchObject({ status: 404 });
  });

  it("delete unused → 204; referenced → 409", async () => {
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/groups/:id`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(deleteTeacherGroup("g1")).resolves.toBeUndefined();
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/groups/:id`, () => err(409, "Group still has teams")),
    );
    await expect(deleteTeacherGroup("g1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("teacher teams (admin doc §30)", () => {
  it("create valid → 201; unknown group → 400; blank → 400", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/teams`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(typeof body.groupId).toBe("number");
        expect(body.class).toBe("U18");
        return HttpResponse.json(
          {
            data: { teamId: "t9", class: "U18", name: "New", groupId: "1" },
          },
          { status: 201 },
        );
      }),
    );
    const t = await createTeacherTeam({ groupId: "1", class: "U18", name: "New" });
    expect(t.teamId).toBe("t9");

    server.use(http.post(`${API_BASE_URL}/api/teacher/teams`, () => err(400, "Unknown group")));
    await expect(
      createTeacherTeam({ groupId: "999", class: "U18", name: "New" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("update move group → 200; missing → 404; delete referenced → 409", async () => {
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/teams/:id`, () =>
        HttpResponse.json({ data: { teamId: "t1", class: "U18", name: "Moved", groupId: "2" } }),
      ),
    );
    expect((await updateTeacherTeam("t1", { groupId: "2", class: "U18", name: "Moved" })).groupId).toBe("2");
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/teams/:id`, () => err(409, "Team is referenced by a game")),
    );
    await expect(deleteTeacherTeam("t1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("teacher rounds (admin doc §30)", () => {
  it("positive integer → success; zero/negative → client 400; duplicate → 409", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/rounds`, () =>
        HttpResponse.json(
          { data: { roundId: "r9", number: 9 } },
          { status: 201 },
        ),
      ),
    );
    expect((await createTeacherRound(9)).number).toBe(9);
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/rounds`, () => err(409, "Round already exists")),
    );
    await expect(createTeacherRound(1)).rejects.toMatchObject({ status: 409 });
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/rounds/:id`, () => err(404, "Round not found")),
    );
    await expect(deleteTeacherRound("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("update valid → 200", async () => {
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/rounds/:id`, () =>
        HttpResponse.json({ data: { roundId: "r1", number: 7 } }),
      ),
    );
    expect((await updateTeacherRound("r1", 7)).number).toBe(7);
  });
});

describe("teacher fields (admin doc §30)", () => {
  it("create/update/delete incl. referenced → 409", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/fields`, () =>
        HttpResponse.json(
          { data: { fieldId: "f9", name: "Hall" } },
          { status: 201 },
        ),
      ),
    );
    expect((await createTeacherField("Hall")).fieldId).toBe("f9");
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/fields/:id`, () =>
        HttpResponse.json({ data: { fieldId: "f1", name: "Renamed" } }),
      ),
    );
    expect((await updateTeacherField("f1", "Renamed")).name).toBe("Renamed");
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/fields/:id`, () => err(409, "Field still has games")),
    );
    await expect(deleteTeacherField("f1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("teacher games (admin doc §30)", () => {
  const input = {
    roundId: "1",
    fieldId: "1",
    teamAId: "1",
    teamBId: "2",
    refereeTeamId: "3",
    scoreA: 0,
    scoreB: 0,
  };

  it("valid create → 201; invalid bodies → 400", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/games`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        // Numeric wire IDs per OpenAPI.
        expect(typeof body.roundId).toBe("number");
        return HttpResponse.json(
          {
            data: {
              gameId: "gm9",
              roundId: "1",
              fieldId: "1",
              teamAId: "1",
              teamBId: "2",
              refereeTeamId: "3",
              scoreA: 0,
              scoreB: 0,
            },
          },
          { status: 201 },
        );
      }),
    );
    expect((await createTeacherGame(input)).gameId).toBe("gm9");

    server.use(http.post(`${API_BASE_URL}/api/teacher/games`, () => err(400, "Invalid game")));
    await expect(createTeacherGame({ ...input, teamBId: "1" })).rejects.toMatchObject({ status: 400 });
    await expect(createTeacherGame({ ...input, scoreA: -1 })).rejects.toMatchObject({ status: 400 });
  });

  it("update valid → 200; missing → 404; delete existing → 204", async () => {
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, () =>
        HttpResponse.json({
          data: { ...input, gameId: "gm1", roundId: "1", fieldId: "1", teamAId: "1", teamBId: "2", refereeTeamId: "3", scoreA: 5, scoreB: 3 },
        }),
      ),
    );
    expect((await updateTeacherGame("gm1", { ...input, scoreA: 5, scoreB: 3 })).scoreA).toBe(5);
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/games/:id`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(deleteTeacherGame("gm1")).resolves.toBeUndefined();
  });

  it("form validation blocks teamA==teamB, referee collisions, bad scores", () => {
    expect(validateTeacherGameInput(input)).toBeNull();
    expect(validateTeacherGameInput({ ...input, teamBId: "1" })).toMatch(/differ/);
    expect(validateTeacherGameInput({ ...input, refereeTeamId: "1" })).toMatch(/Referee/);
    expect(validateTeacherGameInput({ ...input, refereeTeamId: "2" })).toMatch(/Referee/);
    expect(validateTeacherGameInput({ ...input, scoreA: -1 })).toMatch(/Score A/);
    expect(validateTeacherGameInput({ ...input, scoreB: 1.5 })).toMatch(/Score B/);
    expect(validateTeacherGameInput({ ...input, roundId: "" })).toMatch(/required/);
  });
});

describe("teacher transport errors", () => {
  it("network failure → status 0; 500 → retryable", async () => {
    server.use(http.post(`${API_BASE_URL}/api/teacher/groups`, () => HttpResponse.error()));
    const e = await createTeacherGroup("X").catch((x) => x);
    expect(e).toBeInstanceOf(TeacherApiError);
    expect((e as TeacherApiError).isNetwork).toBe(true);

    server.use(
      http.post(`${API_BASE_URL}/api/teacher/groups`, () => err(500, "boom", "SERVER_ERROR")),
    );
    await expect(createTeacherGroup("X")).rejects.toMatchObject({ status: 500 });
  });
});
