import type { ProductionLineData } from "./types";

export interface FactoryTabData {
  id: string;
  label: string;
}

export function getFactoryTabs(): FactoryTabData[] {
  return [
    { id: "jamshedpur", label: "Jamshedpur" },
    { id: "kalinganagar", label: "Kalinganagar" },
    { id: "meramandali", label: "Meramandali" },
  ];
}

export function getProductionLines(factoryId: string): ProductionLineData[] {
  const all: Record<string, ProductionLineData[]> = {
    jamshedpur: [
      {
        name: "Blast Furnace A",
        statusText: "Steel Output Rate",
        type: "active",
        outputRate: "150 T/hr",
        iconBgColor: "#3b82f6",
      },
      {
        name: "Sinter Plant A",
        statusText: "Mill Speed Level",
        type: "normal",
        outputRate: "127 RPM",
        iconBgColor: "#22c55e",
      },
      {
        name: "Coke Oven Battery A",
        statusText: "Rolling Efficiency",
        type: "warning",
        outputRate: "89 T/hr",
        iconBgColor: "#eab308",
      },
      {
        name: "LMMF Section A",
        statusText: "Caster Utilization",
        type: "active",
        outputRate: "750 TPD",
        iconBgColor: "#8b5cf6",
      },
    ],
    kalinganagar: [
      {
        name: "Blast Furnace B",
        statusText: "Steel Output Rate",
        type: "active",
        outputRate: "132 T/hr",
        iconBgColor: "#3b82f6",
      },
      {
        name: "Sinter Plant B",
        statusText: "Mill Speed Level",
        type: "warning",
        outputRate: "98 RPM",
        iconBgColor: "#eab308",
      },
      {
        name: "Coke Oven Battery B",
        statusText: "Rolling Efficiency",
        type: "normal",
        outputRate: "76 T/hr",
        iconBgColor: "#22c55e",
      },
    ],
    meramandali: [
      {
        name: "Blast Furnace C",
        statusText: "Steel Output Rate",
        type: "warning",
        outputRate: "118 T/hr",
        iconBgColor: "#eab308",
      },
      {
        name: "Sinter Plant C",
        statusText: "Mill Speed Level",
        type: "critical",
        outputRate: "72 RPM",
        iconBgColor: "#ef4444",
      },
    ],
  };
  return all[factoryId] ?? [];
}

export function computeFactoryMetrics(targetOutput: number) {
  return {
    steelOutputRate: Math.round(150 * targetOutput),
    millSpeedLevel: (0.85 * targetOutput).toFixed(1),
    isHighPerformance: targetOutput >= 0.85,
  };
}
