// In-memory fixture store for the local test server.
// Holds realistic data covering normal + edge cases (doc §13).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function load<T>(name: string): T[] {
  const here = dirname(fileURLToPath(import.meta.url));
  // store.ts lives in src/data/, fixtures live in src/fixtures/.
  const raw = readFileSync(join(here, "..", "fixtures", name), "utf-8");
  return JSON.parse(raw) as T[];
}

export interface GroupRow {
  groupId: string;
  name: string;
}
export interface RoundRow {
  roundId: string;
  number: number;
}
export interface TeamRow {
  teamId: string;
  class: string;
  name: string;
  groupId: string;
}
export interface FieldRow {
  fieldId: string;
  name: string;
}
export interface GameRow {
  gameId: string;
  roundId: string;
  fieldId: string;
  teamAId: string;
  teamBId: string;
  refereeTeamId: string;
  scoreA: number;
  scoreB: number;
  // Explicit lifecycle status (admin doc §13). Optional: fixtures
  // without it are treated as unknown display state.
  status?: "SCHEDULED" | "LIVE" | "COMPLETED";
}

export const groups: GroupRow[] = load("groups.json");
export const rounds: RoundRow[] = load("rounds.json");
export const teams: TeamRow[] = load("teams.json");
export const fields: FieldRow[] = load("fields.json");
export const games: GameRow[] = load("games.json");

export function findById<T extends object>(
  rows: T[],
  key: keyof T,
  id: string,
): T | undefined {
  return rows.find((r) => (r[key] as unknown) === id);
}
