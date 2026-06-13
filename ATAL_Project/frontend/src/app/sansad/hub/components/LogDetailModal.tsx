"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import type { LogEntry } from "@/services/types";

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

export default function LogDetailModal({
  log,
  onClose,
}: LogDetailModalProps) {
  if (!log) return null;

  const isCritical = log.text.includes("CRITICAL") || log.text.includes("fatigue") || log.text.includes("risk") || log.text.includes("extreme");
  const isWarning = log.text.includes("WARNING") || log.text.includes("drift") || log.text.includes("vibration");

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 animate-in fade-in duration-200 cursor-default"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-zinc-200/80 rounded-3xl p-10 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Indicators */}
        <div className="absolute top-3.5 left-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>
        <div className="absolute bottom-3.5 right-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>

        <div className="flex justify-between items-start border-b border-zinc-150 pb-5 mb-6">
          <div>
            <span className="font-mono text-sm font-bold text-[#f97316] uppercase tracking-[0.2em]">[{log.time}] SYSTEM LOG</span>
            <h3 className="text-4xl lg:text-5xl font-black text-[#1b253c] uppercase mt-1 leading-tight" style={{ fontFamily: "var(--font-questrial)" }}>
              {log.module}
            </h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider shrink-0 ${
            isCritical
              ? "text-rose-600 bg-rose-50 border-rose-200/50 animate-pulse"
              : isWarning
                ? "text-amber-600 bg-amber-50 border-amber-200/50"
                : "text-emerald-600 bg-emerald-50 border-emerald-200/50"
          }`}>
            {isCritical ? "critical" : isWarning ? "warning" : "info"}
          </div>
        </div>

        {/* Detailed Log Statement container */}
        <div className="bg-[#FAF9F5] p-8 rounded-2xl border border-zinc-150 mb-8 select-text">
          <span className="block font-mono text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider mb-2 select-none">Log Statement</span>
          <p className="text-xl lg:text-2xl font-bold leading-relaxed text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
            {log.text}
          </p>
        </div>

        {/* Simulated Recommendation context based on text/severity */}
        <div className={`p-6 rounded-2xl border flex items-start gap-4 select-none mb-8 ${
          isCritical
            ? "bg-rose-50 border-rose-100 text-rose-950"
            : isWarning
              ? "bg-amber-50 border-amber-100 text-amber-950"
              : "bg-emerald-50 border-emerald-100 text-emerald-950"
        }`}>
          {isCritical ? (
            <ShieldAlert className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
          ) : isWarning ? (
            <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500 mt-0.5" />
          ) : (
            <CheckCircle className="w-6 h-6 shrink-0 text-emerald-500 mt-0.5" />
          )}
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider block text-zinc-500">Recommended SOP Action</span>
            <p className="text-sm mt-1.5 leading-relaxed font-sans font-medium">
              {isCritical
                ? "CRITICAL INCIDENT: Telemetry loop has registered severe anomalous operation. Inspect target device immediately, verify standby device engagement, and notify the site operations command."
                : isWarning
                  ? "WARNING ALARM: System parameter drift observed. Perform secondary calibration checks, flag the physical components in the asset manager database, and monitor telemetry on the next shift cycle."
                  : "NOMINAL STATUS: System diagnostics operating within normal boundaries. No intervention required. Logs successfully routed to Manas vector database."}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-zinc-400 border-t border-zinc-150 pt-5">
          <span>Telemetry Timestamp: {log.time}</span>
          <button
            onClick={onClose}
            className="h-9 px-5 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl transition-all duration-300 font-bold uppercase text-[10px] cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
