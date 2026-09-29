// Fixture store for the local test server with JSON file persistence.
// - First start: loads realistic data from src/fixtures/*.json
// - Every mutation is saved to TEST_SERVER_DATA_FILE (default test-server/data/db.json)
// - Next start: loads from that file, so teams/groups/games etc. survive restarts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadFixture<T>(name: string): T[] {
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
export type GameStatusRow = "SCHEDULED" | "RUNNING" | "FINISHED" | "LIVE" | "COMPLETED";
export interface GameRow {
  gameId: string;
  roundId: string;
  fieldId: string;
  teamAId: string;
  teamBId: string;
  refereeTeamId: string;
  scoreA: number;
  scoreB: number;
  // Explicit lifecycle status. Old fixtures may omit it or use
  // legacy LIVE/COMPLETED; normalized to SCHEDULED/RUNNING/FINISHED on read.
  status?: GameStatusRow;
}

interface DbShape {
  groups: GroupRow[];
  rounds: RoundRow[];
  teams: TeamRow[];
  fields: FieldRow[];
  games: GameRow[];
}

function dataFilePath(): string {
  const fromEnv = process.env.TEST_SERVER_DATA_FILE;
  if (fromEnv) return resolve(process.cwd(), fromEnv);
  const here = dirname(fileURLToPath(import.meta.url));
  // test-server/src/data/ -> test-server/data/db.json
  return join(here, "..", "..", "data", "db.json");
}

function readDbFile(path: string): DbShape | null {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    if (!parsed || !Array.isArray(parsed.groups)) return null;
    return {
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      games: Array.isArray(parsed.games) ? parsed.games : [],
    };
  } catch {
    return null;
  }
}

const DB_PATH = dataFilePath();
const persisted = readDbFile(DB_PATH);

export const groups: GroupRow[] = persisted?.groups ?? loadFixture("groups.json");
export const rounds: RoundRow[] = persisted?.rounds ?? loadFixture("rounds.json");
export const teams: TeamRow[] = persisted?.teams ?? loadFixture("teams.json");
export const fields: FieldRow[] = persisted?.fields ?? loadFixture("fields.json");
export const games: GameRow[] = persisted?.games ?? loadFixture("games.json");

// Normalize legacy/missing game status so new frontends (which require
// SCHEDULED/RUNNING/FINISHED) never receive an invalid payload.
export function normalizeGameStatus(status: unknown): "SCHEDULED" | "RUNNING" | "FINISHED" {
  if (status === "RUNNING" || status === "LIVE") return "RUNNING";
  if (status === "FINISHED" || status === "COMPLETED") return "FINISHED";
  return "SCHEDULED";
}

for (const g of games) {
  g.status = normalizeGameStatus(g.status);
  // Keep all ids/scores in the shape the frontend mappers expect.
  g.gameId = String(g.gameId);
  g.roundId = String(g.roundId);
  g.fieldId = String(g.fieldId);
  g.teamAId = String(g.teamAId);
  g.teamBId = String(g.teamBId);
  g.refereeTeamId = String(g.refereeTeamId);
  if (!Number.isInteger(g.scoreA) || g.scoreA < 0) g.scoreA = 0;
  if (!Number.isInteger(g.scoreB) || g.scoreB < 0) g.scoreB = 0;
}

export function getDataFilePath(): string {
  return DB_PATH;
}

export function saveDb(): void {
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const payload: DbShape = { groups, rounds, teams, fields, games };
    writeFileSync(DB_PATH, JSON.stringify(payload, null, 2), "utf-8");
  } catch (e) {
    console.error(`[test-server] failed to save ${DB_PATH}:`, e);
  }
}

// Save initial DB on first boot so the file exists for editing.
if (!persisted) saveDb();
else console.log(`[test-server] loaded persisted data from ${DB_PATH}`);

export function findById<T extends object>(
  rows: T[],
  key: keyof T,
  id: string,
): T | undefined {
  return rows.find((r) => (r[key] as unknown) === id);
}
