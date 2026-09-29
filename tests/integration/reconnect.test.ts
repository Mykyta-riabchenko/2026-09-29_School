import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import { getGames } from "../../src/api/gamesApi";
import { getTeams as fetchTeams } from "../../src/api/teamsApi";
import { getFields } from "../../src/api/fieldsApi";
import { createTournamentStore } from "../../src/state/store";

// Integration: REST consistency refresh after reconnect (doc §6).
// Simulates missed events while disconnected by refetching collections.
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("integration: reconnect consistency refetch", () => {
  it("refetch after reconnect reconciles missed game.updated events", async () => {
    const store = createTournamentStore();
    store.setGames([
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
    ]);

    // Server now has the newer score (event missed while offline).
    server.use(
      http.get(`${API_BASE_URL}/api/games`, () =>
        HttpResponse.json({
          data: [
            {
              gameId: "game_01",
              roundId: "round_01",
              fieldId: "field_01",
              teamAId: "team_01",
              teamBId: "team_02",
              refereeTeamId: "team_03",
              scoreA: 9,
              scoreB: 9,
            },
          ],
        }),
      ),
    );

    // After reconnecting, the frontend refetches collections.
    const fresh = await getGames();
    store.setGames(fresh);
    expect(store.getGame("game_01")?.scoreA).toBe(9);
  });

  it("round filter + lookups resolve display names", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/games/filter/:filter`, () =>
        HttpResponse.json({
          data: [
            {
              gameId: "game_03",
              roundId: "round_02",
              fieldId: "field_01",
              teamAId: "team_06",
              teamBId: "team_07",
              refereeTeamId: "team_02",
              scoreA: 5,
              scoreB: 3,
            },
          ],
        }),
      ),
      http.get(`${API_BASE_URL}/api/teams`, () =>
        HttpResponse.json({
          data: [
            { teamId: "team_06", class: "U18", name: "Lions", groupId: "g_03" },
            { teamId: "team_07", class: "U18", name: "Tigers", groupId: "g_03" },
            { teamId: "team_02", class: "U18", name: "Team Beta", groupId: "g_01" },
          ],
        }),
      ),
      http.get(`${API_BASE_URL}/api/fields`, () =>
        HttpResponse.json({ data: [{ fieldId: "field_01", name: "Main Field" }] }),
      ),
    );

    const { getGamesByFilter } = await import("../../src/api/gamesApi");
    const games = await getGamesByFilter("round_02");
    const teams = await fetchTeams();
    const fields = await getFields();
    expect(games).toHaveLength(1);
    expect(teams.find((t) => t.teamId === "team_06")?.name).toBe("Lions");
    expect(fields[0].name).toBe("Main Field");
  });
});

