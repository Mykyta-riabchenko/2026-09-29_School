import { describe, it, expect, beforeEach } from "vitest";
import {
  TOURNAMENT_CACHE_KEY,
  TOURNAMENT_CACHE_VERSION,
  saveTournamentCache,
  loadTournamentCache,
  clearTournamentCache,
  formatCacheAge,
  type CacheableMaps,
} from "../../src/state/cache";
import {
  createTournamentStore,
  hydrateStoreFromCache,
} from "../../src/state/store";
import type { Group } from "../../src/domain/group";
import type { Round } from "../../src/domain/round";
import type { Team } from "../../src/domain/team";
import type { Field } from "../../src/domain/field";
import type { Game } from "../../src/domain/game";

function seedState(): CacheableMaps {
  const groups: Group[] = [{ groupId: "g_01", name: "Group A" }];
  const rounds: Round[] = [{ roundId: "round_01", number: 1 }];
  const teams: Team[] = [
    { teamId: "team_01", class: "U18", name: "Team Alpha", groupId: "g_01" },
  ];
  const fields: Field[] = [{ fieldId: "field_01", name: "Main" }];
  const games: Game[] = [
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
  ];
  return {
    groups: new Map(groups.map((g): [string, Group] => [g.groupId, g])),
    rounds: new Map(rounds.map((r): [string, Round] => [r.roundId, r])),
    teams: new Map(teams.map((t): [string, Team] => [t.teamId, t])),
    fields: new Map(fields.map((f): [string, Field] => [f.fieldId, f])),
    games: new Map(games.map((g): [string, Game] => [g.gameId, g])),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("persistent offline cache", () => {
  it("saves and loads a roundtrip snapshot", () => {
    saveTournamentCache(seedState());
    const loaded = loadTournamentCache();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(TOURNAMENT_CACHE_VERSION);
    expect(loaded!.groups).toHaveLength(1);
    expect(loaded!.games[0].gameId).toBe("game_01");
    expect(typeof loaded!.savedAt).toBe("string");
  });

  it("returns null when no cache exists", () => {
    expect(loadTournamentCache()).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    localStorage.setItem(TOURNAMENT_CACHE_KEY, "{not-json");
    expect(loadTournamentCache()).toBeNull();
  });

  it("returns null on unknown version", () => {
    localStorage.setItem(
      TOURNAMENT_CACHE_KEY,
      JSON.stringify({ version: 999, savedAt: new Date().toISOString() }),
    );
    expect(loadTournamentCache()).toBeNull();
  });

  it("filters tampered items but keeps valid ones", () => {
    saveTournamentCache(seedState());
    const raw = JSON.parse(localStorage.getItem(TOURNAMENT_CACHE_KEY)!);
    raw.groups.push({ groupId: 123 });
    raw.games.push({ gameId: "bad" });
    localStorage.setItem(TOURNAMENT_CACHE_KEY, JSON.stringify(raw));
    const loaded = loadTournamentCache();
    expect(loaded!.groups).toHaveLength(1);
    expect(loaded!.games).toHaveLength(1);
  });

  it("store mutations persist to localStorage", () => {
    const store = createTournamentStore();
    store.setGroups([{ groupId: "g_01", name: "Group A" }]);
    const loaded = loadTournamentCache();
    expect(loaded?.groups).toHaveLength(1);
  });

  it("live events update the persistent cache", () => {
    const store = createTournamentStore();
    store.applyLiveEvent({
      type: "game.created",
      entity: "game",
      data: {
        gameId: "game_01",
        roundId: "round_01",
        fieldId: "field_01",
        teamAId: "team_01",
        teamBId: "team_02",
        refereeTeamId: "team_03",
        scoreA: 2,
        scoreB: 1,
      },
    });
    expect(loadTournamentCache()?.games).toHaveLength(1);
  });

  it("hydrates a fresh store from cache (offline reload)", () => {
    const first = createTournamentStore();
    first.setGroups([{ groupId: "g_01", name: "Group A" }]);
    first.setTeams([
      { teamId: "t1", class: "U18", name: "Alpha", groupId: "g_01" },
    ]);

    // Simulate a page reload while offline: brand-new store.
    const second = createTournamentStore();
    expect(second.getSnapshot().groups.size).toBe(0);
    expect(hydrateStoreFromCache(second)).toBe(true);
    expect(second.getSnapshot().groups.size).toBe(1);
    expect(second.getSnapshot().teams.get("t1")?.name).toBe("Alpha");
  });

  it("hydrate returns false without cache", () => {
    expect(hydrateStoreFromCache(createTournamentStore())).toBe(false);
  });

  it("clear removes the cache", () => {
    saveTournamentCache(seedState());
    clearTournamentCache();
    expect(loadTournamentCache()).toBeNull();
  });

  it("formats cache age for the banner", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    expect(
      formatCacheAge("2026-09-22T11:59:30Z", now),
    ).toBe("just now");
    expect(formatCacheAge("2026-09-22T11:30:00Z", now)).toBe("30 min ago");
    expect(formatCacheAge("2026-09-22T10:00:00Z", now)).toBe("2 h ago");
    expect(formatCacheAge("2026-09-20T12:00:00Z", now)).toBe("2 d ago");
  });
});
