import { apiFetch, apiJson, apiList, ApiError, getApiBase } from "@/lib/api";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  it("uses django backend port in browser", () => {
    expect(getApiBase()).toMatch(/:8000$/);
  });

  it("attaches bearer token when present", async () => {
    localStorage.setItem("atal_access", "test-token");
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    await apiFetch("/api/v1/assets/");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/assets\/$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      jsonResponse({ detail: "Unauthorized" }, 401),
    );
    await expect(apiJson("/api/v1/chat/sessions/")).rejects.toBeInstanceOf(ApiError);
  });

  it("unwraps paginated list responses", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      jsonResponse({ count: 1, results: [{ id: "f1", code: "F1" }] }),
    );
    const rows = await apiList<{ id: string; code: string }>("/api/v1/factories/");
    expect(rows).toEqual([{ id: "f1", code: "F1" }]);
  });
});
