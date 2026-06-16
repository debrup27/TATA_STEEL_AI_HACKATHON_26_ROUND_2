"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, RefreshCw } from "lucide-react";
import HubShell from "../components/HubShell";
import { useHubManasNotify } from "../components/HubManasNotify";
import {
  fetchDiagnostics,
  fetchDiagnosticDetail,
  fetchRcaOverviewInsight,
  fetchDefectCorrelationInsight,
} from "@/services/diagnostics";
import type { DiagnosticAsset } from "@/services/sansadOutputs";
import { HUB_TICK_INTERVAL } from "@/services/telemetry";
import { deferEffect } from "@/lib/defer-effect";
import {
  Activity,
  AlertTriangle,
  GitBranch,
  Gauge,
  MessageCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

function sensorTone(status: string) {
  if (status === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-zinc-200 bg-zinc-50 text-zinc-800";
}

function healthTone(score: number) {
  if (score < 35) return "text-rose-600";
  if (score < 60) return "text-amber-600";
  return "text-emerald-600";
}

function PanelCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-zinc-200 rounded-3xl p-5 relative overflow-hidden ${className}`}>
      <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
      <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
      {children}
    </div>
  );
}

// MANAS insight card with pop-out modal (shared) — handles long responses that overflow inline.
import InsightPanel from "../components/ManasInsightPanel";
import HubMarkdown from "../components/HubMarkdown";

function formatRul(asset: DiagnosticAsset): { value: string; unit: string } {
  if (asset.rulHours != null && asset.rulHours > 0) return { value: asset.rulHours.toFixed(0), unit: "hours" };
  if (asset.rulDays != null && asset.rulDays > 0) return { value: String(Math.round(asset.rulDays * 24)), unit: "hours" };
  return { value: "—", unit: "" };
}

export default function DiagnosticsPage() {
  const { runManasCall } = useHubManasNotify();
  const [assets, setAssets] = useState<DiagnosticAsset[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rcaInsight, setRcaInsight] = useState<{ angle: string; text: string; router?: string } | null>(null);
  const [defectInsight, setDefectInsight] = useState<{ angle: string; text: string; router?: string } | null>(null);
  const [rcaLoading, setRcaLoading] = useState(false);
  const [defectLoading, setDefectLoading] = useState(false);

  const mergeAsset = useCallback((updated: DiagnosticAsset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const rows = await fetchDiagnostics();
      setAssets(rows);
      setError(null);
      return rows;
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load diagnostics");
      return null;
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const loadActive = useCallback(async (assetId: string) => {
    if (!assetId) return;
    try {
      const row = await fetchDiagnosticDetail(assetId);
      mergeAsset(row);
      setError(null);
    } catch {
      /* keep list snapshot */
    }
  }, [mergeAsset]);

  useEffect(() => {
    deferEffect(() => {
      void loadAll().then((rows) => {
        if (rows?.[0]) {
          setActiveId((current) => current || rows[0].id);
        }
      });
    });
  }, [loadAll]);

  useEffect(() => {
    if (!activeId) return;
    deferEffect(() => {
      void loadActive(activeId);
    });
    const interval = setInterval(() => {
      void loadActive(activeId);
    }, HUB_TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [activeId, loadActive]);

  useEffect(() => {
    const interval = setInterval(() => void loadAll(true), HUB_TICK_INTERVAL * 3);
    return () => clearInterval(interval);
  }, [loadAll]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.factory.toLowerCase().includes(q) ||
        a.stage.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const asset =
    assets.find((a) => a.id === activeId) ??
    (activeId ? undefined : filteredAssets[0] ?? assets[0]);

  const selectAsset = (id: string) => {
    setActiveId(id);
    setRcaInsight(null);
    setDefectInsight(null);
    setError(null);
  };

  const askRcaInsight = async () => {
    if (!asset) return;
    setRcaLoading(true);
    setRcaInsight(null);
    const res = await runManasCall(
      `RCA insight — ${asset.name}`,
      () => fetchRcaOverviewInsight(asset.id),
      {
        pendingDetail: "Generating root-cause overview…",
        validate: (r) => Boolean(r.insight?.trim()),
        emptyDetail: "MANAS returned an empty insight — retry in a moment",
        successDetail: "Root-cause insight is ready below",
      },
    );
    if (res?.insight?.trim()) {
      setRcaInsight({ angle: res.insight_angle, text: res.insight, router: res.router });
      setError(null);
    } else if (!res) {
      setError("MANAS returned an empty insight — retry in a moment");
    }
    setRcaLoading(false);
  };

  const askDefectInsight = async () => {
    if (!asset) return;
    setDefectLoading(true);
    setDefectInsight(null);
    const res = await runManasCall(
      `Defect correlation — ${asset.name}`,
      () => fetchDefectCorrelationInsight(asset.id),
      {
        pendingDetail: "Analyzing defect correlations…",
        validate: (r) => Boolean(r.insight?.trim()),
        emptyDetail: "MANAS returned an empty insight — retry in a moment",
        successDetail: "Defect correlation insight is ready below",
      },
    );
    if (res?.insight?.trim()) {
      setDefectInsight({ angle: res.insight_angle, text: res.insight, router: res.router });
      setError(null);
    } else if (!res) {
      setError("MANAS returned an empty insight — retry in a moment");
    }
    setDefectLoading(false);
  };

  const isNormal = asset?.isNormalOperation ?? false;
  const hasDiagnosis = Boolean(asset?.probableFault?.trim());
  const hasConfidence = (asset?.faultConfidence ?? 0) > 0 && !isNormal;
  const rul = asset ? formatRul(asset) : { value: "—", unit: "" };

  // Single stable shell across loading/empty/loaded — keeps the back button and
  // header from flickering on first load; constant subtitle, only the body swaps.
  return (
    <HubShell title="Diagnostics & Prediction" subtitle="Live ML inference · RCA · RUL · cross-stage defects">
      {loading || (!asset && activeId) ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono uppercase">Fetching ML inference & health data</span>
        </div>
      ) : !asset ? (
        <p className="text-center text-zinc-500 text-sm py-24">No assets available.</p>
      ) : (
      <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex-1 min-h-0 flex gap-5">
        {/* Left — component list */}
        <div className="w-[30%] min-w-[240px] max-w-[320px] flex flex-col gap-3 shrink-0">
          <PanelCard className="shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                Components
              </span>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-orange-600 cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-3 py-2 bg-[#FAF9F5] border border-zinc-200 rounded-xl text-[11px] font-semibold focus:outline-none focus:border-[#4A582E]"
              />
            </div>
          </PanelCard>

          <PanelCard className="flex-1 min-h-0 flex flex-col !p-3">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {filteredAssets.map((a) => {
                const active = a.id === activeId;
                const nominal = a.isNormalOperation;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAsset(a.id)}
                    className={`w-full text-left rounded-xl px-3 py-2 border transition-all cursor-pointer ${
                      active
                        ? "bg-[#4A582E] text-white border-[#4A582E]"
                        : "bg-[#FAF9F5] text-zinc-700 border-zinc-200/80 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase truncate">{a.name}</p>
                    <p className={`text-[9px] font-mono mt-0.5 truncate ${active ? "text-white/70" : "text-zinc-400"}`}>
                      {nominal ? "Nominal" : "Fault active"} · {a.health}%
                    </p>
                  </button>
                );
              })}
            </div>
          </PanelCard>
        </div>

        {/* Right — detail */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
          {error && (
            <div className="shrink-0 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="shrink-0 flex justify-between items-end border-b border-zinc-200 pb-2">
            <div>
              <h2 className="text-xl font-black uppercase text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                {asset.name}
              </h2>
              <p className="text-[10px] font-mono text-zinc-400 uppercase">{asset.factory} · {asset.stage}</p>
            </div>
            <p className={`text-2xl font-black ${healthTone(asset.health)}`}>{asset.health}%</p>
          </div>

          {asset.earlyWarning && (
            <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-sm text-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <HubMarkdown className="text-sm text-rose-900 [&_p]:my-0">{asset.earlyWarning}</HubMarkdown>
            </div>
          )}

          <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 auto-rows-fr">
            {/* Fault */}
            <PanelCard className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-sky-600" />
                <h3 className="text-[11px] font-black uppercase text-[#1b253c]">Probable Fault Diagnosis</h3>
              </div>
              {hasDiagnosis ? (
                <>
                  <HubMarkdown className="text-base font-semibold text-zinc-800 leading-snug [&_p]:my-0">
                    {asset.probableFault}
                  </HubMarkdown>
                  {hasConfidence && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${asset.faultConfidence * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-sky-700">
                        {Math.round(asset.faultConfidence * 100)}%
                      </span>
                    </div>
                  )}
                  {isNormal && (
                    <p className="text-[10px] text-emerald-600 font-mono uppercase mt-2">No active fault pathway</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-400">Awaiting ML inference.</p>
              )}
            </PanelCard>

            {/* RUL — compact, no scroll */}
            <PanelCard className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h3 className="text-[11px] font-black uppercase text-[#1b253c]">RUL Prediction</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                  {rul.value}
                </span>
                {rul.unit && <span className="text-sm font-bold text-zinc-400 mb-0.5">{rul.unit}</span>}
              </div>
              {asset.sensors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {asset.sensors.map((s) => (
                    <div key={s.label} className={`rounded-lg px-2 py-1 border text-[10px] ${sensorTone(s.status)}`}>
                      <span className="font-bold uppercase opacity-70">{s.label}: </span>
                      <span className="font-mono">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* RCA */}
            <PanelCard className="flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <h3 className="text-[11px] font-black uppercase text-[#1b253c]">Root Cause Analysis</h3>
                </div>
                {!isNormal && asset.rootCauses.length > 0 && (
                  <button
                    type="button"
                    disabled={rcaLoading}
                    onClick={() => void askRcaInsight()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border border-orange-200 text-orange-600 bg-white hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                  >
                    {rcaLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    Ask MANAS
                  </button>
                )}
              </div>

              {isNormal ? (
                <p className="text-sm text-zinc-500" style={{ fontFamily: "var(--font-questrial)" }}>
                  Equipment is in normal operation — root cause analysis is not applicable until a fault is detected.
                </p>
              ) : asset.rootCauses.length === 0 ? (
                <p className="text-sm text-zinc-400">Fault active — run consolidation to populate ranked causes.</p>
              ) : (
                <div className="space-y-2">
                  {asset.rootCauses.map((rc, i) => (
                    <div key={`${rc.factor}-${i}`} className="rounded-lg border border-zinc-200 bg-[#FAF9F5] px-3 py-2">
                      <div className="flex justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-800">{rc.factor}</p>
                        <span className="text-[10px] font-mono text-sky-600">{Math.round(rc.weight * 100)}%</span>
                      </div>
                      <div className="h-1 bg-zinc-200 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-sky-400/80 rounded-full" style={{ width: `${rc.weight * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rcaLoading ? (
                <InsightPanel title="MANAS — Operational insight" loading />
              ) : rcaInsight?.text ? (
                <InsightPanel title={`MANAS — ${rcaInsight.angle}`} text={rcaInsight.text} />
              ) : null}
            </PanelCard>

            {/* Process defects */}
            <PanelCard className="flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-violet-600" />
                  <h3 className="text-[11px] font-black uppercase text-[#1b253c]">Process Defect Correlation</h3>
                </div>
                {!isNormal && asset.processDefects.length > 0 && (
                  <button
                    type="button"
                    disabled={defectLoading}
                    onClick={() => void askDefectInsight()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border border-orange-200 text-orange-600 bg-white hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                  >
                    {defectLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    Ask MANAS
                  </button>
                )}
              </div>

              {isNormal ? (
                <p className="text-sm text-zinc-500" style={{ fontFamily: "var(--font-questrial)" }}>
                  No cross-stage defect correlation while the asset is operating normally.
                </p>
              ) : asset.processDefects.length === 0 ? (
                <p className="text-sm text-zinc-400">No significant upstream deviations in the 24h window.</p>
              ) : (
                <div className="space-y-2">
                  {asset.processDefects.map((d) => (
                    <div key={`${d.stage}-${d.defect}`} className="rounded-lg border border-violet-100 bg-violet-50/50 p-2.5 border-l-[3px] border-l-violet-400">
                      <p className="text-[9px] font-bold uppercase text-violet-600">{d.stage}</p>
                      <p className="text-xs font-semibold text-zinc-800 mt-0.5">{d.defect}</p>
                      <p className="text-[10px] text-zinc-500 italic">{d.link}</p>
                    </div>
                  ))}
                </div>
              )}

              {defectLoading ? (
                <InsightPanel title="MANAS — Operational insight" loading />
              ) : defectInsight?.text ? (
                <InsightPanel title={`MANAS — ${defectInsight.angle}`} text={defectInsight.text} />
              ) : null}
            </PanelCard>
          </div>
        </div>
      </div>
      </div>
      )}
    </HubShell>
  );
}
