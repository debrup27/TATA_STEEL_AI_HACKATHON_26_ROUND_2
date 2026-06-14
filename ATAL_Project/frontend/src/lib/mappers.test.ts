import {
  mapAssetHealth,
  mapRiskAsset,
  mapTelemetryCell,
  mapChatSession,
} from "@/lib/mappers";

describe("mappers", () => {
  it("maps asset health to UI shape", () => {
    const result = mapAssetHealth({
      asset_id: "a1",
      name: "Exhauster",
      health_score: 24,
      rul_hours: 336,
      status: "critical",
      active_alerts_count: 2,
    });
    expect(result.id).toBe("a1");
    expect(result.rulDays).toBe(14);
    expect(result.status).toBe("critical");
  });

  it("maps ranked asset to risk asset", () => {
    const result = mapRiskAsset(
      {
        asset_id: "x",
        asset_name: "Pump",
        factory: "F1",
        urgency_score: 2.8,
        health_score: 40,
        criticality_level: "high",
      },
      0,
    );
    expect(result.id).toBe("x");
    expect(result.urgency).toBe("HIGH");
  });

  it("normalizes telemetry cell status", () => {
    expect(mapTelemetryCell({ label: "T", value: "1", status: "critical" }).status).toBe(
      "critical",
    );
    expect(mapTelemetryCell({ label: "T", value: "1", status: "unknown" }).status).toBe(
      "nominal",
    );
  });

  it("maps backend chat session", () => {
    const session = mapChatSession(
      { id: "s1", last_active: "2026-06-14T10:00:00Z" },
      [{ id: "m1", role: "user", content: "hi" }],
    );
    expect(session.id).toBe("s1");
    expect(session.messages).toHaveLength(1);
  });
});
