"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerPageTransition } from "../animations/PageTransition";

type CapabilityId = "manas" | "sansad" | "rag" | "rul";

// ─── MANAS panel ────────────────────────────────────────────────────────────

function ManasPanelPreview() {
  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="bg-zinc-900 text-white text-xs rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] leading-relaxed">
          Hydraulic AGC cylinder pressure dropped to 180 bar during active roll force compensation.
        </div>
      </div>

      {/* AI response card */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">MANAS</span>
        </div>

        {/* Fault + confidence row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-0.5">Probable Fault</p>
            <p className="text-xs font-bold text-red-700 truncate">Internal cylinder seal failure</p>
          </div>
          <div className="flex flex-col items-center bg-red-600 text-white rounded-xl px-3 py-2 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Risk</span>
            <span className="text-xs font-black">CRITICAL</span>
          </div>
          <div className="flex flex-col items-center bg-zinc-100 rounded-xl px-3 py-2 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Conf.</span>
            <span className="text-xs font-black text-zinc-800">87%</span>
          </div>
        </div>

        {/* Evidence block */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Evidence · HAGCC Manual §4.3.2</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed italic">
            &ldquo;Operating pressure shall be maintained 220–260 bar. Drop below 200 bar indicates seal or accumulator fault.&rdquo;
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white border border-zinc-100 rounded-xl px-3.5 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Recommended Actions</p>
          <div className="flex flex-col gap-1">
            {[
              { n: "1", text: "LOTO AGC circuit before inspection", urgent: true },
              { n: "2", text: "Replace seal kit P/N HYD-2241-AG", urgent: false },
              { n: "3", text: "Flush and refill to ISO VG 46 spec", urgent: false },
            ].map((a) => (
              <div key={a.n} className="flex items-start gap-2">
                <span className={`text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${a.urgent ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>
                  {a.n}
                </span>
                <span className={`text-xs leading-relaxed ${a.urgent ? "font-bold text-zinc-800" : "text-zinc-600"}`}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Sources</span>
          {["HAGCC Manual §4.3.2", "ISO 4406:2021", "HAGCC SOP-07"].map((s) => (
            <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SANSAD panel ────────────────────────────────────────────────────────────

function SansadPanelPreview() {
  const assets = [
    { id: "SRF",   label: "Slab Reheat",     metric: "1248 °C", status: "ok" },
    { id: "HHPD",  label: "Hi-P Descaler",   metric: "312 bar", status: "ok" },
    { id: "FS",    label: "Finishing Stand",  metric: "8420 kN", status: "ok" },
    { id: "HAGCC", label: "Hyd. AGC Cyl.",   metric: "181 bar", status: "critical" },
    { id: "APT",   label: "Acid Pickle",      metric: "18.2%",   status: "warning" },
    { id: "TCMS",  label: "Cold Mill",        metric: "94 kN",   status: "ok" },
    { id: "CGP",   label: "Galvaniz. Pot",    metric: "460 °C",  status: "ok" },
    { id: "HPAK",  label: "Air Knife",        metric: "5.8 bar", status: "ok" },
  ];
  const statusStyle: Record<string, string> = {
    ok:       "bg-emerald-500",
    warning:  "bg-amber-400",
    critical: "bg-red-500 animate-pulse",
  };
  const badgeStyle: Record<string, string> = {
    ok:       "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning:  "bg-amber-50 text-amber-600 border-amber-100",
    critical: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="grid grid-cols-2 gap-2.5">
        {assets.map((a) => (
          <div key={a.id} className="bg-white border border-zinc-100 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{a.id}</span>
              <span className={`w-2 h-2 rounded-full ${statusStyle[a.status]}`} />
            </div>
            <span className="font-mono text-sm font-black text-zinc-800 leading-none">{a.metric}</span>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-400 truncate">{a.label}</span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider border ${badgeStyle[a.status]}`}>
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert strip */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-red-700">HAGCC pressure 181 bar — below 200 bar threshold</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">APT acid concentration drift +0.4%/h</span>
        </div>
      </div>
    </div>
  );
}

// ─── RAG panel ───────────────────────────────────────────────────────────────

function RagPanelPreview() {
  const results = [
    {
      rank: 1, score: 0.97, color: "bg-violet-600",
      doc: "HAGCC Maintenance Manual", section: "§4.3.2",
      excerpt: "Operating pressure shall be maintained between 220–260 bar. Drop below 200 bar indicates seal or accumulator fault.",
    },
    {
      rank: 2, score: 0.94, color: "bg-violet-500",
      doc: "HAGCC SOP-07", section: "Hydraulic System Checks",
      excerpt: "Inspect accumulator pre-charge at 150 bar ± 5 bar during scheduled outage.",
    },
    {
      rank: 3, score: 0.91, color: "bg-violet-400",
      doc: "ISO 4406:2021", section: "Fluid Cleanliness",
      excerpt: "Target cleanliness code ≤ 17/15/12 for servo hydraulic systems.",
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Query chip */}
      <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3.5 py-2">
        <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs font-bold text-violet-700">&ldquo;HAGCC seal pressure threshold&rdquo;</span>
        <span className="ml-auto text-[9px] font-black text-violet-400 uppercase tracking-widest">BGE-M3 · BM25</span>
      </div>

      {/* Result cards */}
      {results.map((r) => (
        <div key={r.rank} className="bg-white border border-zinc-100 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black text-white px-1.5 py-0.5 rounded-md ${r.color}`}>#{r.rank}</span>
            <span className="text-xs font-bold text-zinc-800 truncate">{r.doc}</span>
            <span className="text-[9px] font-bold text-zinc-400 shrink-0">{r.section}</span>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <div className="w-12 h-1 rounded-full bg-zinc-100 overflow-hidden">
                <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.score * 100}%` }} />
              </div>
              <span className="text-[9px] font-black text-zinc-500">{r.score}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed italic">&ldquo;{r.excerpt}&rdquo;</p>
        </div>
      ))}

      <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-auto">
        <span>Reranker: bge-reranker-v2-m3</span>
        <span className="ml-auto text-emerald-600">Precision ≥ 0.9 ✓</span>
      </div>
    </div>
  );
}

// ─── RUL panel ───────────────────────────────────────────────────────────────

function RulPanelPreview() {
  const assets = [
    { id: "SRF",   rul: 91, conf: 0.88, risk: "low" },
    { id: "HHPD",  rul: 55, conf: 0.83, risk: "low" },
    { id: "FS",    rul: 38, conf: 0.79, risk: "medium" },
    { id: "HAGCC", rul: 14, conf: 0.91, risk: "critical" },
    { id: "APT",   rul: 27, conf: 0.76, risk: "high" },
    { id: "TCMS",  rul: 62, conf: 0.85, risk: "low" },
    { id: "CGP",   rul: 48, conf: 0.81, risk: "medium" },
    { id: "HPAK",  rul: 73, conf: 0.87, risk: "low" },
  ];
  const riskStyle: Record<string, { bar: string; badge: string }> = {
    low:      { bar: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    medium:   { bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-100" },
    high:     { bar: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border-orange-100" },
    critical: { bar: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-100" },
  };

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {assets.map((a) => {
        const s = riskStyle[a.risk];
        const pct = Math.min(100, (a.rul / 100) * 100);
        return (
          <div key={a.id} className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-3.5 py-2.5">
            <span className="font-mono text-[10px] font-black text-zinc-500 w-10 shrink-0">{a.id}</span>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800">{a.rul} days</span>
                <span className="text-[9px] text-zinc-400">conf {(a.conf * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider border shrink-0 ${s.badge}`}>
              {a.risk}
            </span>
          </div>
        );
      })}

      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2 mt-1">
        <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-xs font-bold text-red-700">HAGCC — order seal kit P/N HYD-2241-AG now · 7-day lead time</span>
      </div>
    </div>
  );
}

// ─── Capability config ────────────────────────────────────────────────────────

interface CapabilityItem {
  id: CapabilityId;
  title: string;
  panelLabel: string;
  description: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  panel: React.ReactNode;
}

const capabilities: CapabilityItem[] = [
  {
    id: "manas",
    title: "MANAS Diagnostic Chat",
    panelLabel: "MANAS · Fault Diagnosis · HAGCC Asset",
    description: "Multi-agent LLM reasoning over OEM manuals and SOPs. Source citations enforced on every response.",
    tag: "AI WIZARD",
    tagColor: "#f97316",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    panel: <ManasPanelPreview />,
  },
  {
    id: "sansad",
    title: "SANSAD Live Telemetry",
    panelLabel: "SANSAD · Live Telemetry · tick 1847",
    description: "Real-time WebSocket stream from 8 production assets. Anomaly flags surface within one tick.",
    tag: "DASHBOARD",
    tagColor: "#3b82f6",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
      </svg>
    ),
    panel: <SansadPanelPreview />,
  },
  {
    id: "rag",
    title: "RAG Document Retrieval",
    panelLabel: "RAG · BGE-M3 + BM25 · top-3 results",
    description: "BGE-M3 1024-dim + BM25 hybrid search over OEM manuals, SOPs, ISO standards. Reranker precision ≥ 0.9.",
    tag: "RAG ENGINE",
    tagColor: "#8b5cf6",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    panel: <RagPanelPreview />,
  },
  {
    id: "rul",
    title: "RUL Prediction Engine",
    panelLabel: "ML Engine · RUL forecast · all assets",
    description: "Remaining Useful Life models on degradation curves. Outputs risk class and spares procurement window.",
    tag: "ML ENGINE",
    tagColor: "#10b981",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    panel: <RulPanelPreview />,
  },
];

const bottomCards = [
  {
    title: "Self-Hosted",
    description: "Full stack inside your plant network. No data leaves the facility. Docker Compose single-command deploy.",
    icon: (
      <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    chip: "Air-gapped",
    chipStyle: "text-green-600 bg-green-50 border-green-100",
  },
  {
    title: "Local LLM — Qwen 3.5",
    description: "qwen3.5:9b via Ollama. No cloud inference, no token billing, no rate limits.",
    icon: (
      <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    chip: "On-premise",
    chipStyle: "text-blue-600 bg-blue-50 border-blue-100",
    codeSnippet: "ollama run qwen3.5:9b",
  },
  {
    title: "Validated Test Gates",
    description: "P2 gates: LLM smoke, BGE-M3 1024-dim, Reranker ≥ 0.9, ISO 4406 exact match.",
    icon: (
      <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    chip: "4/4 passing",
    chipStyle: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AtalDeveloperSection() {
  const [activeCap, setActiveCap] = useState<CapabilityId>("manas");
  const current = capabilities.find((c) => c.id === activeCap)!;

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 mt-16 border-t border-zinc-100 pt-16">
      {/* Heading */}
      <div className="text-center mb-10 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 mb-2 leading-tight font-sans">
          What ATAL does,{" "}
          <span className="text-blue-600">under the hood</span>
        </h2>
        <p className="text-sm md:text-base text-zinc-500 font-medium select-none">
          Real pipeline outputs — live telemetry to AI diagnosis to sourced recommendations.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full max-w-6xl">

        {/* Left: live UI preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col border border-zinc-100 rounded-3xl overflow-hidden bg-white shadow-sm">
          {/* Browser-style top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100 shrink-0 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span className="font-mono text-[10px] text-zinc-400 tracking-wide">{current.panelLabel}</span>
            <button
              onClick={() => triggerPageTransition(activeCap === "manas" || activeCap === "rag" ? "/manas" : "/sansad")}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Open →
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 p-5 overflow-hidden min-h-[420px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCap}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {current.panel}
              </motion.div>
            </AnimatePresence>
            {/* bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Right: 2×2 capability cards (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch select-none">
          {capabilities.map((item) => {
            const isSelected = activeCap === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveCap(item.id)}
                className={`relative flex flex-col justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 border min-h-[170px] overflow-hidden group ${
                  isSelected
                    ? "bg-white border-zinc-950 shadow-md ring-1 ring-zinc-950/5"
                    : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50"
                }`}
              >
                {isSelected && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-3xl"
                    style={{ background: `radial-gradient(ellipse at top left, ${item.tagColor}18 0%, transparent 70%)` }}
                  />
                )}

                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: isSelected ? item.tagColor : "#f4f4f5" }}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, {
                      className: `w-5 h-5 ${isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"}`,
                    })}
                  </div>
                  <span
                    className="text-[9px] font-black tracking-[0.15em] uppercase px-2 py-1 rounded-md border"
                    style={
                      isSelected
                        ? { color: item.tagColor, backgroundColor: `${item.tagColor}15`, borderColor: `${item.tagColor}30` }
                        : { color: "#a1a1aa", backgroundColor: "#f4f4f5", borderColor: "#e4e4e7" }
                    }
                  >
                    {item.tag}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className={`text-sm font-bold ${isSelected ? "text-zinc-950" : "text-zinc-700 group-hover:text-zinc-900"}`}>
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-8 select-none">
        {bottomCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-3xl p-6 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                {card.icon}
                <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border ${card.chipStyle}`}>
                  {card.chip}
                </span>
              </div>
              <h4 className="text-base font-bold text-zinc-900">{card.title}</h4>
              <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1.5">{card.description}</p>
            </div>
            {card.codeSnippet && (
              <div className="mt-4 bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2">
                <code className="text-[11px] font-mono text-zinc-600 font-bold select-all">{card.codeSnippet}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
