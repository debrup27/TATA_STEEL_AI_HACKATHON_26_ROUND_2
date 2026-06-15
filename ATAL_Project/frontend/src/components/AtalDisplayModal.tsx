"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RefreshCw } from "lucide-react";
import { triggerPageTransition } from "../animations/PageTransition";
import { useTelemetryCells } from "@/hooks";
import { getWelcomeMessage, generateDemoReply } from "@/services/chat";
import { fetchManasPredictions, type RulPredictionData } from "@/services/prediction";
import { SPRING_DEFAULT } from "@/lib/constants";
import SansadGrid from "@/components/SansadGrid";

const DemoMessage = React.memo(function DemoMessage({ msg }: { msg: { role: string; content: string } }) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-normal shadow-xs ${
          msg.role === "user"
            ? "bg-zinc-900 text-white rounded-tr-sm"
            : "bg-white border border-zinc-200/80 text-zinc-700 rounded-tl-sm"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
});

interface TabItem {
  id: "atal_sansad" | "atal_manas";
  label: string;
  icon: React.ReactNode;
}

interface RightPanelItem {
  title: string;
  badgeText: string;
  badgeType: "critical" | "warning" | "healthy" | "info";
  subtext: string;
  iconBgColor: string;
  icon: React.ReactNode;
}

export default function AtalDisplayModal() {
  const [activeTab, setActiveTab] = useState<"atal_sansad" | "atal_manas">("atal_sansad");
  const cells = useTelemetryCells();
  const [predictions, setPredictions] = useState<RulPredictionData[]>([]);

  useEffect(() => {
    fetchManasPredictions().then(setPredictions).catch(() => setPredictions([]));
  }, []);

  const [demoMessages, setDemoMessages] = useState<{ role: "user" | "assistant" | "system"; content: string }[]>([
    getWelcomeMessage(),
  ]);
  const [manasInput, setManasInput] = useState("");

  const handleTabChange = (tabId: "atal_sansad" | "atal_manas") => {
    setActiveTab(tabId);
  };

  const handleSendDemoMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manasInput.trim()) return;
    const userMsg = manasInput.trim();
    setDemoMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: generateDemoReply() },
    ]);
    setManasInput("");
  };

  const resetDemo = () => {
    setDemoMessages([getWelcomeMessage()]);
    setManasInput("");
  };

  const tabs: TabItem[] = [
    {
      id: "atal_sansad",
      label: "ATAL Sansad",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: "atal_manas",
      label: "ATAL Manas",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  const predictionIcons: Record<number, React.ReactNode> = {
    0: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    1: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    2: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    3: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  };

  const manasPredictions: RightPanelItem[] = predictions.map((p, i) => ({
    ...p,
    icon: predictionIcons[i] ?? null,
  }));

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Dynamic Text on Top describing Tata Steel Challenge and ATAL Copilot */}
      <div className="text-center mb-8 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-950 mb-2 select-none flex flex-wrap justify-center items-center gap-x-2 md:gap-x-3 leading-tight font-sans">
          <span className="font-thin italic text-zinc-500">Reliable infrastructure</span>
          <span className="font-extrabold text-zinc-900">to manage factories</span>
        </h2>
      </div>

      {/* Main Display Modal Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col transition-all duration-300">
        
        {/* Navigation Tabs Pill Container */}
        <div className="w-full flex justify-start md:justify-center overflow-x-auto pb-4 mb-6 border-b border-zinc-50 scrollbar-none">
          <div className="flex bg-zinc-100/70 p-1.5 rounded-full items-center gap-1.5 min-w-max relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer select-none z-10 ${
                    isActive ? "text-blue-600" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span className={isActive ? "text-blue-600" : "text-zinc-400"}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-white shadow-[0_2px_8px_rgba(59,130,246,0.15)] border border-blue-50/50 rounded-full -z-10"
                      transition={{ type: "spring", ...SPRING_DEFAULT }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Main Grid splits Left / Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

          {/* Left Panel: (8 Columns) - Displays page visual layout */}
          <div className="md:col-span-7 flex flex-col items-center justify-center relative h-[380px]">
            {activeTab === "atal_sansad" ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-zinc-100 rounded-2xl p-6 bg-zinc-50/40 relative overflow-hidden">
                <SansadGrid
                  className="p-4 bg-[#FAF6EE]/50 border border-black/15 rounded-3xl w-full max-w-xs shadow-sm"
                  cellSizeClass="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
            ) : (
              /* Manas Page Redesign Visual: Safari Browser mockup Chat Client */
              <div 
                className="w-full h-full flex flex-col items-center justify-center p-4 border border-zinc-100 bg-zinc-50/40 rounded-2xl overflow-hidden relative"
                style={{
                  backgroundImage: "url('/pastel.webp')",
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              >
                {/* Safari Browser Window Mockup */}
                <div className="w-full h-full min-h-[300px] max-h-[380px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/15 flex flex-col overflow-hidden shadow-xl">
                  {/* Browser Header Bar */}
                  <div className="border-b border-black/10 px-4 py-2.5 flex items-center justify-between bg-white/90 backdrop-blur-xs select-none">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="size-2 rounded-full bg-[#ff5f56]" />
                      <span className="size-2 rounded-full bg-[#ffbd2e]" />
                      <span className="size-2 rounded-full bg-[#27c93f]" />
                    </div>
                    <span 
                      className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase select-none font-mono"
                    >
                      ATAL MANAS
                    </span>
                    <button 
                      onClick={resetDemo}
                      className="text-zinc-400 hover:text-orange-500 transition-colors bg-transparent border-none p-0 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  {/* Chat Messages Panel */}
                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-transparent text-[11px] sm:text-xs [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {demoMessages.map((msg, i) => (
                      <DemoMessage key={i} msg={msg} />
                    ))}
                  </div>

                  {/* Browser Input Bar */}
                  <form 
                    onSubmit={handleSendDemoMessage}
                    className="border-t border-black/5 p-2 bg-white/90 backdrop-blur-xs flex gap-2 items-center shrink-0"
                  >
                    <input
                      type="text"
                      value={manasInput}
                      onChange={(e) => setManasInput(e.target.value)}
                      placeholder="Ask Manas..."
                      className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={!manasInput.trim()}
                      className="p-2 bg-zinc-950 text-white rounded-xl hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-zinc-950 shrink-0"
                    >
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Side Status list / Alert list (5 Columns) */}
          <div className="md:col-span-5 flex flex-col p-1 h-[380px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {activeTab === "atal_sansad" ? (
              <div>
                {/* Header inside Panel */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-zinc-800 select-none">
                    Telemetry Indicators
                  </h3>
                  <button
                    onClick={() => triggerPageTransition("/sansad")}
                    className="text-[11px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer select-none flex items-center gap-1 group/vd"
                  >
                    View details
                    <span className="group-hover/vd:translate-x-0.5 transition-transform inline-block">→</span>
                  </button>
                </div>

                {/* Telemetry Cells Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {cells.map((cell) => {
                    let badgeColors = "bg-green-50 text-green-600 border border-green-200/50";
                    if (cell.status === "critical") {
                      badgeColors = "bg-red-50 text-red-600 border border-red-200/50";
                    } else if (cell.status === "warning") {
                      badgeColors = "bg-amber-50 text-amber-600 border border-amber-200/50";
                    }
                    return (
                      <div 
                        key={cell.label}
                        className="bg-white border border-zinc-100 rounded-xl p-3 flex flex-col justify-between h-[85px] shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{cell.label}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            cell.status === "critical" 
                              ? "bg-red-500 animate-pulse" 
                              : cell.status === "warning" 
                              ? "bg-amber-400" 
                              : "bg-emerald-500"
                          }`} />
                        </div>
                        <span className="font-mono text-base font-black text-zinc-800 leading-none my-1">{cell.value}</span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider text-center w-fit ${badgeColors}`}>
                          {cell.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {/* Header inside Panel */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-zinc-800 select-none">
                    Asset Health
                  </h3>
                  <button
                    onClick={() => triggerPageTransition("/manas")}
                    className="text-[11px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer select-none flex items-center gap-1 group/va"
                  >
                    View all
                    <span className="group-hover/va:translate-x-0.5 transition-transform inline-block">→</span>
                  </button>
                </div>

                {/* List of items */}
                <div className="flex flex-col gap-4">
                  {manasPredictions.map((item, index) => {
                    let badgeColors = "bg-blue-50 text-blue-600";
                    if (item.badgeType === "critical") {
                      badgeColors = "bg-red-50 text-red-600";
                    } else if (item.badgeType === "warning") {
                      badgeColors = "bg-orange-50 text-orange-600";
                    } else if (item.badgeType === "healthy") {
                      badgeColors = "bg-green-50 text-green-600";
                    }

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-zinc-50/70 border border-transparent hover:border-zinc-100 transition-all duration-300 group cursor-pointer"
                      >
                        {/* Colored icon */}
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm"
                          style={{ backgroundColor: item.iconBgColor }}
                        >
                          {item.icon}
                        </div>

                        {/* Content block */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-zinc-800 truncate">
                              {item.title}
                            </h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide select-none ${badgeColors}`}>
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-zinc-400 truncate">
                            {item.subtext}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
