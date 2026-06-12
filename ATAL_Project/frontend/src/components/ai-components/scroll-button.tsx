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
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#1b253c]/15 bg-[#F7F4EC] shadow-md text-xs font-bold text-[#1b253c]/80 hover:text-orange-600 hover:border-orange-200 transition-all duration-200 cursor-pointer active:scale-95 select-none ${className}`}
    >
      <ChevronDown size={13.5} strokeWidth={2.5} className="text-current" />
      <span>Scroll to bottom</span>
    </button>
  );
}

export { ScrollButton };
