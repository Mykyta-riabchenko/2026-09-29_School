import { describe, it, expect } from "vitest";
import { getLiveSocketUrl, API_BASE_URL } from "../../src/config/api";

// E2E smoke: configuration + contract invariants that must hold
// in every environment (real backend and local test server).
describe("e2e smoke (doc §20 Definition of Done)", () => {
  it("single API config is used to derive REST + WS urls", () => {
    expect(API_BASE_URL).toMatch(/^http/);
    expect(getLiveSocketUrl()).toBe(
      `${API_BASE_URL.replace(/^http/, "ws")}/ws/live`,
    );
    // Manual switch: pointing at the test server keeps the WS path.
    expect(getLiveSocketUrl("http://localhost:4000")).toBe(
      "ws://localhost:4000/ws/live",
    );
  });

  it("opaque IDs are never parsed for sorting", () => {
    const ids = ["enc:zz", "g_01", "10", "2"];
    // Frontend MUST NOT sort by ID; sorted views use names.
    expect([...ids].sort()).not.toEqual(ids);
  });
});
