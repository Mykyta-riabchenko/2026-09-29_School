import { apiGetCollection, apiGetSingle } from "./client";
import { mapTeamResponse, type Team } from "../domain/team";
import type { Id } from "../domain/group";

export async function getTeams(): Promise<Team[]> {
  return apiGetCollection("/api/teams", mapTeamResponse);
}

export async function getTeamById(id: Id): Promise<Team> {
  return apiGetSingle(`/api/teams/${encodeURIComponent(id)}`, mapTeamResponse);
}
