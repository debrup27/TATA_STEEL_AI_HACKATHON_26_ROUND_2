"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle, TrendingUp, Clock, Package } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";

interface RiskAsset {
  id: string;
  name: string;
  score: number;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  impact: string;
  sparesAvailable: boolean;
  downtimeHours: number;
  recommendation: string;
}

export default function AbnormalityPredictionPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeRiskId, setActiveRiskId] = useState<string | null>("risk-1");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const risks: RiskAsset[] = [
    {
      id: "risk-1",
      name: "F1-EQ09 Exhauster Bearing",
      score: 97,
      urgency: "CRITICAL",
      impact: "Total Coke Gas flow bottleneck. High cascade risk: downstream blast furnace gas injection failure within 14 days.",
      sparesAvailable: true,
      downtimeHours: 6,
      recommendation: "Purchase order approved. Schedule replacement on the upcoming Tuesday afternoon outage window.",
    },
    {
      id: "risk-2",
      name: "F2-EQ04 Drive Sprocket",
      score: 81,
      urgency: "HIGH",
      impact: "Sintering strand speed degradation. Potential 15% throughput loss in iron ore burden feeding.",
      sparesAvailable: false,
      downtimeHours: 12,
      recommendation: "Spares on backorder (estimated delivery 5 days). Implement speed cap limits on strand A.",
    },
    {
      id: "risk-3",
      name: "F2-EQ09 Waste Gas Fan Impeller",
      score: 54,
      urgency: "MEDIUM",
      impact: "Minor emission regulation drift. Low process impact. Secondary ventilation loop redundancy matches spec.",
      sparesAvailable: true,
      downtimeHours: 4,
      recommendation: "Add to inspection task list for regular check. Keep monitoring vibration spectral alarms.",
    },
    {
      id: "risk-4",
      name: "F1-EQ11 Electrostatic Precipitator",
      score: 22,
      urgency: "LOW",
      impact: "Negligible process risk. Collector grid capacity operating at 92%. Nominal redundant plates clean.",
      sparesAvailable: true,
      downtimeHours: 2,
      recommendation: "Schedule clean-out during standard monthly preventive maintenance cycle.",
    },
  ];

  const activeRisk = risks.find(r => r.id === activeRiskId) || risks[0];

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === "CRITICAL") return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    if (urgency === "HIGH") return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    if (urgency === "MEDIUM") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-rose-500";
    if (score >= 50) return "text-orange-500";
    if (score >= 25) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none"
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes marqueeDown {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0%); }
          }
          @keyframes marqueeUp {
            0% { transform: translateY(0%); }
            100% { transform: translateY(-50%); }
          }
          .animate-marquee-up {
            animation: marqueeUp 35s linear infinite;
          }
          .animate-marquee-down {
            animation: marqueeDown 35s linear infinite;
          }
          .atal-text-filled {
            font-family: var(--font-pixeloid);
            font-weight: 900;
            color: #000000;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            transform: rotate(90deg);
            display: inline-block;
          }
          .atal-text-filled:hover {
            color: #f97316;
            transform: scale(1.1) rotate(90deg);
          }
        `
      }} />

      {isMobile ? (
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />HUB
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Abnormality Prediction & Triage
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport.</p>
            <Link href="/sansad/hub" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Console
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("SANSAD").concat(Array(6).fill("SANSAD")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("ATAL").concat(Array(6).fill("ATAL")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:hidden [&::-webkit-scrollbar-thumb]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="w-full flex items-center justify-between mb-6 border-b border-zinc-200 pb-4 select-none">
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub" className="flex items-center select-none">
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
                  ABNORMALITY PREDICTION
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Anomaly scoring & triage assessment
                </span>
              </div>
              <div className="w-1/4" />
            </div>

            {/* Left/Right split */}
            <div className="flex-1 flex gap-8 min-h-0">
              <div className="w-[45%] h-full flex flex-col gap-4 overflow-y-auto pr-6 scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:hidden [&::-webkit-scrollbar-thumb]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {risks.map((risk) => {
                  const isActive = risk.id === activeRiskId;
                  const scoreColor = getScoreColor(risk.score);

                  return (
                    <div
                      key={risk.id}
                      onClick={() => setActiveRiskId(risk.id)}
                      className={`rounded-2xl border p-6 flex flex-col relative transition-all duration-300 cursor-pointer select-none mr-1 ${
                        isActive
                          ? "bg-[#4A582E] border-[#4A582E] shadow-md text-white"
                          : "bg-white border-zinc-200 hover:border-[#4A582E]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-mono text-xs font-bold uppercase tracking-widest ${isActive ? "text-zinc-200" : "text-zinc-400"}`}>
                          {risk.urgency} Priority
                        </span>
                        <span className={`text-2xl font-black ${isActive ? "text-white" : scoreColor}`} style={{ fontFamily: "var(--font-questrial)" }}>
                          {risk.score}
                        </span>
                      </div>
                      <h3 className={`text-lg font-black uppercase ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                        {risk.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={`font-mono font-bold ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                          {risk.downtimeHours}h outage
                        </span>
                        <span className={`font-mono font-bold ${isActive ? "text-zinc-300" : risk.sparesAvailable ? "text-emerald-600" : "text-rose-500"}`}>
                          Spares: {risk.sparesAvailable ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                {activeRisk && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6 pb-6 border-b border-zinc-150">
                      <div>
                        <span className="font-mono text-sm font-black text-orange-500 uppercase tracking-wider">Abnormality Assessment</span>
                        <h3 className="text-3xl font-black text-[#1b253c] uppercase mt-1" style={{ fontFamily: "var(--font-questrial)" }}>
                          {activeRisk.name}
                        </h3>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-sm font-black border shrink-0 ${
                        activeRisk.urgency === "CRITICAL"
                          ? "text-rose-600 bg-rose-50 border-rose-200 animate-pulse"
                          : activeRisk.urgency === "HIGH"
                            ? "text-orange-600 bg-orange-50 border-orange-200"
                            : activeRisk.urgency === "MEDIUM"
                              ? "text-amber-600 bg-amber-50 border-amber-200"
                              : "text-emerald-600 bg-emerald-50 border-emerald-200"
                      }`} style={{ fontFamily: "var(--font-questrial)" }}>
                        {activeRisk.urgency} · {activeRisk.score}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-[#FAF9F5] p-4 rounded-xl border border-zinc-150 flex flex-col items-center gap-1">
                        <ShieldAlert className="w-5 h-5 text-zinc-400" />
                        <span className="block font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Triage Tier</span>
                        <span className={`text-xl font-black ${getScoreColor(activeRisk.score)}`} style={{ fontFamily: "var(--font-questrial)" }}>{activeRisk.urgency}</span>
                      </div>
                      <div className="bg-[#FAF9F5] p-4 rounded-xl border border-zinc-150 flex flex-col items-center gap-1">
                        <Clock className="w-5 h-5 text-zinc-400" />
                        <span className="block font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Est. Outage</span>
                        <span className="block text-xl font-black text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>{activeRisk.downtimeHours} Hrs</span>
                      </div>
                      <div className="bg-[#FAF9F5] p-4 rounded-xl border border-zinc-150 flex flex-col items-center gap-1">
                        <Package className="w-5 h-5 text-zinc-400" />
                        <span className="block font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Spares Ready</span>
                        <span className={`block text-xl font-black ${activeRisk.sparesAvailable ? "text-emerald-600" : "text-rose-500"}`} style={{ fontFamily: "var(--font-questrial)" }}>{activeRisk.sparesAvailable ? "YES" : "NO"}</span>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:hidden [&::-webkit-scrollbar-thumb]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <ShieldAlert className="w-4 h-4 text-orange-500" />
                          <span className="font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">Process Bottleneck Impact</span>
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed font-sans bg-[#FAF9F5] p-5 rounded-2xl border border-zinc-150">
                          {activeRisk.impact}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span className="font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">Agent Triage & Recommendation</span>
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed font-sans bg-[#FAF9F5] p-5 rounded-2xl border border-zinc-150">
                          {activeRisk.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-150 pt-4 mt-4 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Validated by Manas Anomaly Engine
                      </div>
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
