"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Activity,
  Calendar,
  ShieldAlert,
  RefreshCw,
  TrendingDown,
  Gauge,
} from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import {
  fetchSamvidhaanDashboard,
  type SamvidhaanAssetGraph,
  type SamvidhaanDashboardData,
} from "@/services/samvidhaanGraphs";
import { SamvidhaanChart, SamvidhaanLabeledBars } from "../components/SamvidhaanChart";

const PROBLEM_GRAPH_FOCUS = [
  "RUL degradation & lifecycle prediction",
  "Abnormality detection & alert severity",
  "Maintenance mix & downtime (historic logs)",
  "Bottleneck urgency & fleet health",
];

export default function GraphsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SamvidhaanDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    void fetchSamvidhaanDashboard()
      .then((data) => {
        setDashboard(data);
        if (data.assets[0]) setActiveItemId(data.assets[0].id);
      })
      .catch(() => setError("Unable to load diagnostic graphs from backend."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSamvidhaanDashboard()
      .then((data) => {
        if (cancelled) return;
        setDashboard(data);
        if (data.assets[0]) setActiveItemId(data.assets[0].id);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load diagnostic graphs from backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assetTypes = useMemo(() => {
    if (!dashboard) return ["all"];
    const types = [...new Set(dashboard.assets.map((a) => a.assetType))].sort();
    return ["all", ...types];
  }, [dashboard]);

  const filteredItems = useMemo(() => {
    if (!dashboard) return [] as SamvidhaanAssetGraph[];
    return dashboard.assets.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.asset.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      const matchesType = selectedType === "all" || item.assetType === selectedType;
      return matchesSearch && matchesType;
    });
  }, [dashboard, searchQuery, selectedType]);

  const activeItem =
    filteredItems.find((i) => i.id === activeItemId) ??
    dashboard?.assets.find((i) => i.id === activeItemId) ??
    filteredItems[0] ??
    dashboard?.assets[0];

  const kpis = dashboard?.plantKpis;

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none"
    >
      {isMobile ? (
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />SAMVIDHAAN
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Diagnostic Graphs
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Open on desktop to view RUL, anomaly, and maintenance trend graphs.</p>
            <Link href="/sansad/hub/samvidhaan" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Command Center
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("GRAPHS").concat(Array(6).fill("GRAPHS")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("TRENDS").concat(Array(6).fill("TRENDS")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            <div className="w-full flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 select-none">
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub/samvidhaan" className="flex items-center select-none">
                  <div
                    className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold"
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  SAMVIDHAAN DIAGNOSTIC GRAPHS
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Hackathon KPIs · live telemetry · historic maintenance
                </span>
              </div>
              <div className="w-1/4 flex justify-end">
                <button
                  type="button"
                  onClick={loadDashboard}
                  className="h-10 px-4 bg-white border border-zinc-200 hover:border-[#f97316] text-zinc-600 rounded-xl flex items-center gap-2 text-xs font-bold uppercase cursor-pointer"
                  style={{ fontFamily: "var(--font-pixeloid)" }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-3">
              {PROBLEM_GRAPH_FOCUS.map((label) => (
                <div key={label} className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-[9px] font-mono uppercase tracking-wider text-zinc-500">
                  {label}
                </div>
              ))}
            </div>

            {error ? (
              <div className="flex-1 flex items-center justify-center text-sm text-rose-600 font-mono">{error}</div>
            ) : loading && !dashboard ? (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-400 font-mono animate-pulse">
                Loading plant diagnostics…
              </div>
            ) : (
              <div className="flex-1 flex gap-8 min-h-0">
                <div className="w-[42%] h-full flex flex-col gap-4 min-h-0">
                  <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col gap-3 shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search asset, code, diagnostic note..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#FAF9F5] border border-zinc-200 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none transition-all duration-200 font-semibold"
                      />
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assetTypes.map((mod) => (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => setSelectedType(mod)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            selectedType === mod
                              ? "bg-[#1b253c] text-white"
                              : "bg-[#FAF9F5] text-zinc-500 border border-zinc-200 hover:text-[#1b253c]"
                          }`}
                        >
                          {mod === "all" ? "All Assets" : mod}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none min-h-0">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-12 text-sm font-mono text-zinc-400">No assets in catalog match filters.</div>
                    ) : (
                      filteredItems.map((item) => {
                        const isActive = item.id === activeItem?.id;
                        const isCritical = item.healthScore < 50 || item.rulDays > 0 && item.rulDays < 21;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItemId(item.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                              isActive
                                ? "bg-[#1b253c] border-[#1b253c] shadow-md text-white"
                                : "bg-white border-zinc-200 hover:border-[#1b253c]"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                                {item.code}
                              </span>
                              <span className={`font-mono text-[10px] font-bold ${isCritical ? "text-red-400" : isActive ? "text-emerald-300" : "text-[#75864C]"}`}>
                                {item.rulDays > 0 ? `${item.rulDays}d RUL` : "RUL —"}
                              </span>
                            </div>
                            <h4 className={`text-base font-black uppercase truncate ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                              {item.asset}
                            </h4>
                            <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-zinc-100/10">
                              <span className={`text-[9px] font-mono font-bold uppercase ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                                Health {item.healthScore}%
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isCritical ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                                Urgency {item.urgencyScore}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex-1 h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden min-h-0">
                  <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                  <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                  {activeItem && dashboard ? (
                    <div className="flex flex-col h-full overflow-y-auto scrollbar-none gap-6">
                      <div className="flex justify-between items-start border-b pb-4 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-orange-500" />
                            <span className="font-mono text-sm font-black text-orange-500 tracking-wider">{activeItem.code}</span>
                          </div>
                          <h3 className="text-2xl font-black text-[#1b253c] uppercase mt-1 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                            {activeItem.asset}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-[#f97316] font-bold uppercase">
                          <Calendar className="w-3.5 h-3.5" />
                          {activeItem.date}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-600 leading-relaxed bg-[#FAF9F5] p-4 rounded-xl border border-zinc-150">
                        {activeItem.description}
                      </p>

                      <div className="grid grid-cols-4 gap-3 shrink-0">
                        <div className="bg-[#FAF9F5] border border-zinc-200 rounded-xl p-3">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">Plant Health</span>
                          <span className="text-lg font-black text-[#1b253c]">{kpis?.plant_health_score ?? "—"}%</span>
                        </div>
                        <div className="bg-[#FAF9F5] border border-zinc-200 rounded-xl p-3">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">Proactive Maint.</span>
                          <span className="text-lg font-black text-[#75864C]">{Math.round((kpis?.proactive_maintenance_rate ?? 0) * 100)}%</span>
                        </div>
                        <div className="bg-[#FAF9F5] border border-zinc-200 rounded-xl p-3">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">MTTR (30d)</span>
                          <span className="text-lg font-black text-[#1b253c]">{kpis?.mean_time_to_repair_hrs ?? "—"}h</span>
                        </div>
                        <div className="bg-[#FAF9F5] border border-zinc-200 rounded-xl p-3">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">Alarms (30d)</span>
                          <span className="text-lg font-black text-rose-600">{kpis?.total_alarms_30d ?? activeItem.alertCount30d}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SamvidhaanChart
                          title={`${activeItem.sensorLabel} Trend`}
                          subtitle={activeItem.thresholdLabel}
                          values={activeItem.conditionTrend}
                          stroke="#3b82f6"
                          fill="rgba(59, 130, 246, 0.08)"
                          valueSuffix="Problem §5.1 — condition monitoring"
                        />
                        <SamvidhaanChart
                          title="Health / RUL Degradation"
                          subtitle={activeItem.rulDays > 0 ? `${activeItem.rulDays} days remaining` : "RUL pending"}
                          values={activeItem.healthTrend}
                          stroke={activeItem.healthScore < 50 ? "#f43f5e" : "#75864C"}
                          fill={activeItem.healthScore < 50 ? "rgba(244, 63, 94, 0.08)" : "rgba(117, 134, 76, 0.08)"}
                          valueSuffix="Problem §5.1 — lifecycle prediction"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SamvidhaanLabeledBars
                          title="Historic Maintenance Mix"
                          items={dashboard.maintenanceMix}
                          barColor="#1b253c"
                        />
                        <SamvidhaanLabeledBars
                          title="Alert Severity (Fleet)"
                          items={dashboard.alertSeverityMix}
                          barColor="#f97316"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SamvidhaanChart
                          title="Fleet Health by Asset"
                          subtitle="Live twin scores"
                          values={dashboard.fleetHealth.map((f) => f.value)}
                          variant="bar"
                          stroke="#75864C"
                          valueSuffix="Problem §7 — equipment health dashboard"
                        />
                        <SamvidhaanChart
                          title="Bottleneck Urgency Index"
                          subtitle="Process criticality × delay × spares"
                          values={dashboard.urgencyRanking.map((u) => u.value)}
                          variant="bar"
                          stroke="#f43f5e"
                          valueSuffix="Problem §5.2 — prioritization"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-zinc-150 pt-5 shrink-0">
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Asset Health</span>
                          <span className={`block text-base font-black flex items-center gap-1.5 ${activeItem.healthScore < 50 ? "text-rose-600" : "text-zinc-800"}`}>
                            <Gauge className="w-4 h-4" />
                            {activeItem.healthScore}%
                          </span>
                        </div>
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Anomaly Score</span>
                          <span className="block text-sm font-bold text-zinc-700 font-mono flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4 text-amber-500" />
                            {activeItem.anomalyScore}%
                          </span>
                        </div>
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Risk Evaluation</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ShieldAlert className={`w-4 h-4 ${activeItem.urgencyScore >= 70 ? "text-rose-500" : "text-[#75864C]"}`} />
                            <span className="text-xs font-bold text-zinc-800 uppercase">Urgency {activeItem.urgencyScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
