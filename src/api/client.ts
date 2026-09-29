// Transport boundary (doc §4, §18).
// Handles JSON envelope { data } / { error }, HTTP statuses and
// network failures. Validators map raw payloads to canonical types
// so components never see transport details.

import { API_BASE_URL } from "../config/api";
import { ApiError as AdminApiError } from "./errors";

// Teacher/admin transport (admin doc §4): all teacher API calls are
// isolated from UI code. Success returns `body.data`; errors throw
// ApiError(status, code, message) with the backend message preferred.
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new AdminApiError(
      response.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Request failed",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json();
  return body.data;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "RESOURCE_NOT_FOUND"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Low-level GET returning the unwrapped `data` field.
// Throws ApiError for error envelopes, HTTP errors, network
// failures and malformed JSON (doc §4 table).
export async function apiGetData(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new ApiError("NETWORK_ERROR", "Network failure");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("INVALID_RESPONSE", "Malformed JSON response");
  }

  if (!response.ok) {
    const err = body as { error?: { code?: string; message?: string } };
    const message = err?.error?.message ?? `Request failed: ${response.status}`;
    if (response.status === 400)
      throw new ApiError("BAD_REQUEST", message, 400);
    if (response.status === 404)
      throw new ApiError("RESOURCE_NOT_FOUND", message, 404);
    throw new ApiError("SERVER_ERROR", message, response.status);
  }

  if (typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiError("INVALID_RESPONSE", "Missing data envelope");
  }
  return (body as { data: unknown }).data;
}

// Collection helper: validates `data` is an array and maps each item.
export async function apiGetCollection<T>(
  path: string,
  mapItem: (raw: unknown) => T,
): Promise<T[]> {
  const data = await apiGetData(path);
  if (!Array.isArray(data)) {
    throw new ApiError("INVALID_RESPONSE", "Expected array in data envelope");
  }
  // A game MUST NOT render as valid if any required relationship
  // is missing — invalid items are rejected at the boundary.
  return data.map(mapItem);
}

// Single-resource helper.
export async function apiGetSingle<T>(
  path: string,
  mapItem: (raw: unknown) => T,
): Promise<T> {
  const data = await apiGetData(path);
  return mapItem(data);
}
