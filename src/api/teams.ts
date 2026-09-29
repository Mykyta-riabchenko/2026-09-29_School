// Admin team API (admin doc §4). The property is exactly
// `class: string` — never `clazz` internally.
import { getTeams as fetchTeams, getTeamById } from "./teamsApi";
import {
  createTeacherTeam,
  updateTeacherTeam,
  deleteTeacherTeam,
  type TeacherTeamInput,
} from "./teacher/teams";
import type { Team } from "../domain/team";
import type { Id } from "../domain/group";

export type { TeacherTeamInput };

export function getTeams(): Promise<Team[]> {
  return fetchTeams();
}

export function getTeam(id: Id): Promise<Team> {
  return getTeamById(id);
}

export function createTeam(input: TeacherTeamInput): Promise<Team> {
  return createTeacherTeam(input);
}

export function updateTeam(id: Id, input: TeacherTeamInput): Promise<Team> {
  return updateTeacherTeam(id, input);
}

export function deleteTeam(id: Id): Promise<void> {
  return deleteTeacherTeam(id);
}
