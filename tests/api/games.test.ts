import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import {
  getGames,
  getGameById,
  getGamesByFilter,
} from "../../src/api/gamesApi";

const game = {
  gameId: "game_01",
  roundId: "round_01",
  fieldId: "field_01",
  teamAId: "team_01",
  teamBId: "team_02",
  refereeTeamId: "team_03",
  scoreA: 2,
  scoreB: 1,
};

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("GET /api/games (doc §5.3)", () => {
  it("loads games from the API", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({ data: [game] }),
      ),
    );
    const games = await getGames();
    expect(games).toHaveLength(1);
    expect(games[0].gameId).toBe("game_01");
  });

  it("every game has round, field, two teams, referee and numeric scores", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({ data: [game] }),
      ),
    );
    const [g] = await getGames();
    expect(typeof g.roundId).toBe("string");
    expect(typeof g.fieldId).toBe("string");
    expect(typeof g.teamAId).toBe("string");
    expect(typeof g.teamBId).toBe("string");
    expect(typeof g.refereeTeamId).toBe("string");
    expect(typeof g.scoreA).toBe("number");
    expect(typeof g.scoreB).toBe("number");
  });

  it("game IDs are treated as opaque strings", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({ data: [{ ...game, gameId: "enc:9f3:X" }] }),
      ),
    );
    const [g] = await getGames();
    expect(g.gameId).toBe("enc:9f3:X");
  });

  it("invalid/missing relationships are rejected at the boundary", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({ data: [{ gameId: "x" }] }),
      ),
    );
    await expect(getGames()).rejects.toThrow("Invalid Game payload");
  });

  it("empty result is allowed", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    expect(await getGames()).toEqual([]);
  });

  it("500 is retryable", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/games`,
        () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "boom" } },
            { status: 500 },
          ),
      ),
    );
    await expect(getGames()).rejects.toMatchObject({ code: "SERVER_ERROR" });
  });

  it("malformed JSON is an API error", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/games`,
        () => new HttpResponse("nope{", { headers: { "Content-Type": "application/json" } }),
      ),
    );
    await expect(getGames()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});

describe("GET /api/games/{id} (doc §5.4)", () => {
  it("valid encoded ID returns 200 and preserves ID", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games/:id`, () =>
        HttpResponse.json({ data: game }),
      ),
    );
    const g = await getGameById("game_01");
    expect(g.gameId).toBe("game_01");
  });

  it("404 renders not-found", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/games/:id`,
        () =>
          HttpResponse.json(
            { error: { code: "RESOURCE_NOT_FOUND", message: "nf" } },
            { status: 404 },
          ),
      ),
    );
    await expect(getGameById("missing")).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
  });
});

describe("GET /api/games/filter/{filter} (doc §5.5)", () => {
  it("valid round filter returns only matching games", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games/filter/:filter`, ({ params }) =>
        HttpResponse.json({
          data: [game].filter((g) => g.roundId === params.filter),
        }),
      ),
    );
    expect(await getGamesByFilter("round_01")).toHaveLength(1);
    expect(await getGamesByFilter("round_02")).toHaveLength(0);
  });

  it("invalid filter returns documented 400", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/games/filter/:filter`,
        () =>
          HttpResponse.json(
            { error: { code: "BAD_REQUEST", message: "bad filter" } },
            { status: 400 },
          ),
      ),
    );
    await expect(getGamesByFilter("invalid")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

