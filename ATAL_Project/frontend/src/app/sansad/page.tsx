"use client";

import React from "react";
import ClickSpark from "../../animations/ClickSpark";
import NodeWorkflow from "../../components/NodeWorkflow";

export default function SansadPage() {
  return (
    <ClickSpark
      sparkColor="#3b82f6"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative min-h-screen w-full bg-[#FAF9F5] overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth pt-20 pb-10 px-4 md:px-8"
    >
      <div className="w-full max-w-7xl mx-auto z-10 flex-grow flex flex-col justify-center items-center">
        <div className="w-full text-center mb-8 select-none">
          <h1 className="text-3xl font-light text-zinc-800 tracking-tight">Atal troubleshooting workflow</h1>
          <p className="text-sm text-zinc-400 mt-2 font-light">Design and execute automated furnace pipelines in real-time.</p>
        </div>
        <div className="w-full flex-grow flex items-center justify-center">
          <NodeWorkflow />
        </div>
      </div>
    </ClickSpark>
  );
}
