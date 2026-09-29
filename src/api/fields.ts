// Admin field API (admin doc §4, §14).
// 409 on delete → field still has games: preserve it and show the
// backend message; never silently reassign games.
import { getFields as fetchFields, getFieldById } from "./fieldsApi";
import {
  createTeacherField,
  updateTeacherField,
  deleteTeacherField,
} from "./teacher/fields";
import type { Field } from "../domain/field";
import type { Id } from "../domain/group";

export function getFields(): Promise<Field[]> {
  return fetchFields();
}

export function getField(id: Id): Promise<Field> {
  return getFieldById(id);
}

export function createField(name: string): Promise<Field> {
  return createTeacherField(name);
}

export function updateField(id: Id, name: string): Promise<Field> {
  return updateTeacherField(id, name);
}

export function deleteField(id: Id): Promise<void> {
  return deleteTeacherField(id);
}
