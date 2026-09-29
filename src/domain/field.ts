import type { Id } from "./group";

export interface Field {
  fieldId: Id;
  name: string;
}

export function isField(value: unknown): value is Field {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.fieldId === "string" && typeof v.name === "string";
}

export function mapFieldResponse(raw: unknown): Field {
  if (!isField(raw)) throw new Error("Invalid Field payload");
  return { fieldId: raw.fieldId, name: raw.name };
}

export function sortFieldsByName(fields: Field[]): Field[] {
  return [...fields].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
