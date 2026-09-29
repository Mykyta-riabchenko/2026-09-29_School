// Admin tournament cache. Server on :8081 is source of truth.
// No live socket here: only the user app owns the public socket.
// Admin screens refresh via REST after each mutation.
import React, { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Field, Game, Group, Round, Team } from "../../../../packages/contracts/src/index";

export interface TournamentState {
  groups: Map<string, Group>;
  rounds: Map<string, Round>;
  teams: Map<string, Team>;
  fields: Map<string, Field>;
  games: Map<string, Game>;
}

type Listener = () => void;

export function createAdminStore() {
  let state: TournamentState = {
    groups: new Map(),
    rounds: new Map(),
    teams: new Map(),
    fields: new Map(),
    games: new Map(),
  };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());
  function subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }
  function getSnapshot(): TournamentState {
    return state;
  }
  function setGroups(items: Group[]) {
    state = { ...state, groups: new Map(items.map((g) => [g.groupId, g])) };
    emit();
  }
  function setRounds(items: Round[]) {
    state = { ...state, rounds: new Map(items.map((r) => [r.roundId, r])) };
    emit();
  }
  function setTeams(items: Team[]) {
    state = { ...state, teams: new Map(items.map((t) => [t.teamId, t])) };
    emit();
  }
  function setFields(items: Field[]) {
    state = { ...state, fields: new Map(items.map((f) => [f.fieldId, f])) };
    emit();
  }
  function setGames(items: Game[]) {
    state = { ...state, games: new Map(items.map((g) => [g.gameId, g])) };
    emit();
  }
  function upsertGame(game: Game) {
    const games = new Map(state.games);
    games.set(game.gameId, game);
    state = { ...state, games };
    emit();
  }
  return { subscribe, getSnapshot, setGroups, setRounds, setTeams, setFields, setGames, upsertGame };
}

export type AdminStore = ReturnType<typeof createAdminStore>;

const Ctx = createContext<AdminStore | null>(null);

export function AdminProvider({ children, store }: { children: React.ReactNode; store?: AdminStore }) {
  const value = useMemo(() => store ?? createAdminStore(), [store]);
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useAdminStore(): AdminStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("Missing AdminProvider");
  return s;
}

export function useAdminState(): TournamentState {
  const store = useAdminStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
