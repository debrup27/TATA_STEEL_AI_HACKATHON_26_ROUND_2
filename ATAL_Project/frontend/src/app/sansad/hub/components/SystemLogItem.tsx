"use client";

import React from "react";
import { motion } from "framer-motion";
import { DURATION_SECTION_FADE } from "@/lib/constants";
import { getLogSeverity } from "@/lib/logSeverity";
import type { LogEntry } from "@/services/types";

interface SystemLogItemProps {
  log: LogEntry;
  onSelect: (log: LogEntry) => void;
}

export const SystemLogItem = React.memo(function SystemLogItem({
  log,
  onSelect
}: SystemLogItemProps) {
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(log);
  }, [onSelect, log]);

  const severity = getLogSeverity(log.text);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";
  
  let timeColor = "text-[#1b253c]/40 group-hover:text-[#1b253c]/60";
  let moduleColor = "text-[#1b253c]/65 group-hover:text-[#1b253c]/85";
  let textStyle = "text-[#1b253c]/80 group-hover:text-[#1b253c]";
  let dot = "bg-zinc-300 group-hover:bg-zinc-400";
  
  if (isCritical) {
    timeColor = "text-rose-500/60 group-hover:text-rose-600/80";
    moduleColor = "text-rose-600 group-hover:text-rose-700";
    textStyle = "text-rose-600 group-hover:text-rose-700 font-semibold";
    dot = "bg-rose-500 group-hover:bg-rose-600";
  } else if (isWarning) {
    timeColor = "text-amber-600/60 group-hover:text-amber-700/80";
    moduleColor = "text-amber-600 group-hover:text-amber-700";
    textStyle = "text-amber-600 group-hover:text-amber-700";
    dot = "bg-amber-500 group-hover:bg-amber-600";
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION_SECTION_FADE, ease: "easeOut" }}
      onClick={handleClick}
      className={`flex gap-2 items-start border-b border-[#1b253c]/5 group-hover:border-[#1b253c]/10 pb-2 transition-colors duration-300 cursor-pointer ${textStyle}`}
    >
      <span className={`mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0 transition-colors duration-300 ${dot}`} />
      <div>
        <span style={{ fontFamily: "var(--font-questrial)" }} className={`text-[11px] block mb-0.5 transition-colors duration-300 ${timeColor}`}>
          [{log.time}]&nbsp;
          <span className={`font-bold transition-colors duration-300 ${moduleColor}`}>
            {log.module}
          </span>
        </span>
        <span style={{ fontFamily: "var(--font-questrial)" }} className="text-[14px] leading-snug transition-colors duration-300">
          {log.text}
        </span>
      </div>
    </motion.div>
  );
});
