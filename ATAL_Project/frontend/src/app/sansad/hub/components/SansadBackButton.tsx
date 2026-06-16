"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Back control — morph/expand on hover; parent column must be fixed w-1/4 so header stays put. */
export default function SansadBackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center select-none shrink-0">
      <div
        className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold"
        style={{ fontFamily: "var(--font-pixeloid)" }}
      >
        <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
        <span className="text-xs uppercase tracking-wider">Back</span>
      </div>
    </Link>
  );
}
