import type { Message } from "./types";

const STATIC_REPLIES = [
  "Analysis complete. Asset integrity levels are nominal. Predictive wear models estimate 1,200 run hours before replacement. Let me know if you would like me to schedule a diagnostic run.",
  "Furnace 3 telemetry check: Temperature gradient is within normal bounds. Core sensor report is nominal.",
  "No leakage detected. Pressure stability index is at 98.4%, indicating normal seal integrity.",
];

const WELCOME_MESSAGE = "Hi! I am Manas. Ask me anything about ATAL's assets or diagnostics.";

export function getWelcomeMessage(): Message {
  return { role: "assistant", content: WELCOME_MESSAGE };
}

export function getRagWelcomeMessage(docCount: number): Message {
  return {
    role: "assistant",
    content: `Hi! I have loaded the selected ${docCount} document(s) into my context. Ask me anything referencing their content.`,
  };
}

export function getRandomStaticReply(): string {
  return STATIC_REPLIES[Math.floor(Math.random() * STATIC_REPLIES.length)];
}

export function generateDemoReply(userMessage: string): string {
  const query = userMessage.toLowerCase();
  if (query.includes("status") || query.includes("check")) {
    return "System status checks: SYS_OK. Telemetry readings are nominal and stable across all furnace segments.";
  }
  if (query.includes("valve") || query.includes("flow")) {
    return "Optimal valve flow rate calculated at 240L/min. Command stages ready to execute.";
  }
  if (query.includes("ticket") || query.includes("generate")) {
    return "Ticket ATAL-889 generated successfully for turbine diagnostic inspections.";
  }
  return getRandomStaticReply();
}

export async function simulateProcessingSteps(
  stepCount: number,
  intervalMs: number,
  onStep: (stepIndex: number) => void,
): Promise<void> {
  for (let i = 0; i < stepCount; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    onStep(i);
  }
}

export function getPreloadedDocs() {
  return [
    { name: "Standard Operating Procedure - Blast Furnace F3.pdf", size: "2.4 MB" },
    { name: "Ladle Transfer Optimization Manual v2.pdf", size: "1.8 MB" },
    { name: "Exhauster Bearing Repair Guide - F1-EQ09.pdf", size: "4.1 MB" },
    { name: "Coke Oven Precipitator Calibration Logs.pdf", size: "920 KB" },
    { name: "Sinter Plant Maintenance Records - Q1 2026.pdf", size: "3.5 MB" },
  ];
}

export function getModulesList(): string[] {
  return [
    "ALL MODULES",
    "Sansad-Hub",
    "CokeOven-Agent",
    "Sinter-Agent",
    "ThermalCascade-Predictor",
    "LadleTransfer-Optimizer",
    "Calibration-Service",
  ];
}
