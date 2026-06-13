"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Copy, Trash2, X, AlertTriangle } from "lucide-react";
import type { FlowNode } from "./types";
import WorkflowAddMenu from "./WorkflowAddMenu";

interface WorkflowNodeCardProps {
  node: FlowNode;
  isExpanded: boolean;
  isEditing: boolean;
  showAddMenu: boolean;
  zoomScale: number;
  activeFactory: "horizon" | "zephyr";
  editTitle: string;
  editSubtitle: string;
  setEditTitle: (val: string) => void;
  setEditSubtitle: (val: string) => void;
  onNodeClick: (id: string) => void;
  onCloseExpand: () => void;
  onNodeDragStart: (e: React.MouseEvent, id: string) => void;
  onRenameStart: (node: FlowNode) => void;
  onRenameSave: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSimulateAnomaly: (id: string) => void;
  onResetTelemetry: (id: string) => void;
  onToggleAddMenu: (id: string) => void;
  onAddNodeAfter: (parentId: string, type: string) => void;
  allNodes: FlowNode[];
  onToggleConnection: (parentId: string, targetId: string) => void;
}

const getCardWidth = (isExpanded: boolean) => (isExpanded ? 340 : 240);
const getCardHeight = (isExpanded: boolean) => (isExpanded ? 300 : 140);

const WorkflowNodeCardComponent = React.memo(function WorkflowNodeCard({
  node,
  isExpanded,
  isEditing,
  showAddMenu,
  activeFactory,
  editTitle,
  setEditTitle,
  onNodeClick,
  onCloseExpand,
  onNodeDragStart,
  onRenameStart,
  onRenameSave,
  onDuplicate,
  onDelete,
  onSimulateAnomaly,
  onResetTelemetry,
  onToggleAddMenu,
  onAddNodeAfter,
  allNodes,
  onToggleConnection,
}: WorkflowNodeCardProps) {
  const isCompleted = node.status === "completed";
  const isRunning = node.status === "running";
  const cardWidth = getCardWidth(isExpanded);
  const cardHeight = getCardHeight(isExpanded);
  const isNodeCritical = node.statusColor === "#ef4444";

  return (
    <motion.div
      animate={{
        width: cardWidth,
        height: cardHeight
      }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="absolute group z-10"
      style={{
        left: node.x,
        top: node.y,
        zIndex: isExpanded ? 50 : showAddMenu ? 40 : isNodeCritical ? 30 : 10
      }}
    >
      {/* Input port dot (Left handle) */}
      {node.id !== `${activeFactory}_1` && (
        <div 
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md z-20 transform -translate-y-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none"
          style={{ 
            left: 0, 
            top: "50%",
            backgroundColor: isNodeCritical ? "#ef4444" : "#3b82f6"
          }}
        />
      )}
      {/* Output port dot (Right handle) */}
      {node.nextNodes.length > 0 && (
        <div 
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md z-20 transform -translate-y-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none"
          style={{ 
            left: "100%", 
            top: "50%",
            backgroundColor: isNodeCritical ? "#ef4444" : "#3b82f6"
          }}
        />
      )}

      {/* Main Card Element */}
      <div
        onMouseDown={(e) => onNodeDragStart(e, node.id)}
        onClick={() => onNodeClick(node.id)}
        className={`node-element w-full h-full bg-white rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden select-none cursor-grab active:cursor-grabbing ${
          isExpanded 
            ? "border-zinc-800 shadow-xl" 
            : isNodeCritical
            ? "border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.25)] hover:shadow-lg"
            : isRunning
            ? "border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.2)] scale-[1.01]"
            : isCompleted
            ? "border-zinc-200 shadow-xs hover:shadow-md"
            : "border-zinc-100 shadow-3xs opacity-75 hover:opacity-95"
        }`}
      >
        {/* Drag Handle Top Bar */}
        <div className="w-full h-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-center gap-1 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
        </div>

        {/* Floating Node Toolbar Actions Overlay (Hover, only when not expanded) */}
        {!isExpanded && (
          <div className="absolute top-4 right-2.5 flex gap-1 z-35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
            <button 
              title="Rename" 
              type="button"
              onClick={(e) => { e.stopPropagation(); onRenameStart(node); }}
              className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button 
              title="Duplicate" 
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }}
              className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button 
              title="Delete" 
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Expanded Close Button */}
        {isExpanded && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCloseExpand(); }}
            className="action-button absolute top-4 right-4 z-35 size-7 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Node Content Area */}
        <div className="flex-grow p-3 bg-zinc-50/10 border-b border-zinc-100 overflow-hidden relative">
          {!isExpanded ? (
            /* COLLAPSED MINI VIEW CONTENT */
            <div className="h-full flex flex-col justify-between pt-1">
              <div className="text-[10px] font-bold text-zinc-500 line-clamp-2 leading-tight pr-10">
                {node.subtitle}
              </div>
              {node.sensors && node.sensors[0] && (
                <div className="flex justify-between items-center bg-zinc-50 p-1.5 rounded-lg border border-zinc-100 text-[9px] font-mono mt-1">
                  <span className="text-zinc-400 font-semibold">{node.sensors[0].name}</span>
                  <span className="font-extrabold text-zinc-700">{node.sensors[0].value}</span>
                </div>
              )}
              {node.valveName && (
                <div className="flex justify-between items-center text-[9px] font-mono mt-1">
                  <span className="text-zinc-400">{node.valveName}</span>
                  <span className="font-extrabold text-zinc-700">{node.valveFlow} L/min</span>
                </div>
              )}
              {node.rulDays !== undefined && (
                <div className="flex justify-between items-center mt-1 text-[8px] font-bold">
                  <span className="text-zinc-400">RUL INDEX</span>
                  <span className={node.rulDays < 15 ? "text-red-500 animate-pulse" : "text-zinc-500"}>
                    {node.rulDays}d Remaining
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* EXPANDED DETAILED VIEW CONTENT */
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="h-full flex flex-col justify-between text-xs pr-1"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
            >
              <div className="space-y-3 pt-1">
                {/* Asset Info Header Row */}
                <div className="flex justify-between items-start border-b border-zinc-100 pb-2">
                  <div>
                    <span className="text-[9px] font-extrabold tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {node.type}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-400">RUL:</span>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        node.rulDays! < 15 
                          ? "bg-red-50 text-red-600 border border-red-100" 
                          : "bg-zinc-100 text-zinc-700"
                      }`}>
                        {node.rulDays} Days Left
                      </span>
                    </div>
                  </div>
                  {isNodeCritical && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 animate-pulse bg-red-50 border border-red-100 px-2 py-1 rounded-lg">
                      <AlertTriangle className="size-3.5" />
                      <span>CRIT ALERT</span>
                    </div>
                  )}
                </div>

                {/* Dynamic detailed specs */}
                <div className="max-h-[120px] overflow-y-auto pr-1">
                  {node.sensors && (
                    <div className="flex flex-col gap-1.5 font-mono text-[10px] p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex justify-between font-bold text-[8.5px] text-zinc-400 uppercase tracking-wider border-b border-zinc-200/50 pb-1">
                        <span>Sensor Parameter</span>
                        <span>Reading</span>
                        <span>State</span>
                      </div>
                      {node.sensors.map((sensor, idx) => (
                        <div key={idx} className="flex justify-between items-center text-zinc-700">
                          <span className="font-semibold text-zinc-500">{sensor.name}</span>
                          <span className="font-bold">{sensor.value}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                            sensor.status === "OK" 
                              ? "bg-emerald-50 text-emerald-600" 
                              : "bg-red-50 text-red-600 animate-pulse"
                          }`}>{sensor.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {node.threshold && (
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                      <span className="block text-[8px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">Anomaly Evaluation Criteria</span>
                      <span className="font-mono text-[11px] font-bold bg-white border border-zinc-200 px-3 py-1 rounded-lg shadow-3xs inline-block">
                        {node.threshold.field} {node.threshold.operator} {node.threshold.value}
                      </span>
                    </div>
                  )}

                  {node.valveName && (
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex justify-between items-center mb-1 text-[10px]">
                        <span className="font-bold text-zinc-650">{node.valveName}</span>
                        <span className={`font-black uppercase text-[8px] px-1.5 py-0.5 rounded ${isNodeCritical ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {isNodeCritical ? "MAX VENT" : "ACTIVE NOMINAL"}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden my-2 border border-zinc-300/10">
                        <div 
                          className={`h-full transition-all duration-300 ${isNodeCritical ? "bg-red-500" : "bg-emerald-500"}`} 
                          style={{ width: `${Math.min(100, (node.valveFlow! / 700) * 100)}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-400 font-bold font-mono">
                        <span>Cooling flow: {node.valveFlow} L/min</span>
                        <span>Capacity: 700 L/min</span>
                      </div>
                    </div>
                  )}

                  {node.alertChannels && (
                    <div className="space-y-1">
                      <span className="block text-[8px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1">Active Alert Dispatch Logs</span>
                      {node.alertChannels.map((ch, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2 rounded-xl text-[10px] text-zinc-600">
                          <div>
                            <span className="font-extrabold text-zinc-800 uppercase text-[9px] mr-1.5">{ch.type}</span>
                            <span className="font-mono text-zinc-400">{ch.target}</span>
                          </div>
                          <span className="text-zinc-500 italic truncate max-w-[120px]">{ch.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Testing controls (Failure Simulators) */}
              <div className="flex gap-2 pt-2 border-t border-zinc-100 mt-2 shrink-0">
                {isNodeCritical ? (
                  <button
                    type="button"
                    onClick={() => onResetTelemetry(node.id)}
                    className="panel-button flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm transition-all duration-200 cursor-pointer text-center"
                  >
                    Reset Telemetry
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSimulateAnomaly(node.id)}
                    className="panel-button flex-1 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold text-[10px] transition-all duration-200 cursor-pointer text-center"
                  >
                    Simulate Anomaly
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => alert("Maintenance work order ticket raised in system database.")}
                  className="panel-button flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] shadow-sm transition-all duration-200 cursor-pointer text-center"
                >
                  Work Order
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Node Title Footer */}
        <div className="p-3 bg-white flex justify-between items-center h-[48px] flex-shrink-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5 w-full justify-between" onClick={(e) => e.stopPropagation()}>
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                className="border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] w-[140px] focus:outline-none focus:border-zinc-600"
              />
              <button 
                onClick={() => onRenameSave(node.id)}
                className="px-2 py-0.5 bg-zinc-800 text-white rounded text-[9px] font-bold hover:bg-zinc-700 cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <div className="truncate pr-2">
                <h4 className="text-[11px] font-extrabold text-zinc-800 truncate leading-tight">{node.title}</h4>
                <p className="text-[8px] font-bold text-zinc-400 mt-0.5 truncate uppercase tracking-widest leading-none">{node.subtitle}</p>
              </div>
              {/* Status dot */}
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: node.statusColor || "#e4e4e7"
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Insert Node "+" floating button */}
      {!isExpanded && (
        <div className="absolute top-1/2 -translate-y-1/2 -right-7 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleAddMenu(node.id);
            }}
            className="action-button w-6 h-6 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 hover:text-zinc-800 text-zinc-500 cursor-pointer"
          >
            +
          </button>
        </div>
      )}

      {/* Floating Select Dropdown for node actions */}
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
}, (prevProps, nextProps) => {
  // Return true if same (skip re-render), false if different (trigger re-render)
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.showAddMenu === nextProps.showAddMenu &&
    prevProps.activeFactory === nextProps.activeFactory &&
    prevProps.zoomScale === nextProps.zoomScale &&
    prevProps.node.x === nextProps.node.x &&
    prevProps.node.y === nextProps.node.y &&
    prevProps.node.status === nextProps.node.status &&
    prevProps.node.title === nextProps.node.title &&
    prevProps.node.subtitle === nextProps.node.subtitle &&
    prevProps.node.statusColor === nextProps.node.statusColor &&
    prevProps.node.rulDays === nextProps.node.rulDays &&
    prevProps.node.valveFlow === nextProps.node.valveFlow &&
    (!nextProps.isEditing || (prevProps.editTitle === nextProps.editTitle && prevProps.editSubtitle === nextProps.editSubtitle)) &&
    (!nextProps.showAddMenu || prevProps.allNodes.length === nextProps.allNodes.length)
  );
});

export default WorkflowNodeCardComponent;
