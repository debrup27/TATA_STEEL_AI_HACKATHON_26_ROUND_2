"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, GripHorizontal, ChevronDown, Activity, Clock, Wrench, ShieldAlert } from "lucide-react";
import type { FlowNode } from "./types";
import WorkflowAddMenu from "./WorkflowAddMenu";
import {
  CARD_HEIGHT_COLLAPSED,
  CARD_HEIGHT_EXPANDED,
  CARD_WIDTH_COLLAPSED,
  CARD_WIDTH_EXPANDED,
} from "./layout";

interface WorkflowNodeCardProps {
  node: FlowNode;
  isExpanded: boolean;
  isFirstInChain: boolean;
  isEditing: boolean;
  showAddMenu: boolean;
  zoomScale: number;
  activeFactory: "horizon" | "zephyr";
  editTitle: string;
  editSubtitle: string;
  refreshCountdown?: number;
  faultInjected?: boolean;
  setEditTitle: (val: string) => void;
  setEditSubtitle: (val: string) => void;
  onNodeClick: (id: string) => void;
  onCloseExpand: () => void;
  onNodeDragStart: (e: React.MouseEvent, id: string) => void;
  onRenameStart: (node: FlowNode) => void;
  onRenameSave: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onResetTelemetry: (id: string) => void;
  onToggleAddMenu: (id: string) => void;
  onAddNodeAfter: (parentId: string, type: string) => void;
  allNodes: FlowNode[];
  onToggleConnection: (parentId: string, targetId: string) => void;
}

function HealthBar({ score }: { score: number }) {
  const color = score < 40 ? "#ef4444" : score < 60 ? "#f97316" : score < 80 ? "#eab308" : "#22c55e";
  return (
    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(2, score)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  if (score < 40) return <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase">CRITICAL</span>;
  if (score < 60) return <span className="text-[9px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase">WARNING</span>;
  if (score < 80) return <span className="text-[9px] font-extrabold text-yellow-600 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full uppercase">CAUTION</span>;
  return <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">NOMINAL</span>;
}

export default function WorkflowNodeCard({
  node,
  isExpanded,
  isFirstInChain,
  showAddMenu,
  refreshCountdown,
  faultInjected = false,
  onNodeClick,
  onCloseExpand,
  onNodeDragStart,
  onResetTelemetry,
  onToggleAddMenu,
  onAddNodeAfter,
  allNodes,
  onToggleConnection,
}: WorkflowNodeCardProps) {
  const cardWidth = isExpanded ? CARD_WIDTH_EXPANDED : CARD_WIDTH_COLLAPSED;
  const cardHeight = isExpanded ? CARD_HEIGHT_EXPANDED : CARD_HEIGHT_COLLAPSED;

  const healthScore = node.healthScore ?? 100;
  const isNodeCritical = node.statusColor === "#ef4444" || healthScore < 40 || faultInjected;
  const isCompleted = node.status === "completed";
  const isRunning = node.status === "running";
  const hasOutput = node.nextNodes.length > 0;
  const showPorts = !isExpanded;

  const rulHours = node.rulHours;
  const rulUrgent = rulHours != null && rulHours < 48;
  const anomalyScore = node.anomalyScore;
  const faultClass = node.faultClass;
  const activeAlerts = node.activeAlerts ?? 0;
  const campaignHours = node.campaignHours ?? 0;
  const lastMaintenance = node.lastMaintenance;

  return (
    <motion.div
      animate={{ width: cardWidth, height: cardHeight }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute group z-10"
      style={{
        left: node.x,
        top: node.y,
        zIndex: isExpanded ? 50 : showAddMenu ? 40 : isNodeCritical ? 30 : 10,
      }}
    >
      {/* Pipeline ports */}
      {showPorts && !isFirstInChain && (
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md z-20 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: 0, top: CARD_HEIGHT_COLLAPSED / 2, backgroundColor: "#3b82f6" }}
        />
      )}
      {showPorts && hasOutput && (
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md z-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ left: CARD_WIDTH_COLLAPSED, top: CARD_HEIGHT_COLLAPSED / 2, backgroundColor: "#3b82f6" }}
        />
      )}

      <div
        className={`node-element w-full h-full bg-white rounded-2xl border-2 flex flex-col select-none overflow-hidden cursor-grab active:cursor-grabbing ${
          isExpanded
            ? "border-zinc-800 shadow-2xl"
            : isNodeCritical
              ? "border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.25)] hover:shadow-lg"
              : isRunning
                ? "border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.2)]"
                : isCompleted
                  ? "border-zinc-200 shadow-xs hover:shadow-md"
                  : "border-zinc-100 shadow-3xs hover:opacity-100"
        }`}
        onMouseDown={(e) => onNodeDragStart(e, node.id)}
        onClick={() => { if (!isExpanded) onNodeClick(node.id); }}
      >
        {/* Drag handle */}
        <div
          className="node-drag-handle w-full h-8 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between px-3 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => { e.stopPropagation(); onNodeDragStart(e, node.id); }}
        >
          <GripHorizontal className="w-4 h-4 text-zinc-300" />
          {!isExpanded && (
            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              click to expand
            </span>
          )}
        </div>

        {isExpanded && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCloseExpand(); }}
            className="action-button absolute top-9 right-3 z-35 size-8 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}

        <div className={`flex-1 min-h-0 relative ${isExpanded ? "flex flex-col overflow-hidden px-4 pb-2 pt-2" : "overflow-hidden p-3"}`}>
          {!isExpanded ? (
            /* ─── Collapsed view ─── */
            <div className="h-full flex flex-col gap-2">
              <div>
                <h5 className="text-[13px] font-extrabold text-zinc-800 leading-tight line-clamp-2">{node.title}</h5>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{node.subtitle}</p>
              </div>
              {node.sensors && node.sensors.length > 0 && (
                <div className="flex flex-col gap-1 mt-auto">
                  {node.sensors.slice(0, 2).map((sensor, idx) => (
                    <div key={`${sensor.name}-${idx}`} className="flex justify-between items-center text-[11px] font-mono border-b border-zinc-100 pb-1">
                      <span className="text-zinc-500 font-medium truncate max-w-[50%]">{sensor.name}</span>
                      <span className={`font-bold truncate max-w-[48%] text-right tabular-nums ${sensor.status === "OK" ? "text-zinc-800" : "text-red-600"}`}>
                        {sensor.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {rulHours != null && (
                <div className="flex justify-between items-center text-[10px] font-bold mt-1">
                  <span className="text-zinc-400">RUL</span>
                  <span className={rulUrgent ? "text-red-500" : "text-zinc-500"}>{Math.round(rulHours)}h</span>
                </div>
              )}
            </div>
          ) : (
            /* ─── Expanded view ─── */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col min-h-0 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-zinc-100 pb-3 shrink-0 pr-10">
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{node.type}</span>
                  <h5 className="text-base font-extrabold text-zinc-900 mt-2 leading-snug">{node.title}</h5>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{node.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <RiskBadge score={healthScore} />
                  {(isNodeCritical || activeAlerts > 0) && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 mt-0.5">
                      <AlertTriangle className="size-3" />
                      <span>{activeAlerts > 0 ? `${activeAlerts} ALERT${activeAlerts !== 1 ? "S" : ""}` : "FAULT ACTIVE"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* data-no-drag: prevents accidental drag initiation from scrollable content body */}
              <div data-no-drag="true" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-2 pr-1 space-y-2.5">

                {/* Health + RUL cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Activity className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">Health</span>
                    </div>
                    <div className="text-[22px] font-black tabular-nums leading-none mb-1.5"
                      style={{ color: healthScore < 40 ? "#ef4444" : healthScore < 60 ? "#f97316" : healthScore < 80 ? "#eab308" : "#22c55e" }}>
                      {Math.round(healthScore)}%
                    </div>
                    <HealthBar score={healthScore} />
                    {campaignHours > 0 && (
                      <div className="text-[9px] font-mono text-zinc-400 mt-1">{Math.round(campaignHours)}h run time</div>
                    )}
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">RUL</span>
                    </div>
                    {rulHours != null ? (
                      <>
                        <div className={`text-[22px] font-black tabular-nums leading-none ${rulUrgent ? "text-red-500" : "text-zinc-900"}`}>
                          {Math.round(rulHours)}h
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 mt-1">hours remaining</div>
                      </>
                    ) : (
                      <div className="text-[13px] font-bold text-zinc-400 mt-1 leading-tight">Calculating…</div>
                    )}
                  </div>
                </div>

                {/* Anomaly / fault classification */}
                {(anomalyScore != null || faultClass != null) && (
                  <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                    <div className="flex items-center gap-1 mb-1.5">
                      <ShieldAlert className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">ML Diagnostics</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {anomalyScore != null && (
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">Anomaly</span>
                          <span className={`text-[13px] font-black tabular-nums ${anomalyScore > 0.5 ? "text-red-500" : "text-zinc-800"}`}>
                            {(anomalyScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {faultClass != null && (
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">Fault Class</span>
                          <span className={`text-[13px] font-black tabular-nums ${faultClass > 0 ? "text-orange-500" : "text-zinc-800"}`}>
                            {faultClass > 0 ? `Class ${faultClass}` : "None"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last maintenance */}
                {lastMaintenance && (
                  <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Wrench className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">Last Maintenance</span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 mb-0.5">
                      {lastMaintenance.date?.slice(0, 10)} · {lastMaintenance.event_type?.replace(/_/g, " ")}
                    </div>
                    <p className="text-[10px] font-semibold text-zinc-700 leading-snug line-clamp-2">{lastMaintenance.description}</p>
                    {lastMaintenance.outcome && (
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-1 block">{lastMaintenance.outcome}</span>
                    )}
                  </div>
                )}

                {/* Sensor readings */}
                {node.sensors && node.sensors.length > 0 && (
                  <div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 font-bold text-[9px] text-zinc-400 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-1">
                      <span>Sensor</span><span>Reading</span><span>State</span>
                    </div>
                    {node.sensors.map((sensor, idx) => (
                      <div key={`${sensor.name}-${sensor.value}-${idx}`} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center py-1.5 border-b border-zinc-100 last:border-0 font-mono">
                        <span className="text-[11px] font-semibold text-zinc-600 break-words">{sensor.name}</span>
                        <span className="text-[12px] font-bold tabular-nums whitespace-nowrap text-zinc-900">{sensor.value}</span>
                        <span className={`text-[10px] font-extrabold ${sensor.status === "OK" ? "text-emerald-600" : sensor.status === "HIGH" ? "text-orange-500" : "text-red-600"}`}>
                          {sensor.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-zinc-100 mt-2 shrink-0">
                {isNodeCritical && (
                  <button
                    type="button"
                    onClick={() => onResetTelemetry(node.id)}
                    className="panel-button flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Reset to Nominal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => alert("Maintenance work order ticket raised in system database.")}
                  className="panel-button flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] cursor-pointer"
                >
                  Work Order
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Collapsed footer */}
        {!isExpanded && (
          <div className="px-3 py-2 bg-white border-t border-zinc-100 flex items-center justify-between shrink-0">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
              isNodeCritical ? "text-red-600 bg-red-50 border-red-100" : isRunning ? "text-blue-600 bg-blue-50 border-blue-100" : "text-zinc-500 bg-zinc-50 border-zinc-200"
            }`}>
              {isNodeCritical ? "Alert" : isRunning ? "Live" : "Nominal"}
            </span>
            <span className="text-[11px] font-mono font-semibold text-zinc-400 tabular-nums">↻ {refreshCountdown ?? 10}s</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddMenu && (
          <WorkflowAddMenu
            node={node}
            cardWidth={cardWidth}
            allNodes={allNodes}
            onClose={() => onToggleAddMenu(node.id)}
            onAddNodeAfter={onAddNodeAfter}
            onToggleConnection={(targetId) => onToggleConnection(node.id, targetId)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
