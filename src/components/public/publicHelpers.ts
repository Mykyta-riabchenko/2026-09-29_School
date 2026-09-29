import { formatScore } from "../../domain/game";
import type { Game } from "../../domain/game";

// Shared mapping between the explicit game lifecycle status
// (admin doc §13) and the public status pills. A missing status
// means unknown — it is shown as waiting, never inferred as live.
export type PublicStatus = "live" | "waiting" | "ended";

export function toPublicStatus(game: Game): PublicStatus {
  if (game.status === "LIVE") return "live";
  if (game.status === "COMPLETED") return "ended";
  return "waiting";
}

export function publicStatusLabel(s: PublicStatus): string {
  if (s === "live") return "Live";
  if (s === "ended") return "Completed";
  return "Planned";
}

export function formatPublicScore(score: number): string {
  return formatScore(score);
}
