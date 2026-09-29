import { apiGetCollection, apiGetSingle } from "./client";
import { mapGroupResponse, type Group, type Id } from "../domain/group";

export async function getGroups(): Promise<Group[]> {
  return apiGetCollection("/api/groups", mapGroupResponse);
}

export async function getGroupById(id: Id): Promise<Group> {
  // IDs are opaque: pass them unchanged, only URL-encode for transport.
  return apiGetSingle(`/api/groups/${encodeURIComponent(id)}`, mapGroupResponse);
}
