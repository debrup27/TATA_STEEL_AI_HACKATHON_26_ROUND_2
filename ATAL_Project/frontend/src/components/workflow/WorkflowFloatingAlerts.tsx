"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Zap } from "lucide-react";
import type { CanvasAlertMessage } from "@/hooks/useFactoryCanvasAlerts";

interface WorkflowFloatingAlertsProps {
  messages: CanvasAlertMessage[];
}

const SEVERITY_STYLES = {
  critical: "border-red-300 bg-red-50/95 text-red-900 shadow-red-100",
  warning: "border-amber-300 bg-amber-50/95 text-amber-900 shadow-amber-100",
  info: "border-zinc-200 bg-white/95 text-zinc-800 shadow-zinc-100",
} as const;

export default function WorkflowFloatingAlerts({ messages }: WorkflowFloatingAlertsProps) {
  if (!messages.length) return null;

  return (
    <div
      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[520px] max-w-[90%]"
    >
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.28, ease: "easeIn" } }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
            className={`mb-2.5 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${SEVERITY_STYLES[msg.severity]}`}
          >
            <div className="flex items-start gap-2.5">
              {msg.kind === "system" ? (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              ) : (
                <Zap className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">
                    {msg.kind === "system" ? "System Alert" : "Predictive Action"}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">·</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-600 truncate">
                    {msg.assetName}
                  </span>
                  {msg.priority && msg.kind === "predictive" && (
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      msg.priority === "immediate"
                        ? "bg-red-100 text-red-700"
                        : msg.priority === "urgent"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {msg.priority === "immediate" ? "NOW" : msg.priority === "urgent" ? "URGENT" : "MONITOR"}
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-semibold leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                  {msg.text}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
