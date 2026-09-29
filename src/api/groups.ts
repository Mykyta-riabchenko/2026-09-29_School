// Admin group API (admin doc §4). Reads reuse the public GET
// endpoints; mutations go to /api/teacher/groups.
import { getGroups as fetchGroups, getGroupById } from "./groupsApi";
import {
  createTeacherGroup,
  updateTeacherGroup,
  deleteTeacherGroup,
} from "./teacher/groups";
import type { Group, Id } from "../domain/group";

export function getGroups(): Promise<Group[]> {
  return fetchGroups();
}

export function getGroup(id: Id): Promise<Group> {
  return getGroupById(id);
}

export function createGroup(name: string): Promise<Group> {
  return createTeacherGroup(name);
}

export function updateGroup(id: Id, name: string): Promise<Group> {
  return updateTeacherGroup(id, name);
}

export function deleteGroup(id: Id): Promise<void> {
  return deleteTeacherGroup(id);
}
