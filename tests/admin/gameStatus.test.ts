import { describe, it, expect } from "vitest";
import {
  formatScore,
  isGame,
  mapGameResponse,
} from "../../src/domain/game";

// Canonical Game boundary (frontend doc §3, admin doc §3, §13):
// scores are integers >= 0 and display state is NEVER inferred from
// scores alone — only the explicit optional status field counts.
describe("game boundary (trusted docs)", () => {
  it("scores render as numbers", () => {
    expect(formatScore(0)).toBe("0");
    expect(formatScore(25)).toBe("25");
  });

  it("boundary accepts numeric scores and explicit status", () => {
    const base = {
      gameId: "1",
      roundId: "1",
      fieldId: "1",
      teamAId: "1",
      teamBId: "2",
      refereeTeamId: "3",
      scoreA: 2,
      scoreB: 1,
    };
    expect(isGame(base)).toBe(true);
    expect(isGame({ ...base, status: "LIVE" })).toBe(true);
    expect(isGame({ ...base, status: "COMPLETED" })).toBe(true);
    expect(isGame({ ...base, status: "SCHEDULED" })).toBe(true);
    expect(mapGameResponse({ ...base, status: "LIVE" })).toMatchObject({
      scoreA: 2,
      scoreB: 2 - 1,
      status: "LIVE",
    });
  });

  it("boundary rejects null, negative, non-integer and unknown status", () => {
    const base = {
      gameId: "1",
      roundId: "1",
      fieldId: "1",
      teamAId: "1",
      teamBId: "2",
      refereeTeamId: "3",
    };
    expect(isGame({ ...base, scoreA: null, scoreB: null })).toBe(false);
    expect(isGame({ ...base, scoreA: -1, scoreB: 0 })).toBe(false);
    expect(isGame({ ...base, scoreA: 1.5, scoreB: 0 })).toBe(false);
    expect(isGame({ ...base, scoreA: "2", scoreB: 1 })).toBe(false);
    expect(isGame({ ...base, scoreA: undefined, scoreB: 1 })).toBe(false);
    expect(isGame({ ...base, scoreA: 2, scoreB: 1, status: "ENDED" })).toBe(false);
    expect(() =>
      mapGameResponse({ ...base, scoreA: null, scoreB: null }),
    ).toThrow("Invalid Game payload");
  });
});
