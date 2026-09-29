// Teacher API transport (admin doc §4). All mutations go through here;
// UI code must never call fetch directly. Reads reuse the public GET
// endpoints (the backend exposes no teacher GET) — see sibling modules.
//
// Envelope: success returns `{ data }`; errors return
// `{ error: { code, message } }`. Deletes answer 200/204 with an
// optional empty body, so both are accepted.
import { API_BASE_URL } from "../../config/api";
import { TeacherApiError } from "./errors";

function errorFromStatus(
  status: number,
  body: { error?: { code?: string; message?: string } } | null,
  fallback: string,
): TeacherApiError {
  const message = body?.error?.message ?? fallback;
  const code = body?.error?.code ?? "UNKNOWN_ERROR";
  return new TeacherApiError(status, code, message);
}

export async function apiTeacher<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new TeacherApiError(0, "NETWORK_ERROR", "Network failure");
  }

  if (response.status === 204) return undefined as T;

  let parsed: unknown = null;
  const text = await response.text().catch(() => "");
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new TeacherApiError(
        response.status,
        "INVALID_RESPONSE",
        "Malformed JSON response",
      );
    }
  }

  if (!response.ok) {
    throw errorFromStatus(
      response.status,
      parsed as { error?: { code?: string; message?: string } } | null,
      `Request failed: ${response.status}`,
    );
  }

  if (parsed === null || typeof parsed !== "object" || !("data" in parsed)) {
    // Tolerate empty-body 200 on deletes.
    if (method === "DELETE") return undefined as T;
    throw new TeacherApiError(
      response.status,
      "INVALID_RESPONSE",
      "Missing data envelope",
    );
  }
  return (parsed as { data: T }).data;
}

// Canonical string IDs (e.g. "17") → numeric teacher request IDs.
// Throws a client-side validation error instead of sending garbage.
export function toNumericId(id: string, field: string): number {
  const n = Number(id);
  if (!Number.isInteger(n)) {
    throw new TeacherApiError(400, "BAD_REQUEST", `Invalid ${field}: ${id}`);
  }
  return n;
}
