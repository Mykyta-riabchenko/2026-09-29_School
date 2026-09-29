// Public games API (frontend doc §5.3–§5.5).
// The public endpoint is /api/games; the frontend resource is
// still called a Game.
import { apiGetCollection, apiGetSingle } from "./client";
import { mapGameResponse, type Game } from "../domain/game";
import type { Id } from "../domain/group";

export async function getGames(): Promise<Game[]> {
  return apiGetCollection("/api/games", mapGameResponse);
}

export async function getGameById(id: Id): Promise<Game> {
  return apiGetSingle(`/api/games/${encodeURIComponent(id)}`, mapGameResponse);
}

// Filter syntax is backend-owned (doc §5.5) and isolated here.
// The frontend MUST NOT duplicate backend filter parsing rules.
export async function getGamesByFilter(filter: string): Promise<Game[]> {
  return apiGetCollection(
    `/api/games/filter/${encodeURIComponent(filter)}`,
    mapGameResponse,
  );
}

// Convenience for the required round-filter use case.
export async function getGamesByRound(roundId: Id): Promise<Game[]> {
  return getGamesByFilter(roundId);
}
