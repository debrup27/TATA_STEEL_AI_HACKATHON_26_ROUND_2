"use client";

import React from "react";
import Link from "next/link";
import ClickSpark from "../../components/ClickSpark";
import ManasChatInput from "../../components/ManasChatInput";

export default function ManasPage() {
  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative min-h-screen w-full bg-[#FAFAFA] overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth"
    >
      {/* Back Button */}
      <div className="w-full max-w-3xl mx-auto pt-12 px-6 mb-6 flex justify-start z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors duration-200 select-none cursor-pointer bg-white px-4 py-2.5 rounded-full border border-zinc-200/80 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24 -mt-12">
        <ManasChatInput />
      </div>
    </ClickSpark>
  );
}
