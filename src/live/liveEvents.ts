// Canonical WebSocket event names + validation (doc §6).
// Invalid events MUST be ignored and logged, never crash the UI.

import { isGroup } from "../domain/group";
import { isRound } from "../domain/round";
import { isTeam } from "../domain/team";
import { isField } from "../domain/field";
import { isGame } from "../domain/game";

export type LiveEntity = "group" | "round" | "team" | "field" | "game";
export type LiveAction = "created" | "updated" | "deleted";

export type LiveEventType =
  | "group.created"
  | "group.updated"
  | "group.deleted"
  | "round.created"
  | "round.updated"
  | "round.deleted"
  | "team.created"
  | "team.updated"
  | "team.deleted"
  | "field.created"
  | "field.updated"
  | "field.deleted"
  | "game.created"
  | "game.updated"
  | "game.deleted";

export const LIVE_EVENT_TYPES: LiveEventType[] = [
  "group.created",
  "group.updated",
  "group.deleted",
  "round.created",
  "round.updated",
  "round.deleted",
  "team.created",
  "team.updated",
  "team.deleted",
  "field.created",
  "field.updated",
  "field.deleted",
  "game.created",
  "game.updated",
  "game.deleted",
];

export interface LiveEvent {
  type: LiveEventType;
  entity: LiveEntity;
  data: unknown;
}

function isLiveType(t: unknown): t is LiveEventType {
  return (
    typeof t === "string" && (LIVE_EVENT_TYPES as string[]).includes(t)
  );
}

function entityFor(type: LiveEventType): LiveEntity {
  return type.split(".")[0] as LiveEntity;
}

// Returns null for invalid events; caller logs + ignores them.
export function validateLiveEvent(raw: unknown): LiveEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (!isLiveType(v.type)) return null;
  if (typeof v.data !== "object" || v.data === null) return null;
  const type = v.type;
  const entity = entityFor(type);
  const action = type.split(".")[1] as LiveAction;
  const data = v.data as Record<string, unknown>;

  // Deleted events carry only the ID.
  if (action === "deleted") {
    const idKey: Record<LiveEntity, string> = {
      group: "groupId",
      round: "roundId",
      team: "teamId",
      field: "fieldId",
      game: "gameId",
    };
    if (typeof data[idKey[entity]] !== "string") return null;
    return { type, entity, data };
  }

  // Created/updated carry full objects validated by domain guards.
  const validators: Record<LiveEntity, (x: unknown) => boolean> = {
    group: isGroup,
    round: isRound,
    team: isTeam,
    field: isField,
    game: isGame,
  };
  if (!validators[entity](data)) return null;
  return { type, entity, data };
}

// Admin/teacher WS format (admin doc §19). Unlike the public format it
// carries no payload — only the affected identity — so the receiver
// must invalidate and refetch via REST:
//
//   {"type":"TOURNAMENT_DATA_CHANGED","entity":"GAME",
//    "operation":"UPDATE","entityId":17}
export interface InvalidateEvent {
  entity: LiveEntity;
  action: LiveAction;
  /** Opaque string ID (numeric wire IDs are stringified). */
  id: string;
}

const ADMIN_ENTITIES = ["GROUP", "TEAM", "ROUND", "FIELD", "GAME"] as const;
const ADMIN_OPERATIONS = ["CREATE", "UPDATE", "DELETE"] as const;

// Returns null when the message is not a valid admin event.
export function normalizeAdminEvent(raw: unknown): InvalidateEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (v.type !== "TOURNAMENT_DATA_CHANGED") return null;
  if (typeof v.entity !== "string" || typeof v.operation !== "string") {
    return null;
  }
  if (
    !(ADMIN_ENTITIES as readonly string[]).includes(v.entity) ||
    !(ADMIN_OPERATIONS as readonly string[]).includes(v.operation)
  ) {
    return null;
  }
  if (typeof v.entityId !== "string" && typeof v.entityId !== "number") {
    return null;
  }
  // UPDATE → updated, CREATE → created, DELETE → deleted.
  const action =
    v.operation === "CREATE"
      ? "created"
      : v.operation === "DELETE"
        ? "deleted"
        : "updated";
  return {
    entity: v.entity.toLowerCase() as LiveEntity,
    action: action as LiveAction,
    id: String(v.entityId),
  };
}
