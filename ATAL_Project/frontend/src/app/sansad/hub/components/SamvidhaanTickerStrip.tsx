"use client";

import LogoLoop from "@/animations/LogoLoop";
import type { TickerItem } from "@/services/types";

export default function SamvidhaanTickerStrip({
  logos,
  className = "",
}: {
  logos: TickerItem[];
  className?: string;
}) {
  return (
    <div className={`overflow-hidden border-t border-[#1b253c]/8 pt-2 ${className}`}>
      <LogoLoop
        logos={logos}
        speed={22}
        direction="left"
        logoHeight={13}
        gap={16}
        pauseOnHover
        renderItem={(item) => (
          <span
            style={{ fontFamily: "var(--font-questrial)" }}
            className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-[10.5px] ${
              item.isSeparator ? "text-[#1b253c]/20" : "text-[#1b253c]/55 font-bold"
            }`}
          >
            {item.text}
          </span>
        )}
      />
    </div>
  );
}
