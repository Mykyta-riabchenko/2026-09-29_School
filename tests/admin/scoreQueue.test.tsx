import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { API_BASE_URL } from "../../src/config/api";
import { useScoreQueue } from "../../src/features/admin/scoreQueue";
import {
  TournamentProvider,
  createTournamentStore,
} from "../../src/state/store";
import type { Game } from "../../src/domain/game";

const base: Game = {
  gameId: "1",
  roundId: "1",
  fieldId: "1",
  teamAId: "1",
  teamBId: "2",
  refereeTeamId: "3",
  scoreA: 10,
  scoreB: 12,
};

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function seed(scoreA = 10, scoreB = 12) {
  const store = createTournamentStore();
  store.setGames([{ ...base, scoreA, scoreB }]);
  return store;
}

function wrapper(store: ReturnType<typeof createTournamentStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TournamentProvider store={store}>{children}</TournamentProvider>;
  };
}

describe("score queue (admin doc §11, §31)", () => {
  it("increment A: 10:12 → 11:12", async () => {
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, async ({ request }) => {
        const body = (await request.json()) as Game;
        return HttpResponse.json({ data: { ...base, scoreA: body.scoreA, scoreB: body.scoreB } });
      }),
    );
    const store = seed();
    const { result } = renderHook(() => useScoreQueue("1"), { wrapper: wrapper(store) });
    act(() => {
      result.current.incrementA();
    });
    // Optimistic value appears immediately.
    expect(result.current.scoreA).toBe(11);
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });
    expect(store.getGame("1")).toMatchObject({ scoreA: 11, scoreB: 12 });
    expect(result.current.error).toBeNull();
  });

  it("decrement + zero protection: 0:0 stays 0:0 with no PUT", async () => {
    let puts = 0;
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, () => {
        puts += 1;
        return HttpResponse.json({ data: base });
      }),
    );
    const store = seed(0, 0);
    const { result } = renderHook(() => useScoreQueue("1"), { wrapper: wrapper(store) });
    act(() => {
      result.current.decrementA();
      result.current.decrementB();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.scoreA).toBe(0);
    expect(result.current.scoreB).toBe(0);
    expect(puts).toBe(0);
  });

  it("rapid clicks: five A+ reach the backend serialized as 1..5", async () => {
    const bodies: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, async ({ request }) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const body = (await request.json()) as Game;
        bodies.push(body.scoreA ?? 0);
        await new Promise((r) => setTimeout(r, 15));
        inFlight -= 1;
        return HttpResponse.json({ data: { ...base, scoreA: body.scoreA, scoreB: 0 } });
      }),
    );
    const store = seed(0, 0);
    const { result } = renderHook(() => useScoreQueue("1"), { wrapper: wrapper(store) });
    act(() => {
      for (let i = 0; i < 5; i++) result.current.incrementA();
    });
    // Optimistic display jumps at once…
    expect(result.current.scoreA).toBe(5);
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });
    // …while the backend saw serialized PUTs, never parallel.
    expect(maxInFlight).toBe(1);
    expect(bodies).toEqual([1, 2, 3, 4, 5]);
    expect(store.getGame("1")).toMatchObject({ scoreA: 5 });
  });

  it("failure: optimistic change shows, error visible, retry resumes", async () => {
    let calls = 0;
    server.use(
      http.put(`${API_BASE_URL}/api/teacher/games/:id`, async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as Game;
        if (calls === 1) {
          return HttpResponse.json({ error: { code: "SERVER_ERROR", message: "boom" } }, { status: 500 });
        }
        return HttpResponse.json({ data: { ...base, scoreA: body.scoreA, scoreB: body.scoreB } });
      }),
    );
    const store = seed();
    const { result } = renderHook(() => useScoreQueue("1"), { wrapper: wrapper(store) });
    act(() => {
      result.current.incrementA();
    });
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    // Failed op is retained, not silently lost.
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.scoreA).toBe(11);
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });
    expect(result.current.error).toBeNull();
    expect(store.getGame("1")).toMatchObject({ scoreA: 11 });
    expect(calls).toBe(2);
  });
});
