// Live-backend connection test.
// By default these tests are SKIPPED: they need a reachable backend at
// API_BASE_URL (default http://localhost:8080, or VITE_API_BASE_URL).
// Run with: RUN_BACKEND_TESTS=1 npx vitest run tests/api/real-backend-connection.test.ts
// This verifies the frontend API layer can parse REAL backend payloads,
// so the UI (GameList/TeamList/...) renders live data, not mocks.
import { describe, it, expect } from "vitest";
import { API_BASE_URL } from "../../src/config/api";
import { getGroups } from "../../src/api/groupsApi";
import { getGames, getGamesByFilter } from "../../src/api/gamesApi";
import { getTeams } from "../../src/api/teamsApi";
import { getFields } from "../../src/api/fieldsApi";
import { getRounds } from "../../src/api/roundsApi";

// Real network can be slow / backend may be starting — allow 30s.
const TIMEOUT = 30_000;

const describeLive = process.env.RUN_BACKEND_TESTS ? describe : describe.skip;

describe("real backend connection", () => {
  it("API_BASE_URL defaults to the local backend", () => {
    expect(API_BASE_URL).toBe(
      process.env.VITE_API_BASE_URL ?? "http://localhost:4000",
    );
  });
});

describeLive("real backend connection (live)", () => {
  it("loads groups from the real backend", async () => {
    const groups = await getGroups();
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].groupId).toBeTypeOf("string");
    expect(groups[0].name).toBeTypeOf("string");
  }, TIMEOUT);

  it("loads teams + fields + rounds from the real backend", async () => {
    const [teams, fields, rounds] = await Promise.all([
      getTeams(),
      getFields(),
      getRounds(),
    ]);
    expect(teams.length).toBeGreaterThan(0);
    expect(fields.length).toBeGreaterThan(0);
    expect(rounds.length).toBeGreaterThan(0);
    // Team class string (backend may send `class` or `clazz`).
    expect(typeof teams[0].class).toBe("string");
  }, TIMEOUT);

  it("loads games with all required relations", async () => {
    const games = await getGames();
    expect(games.length).toBeGreaterThan(0);
    for (const g of games) {
      expect(typeof g.gameId).toBe("string");
      expect(typeof g.roundId).toBe("string");
      expect(typeof g.fieldId).toBe("string");
      expect(typeof g.teamAId).toBe("string");
      expect(typeof g.teamBId).toBe("string");
      expect(typeof g.refereeTeamId).toBe("string");
      expect(typeof g.scoreA).toBe("number");
      expect(typeof g.scoreB).toBe("number");
    }
  }, TIMEOUT);

  it("round filter returns only matching games", async () => {
    const games = await getGames();
    const roundId = games[0].roundId;
    const filtered = await getGamesByFilter(roundId);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((g) => g.roundId === roundId)).toBe(true);
  }, TIMEOUT);

  it("frontend lookups resolve names for display (what GameList shows)", async () => {
    const [games, teams, fields] = await Promise.all([
      getGames(),
      getTeams(),
      getFields(),
    ]);
    const teamsById = new Map(teams.map((t) => [t.teamId, t]));
    const fieldsById = new Map(fields.map((f) => [f.fieldId, f]));
    const g = games[0];
    // These are exactly what GameList renders instead of raw IDs.
    expect(teamsById.get(g.teamAId)?.name).toBeTypeOf("string");
    expect(teamsById.get(g.teamBId)?.name).toBeTypeOf("string");
    expect(teamsById.get(g.refereeTeamId)?.name).toBeTypeOf("string");
    expect(fieldsById.get(g.fieldId)?.name).toBeTypeOf("string");
  }, TIMEOUT);
});
