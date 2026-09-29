import type { Id } from "./group";

// Canonical Game type (frontend doc §3, admin doc §3).
// A game MUST have exactly one round, one field, two participant
// teams (teamA/teamB) and one referee team (also a Team), plus two
// score values. Scores are integers >= 0; the create form defaults
// to 0 : 0 (admin doc §8).
export type GameStatus = "SCHEDULED" | "LIVE" | "COMPLETED";

export interface Game {
  gameId: Id;
  roundId: Id;
  fieldId: Id;
  teamAId: Id;
  teamBId: Id;
  refereeTeamId: Id;
  scoreA: number;
  scoreB: number;
  // Recommended lifecycle extension (admin doc §13). The current API
  // has no explicit game status, so this field is optional and MUST
  // NOT be inferred from scores alone — a missing status means the
  // display state is unknown, not "live" or "completed".
  status?: GameStatus;
}

// Display helper for score values.
export function formatScore(score: number): string {
  return String(score);
}

// A valid game always references one round, one field,
// two participating teams and one referee team, plus two numeric
// scores. Anything else is rejected at the API boundary.
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
  if (
    v.status !== undefined &&
    v.status !== "SCHEDULED" &&
    v.status !== "LIVE" &&
    v.status !== "COMPLETED"
  ) {
    return false;
  }
  return true;
}

// Map + validate the API contract at the boundary.
// UI components must only receive the canonical Game type.
export function mapGameResponse(raw: unknown): Game {
  if (!isGame(raw)) throw new Error("Invalid Game payload");
  const out: Game = {
    gameId: raw.gameId,
    roundId: raw.roundId,
    fieldId: raw.fieldId,
    teamAId: raw.teamAId,
    teamBId: raw.teamBId,
    refereeTeamId: raw.refereeTeamId,
    scoreA: raw.scoreA,
    scoreB: raw.scoreB,
  };
  if (raw.status !== undefined) out.status = raw.status;
  return out;
}

// Games are primarily grouped/filtered by round (frontend doc §7).
// Returns a new array containing only games of the given round.
export function filterGamesByRound(games: Game[], roundId: Id): Game[] {
  return games.filter((g) => g.roundId === roundId);
}
