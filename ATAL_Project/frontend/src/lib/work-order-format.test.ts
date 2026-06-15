import {
  formatSpareRequirement,
  formatWorkOrderAction,
  normalizeGeneratedWorkOrder,
} from "@/lib/work-order-format";

describe("work-order-format", () => {
  it("formats spare object with part, qty, order_status", () => {
    expect(
      formatSpareRequirement({ part: "Bearing SKF-6205", qty: 2, order_status: "order" }),
    ).toBe("Bearing SKF-6205 — qty 2 — order");
  });

  it("normalizes work order spareRequirements from objects", () => {
    const wo = normalizeGeneratedWorkOrder({
      id: "1",
      asset: "HHPD",
      assetId: "a",
      factory: "F1",
      title: "Test",
      priority: "2 - High",
      description: "desc",
      recommendedActions: [{ step: "Inspect seals" }],
      spareRequirements: [{ part: "Seal kit", qty: 1, order_status: "in stock" }],
      estimatedDurationHrs: 4,
      safetyNotes: "LOTO",
      status: "open",
      source: "ai",
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(wo.spareRequirements[0]).toBe("Seal kit — qty 1 — in stock");
    expect(wo.recommendedActions[0]).toBe("Inspect seals");
  });

  it("passes through string spare lines", () => {
    expect(formatSpareRequirement("Gasket — qty 1 — order")).toBe("Gasket — qty 1 — order");
  });

  it("formats action objects with action key", () => {
    expect(formatWorkOrderAction({ action: "Replace filter" })).toBe("Replace filter");
  });
});
