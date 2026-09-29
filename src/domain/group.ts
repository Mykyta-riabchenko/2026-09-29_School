// Canonical Group type (doc §3).
// IDs are opaque encoded strings: never decode, parse or sort by them.

export type Id = string;

export interface Group {
  groupId: Id;
  name: string;
}

// Type guard used at the API/WebSocket boundary (doc §18).
// All external data is untrusted and validated here.
export function isGroup(value: unknown): value is Group {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.groupId === "string" && typeof v.name === "string";
}

// Map raw API payload to canonical Group.
// Isolates any backend wire-name differences in one place.
export function mapGroupResponse(raw: unknown): Group {
  if (!isGroup(raw)) throw new Error("Invalid Group payload");
  return { groupId: raw.groupId, name: raw.name };
}

// Alphabetical A→Z sort (doc §7). Never mutates the input array;
// callers MUST use this derived selector instead of sorting cached state.
export function sortGroupsByName(groups: Group[]): Group[] {
  return [...groups].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
