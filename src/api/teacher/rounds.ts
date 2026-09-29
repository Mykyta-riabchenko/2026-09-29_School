import { apiTeacher } from "./client";
import { mapRoundResponse, type Round } from "../../domain/round";
import type { Id } from "../../domain/group";

// Teacher round CRUD (admin doc §4, §17). Numbers are positive integers.
export async function createTeacherRound(number: number): Promise<Round> {
  const data = await apiTeacher<unknown>("/api/teacher/rounds", "POST", {
    number,
  });
  return mapRoundResponse(data);
}

export async function updateTeacherRound(
  id: Id,
  number: number,
): Promise<Round> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/rounds/${encodeURIComponent(id)}`,
    "PUT",
    { number },
  );
  return mapRoundResponse(data);
}

export async function deleteTeacherRound(id: Id): Promise<void> {
  await apiTeacher<void>(
    `/api/teacher/rounds/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
