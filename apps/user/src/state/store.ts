// User tournament cache. Server is source of truth.
// Read collections are replaced wholesale on load and on live invalidation.
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

export function createTournamentStore() {
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
  function removeGameById(gameId: string) {
    const games = new Map(state.games);
    games.delete(gameId);
    state = { ...state, games };
    emit();
  }
  return { subscribe, getSnapshot, setGroups, setRounds, setTeams, setFields, setGames, upsertGame, removeGameById };
}

export type TournamentStore = ReturnType<typeof createTournamentStore>;

const Ctx = createContext<TournamentStore | null>(null);

export function TournamentProvider({ children, store }: { children: React.ReactNode; store?: TournamentStore }) {
  const value = useMemo(() => store ?? createTournamentStore(), [store]);
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useTournamentStore(): TournamentStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("Missing TournamentProvider");
  return s;
}

export function useTournamentState(): TournamentState {
  const store = useTournamentStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
