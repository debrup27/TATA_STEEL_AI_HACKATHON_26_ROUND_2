"use client";

import React, { useState, useEffect } from "react";
import HubShell from "../components/HubShell";
import { fetchActionPlans, triggerConsolidationAsync, fetchConsolidationResult } from "@/services/actionPlans";
import type { MaintenanceActionPlan } from "@/services/sansadOutputs";
import { riskLevelColor } from "@/services/sansadOutputs";
import { CheckCircle2, ClipboardList, Eye, Wrench, Loader2, RefreshCw } from "lucide-react";

export default function MaintenanceActionsPage() {
  const [plans, setPlans] = useState<MaintenanceActionPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  const loadPlans = () => {
    setLoading(true);
    return fetchActionPlans()
      .then((rows) => {
        setPlans(rows);
        if (rows[0] && !planId) setPlanId(rows[0].id);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load action plans"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const assetId = plan?.assetId;

  const handleGenerate = async () => {
    if (!assetId) return;
    setGenerating(true);
    setGenStatus("Starting consolidation…");
    try {
      const { task_id } = await triggerConsolidationAsync(assetId);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const result = await fetchConsolidationResult(task_id) as { status?: string; error?: string };
        if (result.status === "SUCCESS" || result.status === "success") {
          setGenStatus("Plan generated — refreshing…");
          await loadPlans();
          setGenStatus(null);
          return;
        }
        if (result.status === "FAILURE" || result.status === "failure") {
          setGenStatus(result.error ?? "Consolidation failed");
          return;
        }
        setGenStatus(`Orchestrating… (${i + 1}/30)`);
      }
      setGenStatus("Timed out — check backend logs");
    } catch (e) {
      setGenStatus(e instanceof Error ? e.message : "Consolidation trigger failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !plans.length) {
    return (
      <HubShell title="Maintenance Actions" subtitle="Loading action plans…">
        <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono uppercase">Fetching maintenance reports & spares</span>
        </div>
      </HubShell>
    );
  }

  if (error && !plan) {
    return (
      <HubShell title="Maintenance Actions" subtitle="Repair steps · immediate actions">
        <div className="text-center py-24 text-zinc-500 text-sm">{error}</div>
      </HubShell>
    );
  }

  if (!plan) {
    return (
      <HubShell title="Maintenance Actions" subtitle="No plans available">
        <div className="text-center py-24 text-zinc-500 text-sm">No maintenance action plans found for degraded assets.</div>
      </HubShell>
    );
  }

  return (
    <HubShell
      title="Maintenance Actions"
      subtitle="Repair steps · immediate actions · plans · monitoring · spares"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {plans.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                  planId === p.id ? "bg-[#1b253c] text-white border-[#1b253c]" : "bg-white border-zinc-200 text-zinc-600"
                }`}
              >
                {p.asset}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskLevelColor(plan.riskLevel)}`}>
                {plan.riskLevel}
              </span>
              <h2 className="text-xl font-black text-[#1b253c] mt-2" style={{ fontFamily: "var(--font-questrial)" }}>
                {plan.asset}
              </h2>
              <p className="text-xs text-zinc-500">{plan.factory}</p>
            </div>
            <div className="flex flex-col items-end gap-2 max-w-md">
              <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-xl p-3 italic">
                {plan.optimizedPlanSummary || "No optimized plan summary yet."}
              </p>
              {assetId && (
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void handleGenerate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-[#1b253c] text-white hover:bg-orange-500 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                  {generating ? "Generating…" : "Generate plan"}
                </button>
              )}
              {genStatus && <p className="text-[10px] font-mono text-zinc-400">{genStatus}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-orange-500" />
              <h2 className="text-sm font-black uppercase text-[#1b253c]">Immediate Actions</h2>
            </div>
            <ul className="space-y-2">
              {plan.immediateActions.length === 0 ? (
                <li className="text-sm text-zinc-400">No immediate actions in latest report.</li>
              ) : (
                plan.immediateActions.map((action, i) => (
                  <li key={action} className="flex gap-2 text-sm text-zinc-700">
                    <span className="text-orange-500 font-bold shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-black uppercase text-[#1b253c]">Step-by-Step Repair</h2>
            </div>
            <div className="space-y-3">
              {plan.steps.length === 0 ? (
                <p className="text-sm text-zinc-400">Run consolidation to populate repair steps.</p>
              ) : (
                plan.steps.map((step) => (
                  <div key={step.order} className="flex gap-4 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50">
                    <span className="flex items-center justify-center size-8 rounded-lg bg-[#1b253c] text-white text-sm font-black shrink-0">
                      {step.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800">{step.action}</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">⚠ {step.safety}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-400 shrink-0 self-center">{step.duration}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-violet-600" />
              <h2 className="text-sm font-black uppercase text-[#1b253c]">Long-Term Monitoring</h2>
            </div>
            <ul className="space-y-2">
              {plan.longTermMonitoring.map((m) => (
                <li key={m} className="text-sm text-zinc-600 flex gap-2">
                  <span className="text-violet-400">•</span>{m}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 lg:col-span-6 bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-sky-600" />
              <h2 className="text-sm font-black uppercase text-[#1b253c]">Spare Procurement Strategy</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-zinc-400 border-b border-zinc-100">
                  <th className="text-left py-2">Part</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-center py-2">Lead</th>
                  <th className="text-right py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {plan.spares.map((s) => (
                  <tr key={s.part} className="border-b border-zinc-50">
                    <td className="py-2.5 font-medium text-zinc-800">{s.part}</td>
                    <td className="text-center py-2.5">{s.qty}</td>
                    <td className="text-center py-2.5 font-mono text-xs">{s.leadDays}d</td>
                    <td className="text-right py-2.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        s.inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {s.inStock ? "Yes" : "Order"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HubShell>
  );
}
