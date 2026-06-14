import { fetchRiskAssets } from "@/services/prediction";
import { ragCollectionsFromDocs } from "@/services/chat";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("service adapters", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.setItem("atal_access", "token");
  });

  it("fetchRiskAssets maps bottleneck response", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      jsonResponse({
        ranked_assets: [
          {
            asset_id: "id-1",
            asset_name: "Fan",
            factory: "Sinter",
            urgency_score: 4,
            health_score: 30,
            criticality_level: "critical",
          },
        ],
      }),
    );
    const assets = await fetchRiskAssets();
    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe("Fan");
  });

  it("ragCollectionsFromDocs detects sop and safety", () => {
    expect(
      ragCollectionsFromDocs(["SRF Startup SOP.pdf", "OSHA safety lockout.html"]),
    ).toEqual(expect.arrayContaining(["sop", "safety"]));
  });
});
