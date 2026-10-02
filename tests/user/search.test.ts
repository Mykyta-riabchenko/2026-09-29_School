import { describe, it, expect } from "vitest";
import { matchesQuery, normalizeQuery } from "../../apps/user/src/components/search";

describe("public search matching", () => {
  it("empty query matches everything", () => {
    expect(matchesQuery("North High School 111", "")).toBe(true);
    expect(matchesQuery("Anything", "   ")).toBe(true);
  });

  it("single characters match (name, class, group)", () => {
    const hay = "North High School 111 Gruppe A";
    expect(matchesQuery(hay, "n")).toBe(true);
    expect(matchesQuery(hay, "1")).toBe(true);
    expect(matchesQuery(hay, "a")).toBe(true);
    expect(matchesQuery(hay, "z")).toBe(false);
  });

  it("is case-insensitive and whitespace-tolerant", () => {
    expect(matchesQuery("Westside Academy U2", "ACADEMY")).toBe(true);
    expect(matchesQuery("Westside  Academy   U2", "  academy   u2 ")).toBe(true);
  });
});
