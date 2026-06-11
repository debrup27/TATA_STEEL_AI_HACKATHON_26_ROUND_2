"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlowNode {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "input" | "condition" | "action" | "end" | "alert" | "schedule";
  statusColor: string;
  previewContent: React.ReactNode;
}

export default function AtalWorkflowFlowchart() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [hasAnomaly, setHasAnomaly] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([
    "System Ready. Click 'Run Simulation' to trace industrial troubleshooting flow."
  ]);

  const cardWidth = 220;
  const cardHeight = 150;

  const nodes: FlowNode[] = [
    {
      id: "node_1",
      title: "Read Telemetry",
      subtitle: "Ingest Sensor Feeds",
      x: 40,
      y: 160,
      width: cardWidth,
      height: cardHeight,
      type: "input",
      statusColor: "#3b82f6",
      previewContent: (
        <div className="text-[10px] text-zinc-500 font-mono space-y-1 p-2 bg-zinc-50 rounded-lg h-full overflow-hidden select-none">
          <div className="flex justify-between border-b border-zinc-200 pb-0.5 font-bold text-zinc-700">
            <span>Sensor</span>
            <span>Val</span>
            <span>Stat</span>
          </div>
          <div className="flex justify-between text-red-500 font-semibold">
            <span>BF_Temp</span>
            <span>108°C</span>
            <span>HIGH</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>BF_Press</span>
            <span>3.2b</span>
            <span>OK</span>
          </div>
        </div>
      )
    },
    {
      id: "node_2",
      title: "Analyze Feeds",
      subtitle: "Anomaly Classifier",
      x: 300,
      y: 200,
      width: cardWidth,
      height: cardHeight,
      type: "condition",
      statusColor: "#a855f7",
      previewContent: (
        <div className="flex flex-col items-center justify-center h-full bg-zinc-50 rounded-lg p-2 text-center select-none">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Threshold check</span>
          <span className="text-[10px] font-extrabold text-zinc-700 mt-1">Temp &gt; 95°C ?</span>
          <div className="flex gap-4 mt-2">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded">TRUE</span>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-green-100 text-green-600 rounded">FALSE</span>
          </div>
        </div>
      )
    },
    // Top Branch (Anomaly detected)
    {
      id: "node_3a",
      title: "Cooling Protocol",
      subtitle: "Deploy Active Cooling",
      x: 560,
      y: 40,
      width: cardWidth,
      height: cardHeight,
      type: "action",
      statusColor: "#ef4444",
      previewContent: (
        <div className="text-[10px] text-zinc-600 space-y-1.5 p-2 bg-zinc-50 rounded-lg h-full select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-zinc-700">VALVE_4A: OPEN</span>
          </div>
          <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[100%]" />
          </div>
          <span className="text-[9px] font-bold text-zinc-400 block mt-1">Flow: 250 L/min</span>
        </div>
      )
    },
    // Bottom Branch (No anomaly)
    {
      id: "node_3b",
      title: "Write Telemetry",
      subtitle: "Log Normal State",
      x: 560,
      y: 330,
      width: cardWidth,
      height: cardHeight,
      type: "end",
      statusColor: "#22c55e",
      previewContent: (
        <div className="flex flex-col items-center justify-center h-full bg-zinc-50 rounded-lg p-2 select-none">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-[9px] font-bold text-zinc-500 uppercase">State Saved</span>
        </div>
      )
    },
    // Continues from 3a
    {
      id: "node_4a",
      title: "Alert Commands",
      subtitle: "Notify Supervisor",
      x: 820,
      y: 160,
      width: cardWidth,
      height: cardHeight,
      type: "alert",
      statusColor: "#f97316",
      previewContent: (
        <div className="text-[9px] text-zinc-600 space-y-1 p-2 bg-zinc-50 rounded-lg h-full select-none">
          <div className="font-bold text-zinc-700 border-b pb-0.5 mb-1 flex justify-between">
            <span>Shift Alerts</span>
            <span className="text-red-500">Active</span>
          </div>
          <div className="truncate bg-white p-1 border rounded text-[8px] font-semibold text-zinc-500">
            SMS: Furnace temp crit...
          </div>
          <div className="truncate bg-white p-1 border rounded text-[8px] font-semibold text-zinc-500">
            Slack: #atal-alerts pinged
          </div>
        </div>
      )
    },
    {
      id: "node_5",
      title: "Schedule Inspection",
      subtitle: "Inspection Ticket",
      x: 1080,
      y: 160,
      width: cardWidth,
      height: cardHeight,
      type: "schedule",
      statusColor: "#eab308",
      previewContent: (
        <div className="text-[10px] text-zinc-600 space-y-1 p-2 bg-zinc-50 rounded-lg h-full select-none">
          <span className="block font-bold text-zinc-700">Ticket #ATAL-889</span>
          <span className="block text-zinc-500">Inspection: Next Shift</span>
          <div className="flex gap-2 mt-1.5">
            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Pending</span>
            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded">Priority: H</span>
          </div>
        </div>
      )
    }
  ];

  // Bezier curve calculations
  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const runSimulation = () => {
    setSimulationStep(1);
    setLogs(["Simulation Started...", "Node 1: Reading live Blast Furnace telemetry data feeds."]);

    const stepTimings = [
      { step: 2, delay: 1500, log: "Node 2: Running anomaly classification on sensor inputs. Warning threshold is > 95°C." },
      {
        step: 3,
        delay: 3000,
        log: hasAnomaly
          ? "Node 3a: Temp (108°C) exceeds limit. Executing active emergency cooling protocol - opening Valve 4A."
          : "Node 3b: Temp is nominal. Writing safe state to PostgreSQL telemetry logs."
      },
      {
        step: 4,
        delay: 4500,
        log: hasAnomaly
          ? "Node 4a: Emergency cooling initiated. Routing alerts to Shift Supervisor and plant emergency channels."
          : "Simulation Finished. All readings normal."
      },
      {
        step: 5,
        delay: 6000,
        log: hasAnomaly
          ? "Node 5: Scheduling manual furnace taphole alignment inspection ticket for the next production shift."
          : ""
      },
      { step: 6, delay: 7500, log: "Simulation Completed." }
    ];

    stepTimings.forEach(({ step, delay, log }) => {
      setTimeout(() => {
        if (step === 3 && !hasAnomaly) {
          setSimulationStep(3.5); // Unique step code for bottom branch
        } else if (step === 4 && !hasAnomaly) {
          setSimulationStep(6); // Skip to end
        } else {
          setSimulationStep(step);
        }
        if (log) {
          setLogs((prev) => [...prev, log]);
        }
      }, delay);
    });
  };



  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Interactive simulation controls panel */}
      <div className="w-full max-w-5xl flex flex-wrap justify-between items-center bg-white border border-zinc-100 shadow-sm rounded-2xl p-4 mb-6 gap-4 z-10 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={runSimulation}
            disabled={simulationStep > 0 && simulationStep < 6}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all duration-300 shadow-md ${
              simulationStep > 0 && simulationStep < 6
                ? "bg-zinc-400 cursor-not-allowed"
                : "bg-[#1b253c] hover:bg-blue-600 cursor-pointer transform hover:scale-105 active:scale-95"
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            Run Simulation
          </button>

          {/* Toggle Preset */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setHasAnomaly(true);
                setSimulationStep(0);
                setLogs(["System State Configured: CRITICAL ANOMALY PRE-SET"]);
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                hasAnomaly ? "bg-white text-red-600 shadow-sm" : "text-zinc-500"
              }`}
            >
              Preset: Critical Temp
            </button>
            <button
              onClick={() => {
                setHasAnomaly(false);
                setSimulationStep(0);
                setLogs(["System State Configured: NORMAL TELEMETRY PRE-SET"]);
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                !hasAnomaly ? "bg-white text-green-600 shadow-sm" : "text-zinc-500"
              }`}
            >
              Preset: Nominal
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Flow Status:
          </span>
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
              simulationStep === 0
                ? "bg-zinc-100 text-zinc-500"
                : simulationStep === 6
                ? "bg-green-100 text-green-600"
                : "bg-blue-50 text-blue-600 animate-pulse"
            }`}
          >
            {simulationStep === 0 ? "Idle" : simulationStep === 6 ? "Finished" : "Running"}
          </span>
        </div>
      </div>

      {/* Main Flow Canvas Card Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col transition-all duration-300 relative">
        
        {/* Horizontal scrollable workspace area */}
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-200">
          <div className="w-[1360px] h-[500px] relative select-none bg-zinc-50/20 rounded-2xl border border-zinc-50">
            
            {/* SVG Connecting Edges Path Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* Node 1 to Node 2 */}
              <path
                d={getBezierPath(40 + cardWidth, 160 + 75, 300, 200 + 75)}
                stroke={simulationStep >= 1 ? "#3b82f6" : "#e4e4e7"}
                strokeWidth={3}
                fill="none"
                className={`transition-colors duration-500 ${
                  simulationStep === 1 ? "stroke-dasharray-anim" : ""
                }`}
              />

              {/* Node 2 splits: Top branch to 3a, Bottom branch to 3b */}
              <path
                d={getBezierPath(300 + cardWidth, 200 + 75, 560, 40 + 75)}
                stroke={simulationStep >= 2 && hasAnomaly ? "#ef4444" : "#e4e4e7"}
                strokeWidth={3}
                fill="none"
                className={`transition-colors duration-500 ${
                  simulationStep === 2 && hasAnomaly ? "stroke-dasharray-anim" : ""
                }`}
              />
              <path
                d={getBezierPath(300 + cardWidth, 200 + 75, 560, 330 + 75)}
                stroke={simulationStep >= 2 && !hasAnomaly ? "#22c55e" : "#e4e4e7"}
                strokeWidth={3}
                fill="none"
                className={`transition-colors duration-500 ${
                  simulationStep === 2 && !hasAnomaly ? "stroke-dasharray-anim" : ""
                }`}
              />

              {/* Node 3a connects to Node 4a */}
              <path
                d={getBezierPath(560 + cardWidth, 40 + 75, 820, 160 + 75)}
                stroke={simulationStep >= 3 && hasAnomaly ? "#f97316" : "#e4e4e7"}
                strokeWidth={3}
                fill="none"
                className={`transition-colors duration-500 ${
                  simulationStep === 3 && hasAnomaly ? "stroke-dasharray-anim" : ""
                }`}
              />

              {/* Node 4a connects to Node 5 */}
              <path
                d={getBezierPath(820 + cardWidth, 160 + 75, 1080, 160 + 75)}
                stroke={simulationStep >= 4 && hasAnomaly ? "#eab308" : "#e4e4e7"}
                strokeWidth={3}
                fill="none"
                className={`transition-colors duration-500 ${
                  simulationStep === 4 && hasAnomaly ? "stroke-dasharray-anim" : ""
                }`}
              />
            </svg>

            {/* SVG Connecting Port Circles */}
            {/* Port 1 Output */}
            <div className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10" style={{ left: 40 + cardWidth - 6, top: 160 + 75 - 6 }} />
            {/* Port 2 Input */}
            <div className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10" style={{ left: 300 - 6, top: 200 + 75 - 6 }} />
            {/* Port 2 Output */}
            <div className="absolute w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-sm z-10" style={{ left: 300 + cardWidth - 6, top: 200 + 75 - 6 }} />
            {/* Port 3a Input */}
            <div className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm z-10" style={{ left: 560 - 6, top: 40 + 75 - 6 }} />
            {/* Port 3b Input */}
            <div className="absolute w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm z-10" style={{ left: 560 - 6, top: 330 + 75 - 6 }} />
            {/* Port 3a Output */}
            <div className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm z-10" style={{ left: 560 + cardWidth - 6, top: 40 + 75 - 6 }} />
            {/* Port 4a Input */}
            <div className="absolute w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm z-10" style={{ left: 820 - 6, top: 160 + 75 - 6 }} />
            {/* Port 4a Output */}
            <div className="absolute w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm z-10" style={{ left: 820 + cardWidth - 6, top: 160 + 75 - 6 }} />
            {/* Port 5 Input */}
            <div className="absolute w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow-sm z-10" style={{ left: 1080 - 6, top: 160 + 75 - 6 }} />

            {/* Node Cards Rendering */}
            {nodes.map((node) => {
              // Conditionally hide branch nodes if simulation hasn't reached them yet (optional, or render them all slightly opaque)
              const isPassed =
                simulationStep === 6 ||
                (node.id === "node_1" && simulationStep >= 1) ||
                (node.id === "node_2" && simulationStep >= 2) ||
                (node.id === "node_3a" && simulationStep >= 3 && hasAnomaly) ||
                (node.id === "node_3b" && simulationStep >= 3 && !hasAnomaly) ||
                (node.id === "node_4a" && simulationStep >= 4 && hasAnomaly) ||
                (node.id === "node_5" && simulationStep >= 5 && hasAnomaly);

              const isActive =
                (node.id === "node_1" && simulationStep === 1) ||
                (node.id === "node_2" && simulationStep === 2) ||
                (node.id === "node_3a" && simulationStep === 3 && hasAnomaly) ||
                (node.id === "node_3b" && simulationStep === 3.5 && !hasAnomaly) ||
                (node.id === "node_4a" && simulationStep === 4 && hasAnomaly) ||
                (node.id === "node_5" && simulationStep === 5 && hasAnomaly);

              // Don't render inactive branch nodes to match correct logic path
              if (node.id === "node_3a" && simulationStep >= 3 && !hasAnomaly) return null;
              if (node.id === "node_3b" && simulationStep >= 3 && hasAnomaly) return null;
              if (node.id === "node_4a" && !hasAnomaly && simulationStep >= 3) return null;
              if (node.id === "node_5" && !hasAnomaly && simulationStep >= 3) return null;

              return (
                <div
                  key={node.id}
                  onClick={() => setActiveNode(node.id)}
                  className={`absolute bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden cursor-pointer group select-none ${
                    isActive
                      ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-[1.03]"
                      : isPassed
                      ? "border-zinc-200 shadow-md opacity-100 hover:shadow-lg"
                      : "border-zinc-100 shadow-sm opacity-60 hover:opacity-90"
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height
                  }}
                >
                  {/* Top Preview Content */}
                  <div className="flex-grow p-3 bg-zinc-50/20 border-b border-zinc-100 overflow-hidden relative">
                    {node.previewContent}
                  </div>

                  {/* Bottom Text Area */}
                  <div className="p-3 bg-white flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800">{node.title}</h4>
                      <p className="text-[9px] font-bold text-zinc-400 mt-0.5">{node.subtitle}</p>
                    </div>
                    {/* Status dot indicator */}
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isPassed ? node.statusColor : "#e4e4e7"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Sidebar Logs terminal panel */}
        <div className="w-full mt-6 bg-zinc-950 rounded-2xl p-4 border border-zinc-800 font-mono text-xs text-zinc-300">
          <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-800 pb-2 mb-2 font-bold select-none">
            <span>ATAL Automated Troubleshooting Log Stream</span>
            <span>Celery Coordinator</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto font-medium">
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i}
                  className={
                    log.includes("crit") || log.includes("exceeds")
                      ? "text-red-400 font-bold"
                      : log.includes("Safe") || log.includes("nominal")
                      ? "text-green-400 font-bold"
                      : log.includes("Started") || log.includes("Completed")
                      ? "text-blue-400 font-bold"
                      : "text-zinc-300"
                  }
                >
                  &gt; {log}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Styled inline flow simulation keyframe classes */}
      <style jsx global>{`
        @keyframes strokeFlow {
          from {
            stroke-dashoffset: 40;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .stroke-dasharray-anim {
          stroke-dasharray: 8, 4;
          animation: strokeFlow 1s linear infinite;
        }
        /* Custom scrollbar configurations */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
