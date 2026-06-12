"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface StepsProps {
  defaultOpen?: boolean;
  children: React.ReactNode;
}

interface StepsTriggerProps {
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
}

interface StepsContentProps {
  bar?: React.ReactNode;
  children: React.ReactNode;
}

interface StepsItemProps {
  children: React.ReactNode;
  status?: "pending" | "active" | "complete";
}

interface StepsBarProps {
  className?: string;
}

const StepsContext = React.createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
});

function Steps({ defaultOpen = false, children }: StepsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((v) => !v);

  return (
    <StepsContext.Provider value={{ open, toggle }}>
      <div className="w-full bg-transparent overflow-hidden transition-all duration-300">
        {children}
      </div>
    </StepsContext.Provider>
  );
}

function StepsTrigger({ leftIcon, children }: StepsTriggerProps) {
  const { open, toggle } = React.useContext(StepsContext);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 py-2 text-sm font-bold text-[#1b253c]/85 hover:text-orange-600 transition-colors duration-200 cursor-pointer text-left"
    >
      {leftIcon && (
        <span className="shrink-0 text-[#1b253c]/50">{leftIcon}</span>
      )}
      <span className="flex-1 tracking-tight">{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0 text-[#1b253c]/40 ml-1"
      >
        <ChevronDown size={15} strokeWidth={2.5} />
      </motion.span>
    </button>
  );
}

function StepsBar({ className = "" }: StepsBarProps) {
  return (
    <div
      className={`w-[1.5px] bg-gradient-to-b from-[#1b253c]/20 via-[#1b253c]/10 to-transparent self-stretch rounded-full ${className}`}
    />
  );
}

function StepsContent({ bar, children }: StepsContentProps) {
  const { open } = React.useContext(StepsContext);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="steps-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex gap-2.5 pb-2 pt-0.5">
            {bar}
            <div className="flex flex-col gap-2 pt-0.5 min-w-0 flex-1">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepsItem({ children, status = "pending" }: StepsItemProps) {
  let indicator;
  if (status === "complete") {
    indicator = (
      <span className="size-3.5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 shadow-sm">
        <svg className="size-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  } else if (status === "active") {
    indicator = (
      <span className="relative flex size-3.5 items-center justify-center shrink-0 mt-0.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400/50 opacity-75"></span>
        <span className="relative inline-flex rounded-full size-2 bg-orange-500 shadow-sm shadow-orange-500/50"></span>
      </span>
    );
  } else {
    indicator = (
      <span className="size-3.5 rounded-full border border-[#1b253c]/15 bg-[#FAF7F2]/60 shrink-0 mt-0.5 transition-all duration-300" />
    );
  }

  const textClass = status === "active"
    ? "text-zinc-950 font-bold"
    : status === "complete"
      ? "text-zinc-650 font-medium"
      : "text-zinc-400 font-normal"

  return (
    <div className={`flex items-start gap-2.5 text-xs sm:text-sm transition-colors duration-300 ${textClass}`}>
      {indicator}
      <span className="leading-relaxed flex items-center flex-wrap gap-x-1.5 gap-y-0.5">{children}</span>
    </div>
  );
}

export { Steps, StepsTrigger, StepsBar, StepsContent, StepsItem };
