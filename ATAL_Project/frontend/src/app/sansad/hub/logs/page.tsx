"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import { useMockTelemetryLogs } from "@/hooks";
import {
  buildLogModuleFilters,
  buildValidAssetModuleSet,
  logModuleFilterLabel,
  type AssetAliasRow,
} from "@/lib/assetAliases";
import { apiList } from "@/lib/api";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { getLogSeverity } from "@/lib/logSeverity";
import { SystemLogControls } from "../components/SystemLogControls";
import AnomalyTripControl from "../components/AnomalyTripControl";
import type { LogEntry } from "@/services/types";

const LogEntryCard = React.memo(function LogEntryCard({ 
  log, 
  onSelect 
}: { 
  log: LogEntry; 
  onSelect: (log: LogEntry) => void;
}) {
  const severity = getLogSeverity(log.text);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";
  
  let cardStyle = "bg-white border-zinc-200/80 hover:border-[#4A582E] hover:bg-zinc-50/40 text-zinc-700";
  let badgeColor = "text-zinc-600 bg-zinc-100/80 border-zinc-200/60";
  let indicatorIcon = <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />;
  
  if (isCritical) {
    cardStyle = "bg-rose-50/20 border-rose-200 hover:border-rose-400 hover:bg-rose-50/40 text-rose-700 font-semibold";
    badgeColor = "text-rose-600 bg-rose-50 border-rose-200/50";
    indicatorIcon = <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />;
  } else if (isWarning) {
    cardStyle = "bg-amber-50/25 border-amber-200 hover:border-amber-400 hover:bg-amber-50/40 text-amber-700";
    badgeColor = "text-amber-600 bg-amber-50 border-amber-200/50";
    indicatorIcon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
  }

  return (
    <div 
      onClick={() => onSelect(log)}
      className={`flex gap-4 items-start border rounded-2xl p-5 transition-colors duration-200 cursor-pointer group/log ${cardStyle}`}
    >
      {indicatorIcon}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2 select-none">
          <span className="text-sm font-semibold font-mono text-zinc-400 group-hover/log:text-zinc-500 transition-colors duration-300">[{log.time}]</span>
          <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all duration-300 ${badgeColor}`}>
            {log.module}
          </span>
        </div>
        <span 
          className="text-base leading-relaxed break-words font-medium block"
          style={{ fontFamily: "var(--font-questrial)" }}
        >
          {log.text}
        </span>
      </div>
    </div>
  );
});

export default function LogsConsolePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState("ALL MODULES");
  const [isLive, setIsLive] = useState(true);
  const [activeLogForModal, setActiveLogForModal] = useState<LogEntry | null>(null);
  const [catalogAssets, setCatalogAssets] = useState<AssetAliasRow[]>([]);

  const { logs, clear, status: logStreamStatus } = useMockTelemetryLogs(2500, 50, isLive);

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void apiList<AssetAliasRow>("/api/v1/assets/")
      .then((rows) => {
        if (!cancelled) setCatalogAssets(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalogAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Debounce search query to prevent render jitter and save resources
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchLoading(true);
    const delay = searchQuery === "" ? SEARCH_DEBOUNCE_MS : 400;
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setSearchLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Autoscroll watcher (only while live)
  useEffect(() => {
    if (!isLive || !logContainerRef.current) return;
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs, isLive]);

  const validModules = useMemo(
    () => buildValidAssetModuleSet(catalogAssets),
    [catalogAssets],
  );

  const modulesList = useMemo(
    () => buildLogModuleFilters(logs.map((log) => log.module), validModules),
    [logs, validModules],
  );

  const activeModule = modulesList.includes(selectedModule) ? selectedModule : "ALL MODULES";

  // Filtering logic
  const filteredLogs = logs.filter((log) => {
    const matchesModule = activeModule === "ALL MODULES" || log.module === activeModule;
    const matchesSearch = log.text.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
                          log.module.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  const criticalLogsCount = logs.filter((log) => getLogSeverity(log.text) === "critical").length;
  const warningLogsCount = logs.filter((log) => getLogSeverity(log.text) === "warning").length;

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
              SYSTEM LOG<br />STREAM CONSOLE
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Expanded Live Stream Console
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to inspect expanded system telemetry.</p>
            <Link href="/sansad/hub" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Console
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          {/* Left Gutter Vertical Marquee (8vw width) */}
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("SANSAD").concat(Array(6).fill("SANSAD")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Gutter Vertical Marquee (8vw width) */}
          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("ATAL").concat(Array(6).fill("ATAL")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Centered partitioned area spanning exactly 84vw */}
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] min-h-0">
            <div className="shrink-0 border-b border-zinc-200 select-none">
            <div className="w-full flex items-center justify-between px-8 py-3">
              {/* Left Side: Back Button */}
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub" className="flex items-center select-none">
                  <div 
                    className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold" 
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>
              </div>

              {/* Center: Title and Subtitle */}
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  SYSTEM LOG STREAM CONSOLE
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Expanded Diagnostics & Real-Time Telemetry
                </span>
              </div>

              {/* Right Side: abnormality controls */}
              <div className="w-1/4 flex justify-end overflow-visible">
                <AnomalyTripControl />
              </div>
            </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:hidden [&::-webkit-scrollbar-thumb]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Split layout */}
            <div className="flex-1 flex gap-8 min-h-0">
              
              {/* Left Column: Diagnostics Statistics & Source Filter Panel */}
              <div className="w-[35%] h-full flex flex-col gap-6">
                
                {/* Stats panel card */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-2xl text-[#1b253c]">
                  <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                  <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                  <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2">CONSOLE METRICS</span>
                  <h2 className="text-4xl font-black uppercase leading-none mt-2 mb-6" style={{ fontFamily: "var(--font-questrial)" }}>
                    DIAGNOSTIC<br />TELEMETRY
                  </h2>

                  <div className="space-y-4 border-t pt-4 border-zinc-150">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Stream Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                        isLive ? "text-emerald-600 bg-emerald-50 border-emerald-200/50" : "text-amber-600 bg-amber-50 border-amber-200/50"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
                        {isLive ? "Live Sync" : "Paused"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Total Entries</span>
                      <span className="text-sm font-bold font-mono text-zinc-800">{logs.length} Logged</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Critical Alarms</span>
                      <span className={`text-sm font-bold font-mono ${criticalLogsCount > 0 ? "text-rose-600 font-extrabold" : "text-zinc-550"}`}>
                        {criticalLogsCount} Active
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Warnings</span>
                      <span className={`text-sm font-bold font-mono ${warningLogsCount > 0 ? "text-amber-600 font-extrabold" : "text-zinc-550"}`}>
                        {warningLogsCount} Total
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 border-t pt-4 border-zinc-150">
                    <SystemLogControls
                      isLive={isLive}
                      onToggleLive={() => setIsLive((v) => !v)}
                      onClear={clear}
                    />
                  </div>
                </div>

                {/* Filter sources card */}
                <div className="flex-1 bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-2xl text-[#1b253c]">
                  <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                  <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                  <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2">ASSET FILTERS</span>
                  <div className="flex-1 overflow-y-auto space-y-2 mt-3 scrollbar-none pr-1">
                    {modulesList.length <= 1 ? (
                      <p
                        className="text-xs text-zinc-450 italic px-2 py-3"
                        style={{ fontFamily: "var(--font-questrial)" }}
                      >
                        Asset filters populate from live alerts and maintenance events.
                      </p>
                    ) : (
                      modulesList.map((mod) => {
                      const isActive = activeModule === mod;
                      return (
                        <button
                          key={mod}
                          onClick={() => setSelectedModule(mod)}
                          className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer select-none ${
                            isActive 
                              ? "bg-[#4A582E] text-white" 
                              : "bg-[#FAF9F5] text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/50"
                          }`}
                          style={{ fontFamily: "var(--font-questrial)" }}
                        >
                          {logModuleFilterLabel(mod)}
                        </button>
                      );
                    })
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Console terminal display */}
              <div className="w-[65%] h-full flex flex-col gap-4 overflow-hidden bg-white border border-zinc-200 rounded-3xl p-8 relative hover:shadow-2xl transition-all duration-300">
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                {/* Filter/Search Row */}
                <div className="flex-shrink-0 flex items-center justify-between gap-4 border-b border-zinc-150 pb-4 mb-2 select-none">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text"
                      placeholder="Search log logs, severity keywords, or sources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#4A582E] text-[#1b253c] placeholder-zinc-400"
                      style={{ fontFamily: "var(--font-questrial)" }}
                    />
                  </div>
                </div>

                {/* Main scrollable logs box */}
                <div className="flex-1 min-h-0 relative bg-[#FAF9F5] border border-zinc-200/70 rounded-2xl p-6">
                  <div 
                    ref={logContainerRef}
                    className="sansad-scroll-styled h-full overflow-y-auto space-y-3 scroll-smooth pr-2 select-text"
                  >
                    {searchLoading ? (
                      <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 select-none animate-pulse">
                        <RefreshCw className="w-10 h-10 text-[#4A582E] animate-spin mb-3 opacity-80" />
                        <span className="block text-sm font-bold uppercase tracking-wider text-zinc-650" style={{ fontFamily: "var(--font-questrial)" }}>
                          {searchQuery === "" ? "Restoring Live Stream..." : "Filtering Telemetry Logs..."}
                        </span>
                        <span className="text-xs text-zinc-400 mt-1">
                          Re-indexing vector spaces and diagnostics logs cache.
                        </span>
                      </div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 select-none">
                        <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                        <span className="block text-sm font-bold uppercase tracking-wider text-zinc-650" style={{ fontFamily: "var(--font-questrial)" }}>
                          {logStreamStatus === "auth_required"
                            ? "Sign In Required"
                            : logStreamStatus === "error"
                              ? "Log API Unavailable"
                              : logs.length === 0 && !isLive
                                ? "Stream Paused"
                                : logs.length === 0
                                  ? "Awaiting System Alerts"
                                  : "No Diagnostic Matches"}
                        </span>
                        <span className="text-xs text-zinc-400 mt-1">
                          {logStreamStatus === "auth_required"
                            ? "Log in at /login (demo: tech_demo / TechDemo@123) then return here."
                            : logStreamStatus === "error"
                              ? "Could not load alerts, maintenance events, or reports from the backend."
                              : logs.length === 0 && !isLive
                                ? "Resume the stream to load alerts and maintenance events."
                                : logs.length === 0
                                  ? "Live alerts, maintenance events, and AI reports will appear here."
                                  : "No active logs match the selected search query or module filters."}
                        </span>
                      </div>
                    ) : (
                      filteredLogs.map((log) => (
                        <LogEntryCard key={log.id} log={log} onSelect={setActiveLogForModal} />
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal Dialog for detailed log view */}
      {activeLogForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-10 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Corner Indicators */}
            <div className="absolute top-3.5 left-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>
            <div className="absolute bottom-3.5 right-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>

            <div className="flex justify-between items-start border-b border-zinc-150 pb-5 mb-6">
              <div>
                <span className="font-mono text-sm font-bold text-[#f97316] uppercase tracking-[0.2em]">[{activeLogForModal.time}] SYSTEM LOG</span>
                <h3 className="text-4xl lg:text-5xl font-black text-[#1b253c] uppercase mt-1 leading-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  {activeLogForModal.module}
                </h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider shrink-0 ${
                activeLogForModal.text.includes("CRITICAL")
                  ? "text-rose-600 bg-rose-50 border-rose-200/55 animate-pulse"
                  : activeLogForModal.text.includes("WARNING")
                    ? "text-amber-600 bg-amber-50 border-amber-200/55"
                    : "text-emerald-600 bg-emerald-50 border-emerald-200/55"
              }`}>
                {activeLogForModal.text.includes("CRITICAL")
                  ? "critical"
                  : activeLogForModal.text.includes("WARNING")
                    ? "warning"
                    : "info"}
              </div>
            </div>

            {/* Detailed Log Statement container */}
            <div className="bg-[#FAF9F5] p-8 rounded-2xl border border-zinc-150 mb-8 select-text">
              <span className="block font-mono text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider mb-2 select-none">Log Statement</span>
              <p className="text-xl lg:text-2xl font-bold leading-relaxed text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                {activeLogForModal.text}
              </p>
            </div>

            {/* Simulated Recommendation context based on text/severity */}
            <div className={`p-6 rounded-2xl border flex items-start gap-4 select-none mb-8 ${
              activeLogForModal.text.includes("CRITICAL")
                ? "bg-rose-50 border-rose-100 text-rose-950"
                : activeLogForModal.text.includes("WARNING")
                  ? "bg-amber-50 border-amber-100 text-amber-950"
                  : "bg-emerald-50 border-emerald-100 text-emerald-950"
            }`}>
              {activeLogForModal.text.includes("CRITICAL") ? (
                <ShieldAlert className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
              ) : activeLogForModal.text.includes("WARNING") ? (
                <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500 mt-0.5" />
              ) : (
                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-500 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider block text-zinc-500">Recommended SOP Action</span>
                <p className="text-sm mt-1.5 leading-relaxed font-sans font-medium">
                  {activeLogForModal.text.includes("CRITICAL")
                    ? "CRITICAL INCIDENT: Telemetry loop has registered severe anomalous operation. Inspect target device immediately, verify standby device engagement, and notify the site operations command."
                    : activeLogForModal.text.includes("WARNING")
                      ? "WARNING ALARM: System parameter drift observed. Perform secondary calibration checks, flag the physical components in the asset manager database, and monitor telemetry on the next shift cycle."
                      : "NOMINAL STATUS: System diagnostics operating within normal boundaries. No intervention required. Logs successfully routed to Manas vector database."}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono text-zinc-400 border-t border-zinc-150 pt-5">
              <span>Telemetry Timestamp: {activeLogForModal.time}</span>
              <button 
                onClick={() => setActiveLogForModal(null)}
                className="h-11 px-8 bg-[#1b253c] hover:bg-[#f97316] hover:scale-105 active:scale-95 text-white rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer transition-all duration-300 shadow-md"
                style={{ fontFamily: "var(--font-pixeloid)" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
