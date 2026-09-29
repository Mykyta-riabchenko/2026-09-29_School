import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import React from "react";
import { API_BASE_URL } from "../../src/config/api";
import { TeamsPage } from "../../src/pages/TeamsPage";
import {
  TournamentProvider,
  createTournamentStore,
} from "../../src/state/store";

// Regression: WS-triggered silent in-place update.
// Simulates a `team.updated` WS event arriving while the user stays on
// the page: the old value must swap to the new one without navigation,
// without a loading spinner, and without losing UI state (search text).
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("silent WS updates (no navigation, no page refresh)", () => {
  it("swaps only the updated team name in place", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/teams`, () =>
        HttpResponse.json({
          data: [
            { teamId: "t1", class: "U18", name: "Old Name", groupId: "g1" },
            { teamId: "t2", class: "U18", name: "Other Name", groupId: "g1" },
          ],
        }),
      ),
    );

    const store = createTournamentStore();
    render(
      <TournamentProvider store={store}>
        <TeamsPage />
      </TournamentProvider>,
    );

    // Initial REST load shows the server value.
    await waitFor(() => {
      expect(screen.getByText("Old Name")).toBeInTheDocument();
    });

    // User state that must survive the live update.
    // "name" matches both "Old Name" and the later "New Name".
    const search = screen.getByLabelText("Search teams");
    fireEvent.change(search, { target: { value: "name" } });
    expect(search).toHaveValue("name");

    // WS `team.updated` arrives: same path as LiveProvider's onEvent
    // (store.applyLiveEvent), no remount, no refetch spinner.
    await act(async () => {
      store.applyLiveEvent({
        type: "team.updated",
        entity: "team",
        data: { teamId: "t1", class: "U18", name: "New Name", groupId: "g1" },
      });
    });

    // Only the changed value swapped; the rest is untouched.
    await waitFor(() => {
      expect(screen.getByText("New Name")).toBeInTheDocument();
    });
    expect(screen.queryByText("Old Name")).not.toBeInTheDocument();
    expect(screen.getByText("Other Name")).toBeInTheDocument();
    // No whole-page refresh: no loading state, search text preserved.
    expect(screen.queryByText(/loading teams/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search teams")).toHaveValue("name");
  });
});
