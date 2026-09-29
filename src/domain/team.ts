import type { Id } from "./group";

export interface Team {
  teamId: Id;
  class: string;
  name: string;
  groupId: Id;
}

export function isTeam(value: unknown): value is Team {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  // Real backend (Java) may serialize `class` as `clazz` because
  // `class` is a reserved word — accept either at the boundary.
  const cls = v.class ?? v.clazz;
  return (
    typeof v.teamId === "string" &&
    typeof cls === "string" &&
    typeof v.name === "string" &&
    typeof v.groupId === "string"
  );
}

export function mapTeamResponse(raw: unknown): Team {
  if (typeof raw !== "object" || raw === null)
    throw new Error("Invalid Team payload");
  const v = raw as Record<string, unknown>;
  const cls = v.class ?? v.clazz;
  if (
    typeof v.teamId !== "string" ||
    typeof cls !== "string" ||
    typeof v.name !== "string" ||
    typeof v.groupId !== "string"
  )
    throw new Error("Invalid Team payload");
  return {
    teamId: v.teamId,
    class: cls,
    name: v.name,
    groupId: v.groupId,
  };
}

// Alphabetical A→Z by name (doc §5.6, §7). Returns a new array.
export function sortTeamsByName(teams: Team[]): Team[] {
  return [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
