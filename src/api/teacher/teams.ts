import { apiTeacher, toNumericId } from "./client";
import { mapTeamResponse, type Team } from "../../domain/team";
import type { Id } from "../../domain/group";

export interface TeacherTeamInput {
  groupId: Id;
  class: string;
  name: string;
}

// Teacher team CRUD (admin doc §4, §15). The wire property is `class`
// (never `clazz` internally); groupId is sent numeric.
export async function createTeacherTeam(input: TeacherTeamInput): Promise<Team> {
  const data = await apiTeacher<unknown>("/api/teacher/teams", "POST", {
    groupId: toNumericId(input.groupId, "groupId"),
    class: input.class,
    name: input.name,
  });
  return mapTeamResponse(data);
}

export async function updateTeacherTeam(
  id: Id,
  input: TeacherTeamInput,
): Promise<Team> {
  const data = await apiTeacher<unknown>(
    `/api/teacher/teams/${encodeURIComponent(id)}`,
    "PUT",
    {
      groupId: toNumericId(input.groupId, "groupId"),
      class: input.class,
      name: input.name,
    },
  );
  return mapTeamResponse(data);
}

export async function deleteTeacherTeam(id: Id): Promise<void> {
  await apiTeacher<void>(
    `/api/teacher/teams/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
