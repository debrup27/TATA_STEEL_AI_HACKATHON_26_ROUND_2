import { apiJson } from "@/lib/api";

export interface CostAssetRow {
  asset_id: string;
  name: string;
  asset_type: string;
  loss_lakhs: number;
  savings_lakhs: number;
  rul_hours: number | null;
  risk_level: string;
  recovery_pct?: number;
  failure_probability?: number;
  downtime_h?: number;
  hourly_loss_lakh?: number;
}

export interface CostMethodology {
  loss_formula: string;
  savings_formula: string;
  pfail_formula: string;
  inputs: string;
  params: {
    loss_band_lakh: number[];
    savings_band_lakh: number[];
    criticality_bands: Record<string, { downtime_h: number; hourly_loss_lakh: number }>;
  };
}

export interface FactoryCostAnalysis {
  factory_id: string;
  factory: string;
  factory_code: string;
  factory_label: string;
  unit: string;
  predicted_loss_lakhs: number;
  pdm_savings_lakhs: number;
  net_benefit_lakhs: number;
  avg_failure_probability: number;
  recommended_label: string;
  assets: CostAssetRow[];
  summary: string;
  methodology?: CostMethodology;
  error?: string;
}

export interface CostAnalysisResponse {
  factories: FactoryCostAnalysis[];
  plant_totals: {
    predicted_loss_lakhs: number;
    pdm_savings_lakhs: number;
  };
}

export async function fetchCostAnalysis(factoryId?: string): Promise<CostAnalysisResponse> {
  const qs = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : "";
  return apiJson<CostAnalysisResponse>(`/api/v1/plant/cost-analysis/${qs}`);
}
