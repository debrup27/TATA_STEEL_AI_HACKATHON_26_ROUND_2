"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, CheckSquare, Clock, Package } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";

interface MaintenanceItem {
  id: string;
  code: string;
  date: string;
  asset: string;
  module: string;
  status: "pending" | "scheduled" | "nominal";
  recommendations: string[];
  immediateActions: string[];
  spareStrategy: {
    partNeeded: string;
    availability: string;
    leadTime: string;
    procurementNote: string;
  };
  longTermMonitoring: string[];
}

export default function MaintenancePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeItemId, setActiveItemId] = useState<string>("maint-1");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items: MaintenanceItem[] = [
    {
      id: "maint-1",
      code: "REC-2026-112",
      date: "2026-06-13",
      asset: "F1-EQ09 Centrifugal Exhauster",
      module: "CokeOven-Agent",
      status: "pending",
      recommendations: [
        "Isolate power supply and initiate thermal exhaust shutdown sequence.",
        "Flush inboard spherical roller bearing housing with specialized degreaser.",
        "Apply precision torque calibration matching exhauster baseline settings.",
        "Verify vibration levels align within normal tolerances (> 5.5 mm/s bounds)."
      ],
      immediateActions: [
        "Apply emergency grease to bearing housing F1-EQ09.",
        "Order replacement spherical roller bearing (Part #SRB-22316)."
      ],
      spareStrategy: {
        partNeeded: "Spherical Roller Bearing (Part #SRB-22316)",
        availability: "Out of Stock (Central Warehouse)",
        leadTime: "3 Days",
        procurementNote: "Supplier order raised. Delivery expected June 16, 2026. Local stock checked - negative."
      },
      longTermMonitoring: [
        "Inspect exhauster vibration spectral data daily for the next 14 days.",
        "Perform visual bearing seal check during weekly preventive maintenance shut."
      ]
    },
    {
      id: "maint-2",
      code: "REC-2026-098",
      date: "2026-06-11",
      asset: "F2-EQ09 Waste Gas Fan Impeller",
      module: "Sinter-Agent",
      status: "scheduled",
      recommendations: [
        "Remove waste fan housing inspection hatch.",
        "Inspect impeller blades for local pitting and mechanical cracking.",
        "Conduct dynamic balancing tests on site.",
        "Weld reinforcement plates where blade thickness drops below 4.5mm."
      ],
      immediateActions: [
        "Reduce waste fan load threshold limit to 80% to lower torsional stress."
      ],
      spareStrategy: {
        partNeeded: "Impeller Blade Reinforcement kit (Part #IBK-440)",
        availability: "In Stock (Local Depot)",
        leadTime: "12 Hours",
        procurementNote: "Materials reserved at Workshop 3. Transportation scheduled for scheduled shutdown."
      },
      longTermMonitoring: [
        "Continuous thermocouple temperature monitoring on the exhaust stack.",
        "Conduct ultrasonic blade checks every 90 days."
      ]
    },
    {
      id: "maint-3",
      code: "REC-2026-054",
      date: "2026-06-08",
      asset: "F2-EQ04 Drive Sprocket",
      module: "Sinter-Agent",
      status: "nominal",
      recommendations: [
        "Check alignment offset on the Sinter belt feeder drive coupling.",
        "Re-grease coupling teeth using standard industrial lubricant."
      ],
      immediateActions: [
        "Clean surrounding dust build-up from sprocket drive assembly."
      ],
      spareStrategy: {
        partNeeded: "Drive Sprocket Alignment Shims (Part #DAS-08)",
        availability: "In Stock (Local Depot)",
        leadTime: "Instant",
        procurementNote: "Nominal maintenance kit components. Kept in engineer cabinet."
      },
      longTermMonitoring: [
        "Check drive chain tension during bi-weekly inspections."
      ]
    }
  ];

  const activeItem = items.find((i) => i.id === activeItemId) || items[0];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.module.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none"
    >
      {isMobile ? (
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />SAMVIDHAAN
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Maintenance Action SOPs
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to inspect maintenance SOPs and schedules.</p>
            <Link href="/sansad/hub/samvidhaan" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Command Center
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          {/* Left Gutter Vertical Marquee */}
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("REPAIRS").concat(Array(6).fill("REPAIRS")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Gutter Vertical Marquee */}
          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("SOPS").concat(Array(6).fill("SOPS")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Centered partitioned area */}
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            <div className="w-full flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 select-none">
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub/samvidhaan" className="flex items-center select-none">
                  <div 
                    className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold" 
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  MAINTENANCE WIZARD
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Step-by-step SOP recommendations & parts strategy
                </span>
              </div>
              <div className="w-1/4" />
            </div>

            <div className="flex-1 flex gap-8 min-h-0">
              {/* Left sidebar listing action cards */}
              <div className="w-[42%] h-full flex flex-col gap-4">
                <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search recommendations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-zinc-200 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none transition-all duration-200 font-semibold"
                    />
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex gap-2">
                    {["all", "pending", "scheduled", "nominal"].map((stat) => (
                      <button
                        key={stat}
                        onClick={() => setSelectedStatus(stat)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selectedStatus === stat 
                            ? "bg-[#1b253c] text-white" 
                            : "bg-[#FAF9F5] text-zinc-500 border border-zinc-200 hover:text-[#1b253c] hover:border-zinc-350"
                        }`}
                      >
                        {stat === "all" ? "All Statuses" : stat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-none">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-sm font-mono text-zinc-400">
                      No active tickets.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isActive = item.id === activeItemId;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setActiveItemId(item.id)}
                          className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none relative ${
                            isActive 
                              ? "bg-[#1b253c] border-[#1b253c] shadow-md text-white mr-1" 
                              : "bg-white border-zinc-200 hover:border-[#1b253c] mr-1"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-zinc-350" : "text-zinc-400"}`}>{item.code}</span>
                            <span className={`text-[9px] font-bold uppercase ${
                              item.status === "pending" ? "text-red-500" : item.status === "scheduled" ? "text-amber-500" : "text-emerald-600"
                            }`}>{item.status}</span>
                          </div>
                          <h4 className={`text-base font-black uppercase truncate ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                            {item.asset}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest block mt-1.5 ${isActive ? "text-zinc-300" : "text-zinc-450"}`}>Source: {item.module}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right detail dashboard panels */}
              <div className="flex-grow h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                {activeItem && (
                  <div className="flex flex-col h-full justify-between overflow-y-auto scrollbar-none">
                    <div className="space-y-6">
                      {/* Header block */}
                      <div className="flex justify-between items-start border-b pb-4 mb-4 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-orange-500" />
                            <span className="font-mono text-sm font-black text-orange-500 tracking-wider">{activeItem.code}</span>
                          </div>
                          <h3 className="text-2xl font-black text-[#1b253c] uppercase mt-1 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                            {activeItem.asset}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-mono font-bold border px-3 py-1 rounded-full uppercase leading-none select-none ${
                          activeItem.status === "pending" 
                            ? "bg-rose-50 text-rose-600 border-rose-100" 
                            : activeItem.status === "scheduled"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                          {activeItem.status}
                        </span>
                      </div>

                      {/* Immediate action alert points */}
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                        <span className="block font-mono text-[9px] text-rose-500 font-bold uppercase tracking-wider mb-2">Immediate Action Points</span>
                        <ul className="space-y-1.5 list-disc pl-4 text-xs font-semibold text-rose-700 leading-snug">
                          {activeItem.immediateActions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Step-by-step repair recommendations */}
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Step-by-Step SOP Recommendations</span>
                        <div className="space-y-2 bg-[#FAF9F5] p-5 rounded-2xl border border-zinc-150">
                          {activeItem.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-2.5">
                              <span className="size-4.5 rounded bg-[#1b253c] text-white flex items-center justify-center text-[10px] font-mono font-bold mt-0.5 shrink-0">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-zinc-650 leading-relaxed font-sans">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Parts and Procurement Strategy */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-[#1b253c] font-black uppercase">
                            <Package className="w-4 h-4 text-orange-500" />
                            <span>Spare Procurement Strategy</span>
                          </div>
                          <div className="space-y-1.5 mt-1 text-xs">
                            <div>
                              <span className="text-[9px] font-mono text-zinc-400 font-bold block uppercase">Component Needed</span>
                              <span className="font-bold text-zinc-700">{activeItem.spareStrategy.partNeeded}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-zinc-400 font-bold block uppercase">Availability / Lead Time</span>
                              <span className="font-bold text-zinc-700">{activeItem.spareStrategy.availability} ({activeItem.spareStrategy.leadTime})</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-[#1b253c] font-black uppercase">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span>Long-Term Monitoring</span>
                          </div>
                          <ul className="space-y-1.5 list-disc pl-4 text-[11px] text-zinc-600 font-semibold leading-snug mt-1">
                            {activeItem.longTermMonitoring.map((mon, idx) => (
                              <li key={idx}>{mon}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action panel */}
                    <div className="border-t border-zinc-150 pt-5 mt-6 shrink-0 flex justify-between items-center bg-white z-10 no-drag">
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Procurement Status</span>
                        <span className="block text-xs font-bold text-zinc-700 mt-0.5">{activeItem.spareStrategy.procurementNote}</span>
                      </div>
                      <button 
                        onClick={() => alert("System generated work order and spare requisition successfully.")}
                        className="bg-[#1b253c] hover:bg-[#f97316] text-white text-[10px] font-bold px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-md select-none"
                        style={{ fontFamily: "var(--font-pixeloid)" }}
                      >
                        Approve Spare Requisition
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
