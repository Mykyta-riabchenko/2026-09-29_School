import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { API_BASE_URL } from "../../src/config/api";
import { GamesPage } from "../../src/pages/GamesPage";
import { TeamsPage } from "../../src/pages/TeamsPage";
import { LiveProvider } from "../../src/live/LiveProvider";
import {
  TournamentProvider,
  createTournamentStore,
} from "../../src/state/store";

// Instant reconnect backoff for tests (real delays 1s→30s are covered
// by unit math in live.test.ts; here we need fast instance turnover).
vi.mock("../../src/live/reconnect", () => ({
  RECONNECT_STEPS_MS: [0],
  MAX_RECONNECT_DELAY_MS: 0,
  getReconnectDelay: () => 0,
}));

// Mocked browser WebSocket: captures instances so tests can open the
// connection, deliver wire bytes, and drop it — no real network.
class MockWS {
  static instances: MockWS[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closeCalled = false;
  url: string;
  constructor(url: string) {
    this.url = url;
    MockWS.instances.push(this);
  }
  close() {
    this.closeCalled = true;
  }
  // Test helpers: pretend the server did something.
  serverOpen() {
    this.onopen?.();
  }
  serverSend(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
  serverClose() {
    this.onclose?.();
  }
}

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  MockWS.instances = [];
  vi.stubGlobal("WebSocket", MockWS);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function send(ws: MockWS, payload: unknown) {
  act(() => {
    ws.serverSend(payload);
  });
}

async function flush(ms = 10) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const team1 = { teamId: "t1", class: "U18", name: "Old Name", groupId: "g1" };

function mockCollections(overrides?: {
  teams?: unknown[];
  games?: unknown[];
}) {
  server.use(
    http.get(`${API_BASE_URL}/api/teams`, () =>
      HttpResponse.json({
        data: overrides?.teams ?? [team1, { teamId: "t2", class: "U18", name: "Other Name", groupId: "g1" }],
      }),
    ),
    http.get(`${API_BASE_URL}/api/matches`, () =>
      HttpResponse.json({
        data: overrides?.games ?? [
          {
            gameId: "gm1",
            roundId: "r1",
            fieldId: "f1",
            teamAId: "t1",
            teamBId: "t2",
            refereeTeamId: "t2",
            scoreA: 2,
            scoreB: 1,
          },
        ],
      }),
    ),
    http.get(`${API_BASE_URL}/api/fields`, () =>
      HttpResponse.json({ data: [{ fieldId: "f1", name: "Court 1" }] }),
    ),
    http.get(`${API_BASE_URL}/api/rounds`, () =>
      HttpResponse.json({ data: [{ roundId: "r1", number: 1 }] }),
    ),
    http.get(`${API_BASE_URL}/api/groups`, () =>
      HttpResponse.json({ data: [{ groupId: "g1", name: "Group A" }] }),
    ),
  );
}

describe("WS connection: backend event → API fetch → silent UI update", () => {
  it("team.updated triggers GET /api/teams/:id and swaps only that value", async () => {
    mockCollections();
    let singleHits = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/teams/:id`, () => {
        singleHits += 1;
        return HttpResponse.json({
          data: { teamId: "t1", class: "U18", name: "Fresh From API", groupId: "g1" },
        });
      }),
    );

    const store = createTournamentStore();
    render(
      <TournamentProvider store={store}>
        <LiveProvider>
          <TeamsPage />
        </LiveProvider>
      </TournamentProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Old Name")).toBeInTheDocument();
    });
    // Socket opened by the provider.
    expect(MockWS.instances).toHaveLength(1);
    act(() => {
      MockWS.instances[0].serverOpen();
    });

    // Backend sends the trigger. Payload name is deliberately stale —
    // the UI must show the FRESH api value, proving the fetch ran.
    send(MockWS.instances[0], {
      type: "team.updated",
      entity: "team",
      data: { teamId: "t1", class: "U18", name: "Stale Payload Name", groupId: "g1" },
    });

    await waitFor(() => {
      expect(screen.getByText("Fresh From API")).toBeInTheDocument();
    });
    expect(singleHits).toBe(1);
    expect(screen.queryByText("Old Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale Payload Name")).not.toBeInTheDocument();
    expect(screen.getByText("Other Name")).toBeInTheDocument();
    // Silent: no whole-page loading state appeared.
    expect(screen.queryByText(/loading teams/i)).not.toBeInTheDocument();
  });

  it("game.updated swaps the score via fresh API data; game.deleted removes the row", async () => {
    mockCollections();
    let gameHits = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/matches/:id`, () => {
        gameHits += 1;
        return HttpResponse.json({
          data: {
            gameId: "gm1",
            roundId: "r1",
            fieldId: "f1",
            teamAId: "t1",
            teamBId: "t2",
            refereeTeamId: "t2",
            scoreA: 7,
            scoreB: 7,
          },
        });
      }),
    );

    const store = createTournamentStore();
    render(
      <TournamentProvider store={store}>
        <LiveProvider>
          <MemoryRouter>
            <GamesPage />
          </MemoryRouter>
        </LiveProvider>
      </TournamentProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Old Name")).toBeInTheDocument();
    });
    act(() => {
      MockWS.instances[0].serverOpen();
    });

    // Payload carries a decoy score; the API is the truth.
    send(MockWS.instances[0], {
      type: "game.updated",
      entity: "game",
      data: {
        gameId: "gm1",
        roundId: "r1",
        fieldId: "f1",
        teamAId: "t1",
        teamBId: "t2",
        refereeTeamId: "t2",
        scoreA: 99,
        scoreB: 99,
      },
    });

    await waitFor(() => {
      expect(gameHits).toBe(1);
    });
    await waitFor(() => {
      expect(screen.getAllByText("7")).not.toHaveLength(0);
    });
    expect(screen.queryByText("99")).not.toBeInTheDocument();

    // Deletion needs no API call — the row just disappears.
    const hitsBefore = gameHits;
    send(MockWS.instances[0], {
      type: "game.deleted",
      entity: "game",
      data: { gameId: "gm1" },
    });
    await waitFor(() => {
      expect(screen.getByText(/no games in selected round/i)).toBeInTheDocument();
    });
    expect(gameHits).toBe(hitsBefore);
  });

  it("invalid wire messages are ignored: no API call, no UI change", async () => {
    mockCollections();
    let singleHits = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/teams/:id`, () => {
        singleHits += 1;
        return HttpResponse.json({ data: team1 });
      }),
    );

    const store = createTournamentStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <TournamentProvider store={store}>
          <LiveProvider>
            <TeamsPage />
          </LiveProvider>
        </TournamentProvider>,
      );
      await waitFor(() => {
        expect(screen.getByText("Old Name")).toBeInTheDocument();
      });
      const ws = MockWS.instances[0];
      act(() => {
        ws.serverOpen();
      });

      act(() => {
        ws.onmessage?.({ data: "not-json{{{" });
      });
      send(ws, { type: "game.bogus", entity: "game", data: {} });
      send(ws, {
        type: "team.updated",
        entity: "team",
        data: { teamId: 123 },
      });
      await flush();
    } finally {
      warn.mockRestore();
    }

    expect(singleHits).toBe(0);
    expect(screen.getByText("Old Name")).toBeInTheDocument();
  });

  it("reconnect requests fresh collections silently (new info, no loading flash)", async () => {
    let gamesHits = 0;
    mockCollections();
    server.use(
      http.get(`${API_BASE_URL}/api/matches`, () => {
        gamesHits += 1;
        // Second and later fetches carry the new server truth.
        const score = gamesHits >= 2 ? 42 : 2;
        return HttpResponse.json({
          data: [
            {
              gameId: "gm1",
              roundId: "r1",
              fieldId: "f1",
              teamAId: "t1",
              teamBId: "t2",
              refereeTeamId: "t2",
              scoreA: score,
              scoreB: 1,
            },
          ],
        });
      }),
    );

    const store = createTournamentStore();
    render(
      <TournamentProvider store={store}>
        <LiveProvider>
          <MemoryRouter>
            <GamesPage />
          </MemoryRouter>
        </LiveProvider>
      </TournamentProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Old Name")).toBeInTheDocument();
    });
    expect(gamesHits).toBe(1);
    act(() => {
      MockWS.instances[0].serverOpen();
    });

    // Connection drops; provider reconnects (delay mocked to 0) and
    // must refetch collections on the new connection's open.
    act(() => {
      MockWS.instances[0].serverClose();
    });
    await flush();
    expect(MockWS.instances.length).toBeGreaterThan(1);
    const latest = MockWS.instances[MockWS.instances.length - 1];
    act(() => {
      latest.serverOpen();
    });

    await waitFor(() => {
      expect(gamesHits).toBeGreaterThan(1);
    });
    // New server info arrived without a loading flash.
    await waitFor(() => {
      expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/loading games/i)).not.toBeInTheDocument();
  });

  it("gives up after 10 attempts (failed) and retry() reopens", async () => {
    mockCollections();
    const store = createTournamentStore();
    render(
      <TournamentProvider store={store}>
        <LiveProvider>
          <MemoryRouter>
            <GamesPage />
          </MemoryRouter>
        </LiveProvider>
      </TournamentProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Old Name")).toBeInTheDocument();
    });
    act(() => {
      MockWS.instances[0].serverOpen();
    });

    // 11 closes without a successful open exhaust the backoff.
    for (let i = 0; i < 11; i++) {
      act(() => {
        MockWS.instances[MockWS.instances.length - 1].serverClose();
      });
      await flush();
    }
    await waitFor(() => {
      expect(screen.getByText(/live: failed/i)).toBeInTheDocument();
    });

    // Manual retry reopens the connection.
    const countBefore = MockWS.instances.length;
    fireEvent.click(screen.getByRole("button", { name: /retry connection/i }));
    await flush();
    expect(MockWS.instances.length).toBeGreaterThan(countBefore);
  });
});
