"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface ScrollButtonProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

function ScrollButton({ containerRef, className = "" }: ScrollButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => {
      const threshold = 100;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setVisible(!atBottom);
    };

    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => el.removeEventListener("scroll", check);
  }, [containerRef]);

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToBottom}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-all cursor-pointer ${className}`}
    >
      <ChevronDown size={14} />
      Scroll to bottom
    </button>
  );
}

export { ScrollButton };
