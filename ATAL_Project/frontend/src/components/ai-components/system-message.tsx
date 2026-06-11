"use client";

import React from "react";
import { motion } from "framer-motion";

interface SystemMessageProps {
  children: React.ReactNode;
  variant?: "action" | "warning" | "error";
  fill?: boolean;
  icon?: React.ReactNode;
  cta?: {
    label: string;
    variant?: "outline" | "default";
  };
}

const variantStyles = {
  action: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-800",
    icon: "text-blue-500",
    ctaBorder: "border-blue-300",
    ctaText: "text-blue-700",
    ctaHover: "hover:bg-blue-100",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    icon: "text-amber-500",
    ctaBorder: "border-amber-300",
    ctaText: "text-amber-700",
    ctaHover: "hover:bg-amber-100",
  },
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-800",
    icon: "text-red-500",
    ctaBorder: "border-red-300",
    ctaText: "text-red-700",
    ctaHover: "hover:bg-red-100",
  },
};

function SystemMessage({
  children,
  variant = "action",
  fill = false,
  icon,
  cta,
}: SystemMessageProps) {
  const s = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl text-sm leading-[1.4]
        ${fill ? `${s.bg} ${s.border} border` : ""}
        ${s.text}
      `}
    >
      {icon && (
        <span className={`shrink-0 mt-0.5 ${s.icon}`}>{icon}</span>
      )}
      <span className="flex-1">{children}</span>
      {cta && (
        <button
          className={`
            shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer
            ${cta.variant === "outline"
              ? `${s.ctaBorder} ${s.ctaText} ${s.ctaHover}`
              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            }
          `}
          type="button"
        >
          {cta.label}
        </button>
      )}
    </motion.div>
  );
}

export { SystemMessage };
