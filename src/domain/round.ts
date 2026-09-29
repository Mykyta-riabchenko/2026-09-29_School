import type { Id } from "./group";

export interface Round {
  roundId: Id;
  number: number;
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

// Rounds sort by their numeric order, not by opaque ID (doc §2).
export function sortRoundsByNumber(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => a.number - b.number);
}
