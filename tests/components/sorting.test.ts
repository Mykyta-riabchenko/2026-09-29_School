import { describe, it, expect } from "vitest";
import { sortTeamsByName } from "../../src/domain/team";
import { sortGroupsByName } from "../../src/domain/group";
import { filterGamesByRound } from "../../src/domain/game";
import type { Game } from "../../src/domain/game";

describe("alphabetical sorting (doc §7)", () => {
  it("sorts teams alphabetically by name", () => {
    const teams = [
      { teamId: "3", name: "Zeta", class: "U18", groupId: "g1" },
      { teamId: "1", name: "Alpha", class: "U18", groupId: "g1" },
      { teamId: "2", name: "Beta", class: "U18", groupId: "g1" },
    ];
    const result = sortTeamsByName(teams);
    expect(result.map((t) => t.name)).toEqual(["Alpha", "Beta", "Zeta"]);
  });

  it("sorts groups ascending A→Z without mutating input", () => {
    const groups = [
      { groupId: "2", name: "Group B" },
      { groupId: "1", name: "Group A" },
    ];
    const copy = [...groups];
    const result = sortGroupsByName(groups);
    expect(result.map((g) => g.name)).toEqual(["Group A", "Group B"]);
    expect(groups).toEqual(copy);
  });

  it("duplicate names do not break rendering", () => {
    const groups = [
      { groupId: "1", name: "Group A" },
      { groupId: "2", name: "Group A" },
    ];
    expect(sortGroupsByName(groups)).toHaveLength(2);
  });
});

describe("round filtering (doc §5.5, §7)", () => {
  const games: Game[] = [
    {
      gameId: "g1",
      roundId: "r1",
      fieldId: "f1",
      teamAId: "t1",
      teamBId: "t2",
      refereeTeamId: "t3",
      scoreA: 1,
      scoreB: 0,
    },
    {
      gameId: "g2",
      roundId: "r2",
      fieldId: "f1",
      teamAId: "t1",
      teamBId: "t3",
      refereeTeamId: "t2",
      scoreA: 2,
      scoreB: 2,
    },
  ];

  it("filters games by round", () => {
    expect(filterGamesByRound(games, "r1").map((g) => g.gameId)).toEqual([
      "g1",
    ]);
  });

  it("empty round renders empty state (zero results)", () => {
    expect(filterGamesByRound(games, "r9")).toEqual([]);
  });
});
