import type { LiveEvent } from "./liveEvents";
import { normalizeAdminEvent, validateLiveEvent } from "./liveEvents";
import type { TournamentStore } from "../state/store";
import { getGameById, getGames } from "../api/gamesApi";
import { getGroupById, getGroups } from "../api/groupsApi";
import { getTeamById, getTeams } from "../api/teamsApi";
import { getFieldById, getFields } from "../api/fieldsApi";
import { getRoundById, getRounds } from "../api/roundsApi";

// Live sync: backend sends an event → frontend sees it → calls the API
// for fresh info → targeted store write updates cache + UI.
//
// Flow per event:
//   1. WS message arrives (LiveSocket/LiveProvider onEvent).
//   2. This handler fetches the single fresh entity via REST
//      (server is the source of truth; the event is only a trigger —
//      its payload may be partial or stale).
//   3. The upsert/remove store method performs BOTH update steps:
//      a. cache update — mirrors the new state to localStorage, and
//      b. UI update — emit() notifies useSyncExternalStore subscribers,
//         so React re-renders only the components reading that entity
//         (Vue-like: change the variable → the view follows).
//      No loading flags are touched, so the changed value swaps silently
//      in place: no page reload, no spinner, selection/scroll preserved.
//
// Deleted events carry only the ID, so no API call is needed — the
// entry is removed by ID. Created/updated events fetch the full fresh
// object; if the single-item fetch fails (e.g. field/round detail
// endpoints missing on the backend), the validated event payload is
// applied as a fallback so the screen still reflects the change.
export async function handleLiveEvent(
  event: LiveEvent,
  store: TournamentStore,
): Promise<void> {
  const [entity, action] = event.type.split(".");
  const data = event.data as Record<string, unknown>;
  const idOf = (key: string): string => data[key] as string;

  try {
    if (action === "deleted") {
      if (entity === "group") store.removeGroup(idOf("groupId"));
      else if (entity === "round") store.removeRound(idOf("roundId"));
      else if (entity === "team") store.removeTeam(idOf("teamId"));
      else if (entity === "field") store.removeField(idOf("fieldId"));
      else store.removeGame(idOf("gameId"));
      return;
    }

    // created + updated: fetch fresh single entity, then upsert.
    if (entity === "game") {
      store.upsertGame(await getGameById(idOf("gameId")));
    } else if (entity === "team") {
      store.upsertTeam(await getTeamById(idOf("teamId")));
    } else if (entity === "group") {
      store.upsertGroup(await getGroupById(idOf("groupId")));
    } else if (entity === "field") {
      store.upsertField(await getFieldById(idOf("fieldId")));
    } else {
      store.upsertRound(await getRoundById(idOf("roundId")));
    }
  } catch (e) {
    // Single-item fetch failed (offline or endpoint missing): fall back
    // to the validated event payload so the UI still updates silently
    // instead of staying stale. applyLiveEvent upserts by ID with the
    // same cache + emit steps as the upsert methods above.
    if (action !== "deleted") {
      try {
        store.applyLiveEvent(event);
      } catch {
        console.warn("[live] Dropping event after fallback failure", event);
      }
    } else {
      console.warn("[live] Dropping event", e);
    }
  }
}

// Admin-format invalidation (admin doc §19): the event names the entity
// but carries no payload, so the handler refetches via REST and upserts
// the fresh object — same silent targeted update as handleLiveEvent:
//
//   GAME UPDATE → refresh that game (remove/reload on DELETE)
//   TEAM/GROUP/ROUND/FIELD → refresh the affected collection view
export async function handleInvalidateEntity(
  entity: "group" | "round" | "team" | "field" | "game",
  action: "created" | "updated" | "deleted",
  id: string,
  store: TournamentStore,
): Promise<void> {
  try {
    if (action === "deleted") {
      if (entity === "group") store.removeGroup(id);
      else if (entity === "round") store.removeRound(id);
      else if (entity === "team") store.removeTeam(id);
      else if (entity === "field") store.removeField(id);
      else store.removeGame(id);
      return;
    }
    // GAME: single-entity refresh keeps the update targeted.
    if (entity === "game") {
      try {
        store.upsertGame(await getGameById(id));
      } catch {
        // Deleted remotely but reported as update: drop the stale row.
        store.removeGame(id);
      }
      return;
    }
    // Other entities: refresh the collection view they feed.
    if (entity === "team") store.setTeams(await getTeams());
    else if (entity === "group") store.setGroups(await getGroups());
    else if (entity === "round") store.setRounds(await getRounds());
    else store.setFields(await getFields());
  } catch (e) {
    console.warn("[live] Dropping invalidate event", e);
  }
}

// Shared wire entry for both WS formats. Returns true when the message
// was a valid event (either format) and was handled; false when the
// caller should log + ignore it. Never throws.
export async function handleRawLiveMessage(
  raw: unknown,
  store: TournamentStore,
): Promise<boolean> {
  const event: LiveEvent | null =
    typeof raw === "object" && raw !== null ? validateLiveEvent(raw) : null;
  if (event) {
    await handleLiveEvent(event, store);
    return true;
  }
  const admin = normalizeAdminEvent(raw);
  if (admin) {
    await handleInvalidateEntity(admin.entity, admin.action, admin.id, store);
    return true;
  }
  return false;
}
