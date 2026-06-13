import type { RiskAsset } from "./types";

export interface RulPredictionData {
  title: string;
  badgeText: string;
  badgeType: "critical" | "warning" | "healthy" | "info";
  subtext: string;
  iconBgColor: string;
}

export function getRiskAssets(): RiskAsset[] {
  return [
    {
      id: "risk-1",
      name: "F1-EQ09 Exhauster Bearing",
      score: 97,
      urgency: "CRITICAL",
      impact: "Total Coke Gas flow bottleneck. High cascade risk: downstream blast furnace gas injection failure within 14 days.",
      sparesAvailable: true,
      downtimeHours: 6,
      recommendation: "Purchase order approved. Schedule replacement on the upcoming Tuesday afternoon outage window.",
    },
    {
      id: "risk-2",
      name: "F2-EQ04 Drive Sprocket",
      score: 81,
      urgency: "HIGH",
      impact: "Sintering strand speed degradation. Potential 15% throughput loss in iron ore burden feeding.",
      sparesAvailable: false,
      downtimeHours: 12,
      recommendation: "Spares on backorder (estimated delivery 5 days). Implement speed cap limits on strand A.",
    },
    {
      id: "risk-3",
      name: "F2-EQ09 Waste Gas Fan Impeller",
      score: 54,
      urgency: "MEDIUM",
      impact: "Minor emission regulation drift. Low process impact. Secondary ventilation loop redundancy matches spec.",
      sparesAvailable: true,
      downtimeHours: 4,
      recommendation: "Add to inspection task list for regular check. Keep monitoring vibration spectral alarms.",
    },
    {
      id: "risk-4",
      name: "F1-EQ11 Electrostatic Precipitator",
      score: 22,
      urgency: "LOW",
      impact: "Negligible process risk. Collector grid capacity operating at 92%. Nominal redundant plates clean.",
      sparesAvailable: true,
      downtimeHours: 2,
      recommendation: "Schedule clean-out during standard monthly preventive maintenance cycle.",
    },
  ];
}

export function getRiskAssetById(id: string): RiskAsset | undefined {
  const assets = getRiskAssets();
  return assets.find((a) => a.id === id);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-rose-500";
  if (score >= 50) return "text-amber-500";
  if (score >= 25) return "text-yellow-500";
  return "text-green-500";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-rose-500/20";
  if (score >= 50) return "bg-amber-500/20";
  if (score >= 25) return "bg-yellow-500/20";
  return "bg-green-500/20";
}

export function getManasPredictions(): RulPredictionData[] {
  return [
    {
      title: "BF Taphole Drill",
      badgeText: "RUL: 14d",
      badgeType: "critical",
      subtext: "Degradation Rate: Fast • Risk: High",
      iconBgColor: "#3b82f6",
    },
    {
      title: "HSM Roller Coiler",
      badgeText: "RUL: 45d",
      badgeType: "healthy",
      subtext: "Degradation Rate: Normal • Risk: Low",
      iconBgColor: "#22c55e",
    },
    {
      title: "BOF Lance Motor",
      badgeText: "RUL: 8d",
      badgeType: "critical",
      subtext: "Degradation Rate: Accelerated • Risk: High",
      iconBgColor: "#ef4444",
    },
    {
      title: "Sinter Exhaust Blower",
      badgeText: "RUL: 120d",
      badgeType: "healthy",
      subtext: "Degradation Rate: Minimal • Risk: Normal",
      iconBgColor: "#eab308",
    },
  ];
}
