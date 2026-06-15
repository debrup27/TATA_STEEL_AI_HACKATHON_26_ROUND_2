"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Send, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import { triggerPageTransition } from "../animations/PageTransition";
import { useMockChatSimulation, useMockTelemetryLogs } from "@/hooks";
import { getWelcomeMessage, generateDemoReply } from "@/services/chat";
import { fetchManasPredictions, type RulPredictionData } from "@/services/prediction";
import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
  StepsBar,
} from "./ai-components/steps";
import { TextShimmerLoader } from "./ai-components/loader";
import { Source, SourceContent, SourceTrigger } from "./ai-components/source";
import { getLogSeverity } from "@/lib/logSeverity";
import type { LogEntry } from "@/services/types";
import { CHAT_SIM_OVERRIDE_STEP_INTERVAL, CHAT_SIM_OVERRIDE_EXTRA_DONE_DELAY } from "@/lib/constants";

type CapabilityId = "manas" | "rag" | "sansad" | "rul";

// ─── Re-use DemoMessage from AtalDisplayModal ────────────────────────────────
const DemoMessage = React.memo(function DemoMessage({ msg }: { msg: { role: string; content: string } }) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-normal shadow-xs text-[11px] sm:text-xs ${
          msg.role === "user"
            ? "bg-zinc-900 text-white rounded-tr-sm"
            : "bg-white border border-zinc-200/80 text-zinc-700 rounded-tl-sm"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
});

// ─── MANAS panel — Safari mockup with 2 msgs ────────────────────────────────
function ManasPanelPreview() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    getWelcomeMessage() as { role: "user" | "assistant"; content: string },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: generateDemoReply() },
    ]);
    setInput("");
  };

  const reset = () => {
    setMessages([getWelcomeMessage() as { role: "user" | "assistant"; content: string }]);
    setInput("");
  };

  return (
    <div className="w-full h-full min-h-[350px] max-h-[380px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/15 flex flex-col overflow-hidden shadow-xl">
      {/* Browser bar */}
      <div className="border-b border-black/10 px-4 py-2.5 flex items-center justify-between bg-white/90 select-none shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#ff5f56]" />
          <span className="size-2 rounded-full bg-[#ffbd2e]" />
          <span className="size-2 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase select-none font-mono">ATAL MANAS</span>
        <button onClick={reset} className="text-zinc-400 hover:text-orange-500 transition-colors bg-transparent border-none p-0 cursor-pointer">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((msg, i) => <DemoMessage key={i} msg={msg} />)}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-black/5 p-2 bg-white/90 flex gap-2 items-center shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Manas..."
          className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 bg-zinc-950 text-white rounded-xl hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-zinc-950 shrink-0"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}

// ─── RAG panel — same Safari mockup, shows RAG retrieval steps ───────────────
function RagPanelPreview() {
  const [queried, setQueried] = useState(false);
  const [input, setInput] = useState("");

  const chatSim = useMockChatSimulation({
    stepInterval: CHAT_SIM_OVERRIDE_STEP_INTERVAL,
    extraDoneDelay: CHAT_SIM_OVERRIDE_EXTRA_DONE_DELAY,
    onDone: () => setQueried(true),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatSim.isLoading) return;
    setQueried(false);
    chatSim.start();
  };

  const reset = () => {
    setQueried(false);
    setInput("");
    chatSim.reset();
  };

  return (
    <div className="w-full h-full min-h-[350px] max-h-[380px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/15 flex flex-col overflow-hidden shadow-xl">
      {/* Browser bar */}
      <div className="border-b border-black/10 px-4 py-2.5 flex items-center justify-between bg-white/90 select-none shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#ff5f56]" />
          <span className="size-2 rounded-full bg-[#ffbd2e]" />
          <span className="size-2 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase select-none font-mono">RAG RETRIEVAL</span>
        <button onClick={reset} className="text-zinc-400 hover:text-purple-500 transition-colors bg-transparent border-none p-0 cursor-pointer">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Pre-query hint */}
        {!chatSim.isLoading && !queried && (
          <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2 bg-white border border-zinc-200/80 text-zinc-700 text-[11px] sm:text-xs leading-normal shadow-xs">
            Ask me anything — I&apos;ll search the OEM manuals, SOPs and ISO standards corpus.
          </div>
        )}

        {/* Retrieval steps */}
        {chatSim.isLoading && (
          <div className="max-w-[90%] self-start text-[11px]">
            <Steps defaultOpen>
              <StepsTrigger><TextShimmerLoader text="Searching corpus" size="sm" /></StepsTrigger>
              <StepsContent bar={<StepsBar />}>
                <div className="space-y-1 mt-1 font-medium">
                  <StepsItem status={chatSim.currentStep > 0 ? "complete" : "active"}>BGE-M3 embedding query</StepsItem>
                  <StepsItem status={chatSim.currentStep > 1 ? "complete" : chatSim.currentStep === 1 ? "active" : "pending"}>
                    <Source><SourceTrigger label="HAGCC Manual §4.3.2" showFavicon /><SourceContent title="HAGCC Maintenance Manual" description="OEM manual for Hydraulic AGC Cylinders. Section 4.3.2 covers operating pressure limits." /></Source>{" "}matched
                  </StepsItem>
                  <StepsItem status={chatSim.currentStep > 2 ? "complete" : chatSim.currentStep === 2 ? "active" : "pending"}>
                    <Source><SourceTrigger label="ISO 4406:2021" showFavicon /><SourceContent title="ISO 4406:2021" description="Fluid cleanliness coding system for hydraulic systems." /></Source>{" "}matched
                  </StepsItem>
                  <StepsItem status={chatSim.currentStep > 3 ? "complete" : chatSim.currentStep === 3 ? "active" : "pending"}>Reranking with BGE Reranker v2-M3</StepsItem>
                </div>
              </StepsContent>
            </Steps>
          </div>
        )}

        {/* Result */}
        {queried && (
          <div className="self-start max-w-[90%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-white border border-zinc-200/80 text-zinc-700 text-[11px] sm:text-xs shadow-xs flex flex-col gap-2">
            <p className="font-semibold text-zinc-800">Top 2 sources retrieved:</p>
            <div className="flex flex-col gap-1.5">
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                <p className="font-bold text-purple-700 text-[10px]">HAGCC Manual §4.3.2 · score 0.97</p>
                <p className="text-zinc-600 text-[10px] italic mt-0.5">&ldquo;Operating pressure shall be 220–260 bar…&rdquo;</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                <p className="font-bold text-purple-700 text-[10px]">ISO 4406:2021 · score 0.91</p>
                <p className="text-zinc-600 text-[10px] italic mt-0.5">&ldquo;Target cleanliness ≤ 17/15/12 for servo systems…&rdquo;</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-black/5 p-2 bg-white/90 flex gap-2 items-center shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Query the corpus..."
          disabled={chatSim.isLoading}
          className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || chatSim.isLoading}
          className="p-2 bg-zinc-950 text-white rounded-xl hover:bg-purple-600 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}

// ─── SANSAD panel — log entries from logs page ───────────────────────────────
function SansadPanelPreview() {
  const { logs } = useMockTelemetryLogs(3000, 12, true);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center justify-between mb-1 select-none shrink-0">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">System Logs · Live</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-bold text-emerald-600">streaming</span>
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        <AnimatePresence initial={false}>
          {logs.map((log) => <LogCard key={log.id} log={log} />)}
        </AnimatePresence>
        {logs.length === 0 && (
          <p className="text-xs text-zinc-400 text-center mt-8">Waiting for telemetry…</p>
        )}
      </div>
    </div>
  );
}

function LogCard({ log }: { log: LogEntry }) {
  const severity = getLogSeverity(log.text);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";

  let cardStyle = "bg-white border-zinc-200/80 text-zinc-700";
  let badgeColor = "text-zinc-600 bg-zinc-100/80 border-zinc-200/60";
  let icon = <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;

  if (isCritical) {
    cardStyle = "bg-rose-50/20 border-rose-200 text-rose-700 font-semibold";
    badgeColor = "text-rose-600 bg-rose-50 border-rose-200/50";
    icon = <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />;
  } else if (isWarning) {
    cardStyle = "bg-amber-50/25 border-amber-200 text-amber-700";
    badgeColor = "text-amber-600 bg-amber-50 border-amber-200/50";
    icon = <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 items-start border rounded-xl p-3 ${cardStyle}`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-zinc-400">[{log.time}]</span>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${badgeColor}`}>{log.module}</span>
        </div>
        <p className="text-xs leading-snug break-words">{log.text}</p>
      </div>
    </motion.div>
  );
}

// ─── RUL panel — fetchManasPredictions list (same as AtalDisplayModal) ───────
function RulPanelPreview() {
  const [predictions, setPredictions] = useState<RulPredictionData[]>([]);

  useEffect(() => {
    fetchManasPredictions().then(setPredictions).catch(() => setPredictions([]));
  }, []);

  const predIcons: React.ReactNode[] = [
    <svg key={0} className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    <svg key={1} className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg key={2} className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg key={3} className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  ];

  if (!predictions.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-zinc-400">Loading asset health…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0 select-none">Asset Health · RUL Forecast</p>
      {predictions.map((item, i) => {
        let badgeColors = "bg-blue-50 text-blue-600";
        if (item.badgeType === "critical") badgeColors = "bg-red-50 text-red-600";
        else if (item.badgeType === "warning") badgeColors = "bg-orange-50 text-orange-600";
        else if (item.badgeType === "healthy") badgeColors = "bg-green-50 text-green-600";
        return (
          <div key={i} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-zinc-50/70 border border-transparent hover:border-zinc-100 transition-all duration-300 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm shrink-0" style={{ backgroundColor: item.iconBgColor }}>
              {predIcons[i % predIcons.length]}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-bold text-zinc-800 truncate">{item.title}</h4>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide select-none ${badgeColors}`}>{item.badgeText}</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-400 truncate">{item.subtext}</p>
            </div>
          </div>
        );
      })}
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
  href: string;
  icon: React.ReactNode;
}

const capabilities: CapabilityItem[] = [
  {
    id: "manas",
    title: "MANAS Diagnostic Chat",
    panelLabel: "ATAL MANAS · Diagnostic Chat",
    description: "Multi-agent LLM reasoning over OEM manuals and SOPs. Source citations enforced on every response.",
    tag: "MANAS",
    tagColor: "#f97316",
    href: "/manas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: "rag",
    title: "RAG Document Retrieval",
    panelLabel: "RAG · BGE-M3 + BM25 Hybrid",
    description: "BGE-M3 1024-dim + BM25 hybrid search over OEM manuals, SOPs, ISO standards. Reranker precision ≥ 0.9.",
    tag: "RAG",
    tagColor: "#8b5cf6",
    href: "/manas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: "sansad",
    title: "SANSAD System Logs",
    panelLabel: "SANSAD · Live System Logs",
    description: "Real-time alert log stream from 8 production assets. Severity-coded, module-tagged.",
    tag: "SANSAD",
    tagColor: "#3b82f6",
    href: "/sansad/hub/logs",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
      </svg>
    ),
  },
  {
    id: "rul",
    title: "Asset Health & RUL",
    panelLabel: "ML Engine · Asset Health Forecast",
    description: "Remaining Useful Life models on degradation curves. Outputs risk class and spares procurement window.",
    tag: "SANSAD",
    tagColor: "#10b981",
    href: "/sansad/hub",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const PANELS: Record<CapabilityId, React.ReactNode> = {
  manas: <ManasPanelPreview />,
  rag: <RagPanelPreview />,
  sansad: <SansadPanelPreview />,
  rul: <RulPanelPreview />,
};

const bottomCards = [
  {
    title: "Self-Hosted",
    description: "Full stack inside your plant network. No data leaves the facility. Single-command deploy with Docker Compose.",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    chip: "Air-gapped",
  },
  {
    title: "Local LLM — Qwen 3.5",
    description: "qwen3.5:9b via Ollama. No cloud inference, no token billing, no rate limits.",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    chip: "On-premise",
    codeSnippet: "ollama run qwen3.5:9b",
  },
  {
    title: "Historical Logs",
    description: "Searchable audit trail of every alert, maintenance event, and AI diagnostic report across all assets.",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    chip: "Full audit trail",
    href: "/sansad/hub/historical-logs",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AtalDeveloperSection() {
  const [activeCap, setActiveCap] = useState<CapabilityId>("manas");
  const current = capabilities.find((c) => c.id === activeCap)!;

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 mt-16 border-t border-zinc-100 pt-16">
      <div className="text-center mb-10 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 mb-2 leading-tight font-sans">
          What ATAL does,{" "}
          <span className="text-blue-600">under the hood</span>
        </h2>
        <p className="text-sm md:text-base text-zinc-500 font-medium select-none">
          Live components from the actual product — click a card to explore.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full max-w-6xl">

        {/* Left: fixed-height preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col border border-zinc-100 rounded-3xl overflow-hidden bg-white shadow-sm">
          {/* Browser top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100 shrink-0 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span className="font-mono text-[10px] text-zinc-400 tracking-wide">{current.panelLabel}</span>
            <button
              onClick={() => triggerPageTransition(current.href)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Open →
            </button>
          </div>

          {/* Fixed-height panel — all cards same size */}
          <div className="h-[420px] p-4 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCap}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                {PANELS[activeCap]}
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Right: 2×2 cards (5 cols) */}
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
                    className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                    style={
                      isSelected
                        ? { color: item.tagColor, backgroundColor: `${item.tagColor}12`, border: `1px solid ${item.tagColor}25` }
                        : { color: "#a1a1aa", backgroundColor: "transparent", border: "1px solid #e4e4e7" }
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? item.tagColor : "#d4d4d8" }}
                    />
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
            className="bg-white rounded-3xl p-6 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px] group"
          >
            <div>
              {/* Icon + chip row */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 group-hover:bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-white transition-all duration-300">
                  {card.icon}
                </div>
                <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border border-zinc-200 text-zinc-500 bg-white">
                  <span className="w-1 h-1 rounded-full bg-zinc-400" />
                  {card.chip}
                </span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900">{card.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1.5">{card.description}</p>
            </div>
            {card.codeSnippet && (
              <div className="mt-4 bg-zinc-950 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <code className="text-[11px] font-mono text-zinc-300 select-all">{card.codeSnippet}</code>
              </div>
            )}
            {"href" in card && card.href && (
              <button
                onClick={() => triggerPageTransition(card.href!)}
                className="mt-4 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer text-left flex items-center gap-1 group/link"
              >
                View logs
                <span className="group-hover/link:translate-x-0.5 transition-transform inline-block">→</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
