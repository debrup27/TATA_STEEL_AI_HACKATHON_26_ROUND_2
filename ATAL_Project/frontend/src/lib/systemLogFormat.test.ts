import {
  formatAlertLogText,
  formatReportLogText,
  humanizeSensorName,
} from "@/lib/systemLogFormat";

describe("systemLogFormat", () => {
  it("humanizes sensor snake_case names", () => {
    expect(humanizeSensorName("hysteresis_deviation_um")).toBe("Hysteresis Deviation μm");
  });

  it("formats threshold alert messages", () => {
    const text = formatAlertLogText({
      message: "Trip threshold breached: hysteresis_deviation_um = 102.0881 μm",
      severity: "trip",
    });
    expect(text).toContain("Hysteresis Deviation");
    expect(text).toContain("Abnormality limit exceeded");
    expect(text).not.toContain("102.0881");
  });

  it("prefers recommendation steps over raw diagnosis for reports", () => {
    const text = formatReportLogText({
      asset_name: "High-Pressure Air Knives",
      diagnosis:
        "Asset 2ecab1f3-d15d-4aa8-b100-cbcab9b19f39 shows critical condition with health_score=40.0",
      risk_level: "critical",
      recommendations: [
        { step: "Inspect blower impeller within 24 hours" },
      ],
    });
    expect(text).toBe("Inspect blower impeller within 24 hours");
    expect(text).not.toContain("2ecab1f3");
  });
});
