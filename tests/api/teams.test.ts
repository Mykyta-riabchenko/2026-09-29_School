import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import { getTeams, getTeamById } from "../../src/api/teamsApi";

const team = {
  teamId: "team_01",
  class: "U18",
  name: "Team Alpha",
  groupId: "group_01",
};

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("GET /api/teams (doc §5.6)", () => {
  it("valid response with string class", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/teams`, () =>
        HttpResponse.json({ data: [team] }),
      ),
    );
    const [t] = await getTeams();
    expect(typeof t.class).toBe("string");
  });

  it("empty result is allowed", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/teams`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    expect(await getTeams()).toEqual([]);
  });

  it("server error is surfaced", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/teams`,
        () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "x" } },
            { status: 500 },
          ),
      ),
    );
    await expect(getTeams()).rejects.toMatchObject({ code: "SERVER_ERROR" });
  });

  it("network error is surfaced", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/teams`, () => HttpResponse.error()),
    );
    await expect(getTeams()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});

describe("GET /api/teams/{id} (doc §5.7)", () => {
  it("valid encoded ID returns 200", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/teams/:id`, () =>
        HttpResponse.json({ data: team }),
      ),
    );
    expect((await getTeamById("team_01")).teamId).toBe("team_01");
  });

  it("404 renders not-found", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/teams/:id`,
        () =>
          HttpResponse.json(
            { error: { code: "RESOURCE_NOT_FOUND", message: "nf" } },
            { status: 404 },
          ),
      ),
    );
    await expect(getTeamById("zz")).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
  });

  it("required fields are validated", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/teams/:id`, () =>
        HttpResponse.json({ data: { teamId: "x" } }),
      ),
    );
    await expect(getTeamById("x")).rejects.toThrow("Invalid Team payload");
  });
});
