"use client";

import React from "react";
import Link from "next/link";
import ClickSpark from "../../components/ClickSpark";
import AtalWorkflowFlowchart from "../../components/AtalWorkflowFlowchart";

export default function SansadPage() {
  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative min-h-screen w-full bg-[#FAFAFA] overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth py-12 px-6"
    >
      {/* Back Button to Home */}
      <div className="w-full max-w-5xl mx-auto mb-6 flex justify-start z-20">
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

      {/* Modular Flowchart Component */}
      <div className="w-full max-w-5xl mx-auto z-10 flex-grow flex items-center justify-center">
        <AtalWorkflowFlowchart />
      </div>
    </ClickSpark>
  );
}
