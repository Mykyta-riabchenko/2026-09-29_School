import { apiTeacher, toNumericId } from "./client";
import { mapGameResponse, type Game } from "../../domain/game";
import type { Id } from "../../domain/group";

// Teacher game CRUD (admin doc §4, §8). The backend takes a COMPLETE
// game object with numeric reference IDs; rapid score clicks must go
// through the serialized queue (features/admin/scoreQueue), never as
// parallel PUTs (admin doc §11).
export interface TeacherGameInput {
  roundId: Id;
  fieldId: Id;
  teamAId: Id;
  teamBId: Id;
  refereeTeamId: Id;
  scoreA: number;
  scoreB: number;
}

// Wire shape (admin doc §3): teacher request IDs are numbers.
export interface CreateGameRequest {
  roundId: number;
  fieldId: number;
  teamAId: number;
  teamBId: number;
  refereeTeamId: number;
  scoreA: number;
  scoreB: number;
}

function toWire(input: TeacherGameInput): CreateGameRequest {
  return {
    roundId: toNumericId(input.roundId, "roundId"),
    fieldId: toNumericId(input.fieldId, "fieldId"),
    teamAId: toNumericId(input.teamAId, "teamAId"),
    teamBId: toNumericId(input.teamBId, "teamBId"),
    refereeTeamId: toNumericId(input.refereeTeamId, "refereeTeamId"),
    scoreA: input.scoreA,
    scoreB: input.scoreB,
  };
}

export async function createTeacherGame(
  input: TeacherGameInput,
): Promise<Game> {
  const data = await apiTeacher<unknown>(
    "/api/teacher/games",
    "POST",
    toWire(input),
  );
  return mapGameResponse(data);
}

export async function updateTeacherGame(
  id: Id,
  input: TeacherGameInput,
): Promise<Game> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/games/${encodeURIComponent(id)}`,
    "PUT",
    toWire(input),
  );
  return mapGameResponse(data);
}

export async function deleteTeacherGame(id: Id): Promise<void> {
  await apiTeacher<void>(
    `/api/teacher/games/${encodeURIComponent(id)}`,
    "DELETE",
  );
}

// Recommended lifecycle endpoints (admin doc §13, §36).
// Until the backend deploys them, callers MUST treat a 404 as
// "endpoint not available yet" and keep the serialized-PUT behaviour.
export async function startTeacherGame(id: Id): Promise<Game> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/games/${encodeURIComponent(id)}/start`,
    "POST",
  );
  return mapGameResponse(data);
}

export async function finishTeacherGame(id: Id): Promise<Game> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/games/${encodeURIComponent(id)}/finish`,
    "POST",
  );
  return mapGameResponse(data);
}

// Client-side validation for the create/edit form (admin doc §8).
// Backend remains authoritative; this only filters invalid choices early.
export function validateTeacherGameInput(input: TeacherGameInput): string | null {
  if (
    !input.roundId ||
    !input.fieldId ||
    !input.teamAId ||
    !input.teamBId ||
    !input.refereeTeamId
  )
    return "Every reference is required.";
  if (input.teamAId === input.teamBId) return "Team A and Team B must differ.";
  if (input.refereeTeamId === input.teamAId) return "Referee must differ from Team A.";
  if (input.refereeTeamId === input.teamBId) return "Referee must differ from Team B.";
  for (const [label, s] of [["Score A", input.scoreA], ["Score B", input.scoreB]] as const) {
    if (!Number.isInteger(s) || s < 0)
      return `${label} must be an integer ≥ 0.`;
  }
  return null;
}
