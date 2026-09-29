import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { API_BASE_URL } from "../../src/config/api";
import { useGroups } from "../../src/features/groups/useGroups";
import {
  TournamentProvider,
  useSortedGroups,
} from "../../src/state/store";
import {
  saveTournamentCache,
  loadTournamentCache,
} from "../../src/state/cache";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  return <TournamentProvider>{children}</TournamentProvider>;
}

describe("server is source of truth", () => {
  it("provider starts empty even when old cache exists", async () => {
    saveTournamentCache({
      groups: new Map([["g_old", { groupId: "g_old", name: "Old Test" }]]),
      rounds: new Map(),
      teams: new Map(),
      fields: new Map(),
      games: new Map(),
    });
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    const { result } = renderHook(
      () => {
        const query = useGroups();
        const groups = useSortedGroups();
        return { query, groups };
      },
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.query.status).toBe("ready");
    });
    // Server returned empty: old cached "Old Test" must be gone.
    expect(result.current.groups).toHaveLength(0);
    expect(result.current.query.stale).toBe(false);
    expect(loadTournamentCache()?.groups).toHaveLength(0);
  });

  it("successful fetch overwrites stale cache", async () => {
    saveTournamentCache({
      groups: new Map([["g_old", { groupId: "g_old", name: "Old Test" }]]),
      rounds: new Map(),
      teams: new Map(),
      fields: new Map(),
      games: new Map(),
    });
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () =>
        HttpResponse.json({
          data: [{ groupId: "g_new", name: "Real Group" }],
        }),
      ),
    );
    const { result } = renderHook(
      () => {
        const query = useGroups();
        const groups = useSortedGroups();
        return { query, groups };
      },
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.query.status).toBe("ready");
    });
    expect(result.current.groups.map((g) => g.name)).toEqual(["Real Group"]);
    expect(loadTournamentCache()?.groups.map((g) => g.name)).toEqual([
      "Real Group",
    ]);
  });
});
