import {
  mapAssetHealth,
  mapDiagnosticAsset,
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
    expect(session.lastMessagePreview).toBe("hi");
  });

  it("uses last user message for preview when history loaded", () => {
    const session = mapChatSession(
      { id: "s1b", last_active: "2026-06-14T10:00:00Z" },
      [
        { id: "m1", role: "user", content: "hi" },
        { id: "m2", role: "assistant", content: "Hello! I am **MANAS** (Maintenance Agentic...)" },
        { id: "m3", role: "user", content: "explain **this**" },
      ],
    );
    expect(session.lastMessagePreview).toBe("explain this");
  });

  it("uses list last_message when full history not loaded", () => {
    const session = mapChatSession({
      id: "s2",
      last_active: "2026-06-14T10:00:00Z",
      last_message: { role: "user", content: "Latest user question" },
    });
    expect(session.messages).toHaveLength(0);
    expect(session.lastMessagePreview).toBe("Latest user question");
  });

  it("derives title from first user message when metadata is missing", () => {
    const session = mapChatSession(
      { id: "012615bb-aaaa-bbbb-cccc-dddddddddddd" },
      [{ id: "m1", role: "user", content: "write fecl" }],
    );
    expect(session.title).toBe("write fecl");
    expect(session.title).not.toMatch(/^Session /);
  });

  it("derives list title from last_message when metadata is missing", () => {
    const session = mapChatSession({
      id: "012615bb-aaaa-bbbb-cccc-dddddddddddd",
      last_message: { role: "user", content: "write fecl" },
    });
    expect(session.title).toBe("write fecl");
  });

  it("stringifies object process defect rows from backend", () => {
    const result = mapDiagnosticAsset({
      id: "a1",
      name: "Mill",
      assetType: "TCMS",
      health: 72,
      rulDays: 30,
      rulHours: 720,
      status: "warning",
      probableFault: "Bearing wear",
      earlyWarning: null,
      rootCauses: [{ factor: { sensor: "vibration" }, weight: 0.4, evidence: "trend" }],
      processDefects: [
        {
          stage: "SRF",
          defect: { sensor: "furnace_temp", avg_24h: 920, deviation_pct: 28, causal: true },
          link: "Influence weight 0.60",
        },
      ],
      sensors: [{ label: "Force", value: "12 MN", status: "nominal" }],
    });
    expect(result.processDefects[0].defect).toBe("furnace_temp — 28% deviation");
    expect(result.rootCauses[0].factor).toBe("vibration");
  });
});
