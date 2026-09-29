// Admin round API (admin doc §4, §17). Numbers are integers > 0.
import { getRounds as fetchRounds, getRoundById } from "./roundsApi";
import {
  createTeacherRound,
  updateTeacherRound,
  deleteTeacherRound,
} from "./teacher/rounds";
import type { Round } from "../domain/round";
import type { Id } from "../domain/group";

export function getRounds(): Promise<Round[]> {
  return fetchRounds();
}

export function getRound(id: Id): Promise<Round> {
  return getRoundById(id);
}

export function createRound(number: number): Promise<Round> {
  return createTeacherRound(number);
}

export function updateRound(id: Id, number: number): Promise<Round> {
  return updateTeacherRound(id, number);
}

export function deleteRound(id: Id): Promise<void> {
  return deleteTeacherRound(id);
}
