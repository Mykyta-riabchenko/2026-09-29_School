import { apiGetCollection, apiGetSingle } from "./client";
import { mapRoundResponse, type Round } from "../domain/round";
import type { Id } from "../domain/group";

export async function getRounds(): Promise<Round[]> {
  return apiGetCollection("/api/rounds", mapRoundResponse);
}

export async function getRoundById(id: Id): Promise<Round> {
  return apiGetSingle(`/api/rounds/${encodeURIComponent(id)}`, mapRoundResponse);
}
