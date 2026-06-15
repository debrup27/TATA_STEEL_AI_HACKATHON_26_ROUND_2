"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TrendingDown, TrendingUp, Wallet, Loader2, Info, X, Sparkles } from "lucide-react";
import {
  fetchCostAnalysis,
  type CostAnalysisResponse,
  type FactoryCostAnalysis,
} from "@/services/costAnalysis";

const REFRESH_MS = 30_000;

function lakh(n: number): string {
  return `₹${n.toFixed(1)} L`;
}

function CostExplainerModal({ f, onClose }: { f: FactoryCostAnalysis; onClose: () => void }) {
  const m = f.methodology;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[82vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-orange-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <p className="text-xs font-black uppercase text-orange-700 tracking-wider">
              MANAS — How {f.factory_label} cost is calculated
            </p>
          </div>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 text-sm text-zinc-700">
          {m ? (
            <>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Predicted loss (no action)</p>
                <p className="leading-relaxed">{m.loss_formula}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Savings with PdM</p>
                <p className="leading-relaxed">{m.savings_formula}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Failure probability</p>
                <p className="leading-relaxed font-mono text-xs">{m.pfail_formula}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Inputs</p>
                <p className="leading-relaxed">{m.inputs}</p>
              </div>
            </>
          ) : null}
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">Per-asset breakdown (this factory)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase text-zinc-400 border-b border-zinc-100">
                  <th className="text-left py-1.5">Asset</th>
                  <th className="text-center py-1.5">Risk</th>
                  <th className="text-center py-1.5">P(fail)</th>
                  <th className="text-center py-1.5">Recover</th>
                  <th className="text-right py-1.5">Loss → Save</th>
                </tr>
              </thead>
              <tbody>
                {f.assets.map((a) => (
                  <tr key={a.asset_id} className="border-b border-zinc-50">
                    <td className="py-1.5 font-medium text-zinc-700 truncate max-w-[40%]">{a.name}</td>
                    <td className="text-center py-1.5">{a.risk_level}</td>
                    <td className="text-center py-1.5 font-mono">{a.failure_probability ?? "—"}</td>
                    <td className="text-center py-1.5 font-mono">{a.recovery_pct != null ? `${a.recovery_pct}%` : "—"}</td>
                    <td className="text-right py-1.5 font-mono">
                      <span className="text-rose-500">{lakh(a.loss_lakhs)}</span> → <span className="text-emerald-600">{lakh(a.savings_lakhs)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FactoryCostCard({ f }: { f: FactoryCostAnalysis }) {
  const [explain, setExplain] = useState(false);
  if (f.error) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">
            {f.factory_label}
          </p>
          <h3
            className="text-base font-black uppercase text-[#1b253c]"
            style={{ fontFamily: "var(--font-questrial)" }}
          >
            Predictive Cost Analysis
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExplain(true)}
            className="flex items-center gap-1 text-[9px] font-bold uppercase text-orange-600 hover:text-orange-800 cursor-pointer"
            title="How is this calculated?"
          >
            <Info className="w-3.5 h-3.5" /> How?
          </button>
          <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-[#1b253c] text-white">
            {f.recommended_label}
          </span>
        </div>
      </div>
      {explain && <CostExplainerModal f={f} onClose={() => setExplain(false)} />}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col gap-1">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 font-bold">
            Loss if no action
          </span>
          <span className="text-xl font-black text-rose-600" style={{ fontFamily: "var(--font-questrial)" }}>
            {lakh(f.predicted_loss_lakhs)}
          </span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-1">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-500 font-bold">
            Savings with PdM
          </span>
          <span className="text-xl font-black text-emerald-600" style={{ fontFamily: "var(--font-questrial)" }}>
            {lakh(f.pdm_savings_lakhs)}
          </span>
        </div>
        <div className="bg-[#FAF9F5] border border-zinc-150 rounded-xl p-3 flex flex-col gap-1">
          <Wallet className="w-4 h-4 text-zinc-400" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            Net benefit
          </span>
          <span className="text-xl font-black text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
            {lakh(f.net_benefit_lakhs)}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed mt-3">{f.summary}</p>

      {f.assets.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-3 space-y-1.5">
          {f.assets.slice(0, 4).map((a) => (
            <div key={a.asset_id} className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-zinc-700 truncate max-w-[45%]">{a.name}</span>
              <span className="font-mono text-rose-500">−{lakh(a.loss_lakhs)}</span>
              <span className="font-mono text-emerald-600">+{lakh(a.savings_lakhs)}</span>
              <span className="font-mono text-zinc-400">
                {a.rul_hours != null ? `${Math.round(a.rul_hours)}h RUL` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CostAnalysisPanel({ factoryId }: { factoryId?: string }) {
  const [data, setData] = useState<CostAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchCostAnalysis(factoryId);
        if (!cancelled) setData(res);
      } catch {
        /* keep last good data */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [factoryId]);

  if (loading && !data) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center gap-2 text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-mono uppercase">Computing predictive cost analysis…</span>
      </div>
    );
  }

  const factories = (data?.factories ?? []).filter((f) => !f.error);
  if (factories.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-black uppercase text-zinc-600 tracking-wider">
          Predictive Loss vs Savings
        </h2>
        {data?.plant_totals && (
          <span className="text-[10px] font-mono text-zinc-400">
            Plant: <span className="text-rose-500">−{lakh(data.plant_totals.predicted_loss_lakhs)}</span>{" "}
            / <span className="text-emerald-600">+{lakh(data.plant_totals.pdm_savings_lakhs)}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factories.map((f) => (
          <FactoryCostCard key={f.factory_id} f={f} />
        ))}
      </div>
    </div>
  );
}
