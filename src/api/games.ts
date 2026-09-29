// Admin game API (admin doc §4, §8). Games use complete-object PUTs;
// rapid scoring MUST go through the serialized score queue
// (features/admin/scoreQueue), never as parallel PUTs (admin doc §11).
import { getGames as fetchGames, getGameById } from "./gamesApi";
import {
  createTeacherGame,
  updateTeacherGame,
  deleteTeacherGame,
  startTeacherGame,
  finishTeacherGame,
  validateTeacherGameInput,
  type TeacherGameInput,
  type CreateGameRequest,
} from "./teacher/games";
import type { Game } from "../domain/game";
import type { Id } from "../domain/group";

export type { TeacherGameInput, CreateGameRequest };
export { validateTeacherGameInput, startTeacherGame, finishTeacherGame };

export function getGames(): Promise<Game[]> {
  return fetchGames();
}

export function getGame(id: Id): Promise<Game> {
  return getGameById(id);
}

export function createGame(input: TeacherGameInput): Promise<Game> {
  return createTeacherGame(input);
}

export function updateGame(id: Id, input: TeacherGameInput): Promise<Game> {
  return updateTeacherGame(id, input);
}

export function deleteGame(id: Id): Promise<void> {
  return deleteTeacherGame(id);
}
