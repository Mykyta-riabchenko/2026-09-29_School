// In-memory tournament cache (doc §6, §17).
// WebSocket created/updated/deleted events mutate this store;
// components read derived sorted copies so cached state is never
// mutated by sorting (doc §7).

import React, {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Group } from "../domain/group";
import { sortGroupsByName } from "../domain/group";
import type { Round } from "../domain/round";
import { sortRoundsByNumber } from "../domain/round";
import type { Team } from "../domain/team";
import { sortTeamsByName } from "../domain/team";
import type { Field } from "../domain/field";
import { sortFieldsByName } from "../domain/field";
import type { Game } from "../domain/game";
import type { LiveEvent } from "../live/liveEvents";
import { saveTournamentCache, loadTournamentCache } from "./cache";

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

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): TournamentState {
    return state;
  }

  function setGroups(items: Group[]) {
    state = { ...state, groups: new Map(items.map((g) => [g.groupId, g])) };
    emit();
    // Mirror to persistent cache so a lost connection (or reload
    // while offline) still renders the last known data.
    saveTournamentCache(state);
  }
  function setRounds(items: Round[]) {
    state = { ...state, rounds: new Map(items.map((r) => [r.roundId, r])) };
    emit();
    saveTournamentCache(state);
  }
  function setTeams(items: Team[]) {
    state = { ...state, teams: new Map(items.map((t) => [t.teamId, t])) };
    emit();
    saveTournamentCache(state);
  }
  function setFields(items: Field[]) {
    state = { ...state, fields: new Map(items.map((f) => [f.fieldId, f])) };
    emit();
    saveTournamentCache(state);
  }
  function setGames(items: Game[]) {
    state = { ...state, games: new Map(items.map((g) => [g.gameId, g])) };
    emit();
    saveTournamentCache(state);
  }

  // Targeted single-entity writes — the UI_update step of live sync.
  // Like Vue reactivity: change the variable → emit() notifies all
  // useSyncExternalStore subscribers → React re-renders only the
  // components reading that entity. One changed row swaps in place:
  // no page reload, no loading spinner, selection/scroll preserved.
  // Each write also mirrors to the persistent cache (cache-update step).
  function upsertGame(game: Game) {
    const games = new Map(state.games);
    games.set(game.gameId, game);
    state = { ...state, games };
    emit();
    saveTournamentCache(state);
  }
  function removeGame(gameId: string) {
    if (!state.games.has(gameId)) return;
    const games = new Map(state.games);
    games.delete(gameId);
    state = { ...state, games };
    emit();
    saveTournamentCache(state);
  }
  function upsertTeam(team: Team) {
    const teams = new Map(state.teams);
    teams.set(team.teamId, team);
    state = { ...state, teams };
    emit();
    saveTournamentCache(state);
  }
  function removeTeam(teamId: string) {
    if (!state.teams.has(teamId)) return;
    const teams = new Map(state.teams);
    teams.delete(teamId);
    state = { ...state, teams };
    emit();
    saveTournamentCache(state);
  }
  function upsertGroup(group: Group) {
    const groups = new Map(state.groups);
    groups.set(group.groupId, group);
    state = { ...state, groups };
    emit();
    saveTournamentCache(state);
  }
  function removeGroup(groupId: string) {
    if (!state.groups.has(groupId)) return;
    const groups = new Map(state.groups);
    groups.delete(groupId);
    state = { ...state, groups };
    emit();
    saveTournamentCache(state);
  }
  function upsertField(field: Field) {
    const fields = new Map(state.fields);
    fields.set(field.fieldId, field);
    state = { ...state, fields };
    emit();
    saveTournamentCache(state);
  }
  function removeField(fieldId: string) {
    if (!state.fields.has(fieldId)) return;
    const fields = new Map(state.fields);
    fields.delete(fieldId);
    state = { ...state, fields };
    emit();
    saveTournamentCache(state);
  }
  function upsertRound(round: Round) {
    const rounds = new Map(state.rounds);
    rounds.set(round.roundId, round);
    state = { ...state, rounds };
    emit();
    saveTournamentCache(state);
  }
  function removeRound(roundId: string) {
    if (!state.rounds.has(roundId)) return;
    const rounds = new Map(state.rounds);
    rounds.delete(roundId);
    state = { ...state, rounds };
    emit();
    saveTournamentCache(state);
  }

  // Apply one validated live event: add on created, replace by ID
  // on updated, remove by ID on deleted (doc §6). Re-applies
  // sorting/filtering implicitly since selectors derive sorted views.
  function applyLiveEvent(event: LiveEvent) {
    const [entity, action] = event.type.split(".");
    const data = event.data as Record<string, string & object>;
    const next: TournamentState = {
      groups: new Map(state.groups),
      rounds: new Map(state.rounds),
      teams: new Map(state.teams),
      fields: new Map(state.fields),
      games: new Map(state.games),
    };
    const idOf = (d: Record<string, unknown>): string => {
      const key =
        entity === "group"
          ? "groupId"
          : entity === "round"
            ? "roundId"
            : entity === "team"
              ? "teamId"
              : entity === "field"
                ? "fieldId"
                : "gameId";
      return d[key] as string;
    };

    if (action === "deleted") {
      const id = idOf(data);
      if (entity === "group") next.groups.delete(id);
      else if (entity === "round") next.rounds.delete(id);
      else if (entity === "team") next.teams.delete(id);
      else if (entity === "field") next.fields.delete(id);
      else next.games.delete(id);
    } else {
      // created + updated both upsert by ID; updated replaces
      // the existing object so all screens refresh immediately.
      const id = idOf(data);
      if (entity === "group") next.groups.set(id, data as unknown as Group);
      else if (entity === "round") next.rounds.set(id, data as unknown as Round);
      else if (entity === "team") next.teams.set(id, data as unknown as Team);
      else if (entity === "field") next.fields.set(id, data as unknown as Field);
      else next.games.set(id, data as unknown as Game);
    }
    state = next;
    emit();
    // Live updates also refresh the offline cache so the cached
    // snapshot never lags behind what the user just saw.
    saveTournamentCache(state);
  }

  function getGame(gameId: string): Game | undefined {
    return state.games.get(gameId);
  }

  return {
    subscribe,
    getSnapshot,
    setGroups,
    setRounds,
    setTeams,
    setFields,
    setGames,
    upsertGame,
    removeGame,
    upsertTeam,
    removeTeam,
    upsertGroup,
    removeGroup,
    upsertField,
    removeField,
    upsertRound,
    removeRound,
    applyLiveEvent,
    getGame,
  };
}

export type TournamentStore = ReturnType<typeof createTournamentStore>;

// Restore the last persisted snapshot into a store. Returns true when
// a valid cache existed (even if some collections were empty).
// Used ONLY as an offline fallback when a REST fetch fails — the server
// is the source of truth and overwrites both the store and the cache on
// every successful fetch. Never call this on startup: the store starts
// empty (loading state) so stale test/dev data is never shown as truth.
export function hydrateStoreFromCache(store: TournamentStore): boolean {
  const snapshot = loadTournamentCache();
  if (!snapshot) return false;
  store.setGroups(snapshot.groups);
  store.setRounds(snapshot.rounds);
  store.setTeams(snapshot.teams);
  store.setFields(snapshot.fields);
  store.setGames(snapshot.games);
  return true;
}

const TournamentContext = createContext<TournamentStore | null>(null);

export function TournamentProvider({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: TournamentStore;
}) {
  const value = useMemo(() => {
    const s = store ?? createTournamentStore();
    // Server is the source of truth: start empty and let feature hooks
    // fetch + overwrite. The persistent cache is only read on fetch
    // failure (offline fallback via hydrateStoreFromCache in the hooks),
    // never on startup — so old cached test data is never shown.
    return s;
  }, [store]);
  // No JSX here so this file can stay .ts (avoids needing .tsx).
  return React.createElement(
    TournamentContext.Provider,
    { value },
    children,
  );
}

export function useTournamentStore(): TournamentStore {
  const store = useContext(TournamentContext);
  if (!store) throw new Error("Missing TournamentProvider");
  return store;
}

// Reactive snapshot of the whole cache.
export function useTournamentState(): TournamentState {
  const store = useTournamentStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

// Derived sorted selectors — always copies, never mutates cache.
export function useSortedGroups(): Group[] {
  const s = useTournamentState();
  return useMemo(
    () => sortGroupsByName([...s.groups.values()]),
    [s.groups],
  );
}

export function useSortedTeams(): Team[] {
  const s = useTournamentState();
  return useMemo(() => sortTeamsByName([...s.teams.values()]), [s.teams]);
}

export function useSortedFields(): Field[] {
  const s = useTournamentState();
  return useMemo(
    () => sortFieldsByName([...s.fields.values()]),
    [s.fields],
  );
}

export function useSortedRounds(): Round[] {
  const s = useTournamentState();
  return useMemo(
    () => sortRoundsByNumber([...s.rounds.values()]),
    [s.rounds],
  );
}

export function useGamesByRound(roundId: string | null): Game[] {
  const s = useTournamentState();
  return useMemo(() => {
    const all = [...s.games.values()];
    if (!roundId) return all;
    return all.filter((g) => g.roundId === roundId);
  }, [s.games, roundId]);
}
