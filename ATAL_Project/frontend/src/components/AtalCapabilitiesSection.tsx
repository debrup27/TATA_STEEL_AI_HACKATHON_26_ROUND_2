"use client";

import React from "react";
import { motion } from "framer-motion";
import { triggerPageTransition } from "../animations/PageTransition";

const capabilities = [
  {
    tag: "SANSAD",
    title: "Real-Time Telemetry",
    description:
      "Live sensor streams from SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, and HPAK. Anomaly flags surface within one tick — no polling delay.",
    accent: "#3b82f6",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    tag: "MANAS",
    title: "AI Fault Diagnosis",
    description:
      "Multi-agent LLM reasoning over RAG-retrieved OEM manuals, SOPs, and ISO standards. Responses cite exact document sections — no hallucinated thresholds.",
    accent: "#f97316",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    tag: "ML ENGINE",
    title: "RUL Prediction",
    description:
      "Remaining Useful Life models trained on degradation curves. Outputs risk classification (low → critical) with spares procurement timeline.",
    accent: "#10b981",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    tag: "RAG",
    title: "Document Intelligence",
    description:
      "BGE-M3 1024-dim embeddings + BM25 hybrid retrieval over the full corpus. BGE Reranker v2-M3 cross-encoder ensures precision ≥ 0.9 on ISO 4406 queries.",
    accent: "#8b5cf6",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    tag: "SANSAD",
    title: "Cross-Stage Correlation",
    description:
      "Defect propagation traced across the full production sequence: SRF → HHPD → FS → HAGCC → APT → TCMS → CGP → HPAK.",
    accent: "#ec4899",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    tag: "SECURE",
    title: "Air-Gapped Deployment",
    description:
      "All inference runs locally via Ollama qwen3.5:9b. No data leaves the plant boundary. OEM manuals and sensor streams never touch an external cloud.",
    accent: "#64748b",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function AtalCapabilitiesSection() {
  return (
    <div className="w-full flex flex-col items-center mt-12 mb-16 px-4">
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-400 mb-3 select-none">
          What ATAL Does
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 leading-tight">
          Six pillars. One platform.
        </h2>
        <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
          Built for steel plant engineers who need answers in seconds, not reports in days.
        </p>
      </div>

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl"
      >
        {capabilities.map((cap) => (
          <motion.div
            key={cap.title}
            variants={cardVariants}
            className="group relative bg-white border border-zinc-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all duration-300 overflow-hidden"
          >
            {/* Subtle accent glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(ellipse at top left, ${cap.accent}0d 0%, transparent 70%)`,
              }}
            />

            {/* Icon + tag row */}
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: cap.accent }}
              >
                {cap.icon}
              </div>
              <span
                className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-1 rounded-md select-none"
                style={{ color: cap.accent, backgroundColor: `${cap.accent}15` }}
              >
                {cap.tag}
              </span>
            </div>

            {/* Text */}
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1.5">{cap.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{cap.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA row */}
      <div className="flex items-center gap-4 mt-10">
        <button
          onClick={() => triggerPageTransition("/sansad")}
          className="bg-[#1b253c] hover:bg-blue-600 text-white font-bold text-xs px-6 py-3.5 rounded-full transition-all duration-300 shadow-md cursor-pointer transform hover:scale-105 active:scale-95 select-none"
        >
          Open SANSAD
        </button>
        <button
          onClick={() => triggerPageTransition("/manas")}
          className="bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold text-xs px-6 py-3.5 rounded-full transition-all duration-300 shadow-sm cursor-pointer transform hover:scale-105 active:scale-95 select-none"
        >
          Try MANAS
        </button>
      </div>
    </div>
  );
}
