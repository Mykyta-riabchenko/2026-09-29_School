import { apiTeacher } from "./client";
import {
  mapGroupResponse,
  type Group,
  type Id,
} from "../../domain/group";

// Teacher group CRUD (admin doc §4, §16). Reads reuse public GET;
// the backend exposes teacher POST/PUT/DELETE only.
export async function createTeacherGroup(name: string): Promise<Group> {
  const data = await apiTeacher<unknown>("/api/teacher/groups", "POST", {
    name,
  });
  return mapGroupResponse(data);
}

export async function updateTeacherGroup(
  id: Id,
  name: string,
): Promise<Group> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/groups/${encodeURIComponent(id)}`,
    "PUT",
    { name },
  );
  return mapGroupResponse(data);
}

// 204/200 → removed; 404 → already gone; 409 → still referenced.
export async function deleteTeacherGroup(id: Id): Promise<void> {
  await apiTeacher<void>(
    `/api/teacher/groups/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
