"use client";

import { useState } from "react";
import { User, LogOut } from "lucide-react";
import { useUser } from "../hooks/useUser";

export default function UserPill({
  className = "w-9 h-9",
  containerClassName = "",
  containerStyle = {},
  align = "right",
  containerRef
}: {
  className?: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  align?: "left" | "right";
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { user, logout } = useUser();
  const [hovered, setHovered] = useState(false);

  if (!user) return null;

  const content = (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`${className} rounded-full bg-[#1b253c] flex items-center justify-center cursor-default shadow-sm`}>
        <User className="w-4 h-4 text-white" />
      </div>

      {hovered && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full pt-5 min-w-[140px] z-50`}>
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-lg px-4 py-3">
            <p className="text-[11px] font-black text-[#1b253c] uppercase tracking-wider truncate">
              {user.username}
            </p>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mt-0.5">
              {user.role}
            </p>
            <div className="border-t border-zinc-150 my-2" />
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold text-red-500 hover:text-red-750 hover:bg-red-50/50 rounded-lg transition-colors border-none cursor-pointer outline-none bg-transparent"
            >
              <LogOut className="w-3 h-3 text-red-400" />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (containerClassName) {
    return (
      <div
        ref={containerRef}
        className={containerClassName}
        style={containerStyle}
      >
        {content}
      </div>
    );
  }

  return content;
}
