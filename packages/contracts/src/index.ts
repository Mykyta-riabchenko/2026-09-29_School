// Shared pure contracts (frontend_separation_spec v1.0 §8).
// Pure TypeScript only: types + guards + mappers + pure utilities.
// No API clients, no routers, no pages, no WebSocket, no score state,
// no React. Both apps/user and apps/admin import from here.

export type Id = string;
export type EntityId = string;

export interface Group {
  groupId: Id;
  name: string;
}

export interface Team {
  teamId: Id;
  groupId: Id;
  class: string;
  name: string;
}

export interface Round {
  roundId: Id;
  number: number;
}

export interface Field {
  fieldId: Id;
  name: string;
}

// Explicit backend lifecycle status (spec §5).
// Never infer from scores. No other values allowed.
export type GameStatus = "SCHEDULED" | "RUNNING" | "FINISHED";

export interface Game {
  gameId: Id;
  roundId: Id;
  fieldId: Id;
  teamAId: Id;
  teamBId: Id;
  refereeTeamId: Id;
  scoreA: number;
  scoreB: number;
  status: GameStatus;
}

export function isGameStatus(value: unknown): value is GameStatus {
  return value === "SCHEDULED" || value === "RUNNING" || value === "FINISHED";
}

export function isGroup(value: unknown): value is Group {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.groupId === "string" && typeof v.name === "string";
}

export function mapGroupResponse(raw: unknown): Group {
  if (!isGroup(raw)) throw new Error("Invalid Group payload");
  return { groupId: raw.groupId, name: raw.name };
}

export function sortGroupsByName(groups: Group[]): Group[] {
  return [...groups].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function isTeam(value: unknown): value is Team {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const cls = v.class ?? v.clazz;
  return (
    typeof v.teamId === "string" &&
    typeof cls === "string" &&
    typeof v.name === "string" &&
    typeof v.groupId === "string"
  );
}

export function mapTeamResponse(raw: unknown): Team {
  if (typeof raw !== "object" || raw === null)
    throw new Error("Invalid Team payload");
  const v = raw as Record<string, unknown>;
  const cls = v.class ?? v.clazz;
  if (
    typeof v.teamId !== "string" ||
    typeof cls !== "string" ||
    typeof v.name !== "string" ||
    typeof v.groupId !== "string"
  )
    throw new Error("Invalid Team payload");
  return {
    teamId: v.teamId,
    class: cls as string,
    name: v.name as string,
    groupId: v.groupId as string,
  };
}

export function sortTeamsByName(teams: Team[]): Team[] {
  return [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function isRound(value: unknown): value is Round {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.roundId === "string" && typeof v.number === "number";
}

export function mapRoundResponse(raw: unknown): Round {
  if (!isRound(raw)) throw new Error("Invalid Round payload");
  return { roundId: raw.roundId, number: raw.number };
}

export function sortRoundsByNumber(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => a.number - b.number);
}

export function isField(value: unknown): value is Field {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.fieldId === "string" && typeof v.name === "string";
}

export function mapFieldResponse(raw: unknown): Field {
  if (!isField(raw)) throw new Error("Invalid Field payload");
  return { fieldId: raw.fieldId, name: raw.name };
}

export function sortFieldsByName(fields: Field[]): Field[] {
  return [...fields].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function isGame(value: unknown): value is Game {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const scoreOk = (s: unknown) =>
    typeof s === "number" && Number.isInteger(s) && s >= 0;
  if (
    typeof v.gameId !== "string" ||
    typeof v.roundId !== "string" ||
    typeof v.fieldId !== "string" ||
    typeof v.teamAId !== "string" ||
    typeof v.teamBId !== "string" ||
    typeof v.refereeTeamId !== "string" ||
    !scoreOk(v.scoreA) ||
    !scoreOk(v.scoreB)
  ) {
    return false;
  }
  if (!isGameStatus(v.status)) return false;
  return true;
}

export function mapGameResponse(raw: unknown): Game {
  if (!isGame(raw)) throw new Error("Invalid Game payload");
  return {
    gameId: raw.gameId,
    roundId: raw.roundId,
    fieldId: raw.fieldId,
    teamAId: raw.teamAId,
    teamBId: raw.teamBId,
    refereeTeamId: raw.refereeTeamId,
    scoreA: raw.scoreA,
    scoreB: raw.scoreB,
    status: raw.status,
  };
}

export function formatScore(score: number): string {
  return String(score);
}

export function filterGamesByRound(games: Game[], roundId: Id): Game[] {
  return games.filter((g) => g.roundId === roundId);
}
