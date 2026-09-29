import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { API_BASE_URL } from "../../src/config/api";
import { AdminGameFormPage } from "../../src/pages/admin/AdminGameFormPage";
import { AdminGamesPage } from "../../src/pages/admin/AdminGamesPage";
import { AdminScorePage } from "../../src/pages/admin/AdminScorePage";
import { LiveProvider } from "../../src/live/LiveProvider";
import {
  TournamentProvider,
  createTournamentStore,
} from "../../src/state/store";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// LiveProvider opens a WebSocket on mount; stub it so page tests stay
// REST-focused without real network or MSW WS noise.
class NoopWS {
  onopen: unknown = null;
  onmessage: unknown = null;
  onclose: unknown = null;
  onerror: unknown = null;
  constructor(public url: string) {}
  close() {}
}
beforeEach(() => {
  vi.stubGlobal("WebSocket", NoopWS);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const lookups = {
  teams: [
    { teamId: "1", class: "U18", name: "Alpha", groupId: "1" },
    { teamId: "2", class: "U18", name: "Beta", groupId: "1" },
    { teamId: "3", class: "U18", name: "Refs", groupId: "1" },
  ],
  groups: [{ groupId: "1", name: "Group A" }],
  rounds: [
    { roundId: "1", number: 1 },
    { roundId: "2", number: 2 },
  ],
  fields: [
    { fieldId: "1", name: "Court 1" },
    { fieldId: "2", name: "Court 2" },
  ],
};

const game1 = {
  gameId: "1",
  roundId: "1",
  fieldId: "1",
  teamAId: "1",
  teamBId: "2",
  refereeTeamId: "3",
  scoreA: 10,
  scoreB: 12,
};

function mockReads(games: unknown[] = [game1]) {
  server.use(
    http.get(`${API_BASE_URL}/api/matches`, () => HttpResponse.json({ data: games })),
    http.get(`${API_BASE_URL}/api/teams`, () => HttpResponse.json({ data: lookups.teams })),
    http.get(`${API_BASE_URL}/api/groups`, () => HttpResponse.json({ data: lookups.groups })),
    http.get(`${API_BASE_URL}/api/rounds`, () => HttpResponse.json({ data: lookups.rounds })),
    http.get(`${API_BASE_URL}/api/fields`, () => HttpResponse.json({ data: lookups.fields })),
    http.get(`${API_BASE_URL}/api/matches/:id`, () => HttpResponse.json({ data: game1 })),
  );
}

function shell(store: ReturnType<typeof createTournamentStore>, path: string, route: string, el: React.ReactNode) {
  return render(
    <TournamentProvider store={store}>
      <LiveProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={el} />
          </Routes>
        </MemoryRouter>
      </LiveProvider>
    </TournamentProvider>,
  );
}

describe("admin UI (admin doc §33, §31)", () => {
  it("create form blocks Team A = Team B without any POST", async () => {
    mockReads([]);
    let posts = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/teacher/games`, () => {
        posts += 1;
        return HttpResponse.json({ data: game1 });
      }),
    );
    const store = createTournamentStore();
    // LiveProvider opens a real WebSocket in jsdom — it fails fast and
    // reconnects in background; the form itself is fully REST-driven.
    shell(store, "/admin/games/new", "/admin/games/new", <AdminGameFormPage mode="create" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Team A")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Round"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Field"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Team A"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Team B"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Referee Team"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/differ/);
    });
    expect(posts).toBe(0);
  });

  it("games page filters by round and deletes with confirmation", async () => {
    const game2 = { ...game1, gameId: "2", roundId: "2", scoreA: 0, scoreB: 0 };
    mockReads([game1, game2]);
    let deletes = 0;
    server.use(
      http.delete(`${API_BASE_URL}/api/teacher/games/:id`, () => {
        deletes += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const store = createTournamentStore();
    shell(store, "/admin/games", "/admin/games", <AdminGamesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha 10 : 12 Beta")).toBeInTheDocument();
      expect(screen.getByText("Alpha 0 : 0 Beta")).toBeInTheDocument();
    });
    // Round filter narrows the list.
    fireEvent.change(screen.getByLabelText("Filter by round"), { target: { value: "2" } });
    await waitFor(() => {
      expect(screen.queryByText("Alpha 10 : 12 Beta")).not.toBeInTheDocument();
      expect(screen.getByText("Alpha 0 : 0 Beta")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Filter by round"), { target: { value: "all" } });
    await waitFor(() => {
      expect(screen.getByText("Alpha 10 : 12 Beta")).toBeInTheDocument();
    });

    // Delete requires confirmation, then removes the row.
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(deletes).toBe(1);
    });
    await waitFor(() => {
      expect(screen.queryByText("Alpha 10 : 12 Beta")).not.toBeInTheDocument();
      expect(screen.getByText("Alpha 0 : 0 Beta")).toBeInTheDocument();
    });
  });

  it("score page increments immediately (optimistic) and persists via PUT", async () => {
    mockReads();
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, async ({ request }) => {
        const body = (await request.json()) as typeof game1;
        return HttpResponse.json({ data: { ...game1, scoreA: body.scoreA, scoreB: body.scoreB } });
      }),
    );
    const store = createTournamentStore();
    shell(store, "/admin/games/1/score", "/admin/games/:gameId/score", <AdminScorePage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Alpha score")).toHaveTextContent("10");
    });
    fireEvent.click(screen.getByLabelText("Increment Team A"));
    // Optimistic: visible before the PUT resolves.
    expect(screen.getByLabelText("Alpha score")).toHaveTextContent("11");
    await waitFor(() => {
      expect(store.getGame("1")).toMatchObject({ scoreA: 11 });
    });
  });

  it("games status filter uses the explicit lifecycle status", async () => {
    mockReads([
      { ...game1, gameId: "1", status: "LIVE" },
      { ...game1, gameId: "2", scoreA: 0, scoreB: 0, status: "SCHEDULED" },
      { ...game1, gameId: "3", scoreA: 25, scoreB: 18, status: "COMPLETED" },
    ]);
    const store = createTournamentStore();
    shell(store, "/admin/games", "/admin/games", <AdminGamesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha 10 : 12 Beta")).toBeInTheDocument();
    });
    expect(screen.getByText("Alpha 0 : 0 Beta")).toBeInTheDocument();
    expect(screen.getByText("Alpha 25 : 18 Beta")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "COMPLETED" } });
    await waitFor(() => {
      expect(screen.queryByText("Alpha 10 : 12 Beta")).not.toBeInTheDocument();
      expect(screen.queryByText("Alpha 0 : 0 Beta")).not.toBeInTheDocument();
      expect(screen.getByText("Alpha 25 : 18 Beta")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "SCHEDULED" } });
    await waitFor(() => {
      expect(screen.getByText("Alpha 0 : 0 Beta")).toBeInTheDocument();
      expect(screen.queryByText("Alpha 25 : 18 Beta")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Planned").length).toBeGreaterThanOrEqual(1);
  });

  it("score page finishes via confirmation and locks controls", async () => {
    mockReads([{ ...game1, scoreA: 24, scoreB: 21, status: "LIVE" }]);
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, async ({ request }) => {
        const body = (await request.json()) as typeof game1;
        return HttpResponse.json({ data: { ...game1, scoreA: body.scoreA, scoreB: body.scoreB, status: "LIVE" } });
      }),
      http.post(`${API_BASE_URL}/api/teacher/games/:id/finish`, () =>
        HttpResponse.json({ data: { ...game1, scoreA: 24, scoreB: 21, status: "COMPLETED" } }),
      ),
    );
    const store = createTournamentStore();
    shell(store, "/admin/games/1/score", "/admin/games/:gameId/score", <AdminScorePage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Alpha score")).toHaveTextContent("24");
    });
    // Controls are usable while the game is live.
    expect(screen.getByLabelText("Increment Team A")).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Finish Game" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/Finish this game/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Finish Game" }));
    await waitFor(() => {
      expect(store.getGame("1")).toMatchObject({ status: "COMPLETED" });
    });
    expect(screen.getByLabelText("Increment Team A")).toBeDisabled();
    expect(screen.getByLabelText("Decrement Team B")).toBeDisabled();
  });
});
