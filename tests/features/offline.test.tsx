import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import React from "react";
import { API_BASE_URL } from "../../src/config/api";
import { useGroups } from "../../src/features/groups/useGroups";
import { TournamentProvider, useSortedGroups } from "../../src/state/store";
import { saveTournamentCache } from "../../src/state/cache";
import { OfflineBanner } from "../../src/components/OfflineBanner/OfflineBanner";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  return <TournamentProvider>{children}</TournamentProvider>;
}

describe("offline cache fallback (connection lost)", () => {
  it("useGroups serves stale cache when the network fails", async () => {
    // Last known good data persisted before the outage.
    saveTournamentCache({
      groups: new Map([["g_01", { groupId: "g_01", name: "Group A" }]]),
      rounds: new Map(),
      teams: new Map(),
      fields: new Map(),
      games: new Map(),
    });
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () => HttpResponse.error()),
    );

    const { result } = renderHook(() => {
      const query = useGroups();
      const groups = useSortedGroups();
      return { query, groups };
    }, { wrapper });

    await waitFor(() => {
      expect(result.current.query.status).toBe("ready");
    });
    // Stale flag set, cached list still visible.
    expect(result.current.query.stale).toBe(true);
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].name).toBe("Group A");
  });

  it("useGroups reports error (not stale) when nothing is cached", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () => HttpResponse.error()),
    );
    const { result } = renderHook(() => useGroups(), { wrapper });
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.stale).toBe(false);
  });

  it("OfflineBanner shows cached-data notice with retry", () => {
    render(<OfflineBanner message="NETWORK_ERROR" onRetry={() => {}} />);
    expect(
      screen.getByText(/showing cached data/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
