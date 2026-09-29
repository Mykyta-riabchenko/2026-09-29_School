// Public read-only API client (spec §3).
// Only retrieval operations. Uses GET endpoints on :8080.
// No modification calls exist in this module.
import { API_BASE_URL } from "../config";
import {
  mapFieldResponse,
  mapGameResponse,
  mapGroupResponse,
  mapRoundResponse,
  mapTeamResponse,
  type Field,
  type Game,
  type Group,
  type Id,
  type Round,
  type Team,
} from "../../../../packages/contracts/src/index";

export class ApiError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function getData(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new ApiError("NETWORK_ERROR", "Network failure");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("INVALID_RESPONSE", "Malformed JSON response");
  }
  if (!response.ok) {
    const err = body as { error?: { code?: string; message?: string } };
    const message = err?.error?.message ?? `Request failed: ${response.status}`;
    throw new ApiError(err?.error?.code ?? "SERVER_ERROR", message, response.status);
  }
  if (typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiError("INVALID_RESPONSE", "Missing data envelope");
  }
  return (body as { data: unknown }).data;
}

async function getCollection<T>(path: string, mapItem: (raw: unknown) => T): Promise<T[]> {
  const data = await getData(path);
  if (!Array.isArray(data)) throw new ApiError("INVALID_RESPONSE", "Expected array");
  return data.map(mapItem);
}

async function getSingle<T>(path: string, mapItem: (raw: unknown) => T): Promise<T> {
  const data = await getData(path);
  return mapItem(data);
}

export function getGroups(): Promise<Group[]> {
  return getCollection("/api/groups", mapGroupResponse);
}
export function getGroupById(id: Id): Promise<Group> {
  return getSingle(`/api/groups/${encodeURIComponent(id)}`, mapGroupResponse);
}
export function getTeams(): Promise<Team[]> {
  return getCollection("/api/teams", mapTeamResponse);
}
export function getTeamById(id: Id): Promise<Team> {
  return getSingle(`/api/teams/${encodeURIComponent(id)}`, mapTeamResponse);
}
export function getRounds(): Promise<Round[]> {
  return getCollection("/api/rounds", mapRoundResponse);
}
export function getRoundById(id: Id): Promise<Round> {
  return getSingle(`/api/rounds/${encodeURIComponent(id)}`, mapRoundResponse);
}
export function getFields(): Promise<Field[]> {
  return getCollection("/api/fields", mapFieldResponse);
}
export function getFieldById(id: Id): Promise<Field> {
  return getSingle(`/api/fields/${encodeURIComponent(id)}`, mapFieldResponse);
}
export function getGames(): Promise<Game[]> {
  return getCollection("/api/games", mapGameResponse);
}
export function getGameById(id: Id): Promise<Game> {
  return getSingle(`/api/games/${encodeURIComponent(id)}`, mapGameResponse);
}
export function getGamesByFilter(filter: string): Promise<Game[]> {
  return getCollection(`/api/games/filter/${encodeURIComponent(filter)}`, mapGameResponse);
}
