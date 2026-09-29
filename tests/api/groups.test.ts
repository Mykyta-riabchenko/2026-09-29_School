import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL } from "../../src/config/api";
import { getGroups, getGroupById } from "../../src/api/groupsApi";
import { ApiError } from "../../src/api/client";

const groups = [
  { groupId: "g_02", name: "Group B" },
  { groupId: "g_01", name: "Group A" },
];

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("GET /api/groups (doc §5.1)", () => {
  it("200 with multiple groups", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () =>
        HttpResponse.json({ data: groups }),
      ),
    );
    const result = await getGroups();
    expect(result).toHaveLength(2);
  });

  it("all objects contain groupId and name", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () =>
        HttpResponse.json({ data: groups }),
      ),
    );
    const result = await getGroups();
    for (const g of result) {
      expect(typeof g.groupId).toBe("string");
      expect(typeof g.name).toBe("string");
    }
  });

  it("empty array is returned as-is (page renders empty state)", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    expect(await getGroups()).toEqual([]);
  });

  it("500 renders retryable error state", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/groups`,
        () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "boom" } },
            { status: 500 },
          ),
      ),
    );
    await expect(getGroups()).rejects.toMatchObject({ code: "SERVER_ERROR" });
  });

  it("network failure renders network state", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups`, () => HttpResponse.error()),
    );
    await expect(getGroups()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("malformed JSON is handled as API error", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/groups`,
        () => new HttpResponse("{not-json", { headers: { "Content-Type": "application/json" } }),
      ),
    );
    await expect(getGroups()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});

describe("GET /api/groups/{id} (doc §5.2)", () => {
  it("valid ID returns 200 and preserves encoded ID", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/groups/:id`, ({ params }) =>
        HttpResponse.json({
          data: { groupId: params.id, name: "Group A" },
        }),
      ),
    );
    const g = await getGroupById("g_01");
    expect(g.groupId).toBe("g_01");
  });

  it("encoded IDs are passed unchanged (URL-encoded transport)", async () => {
    let seen = "";
    server.use(
      http.get(`${API_BASE_URL}/api/groups/:id`, ({ params }) => {
        seen = String(params.id);
        return HttpResponse.json({
          data: { groupId: seen, name: "X" },
        });
      }),
    );
    await getGroupById("g 01/x");
    expect(seen).toBe("g 01/x");
  });

  it("404 renders not-found state", async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/groups/:id`,
        () =>
          HttpResponse.json(
            { error: { code: "RESOURCE_NOT_FOUND", message: "nope" } },
            { status: 404 },
          ),
      ),
    );
    await expect(getGroupById("missing")).rejects.toBeInstanceOf(ApiError);
  });
});
