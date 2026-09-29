import { apiTeacher } from "./client";
import { mapFieldResponse, type Field } from "../../domain/field";
import type { Id } from "../../domain/group";

// Teacher field CRUD (admin doc §4, §14).
export async function createTeacherField(name: string): Promise<Field> {
  const data = await apiTeacher<unknown>("/api/teacher/fields", "POST", {
    name,
  });
  return mapFieldResponse(data);
}

export async function updateTeacherField(
  id: Id,
  name: string,
): Promise<Field> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/fields/${encodeURIComponent(id)}`,
    "PUT",
    { name },
  );
  return mapFieldResponse(data);
}

// 409 → field still has games: keep it and show the backend message.
export async function deleteTeacherField(id: Id): Promise<void> {
  await apiTeacher<void>(
    `/api/teacher/fields/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
