"use client";

import React, { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import type { LogEntry } from "@/services/types";
import { fetchLogInsight } from "@/services/telemetry";
import { getLogSeverity } from "@/lib/logSeverity";
import { useHubManasNotify } from "./HubManasNotify";
import ManasInsightPanel from "./ManasInsightPanel";

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

export default function LogDetailModal({
  log,
  onClose,
}: LogDetailModalProps) {
  const { runManasCall } = useHubManasNotify();
  const [logInsight, setLogInsight] = useState<{ angle: string; text: string; router?: string } | null>(null);
  const [logInsightLoading, setLogInsightLoading] = useState(false);

  // Reset insight when the selected log changes — done during render (React's
  // "adjust state on prop change" pattern) rather than in an effect, which avoids
  // a cascading-render lint error and an extra paint.
  const prevLogIdRef = React.useRef<LogEntry["id"] | null | undefined>(log?.id);
  if (prevLogIdRef.current !== log?.id) {
    prevLogIdRef.current = log?.id;
    setLogInsight(null);
    setLogInsightLoading(false);
  }

  if (!log) return null;

  const severity = getLogSeverity(log.text);

  const askLogInsight = async () => {
    setLogInsightLoading(true);
    setLogInsight(null);
    const res = await runManasCall(
      `Log insight — ${log.module}`,
      () => fetchLogInsight({ module: log.module, text: log.text, time: log.time }),
      {
        pendingDetail: "MANAS is explaining this log entry…",
        validate: (r) => Boolean(r.insight?.trim()),
        emptyDetail: "MANAS returned an empty explanation — retry in a moment",
        successDetail: "Log explanation is ready below",
      },
    );
    if (res?.insight?.trim()) {
      setLogInsight({ angle: res.insight_angle, text: res.insight, router: res.router });
    }
    setLogInsightLoading(false);
  };

  const handleClose = () => {
    setLogInsight(null);
    setLogInsightLoading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 animate-in fade-in duration-200 cursor-default"
      onClick={handleClose}
    >
      <div
        className="bg-white border border-zinc-200/80 rounded-3xl p-10 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
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
            severity === "critical"
              ? "text-rose-600 bg-rose-50 border-rose-200/50 animate-pulse"
              : severity === "warning"
                ? "text-amber-600 bg-amber-50 border-amber-200/50"
                : "text-emerald-600 bg-emerald-50 border-emerald-200/50"
          }`}>
            {severity}
          </div>
        </div>

        <div className="bg-[#FAF9F5] p-8 rounded-2xl border border-zinc-150 mb-8 select-text">
          <span className="block font-mono text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider mb-2 select-none">Log Statement</span>
          <p className="text-xl lg:text-2xl font-bold leading-relaxed text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
            {log.text}
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              MANAS explanation
            </span>
            <button
              type="button"
              onClick={() => void askLogInsight()}
              disabled={logInsightLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              {logInsightLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              Ask MANAS
            </button>
          </div>
          {logInsightLoading ? (
            <ManasInsightPanel title="MANAS — Log explanation" loading />
          ) : logInsight ? (
            <ManasInsightPanel title={`MANAS — ${logInsight.angle}`} text={logInsight.text} />
          ) : (
            <p className="text-sm text-zinc-500 leading-relaxed" style={{ fontFamily: "var(--font-questrial)" }}>
              Tap <strong className="text-orange-600">Ask MANAS</strong> for a plain-language explanation of this log and recommended preventive actions.
            </p>
          )}
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-zinc-400 border-t border-zinc-150 pt-5">
          <span>Telemetry Timestamp: {log.time}</span>
          <button
            onClick={handleClose}
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
