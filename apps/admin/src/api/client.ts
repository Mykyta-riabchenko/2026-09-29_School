// Admin API client (spec §4).
// Uses the admin backend. CRUD under /api/admin/..., lifecycle
// POST /api/games/{id}/start + POST /api/games/{id}/end, generation
// POST /api/admin/rounds/{id}/generate-games/round-robin|knockout|consolation.
// Status is explicit backend data SCHEDULED/RUNNING/FINISHED.
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

export class AdminApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AdminApiError(0, "NETWORK_ERROR", "Network failure");
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AdminApiError(response.status, "INVALID_RESPONSE", "Malformed JSON response");
    }
  }
  if (!response.ok) {
    const e = parsed as { error?: { code?: string; message?: string } } | null;
    throw new AdminApiError(response.status, e?.error?.code ?? "UNKNOWN_ERROR", e?.error?.message ?? `Request failed: ${response.status}`);
  }
  if (parsed === null || typeof parsed !== "object" || !("data" in parsed)) {
    if (method === "DELETE") return undefined as T;
    throw new AdminApiError(response.status, "INVALID_RESPONSE", "Missing data envelope");
  }
  return (parsed as { data: T }).data;
}

async function getData(path: string): Promise<unknown> {
  return request<unknown>(path, "GET");
}

// ---- Reads (for dashboard + management screens) ----
export async function getGroups(): Promise<Group[]> {
  const data = await getData("/api/groups");
  if (!Array.isArray(data)) throw new AdminApiError(500, "INVALID_RESPONSE", "Expected array");
  return data.map(mapGroupResponse);
}
export async function getTeams(): Promise<Team[]> {
  const data = await getData("/api/teams");
  if (!Array.isArray(data)) throw new AdminApiError(500, "INVALID_RESPONSE", "Expected array");
  return data.map(mapTeamResponse);
}
export async function getRounds(): Promise<Round[]> {
  const data = await getData("/api/rounds");
  if (!Array.isArray(data)) throw new AdminApiError(500, "INVALID_RESPONSE", "Expected array");
  return data.map(mapRoundResponse);
}
export async function getFields(): Promise<Field[]> {
  const data = await getData("/api/fields");
  if (!Array.isArray(data)) throw new AdminApiError(500, "INVALID_RESPONSE", "Expected array");
  return data.map(mapFieldResponse);
}
export async function getGames(): Promise<Game[]> {
  const data = await getData("/api/games");
  if (!Array.isArray(data)) throw new AdminApiError(500, "INVALID_RESPONSE", "Expected array");
  return data.map(mapGameResponse);
}
export async function getGameById(id: Id): Promise<Game> {
  const data = await getData(`/api/games/${encodeURIComponent(id)}`);
  return mapGameResponse(data);
}

// ---- Group CRUD ----
export async function createGroup(name: string): Promise<Group> {
  const data = await request<unknown>("/api/admin/groups", "POST", { name });
  return mapGroupResponse(data);
}
export async function updateGroup(id: Id, name: string): Promise<Group> {
  const data = await request<unknown>(`/api/admin/groups/${encodeURIComponent(id)}`, "PUT", { name });
  return mapGroupResponse(data);
}
export async function deleteGroup(id: Id): Promise<void> {
  await request<void>(`/api/admin/groups/${encodeURIComponent(id)}`, "DELETE");
}

// ---- Team CRUD ----
export interface TeamInput {
  groupId: Id;
  class: string;
  name: string;
}
function teamToWire(input: TeamInput) {
  // Backend uses opaque string IDs (e.g. "1", "g_1790699107454_943").
  // Pass them through unchanged; only reject missing/blank values.
  const groupId = String(input.groupId ?? "").trim();
  if (!groupId) throw new AdminApiError(400, "BAD_REQUEST", `Invalid groupId: ${input.groupId}`);
  return { groupId, class: input.class, name: input.name };
}
export async function createTeam(input: TeamInput): Promise<Team> {
  const data = await request<unknown>("/api/admin/teams", "POST", teamToWire(input));
  return mapTeamResponse(data);
}
export async function updateTeam(id: Id, input: TeamInput): Promise<Team> {
  const data = await request<unknown>(`/api/admin/teams/${encodeURIComponent(id)}`, "PUT", teamToWire(input));
  return mapTeamResponse(data);
}
export async function deleteTeam(id: Id): Promise<void> {
  await request<void>(`/api/admin/teams/${encodeURIComponent(id)}`, "DELETE");
}

// ---- Round CRUD ----
export async function createRound(number: number): Promise<Round> {
  const data = await request<unknown>("/api/admin/rounds", "POST", { number });
  return mapRoundResponse(data);
}
export async function updateRound(id: Id, number: number): Promise<Round> {
  const data = await request<unknown>(`/api/admin/rounds/${encodeURIComponent(id)}`, "PUT", { number });
  return mapRoundResponse(data);
}
export async function deleteRound(id: Id): Promise<void> {
  await request<void>(`/api/admin/rounds/${encodeURIComponent(id)}`, "DELETE");
}

// ---- Field CRUD ----
export async function createField(name: string): Promise<Field> {
  const data = await request<unknown>("/api/admin/fields", "POST", { name });
  return mapFieldResponse(data);
}
export async function updateField(id: Id, name: string): Promise<Field> {
  const data = await request<unknown>(`/api/admin/fields/${encodeURIComponent(id)}`, "PUT", { name });
  return mapFieldResponse(data);
}
export async function deleteField(id: Id): Promise<void> {
  await request<void>(`/api/admin/fields/${encodeURIComponent(id)}`, "DELETE");
}

// ---- Game CRUD ----
export interface GameInput {
  roundId: Id;
  fieldId: Id;
  teamAId: Id;
  teamBId: Id;
  refereeTeamId: Id;
  scoreA: number;
  scoreB: number;
}
function gameToWire(input: GameInput) {
  // Same as teams: IDs are opaque strings, pass through unchanged.
  const id = (v: string, field: string) => {
    const s = String(v ?? "").trim();
    if (!s) throw new AdminApiError(400, "BAD_REQUEST", `Invalid ${field}: ${v}`);
    return s;
  };
  return {
    roundId: id(input.roundId, "roundId"),
    fieldId: id(input.fieldId, "fieldId"),
    teamAId: id(input.teamAId, "teamAId"),
    teamBId: id(input.teamBId, "teamBId"),
    refereeTeamId: id(input.refereeTeamId, "refereeTeamId"),
    scoreA: input.scoreA,
    scoreB: input.scoreB,
  };
}
export function validateGameInput(input: GameInput): string | null {
  if (!input.roundId || !input.fieldId || !input.teamAId || !input.teamBId || !input.refereeTeamId)
    return "Every reference is required.";
  if (input.teamAId === input.teamBId) return "Team A and Team B must differ.";
  if (input.refereeTeamId === input.teamAId || input.refereeTeamId === input.teamBId)
    return "Referee must differ from both teams.";
  for (const [label, s] of [["Score A", input.scoreA], ["Score B", input.scoreB]] as const) {
    if (!Number.isInteger(s) || s < 0) return `${label} must be an integer >= 0.`;
  }
  return null;
}
export async function createGame(input: GameInput): Promise<Game> {
  const data = await request<unknown>("/api/admin/games", "POST", gameToWire(input));
  return mapGameResponse(data);
}
export async function updateGame(id: Id, input: GameInput): Promise<Game> {
  const data = await request<unknown>(`/api/admin/games/${encodeURIComponent(id)}`, "PUT", gameToWire(input));
  return mapGameResponse(data);
}
export async function deleteGame(id: Id): Promise<void> {
  await request<void>(`/api/admin/games/${encodeURIComponent(id)}`, "DELETE");
}

// ---- Score update (complete-object PUT, serialized by the queue) ----
export async function saveGameScore(id: Id, input: GameInput): Promise<Game> {
  return updateGame(id, input);
}

// ---- Lifecycle: SCHEDULED --start--> RUNNING --end--> FINISHED ----
export async function startGame(id: Id): Promise<Game> {
  const data = await request<unknown>(`/api/games/${encodeURIComponent(id)}/start`, "POST");
  return mapGameResponse(data);
}
export async function endGame(id: Id): Promise<Game> {
  const data = await request<unknown>(`/api/games/${encodeURIComponent(id)}/end`, "POST");
  return mapGameResponse(data);
}

// ---- Generation ----
export type GenerationKind = "round-robin" | "knockout" | "consolation";
export async function generateGames(roundId: Id, kind: GenerationKind): Promise<Game[]> {
  const data = await request<unknown>(
    `/api/admin/rounds/${encodeURIComponent(roundId)}/generate-games/${kind}`,
    "POST",
  );
  if (!Array.isArray(data)) throw new AdminApiError(500, "INVALID_RESPONSE", "Expected array");
  return data.map(mapGameResponse);
}
export async function generateRoundRobin(roundId: Id): Promise<Game[]> {
  return generateGames(roundId, "round-robin");
}
export async function generateKnockout(roundId: Id): Promise<Game[]> {
  return generateGames(roundId, "knockout");
}
export async function generateConsolation(roundId: Id): Promise<Game[]> {
  return generateGames(roundId, "consolation");
}
