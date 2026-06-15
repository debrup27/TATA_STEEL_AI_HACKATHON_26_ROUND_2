"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SPRING_DEFAULT } from "@/lib/constants";
import { triggerPageTransition } from "@/animations/PageTransition";
import type { ProductionLineData } from "@/services/types";

interface FactoryTab {
  id: "jamshedpur" | "kalinganagar" | "meramandali";
  name: string;
  location: string;
}

interface ProductionLineWithIcon extends ProductionLineData {
  icon: React.ReactNode;
}

export default function SansadFactoriesDashboard() {
  const [activeTab, setActiveTab] = useState<"jamshedpur" | "kalinganagar" | "meramandali">("jamshedpur");
  const [targetOutput, setTargetOutput] = useState(85);

  const factories: FactoryTab[] = [
    { id: "jamshedpur", name: "Jamshedpur Works", location: "Jharkhand, IN" },
    { id: "kalinganagar", name: "Kalinganagar Plant", location: "Odisha, IN" },
    { id: "meramandali", name: "Meramandali Plant", location: "Odisha, IN" }
  ];

  // Mock data for each factory's production lines
  const productionData: Record<string, ProductionLineWithIcon[]> = {
    jamshedpur: [
      {
        name: "Coke Plant 1",
        statusText: "High Output",
        type: "active",
        outputRate: "4,500 T/day",
        iconBgColor: "#3b82f6",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      },
      {
        name: "Sinter Plant 2",
        statusText: "Heat Level: 92°C",
        type: "warning",
        outputRate: "3,200 T/day",
        iconBgColor: "#eab308",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        )
      },
      {
        name: "Blast Furnace H",
        statusText: "Slag Flow Normal",
        type: "normal",
        outputRate: "6,800 T/day",
        iconBgColor: "#22c55e",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        )
      },
      {
        name: "Hot Strip Mill",
        statusText: "Winding Critical",
        type: "critical",
        outputRate: "5,400 T/day",
        iconBgColor: "#ef4444",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      }
    ],
    kalinganagar: [
      {
        name: "Coke Plant 2",
        statusText: "Nominal Output",
        type: "normal",
        outputRate: "5,100 T/day",
        iconBgColor: "#22c55e",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      },
      {
        name: "Blast Furnace 1",
        statusText: "Sensors Abnormal",
        type: "warning",
        outputRate: "7,200 T/day",
        iconBgColor: "#eab308",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      },
      {
        name: "Cold Rolling Mill",
        statusText: "Operational",
        type: "active",
        outputRate: "4,900 T/day",
        iconBgColor: "#3b82f6",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      }
    ],
    meramandali: [
      {
        name: "Blast Furnace 2",
        statusText: "Stable Operations",
        type: "normal",
        outputRate: "6,500 T/day",
        iconBgColor: "#22c55e",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        name: "Sinter Plant 1",
        statusText: "High Heat Level",
        type: "warning",
        outputRate: "2,800 T/day",
        iconBgColor: "#eab308",
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        )
      }
    ]
  };

  const currentLines = productionData[activeTab] || [];

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Top Heading Style (Thin and Thick) */}
      <div className="text-center mb-8 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-950 mb-2 select-none flex flex-wrap justify-center items-center gap-x-2 md:gap-x-3 leading-tight font-sans">
          <span className="font-thin italic text-zinc-500">Reliable infrastructure</span>
          <span className="font-extrabold text-zinc-900">to manage factories</span>
        </h2>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col transition-all duration-300">
        
        {/* Navigation/Factory Selection Switch with sliding motion.div active state */}
        <div className="w-full flex justify-start md:justify-center overflow-x-auto pb-4 mb-6 border-b border-zinc-100 scrollbar-none">
          <div className="flex bg-zinc-100/70 p-1.5 rounded-full items-center gap-1.5 min-w-max relative">
            {factories.map((fac) => {
              const isActive = activeTab === fac.id;
              return (
                <button
                  key={fac.id}
                  onClick={() => setActiveTab(fac.id)}
                  className={`relative flex flex-col items-start px-5 py-2 rounded-full transition-all duration-300 cursor-pointer select-none z-10 ${
                    isActive ? "text-blue-600" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span className="text-xs font-bold">{fac.name}</span>
                  <span className="text-[9px] opacity-60 font-semibold">{fac.location}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeFactoryTabBackground"
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Factory Operations Diagnostics (7 Columns) */}
          <div className="md:col-span-7 flex flex-col justify-between border border-zinc-100 rounded-2xl p-6 bg-zinc-50/40 relative min-h-[350px]">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  Live Operations
                </span>
                <span className="text-xs font-bold text-zinc-400 select-none">
                  Updated: Just Now
                </span>
              </div>

              <h3 className="text-xl font-bold text-zinc-800 mb-4 select-none">
                Continuous Casting Output
              </h3>

              {/* Graphical Parameter Controls */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-600 mb-2 select-none">
                    <span>Active Furnace Target Load</span>
                    <span className="text-blue-600">{targetOutput}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={targetOutput}
                    onChange={(e) => setTargetOutput(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-zinc-100 rounded-xl">
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
                      Steel Output Rate
                    </span>
                    <span className="text-lg font-extrabold text-zinc-800">
                      {Math.round(150 * targetOutput)} Tons/hr
                    </span>
                  </div>
                  <div className="p-4 bg-white border border-zinc-100 rounded-xl">
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
                      Mill Speed Level
                    </span>
                    <span className="text-lg font-extrabold text-zinc-800">
                      {(0.85 * targetOutput).toFixed(1)} RPM
                    </span>
                  </div>
                </div>

                {/* Anomaly Log list */}
                <div className="mt-4 p-4 bg-[#1b253c]/5 border border-zinc-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      ATAL Diagnostics Scanner
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                    {targetOutput > 85
                      ? "High loads detected in Taphole Mill. Automated cooling jets triggered at maximum capacity. Monitor structural shear values."
                      : "Telemetry streaming normal. Thermosensors aligned within tolerance ranges. All equipment functioning correctly."}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Controls inside Left Panel */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-100/60">
              <span className="text-xs font-bold text-zinc-400 select-none">
                Scale: {targetOutput > 85 ? "Maximum Output Alert" : "Optimal Conditions"}
              </span>
              <button
                type="button"
                onClick={() => triggerPageTransition("/sansad/hub")}
                className="w-11 h-11 rounded-full bg-[#1b253c] hover:bg-blue-600 text-white flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer transform hover:scale-105 active:scale-95"
                aria-label="Open SANSAD hub"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.25" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Panel: Factory Active Production Lines (5 Columns) */}
          <div className="md:col-span-5 flex flex-col justify-between p-1">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-zinc-800 select-none">
                  Production Lines
                </h3>
                <button
                  type="button"
                  onClick={() => triggerPageTransition("/sansad/hub/horizon-foundry")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer select-none"
                >
                  View all
                </button>
              </div>

              {/* List of Production Lines */}
              <div className="flex flex-col gap-4">
                {currentLines.map((line, index) => {
                  let badgeColor = "bg-blue-50 text-blue-600";
                  if (line.type === "critical") {
                    badgeColor = "bg-red-50 text-red-600";
                  } else if (line.type === "warning") {
                    badgeColor = "bg-orange-50 text-orange-600";
                  } else if (line.type === "normal") {
                    badgeColor = "bg-green-50 text-green-600";
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-zinc-50/70 border border-transparent hover:border-zinc-100 transition-all duration-300 group cursor-pointer"
                    >
                      {/* Avatar / Production Icon */}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm"
                        style={{ backgroundColor: line.iconBgColor }}
                      >
                        {line.icon}
                      </div>

                      {/* Content block */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-zinc-800 truncate">
                            {line.name}
                          </h4>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide select-none ${badgeColor}`}>
                            {line.statusText}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-400 truncate">
                          Output: {line.outputRate}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Inside Right Panel */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-zinc-100">
              <span className="text-xs font-bold text-zinc-500 select-none">
                Diagnostic Scan?
              </span>
              <button
                type="button"
                onClick={() => triggerPageTransition("/sansad/hub/diagnostics")}
                className="bg-[#1b253c] hover:bg-zinc-800 text-white text-[11px] font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-md transform hover:scale-105 active:scale-95 select-none"
              >
                Scan telemetry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Button below card */}
      <button
        type="button"
        onClick={() => triggerPageTransition("/sansad/hub")}
        className="mt-8 bg-white border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-6 py-3.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm select-none transform hover:scale-105 active:scale-95"
      >
        Initialize Factory Dashboard
      </button>
    </div>
  );
}
