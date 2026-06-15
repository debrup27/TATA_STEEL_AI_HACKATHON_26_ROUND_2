import { apiJson, getAccessToken } from "@/lib/api";
import { getDemoManasPredictions } from "@/lib/landing-demo";
import { mapRiskAsset, type BackendRankedAsset } from "@/lib/mappers";
import type { RiskAsset } from "./types";

export interface RulPredictionData {
  title: string;
  badgeText: string;
  badgeType: "critical" | "warning" | "healthy" | "info";
  subtext: string;
  iconBgColor: string;
}

export async function fetchRiskAssets(): Promise<RiskAsset[]> {
  const res = await apiJson<{ ranked_assets: BackendRankedAsset[] }>(
    "/api/v1/plant/bottleneck-score/",
    { method: "POST", body: "{}" },
  );
  return res.ranked_assets.map((r, i) => mapRiskAsset(r, i));
}

export interface RiskInlineInsight {
  insight: string;
  insight_angle: string;
  router: string;
}

export async function fetchRiskBottleneckInsight(
  assetId: string,
  bottleneckRank?: number,
): Promise<RiskInlineInsight> {
  return apiJson(`/api/v1/plant/bottleneck-score/${assetId}/insight/`, {
    method: "POST",
    body: JSON.stringify({ bottleneck_rank: bottleneckRank ?? 1 }),
  });
}

/** @deprecated Use fetchRiskAssets */
export function getRiskAssets(): RiskAsset[] {
  return [];
}

export function getRiskAssetById(id: string, assets: RiskAsset[]): RiskAsset | undefined {
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

export async function fetchManasPredictions(): Promise<RulPredictionData[]> {
  if (!getAccessToken()) {
    return getDemoManasPredictions();
  }
  const assets = await fetchRiskAssets();
  return assets.slice(0, 6).map((a) => ({
    title: a.name,
    badgeText: `Score: ${a.score}`,
    badgeType:
      a.urgency === "CRITICAL"
        ? "critical"
        : a.urgency === "HIGH"
          ? "warning"
          : "healthy",
    subtext: `${a.urgency} · ${a.recommendation.slice(0, 60)}…`,
    iconBgColor:
      a.urgency === "CRITICAL"
        ? "#ef4444"
        : a.urgency === "HIGH"
          ? "#f97316"
          : "#22c55e",
  }));
}

/** @deprecated Use fetchManasPredictions */
export function getManasPredictions(): RulPredictionData[] {
  return getDemoManasPredictions();
}
