// Persistent offline cache (connection-loss fallback).
// The in-memory tournament store is the source of truth while the app
// runs; this module mirrors it to localStorage so that a lost
// connection — or a full page reload while offline — still renders
// the last known good data instead of an empty error screen.
//
// Design notes:
// - Writes happen after every store mutation (cheap: a few KB of JSON).
// - Reads are validated with the domain guards because localStorage
//   is untrusted input (user-tamperable, quota-evictable).
// - Invalid items are filtered per entity; a corrupt envelope is
//   discarded entirely (returns null).

import { useEffect, useState } from "react";
import { isGroup, type Group } from "../domain/group";
import { isRound, type Round } from "../domain/round";
import { isTeam, type Team } from "../domain/team";
import { isField, type Field } from "../domain/field";
import { isGame, type Game } from "../domain/game";

export const TOURNAMENT_CACHE_KEY = "tournament-cache-v1";
// Bumped to 2 so stale test/dev snapshots saved under v1 are ignored:
// the server is the source of truth and overwrites the cache on every
// successful fetch. Old cached test data must never be shown as truth.
export const TOURNAMENT_CACHE_VERSION = 2;

// Minimal structural view of the store — defined here (instead of
// importing the store module) to avoid a runtime import cycle:
// store.ts -> cache.ts -> domain only.
export interface CacheableMaps {
  groups: Map<string, Group>;
  rounds: Map<string, Round>;
  teams: Map<string, Team>;
  fields: Map<string, Field>;
  games: Map<string, Game>;
}

export interface CachedSnapshot {
  version: number;
  savedAt: string;
  groups: Group[];
  rounds: Round[];
  teams: Team[];
  fields: Field[];
  games: Game[];
}

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

// Persist the whole tournament state. Failures (private mode,
// quota, unavailable storage) are swallowed: caching is best-effort
// and MUST never break the live UI.
export function saveTournamentCache(state: CacheableMaps): void {
  if (!storageAvailable()) return;
  try {
    const snapshot: CachedSnapshot = {
      version: TOURNAMENT_CACHE_VERSION,
      savedAt: new Date().toISOString(),
      groups: [...state.groups.values()],
      rounds: [...state.rounds.values()],
      teams: [...state.teams.values()],
      fields: [...state.fields.values()],
      games: [...state.games.values()],
    };
    localStorage.setItem(TOURNAMENT_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort only — ignore write failures.
  }
}

// Load + validate the cached snapshot. Returns null when there is
// no cache, the envelope is corrupt, or the version is unknown.
export function loadTournamentCache(): CachedSnapshot | null {
  if (!storageAvailable()) return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(TOURNAMENT_CACHE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const v = parsed as Record<string, unknown>;
  if (v.version !== TOURNAMENT_CACHE_VERSION) return null;
  if (typeof v.savedAt !== "string" || Number.isNaN(Date.parse(v.savedAt))) {
    return null;
  }
  // Per-item validation: drop tampered entries, keep the rest.
  const groups = Array.isArray(v.groups) ? v.groups.filter(isGroup) : [];
  const rounds = Array.isArray(v.rounds) ? v.rounds.filter(isRound) : [];
  const teams = Array.isArray(v.teams) ? v.teams.filter(isTeam) : [];
  const fields = Array.isArray(v.fields) ? v.fields.filter(isField) : [];
  const games = Array.isArray(v.games) ? v.games.filter(isGame) : [];
  return {
    version: TOURNAMENT_CACHE_VERSION,
    savedAt: v.savedAt,
    groups,
    rounds,
    teams,
    fields,
    games,
  };
}

export function clearTournamentCache(): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(TOURNAMENT_CACHE_KEY);
  } catch {
    // Ignore.
  }
}

// Human-readable cache age for the offline banner.
export function formatCacheAge(savedAt: string, nowMs?: number): string {
  const then = Date.parse(savedAt);
  if (Number.isNaN(then)) return "unknown time";
  const diffMs = (nowMs ?? Date.now()) - then;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

// Tracks navigator.onLine so the UI can proactively show the cached
// state when the browser reports offline (before REST even fails).
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine !== false : true,
  );
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  return online;
}
