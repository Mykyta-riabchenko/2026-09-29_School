import { apiGetCollection, apiGetSingle } from "./client";
import { mapFieldResponse, type Field } from "../domain/field";
import type { Id } from "../domain/group";

export async function getFields(): Promise<Field[]> {
  return apiGetCollection("/api/fields", mapFieldResponse);
}

export async function getFieldById(id: Id): Promise<Field> {
  return apiGetSingle(`/api/fields/${encodeURIComponent(id)}`, mapFieldResponse);
}
