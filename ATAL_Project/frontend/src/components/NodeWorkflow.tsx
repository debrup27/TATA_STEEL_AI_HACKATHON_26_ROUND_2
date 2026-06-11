"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, Plus, Trash2, Copy, Edit3, Check, X
} from "lucide-react";

interface SensorReading {
  name: string;
  value: string;
  status: "OK" | "HIGH" | "CRITICAL";
}

interface FlowNode {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  type: "telemetry" | "classifier" | "action" | "alert" | "end" | "ticket";
  statusColor: string;
  status: "completed" | "running" | "idle";
  nextNodes: string[]; // Child node IDs
  sensors?: SensorReading[];
  threshold?: {
    field: string;
    operator: string;
    value: string;
  };
  valveFlow?: number;
  valveName?: string;
  alertChannels?: { type: string; target: string; msg: string }[];
  ticketId?: string;
}

export default function NodeWorkflow() {
  const [nodes, setNodes] = useState<FlowNode[]>([
    {
      id: "node_1",
      title: "Read Telemetry",
      subtitle: "Ingest Sensor Feeds",
      x: 40,
      y: 170,
      type: "telemetry",
      statusColor: "#3b82f6",
      status: "completed",
      nextNodes: ["node_2"],
      sensors: [
        { name: "BF_Temp", value: "108°C", status: "HIGH" },
        { name: "BF_Press", value: "3.2b", status: "OK" },
        { name: "BF_Level", value: "84%", status: "OK" }
      ]
    },
    {
      id: "node_2",
      title: "Analyze Feeds",
      subtitle: "Anomaly Classifier",
      x: 320,
      y: 170,
      type: "classifier",
      statusColor: "#a855f7",
      status: "completed",
      nextNodes: ["node_3", "node_4"],
      threshold: {
        field: "BF_Temp",
        operator: ">",
        value: "95°C"
      }
    },
    {
      id: "node_3",
      title: "Cooling Protocol",
      subtitle: "Deploy Active Cooling",
      x: 600,
      y: 40,
      type: "action",
      statusColor: "#ef4444",
      status: "completed",
      nextNodes: ["node_5"],
      valveName: "VALVE_4A",
      valveFlow: 250
    },
    {
      id: "node_4",
      title: "Write Telemetry",
      subtitle: "Log Normal State",
      x: 600,
      y: 300,
      type: "end",
      statusColor: "#10b981",
      status: "idle",
      nextNodes: []
    },
    {
      id: "node_5",
      title: "Alert Commands",
      subtitle: "Notify Supervisor",
      x: 880,
      y: 170,
      type: "alert",
      statusColor: "#f97316",
      status: "completed",
      nextNodes: ["node_6"],
      alertChannels: [
        { type: "SMS", target: "+91 99321*****", msg: "Furnace temp crit..." },
        { type: "Slack", target: "#atal-alerts", msg: "Pinged supervisor" }
      ]
    },
    {
      id: "node_6",
      title: "Schedule Inspection",
      subtitle: "Inspection Ticket",
      x: 1160,
      y: 170,
      type: "ticket",
      statusColor: "#eab308",
      status: "idle",
      nextNodes: [],
      ticketId: "ATAL-889"
    }
  ]);

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [showAddMenuId, setShowAddMenuId] = useState<string | null>(null);
  
  // Canvas Pan & Zoom States
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Draggable Node States
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Bezier curve path constructor
  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Node dimensions
  const cardWidth = 240;
  const cardHeight = 160;

  // Zoom handlers
  const handleZoom = (type: "in" | "out" | "reset") => {
    if (type === "in") {
      setZoomScale((prev) => Math.min(prev + 0.1, 1.5));
    } else if (type === "out") {
      setZoomScale((prev) => Math.max(prev - 0.1, 0.6));
    } else {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Canvas Drag/Pan Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If we're clicking a node action button or input, don't pan
    const target = e.target as HTMLElement;
    if (target.closest(".node-element") || target.closest(".action-button")) return;
    
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNodeId) {
      const updatedNodes = nodes.map((node) => {
        if (node.id === draggingNodeId) {
          // Calculate new position based on page space, zoom scale
          let gridX = Math.round((e.clientX - dragOffset.x - panOffset.x) / zoomScale);
          let gridY = Math.round((e.clientY - dragOffset.y - panOffset.y) / zoomScale);
          
          // Constrain coordinates to keep nodes inside canvas bounds
          gridX = Math.max(10, Math.min(2200, gridX));
          gridY = Math.max(10, Math.min(440, gridY));

          return {
            ...node,
            x: gridX,
            y: gridY
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Card drag trigger
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest(".action-button")) return;

    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    // Position offset from cursor position to node top-left corner
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - (node.x * zoomScale + panOffset.x),
      y: e.clientY - (node.y * zoomScale + panOffset.y)
    });
  };

  // Action: Delete Node
  const handleDeleteNode = (nodeId: string) => {
    // Reconnect parents directly to the deleted node's children
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    const children = targetNode.nextNodes;

    const reconnectedNodes = nodes
      .filter((n) => n.id !== nodeId)
      .map((node) => {
        if (node.nextNodes.includes(nodeId)) {
          // Replace deleted node with its children in parent's nextNodes list
          const listWithoutDeleted = node.nextNodes.filter((id) => id !== nodeId);
          return {
            ...node,
            nextNodes: [...new Set([...listWithoutDeleted, ...children])]
          };
        }
        return node;
      });

    setNodes(reconnectedNodes);
    if (activeNodeId === nodeId) setActiveNodeId(null);
  };

  // Action: Duplicate Node
  const handleDuplicateNode = (nodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === nodeId);
    if (!sourceNode) return;

    const newId = `node_${Date.now()}`;
    const duplicated: FlowNode = {
      ...sourceNode,
      id: newId,
      title: `${sourceNode.title} Copy`,
      x: sourceNode.x + 40,
      y: sourceNode.y + 40,
      nextNodes: [...sourceNode.nextNodes]
    };

    setNodes([...nodes, duplicated]);
  };

  // Action: Rename Node
  const startRenameNode = (node: FlowNode) => {
    setEditingNodeId(node.id);
    setEditTitle(node.title);
    setEditSubtitle(node.subtitle);
  };

  const handleSaveRename = (nodeId: string) => {
    setNodes(
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            title: editTitle,
            subtitle: editSubtitle
          };
        }
        return node;
      })
    );
    setEditingNodeId(null);
  };

  // Action: Add Node Next in Sequence
  const handleAddNodeAfter = (parentId: string, type: string) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const newId = `node_${Date.now()}`;
    let newNodeTemplate: FlowNode = {
      id: newId,
      title: "New Ingest Feeds",
      subtitle: "Telemetry Ingest",
      x: parentNode.x + 280,
      y: parentNode.y,
      type: "telemetry",
      statusColor: "#3b82f6",
      status: "idle",
      nextNodes: [...parentNode.nextNodes],
      sensors: [{ name: "New_Sensor", value: "0", status: "OK" }]
    };

    if (type === "classifier") {
      newNodeTemplate = {
        ...newNodeTemplate,
        title: "Analyze Value",
        subtitle: "Anomaly Classifier",
        type: "classifier",
        statusColor: "#a855f7",
        threshold: { field: "Sensor", operator: ">", value: "50" },
        sensors: undefined
      };
    } else if (type === "action") {
      newNodeTemplate = {
        ...newNodeTemplate,
        title: "Trigger Valve",
        subtitle: "Active Control Action",
        type: "action",
        statusColor: "#ef4444",
        valveName: "VALVE_NEW",
        valveFlow: 100,
        sensors: undefined
      };
    } else if (type === "alert") {
      newNodeTemplate = {
        ...newNodeTemplate,
        title: "Notify Channel",
        subtitle: "Alert Action",
        type: "alert",
        statusColor: "#f97316",
        alertChannels: [{ type: "Slack", target: "#alerts", msg: "Custom action ping" }],
        sensors: undefined
      };
    } else if (type === "end") {
      newNodeTemplate = {
        ...newNodeTemplate,
        title: "Success Logging",
        subtitle: "State End Logging",
        type: "end",
        statusColor: "#10b981",
        nextNodes: [],
        sensors: undefined
      };
    }

    // Insert new node in-between: parent now points only to new node.
    // New node points to parent's original nextNodes.
    setNodes(
      nodes.map((n) => {
        if (n.id === parentId) {
          return {
            ...n,
            nextNodes: [newId]
          };
        }
        return n;
      }).concat(newNodeTemplate)
    );

    setShowAddMenuId(null);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center font-sans">
      {/* Main Flow Canvas Card Container */}
      <div 
        ref={containerRef}
        className="w-full h-[620px] bg-[#FAF9F5] rounded-3xl border border-zinc-200/80 shadow-2xl overflow-hidden relative cursor-grab active:cursor-grabbing flex flex-col justify-end"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* SVG Dots Background Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <svg width="100%" height="100%">
            <pattern id="industrial-dot-pattern" x={panOffset.x} y={panOffset.y} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#d4d4d8" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#industrial-dot-pattern)" />
          </svg>
        </div>

        {/* Scalable & Pannable Viewport */}
        <div 
          className="absolute inset-0 z-10 origin-center select-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`
          }}
        >
          {/* SVG Connecting Edges Path Layer */}
          <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none z-0">
            <defs>
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Render curved glowing connector lines dynamically */}
            {nodes.map((sourceNode) => {
              return sourceNode.nextNodes.map((targetId) => {
                const targetNode = nodes.find((n) => n.id === targetId);
                if (!targetNode) return null;

                const startX = sourceNode.x + cardWidth;
                const startY = sourceNode.y + cardHeight / 2;
                const endX = targetNode.x;
                const endY = targetNode.y + cardHeight / 2;

                const pathString = getBezierPath(startX, startY, endX, endY);
                const isActive = sourceNode.status === "completed" && targetNode.status !== "idle";

                return (
                  <g key={`${sourceNode.id}-${targetId}`} className="connector-glow">
                    {/* Glowing outer shadow line */}
                    <path
                      d={pathString}
                      stroke="#a1a1aa"
                      strokeWidth={6}
                      fill="none"
                      strokeLinecap="round"
                      opacity={isActive ? 0.2 : 0.04}
                      className="transition-[stroke,opacity] duration-300"
                      filter="url(#glow-filter)"
                    />
                    {/* Core background connection line */}
                    <path
                      d={pathString}
                      stroke={isActive ? "#a1a1aa" : "#e4e4e7"}
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      className="transition-[stroke,opacity] duration-300"
                    />
                    {/* Glowing flowing dash overlay */}
                    {isActive && (
                      <path
                        d={pathString}
                        stroke="#71717a"
                        strokeWidth={1.5}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="8, 12"
                        className="stroke-dasharray-anim"
                      />
                    )}
                  </g>
                );
              });
            })}
          </svg>

          {/* Render Flow Node Cards */}
          {nodes.map((node) => {
            const isEditing = editingNodeId === node.id;
            const isCompleted = node.status === "completed";
            const isRunning = node.status === "running";

            return (
              <div
                key={node.id}
                className="absolute group"
                style={{
                  left: node.x,
                  top: node.y,
                  width: cardWidth,
                  height: cardHeight,
                  zIndex: showAddMenuId === node.id ? 40 : isRunning ? 20 : 10
                }}
              >
                {/* Input port dot (Left handle) */}
                {node.id !== "node_1" && (
                  <div 
                    className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md z-20 transform -translate-y-1/2 -translate-x-1/2 transition-colors duration-300 pointer-events-none"
                    style={{ 
                      left: 0, 
                      top: cardHeight / 2,
                      backgroundColor: "#b91c1c"
                    }}
                  />
                )}
                {/* Output port dot (Right handle) */}
                {node.nextNodes.length > 0 && (
                  <div 
                    className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md z-20 transform -translate-y-1/2 -translate-x-1/2 transition-colors duration-300 pointer-events-none"
                    style={{ 
                      left: cardWidth, 
                      top: cardHeight / 2,
                      backgroundColor: "#b91c1c"
                    }}
                  />
                )}

                {/* Main Card Element */}
                <div
                  onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  onClick={() => setActiveNodeId(node.id)}
                  className={`node-element w-full h-full bg-white rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden select-none cursor-grab active:cursor-grabbing ${
                    isRunning
                      ? "border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.3)] scale-[1.02]"
                      : isCompleted
                      ? "border-zinc-200 shadow-md hover:shadow-lg"
                      : "border-zinc-100 shadow-xs opacity-60 hover:opacity-90"
                  }`}
                >
                  {/* Drag Handle Top Bar */}
                  <div className="w-full h-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-center gap-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                  </div>

                  {/* Floating Node Toolbar Actions Overlay (Hover) */}
                  <div className="absolute top-4 right-2.5 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                    <button 
                      title="Rename" 
                      onClick={() => startRenameNode(node)}
                      className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                      title="Duplicate" 
                      onClick={() => handleDuplicateNode(node.id)}
                      className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button 
                      title="Delete" 
                      onClick={() => handleDeleteNode(node.id)}
                      className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Dynamic Node Content */}
                  <div className="flex-grow p-3 bg-zinc-50/10 border-b border-zinc-100 overflow-hidden relative">
                    {node.type === "telemetry" && node.sensors && (
                      <div className="flex flex-col h-full text-[8.5px] font-mono p-1 bg-zinc-50/50 rounded-lg border border-zinc-100 overflow-hidden">
                        <div className="flex justify-between border-b border-zinc-200/60 pb-1 font-bold text-zinc-500">
                          <span>Sensor</span>
                          <span>Value</span>
                          <span>Status</span>
                        </div>
                        <div className="flex-grow space-y-1 pt-1 overflow-y-auto">
                          {node.sensors.map((sensor, idx) => (
                            <div key={idx} className="flex justify-between items-center text-zinc-700">
                              <span className="font-semibold text-zinc-600">{sensor.name}</span>
                              <span className="font-extrabold">{sensor.value}</span>
                              <span className={`px-1 rounded-sm text-[7px] font-bold ${
                                sensor.status === "OK" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600 animate-pulse"
                              }`}>{sensor.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {node.type === "classifier" && node.threshold && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="text-[7.5px] font-extrabold text-zinc-400 uppercase tracking-widest">Rule Check</span>
                        <span className="text-[11px] font-bold text-zinc-700 mt-1.5 px-3 py-1 bg-white border border-zinc-200 rounded-lg shadow-2xs">
                          {node.threshold.field} {node.threshold.operator} {node.threshold.value}
                        </span>
                        <div className="flex gap-3 mt-2">
                          <span className="text-[7.5px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded">TRUE</span>
                          <span className="text-[7.5px] font-bold px-2 py-0.5 bg-green-100 text-green-600 rounded">FALSE</span>
                        </div>
                      </div>
                    )}

                    {node.type === "action" && (
                      <div className="flex flex-col h-full justify-between p-1 bg-zinc-50/50 rounded-lg border border-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                          <span className="text-[9px] font-bold text-zinc-700">{node.valveName}: OPEN</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden my-1">
                          <div className="bg-red-500 h-full w-[100%] transition-all duration-300" />
                        </div>
                        <span className="text-[8px] font-bold text-zinc-400">Flow rate: {node.valveFlow} L/min</span>
                      </div>
                    )}

                    {node.type === "alert" && node.alertChannels && (
                      <div className="flex flex-col h-full gap-1 p-0.5 text-[8px]">
                        <span className="font-bold text-zinc-400 uppercase tracking-wider text-[7px]">Alert Coordinator</span>
                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                          {node.alertChannels.map((channel, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-zinc-200/60 p-1 rounded shadow-2xs text-zinc-600">
                              <span className="font-bold text-zinc-700">{channel.type}</span>
                              <span className="text-zinc-500 truncate max-w-[120px]">{channel.msg}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {node.type === "end" && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1 border border-emerald-200 shadow-sm">
                          <Check className="w-4 h-4 stroke-[3.5]" />
                        </div>
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider mt-1">State Logged</span>
                      </div>
                    )}

                    {node.type === "ticket" && (
                      <div className="flex flex-col h-full justify-between p-1 bg-zinc-50/50 rounded-lg border border-zinc-100">
                        <div>
                          <span className="block font-extrabold text-zinc-800 text-[9px]">Ticket #{node.ticketId}</span>
                          <span className="block text-zinc-400 text-[7.5px] mt-0.5">TAPHOLE ALIGNMENT</span>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="text-[7.5px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Pending</span>
                          <span className="text-[7.5px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded">Priority: HIGH</span>
                        </div>
                      </div>
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
                          onClick={() => handleSaveRename(node.id)}
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
                            backgroundColor: node.status === "completed" || node.status === "running" ? node.statusColor : "#e4e4e7"
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Insert Node "+" floating button (shows next to output port on Hover) */}
                <div className="absolute top-1/2 -translate-y-1/2 -right-7 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenuId(showAddMenuId === node.id ? null : node.id);
                    }}
                    className="action-button w-6 h-6 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 hover:text-zinc-800 text-zinc-500 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Floating Select Dropdown for node actions (templates and connections) */}
                <AnimatePresence>
                  {showAddMenuId === node.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-40 bg-white border border-zinc-200/80 shadow-2xl rounded-2xl p-2.5 w-[230px] pointer-events-auto select-none"
                      style={{
                        left: cardWidth + 15,
                        top: 10
                      }}
                    >
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5 mb-2 px-1">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Node Actions</span>
                        <button onClick={() => setShowAddMenuId(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Add new node templates section */}
                      <div className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1 px-1">Insert Template</div>
                      <div className="flex flex-col gap-0.5 text-[9.5px] border-b border-zinc-100 pb-2 mb-2">
                        <button onClick={() => handleAddNodeAfter(node.id, "telemetry")} className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ingest Telemetry
                        </button>
                        <button onClick={() => handleAddNodeAfter(node.id, "classifier")} className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Threshold Classifier
                        </button>
                        <button onClick={() => handleAddNodeAfter(node.id, "action")} className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Deploy cooling action
                        </button>
                        <button onClick={() => handleAddNodeAfter(node.id, "alert")} className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Trigger alerts
                        </button>
                        <button onClick={() => handleAddNodeAfter(node.id, "end")} className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> State saved log
                        </button>
                      </div>

                      {/* Connect preexisting nodes section */}
                      <div className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">Connect Existing Node</div>
                      <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1 text-[9.5px]">
                        {nodes
                          .filter((n) => n.id !== node.id)
                          .map((targetNode) => {
                            const isConnected = node.nextNodes.includes(targetNode.id);
                            return (
                              <button
                                key={targetNode.id}
                                onClick={() => {
                                  setNodes(
                                    nodes.map((n) => {
                                      if (n.id === node.id) {
                                        return {
                                          ...n,
                                          nextNodes: isConnected
                                            ? n.nextNodes.filter((id) => id !== targetNode.id)
                                            : [...n.nextNodes, targetNode.id]
                                        };
                                      }
                                      return n;
                                    })
                                  );
                                }}
                                className={`flex items-center justify-between p-1 hover:bg-zinc-100 rounded text-left cursor-pointer transition-colors ${
                                  isConnected ? "bg-zinc-100 text-zinc-800 font-medium" : "text-zinc-600"
                                }`}
                              >
                                <div className="truncate pr-1">
                                  <span className="block truncate font-bold text-[9px]">{targetNode.title}</span>
                                  <span className="block text-[7px] text-zinc-400 uppercase tracking-wider leading-none mt-0.5">{targetNode.type}</span>
                                </div>
                                <span className={`text-[7.5px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border transition-colors ${
                                  isConnected 
                                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                                }`}>
                                  {isConnected ? "Disconnect" : "Connect"}
                                </span>
                              </button>
                            );
                          })
                        }
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Floating Zoom Controls Panel */}
        <div className="absolute top-4 right-4 z-20 flex bg-white border border-zinc-200/80 shadow-md rounded-xl p-1 gap-0.5 select-none pointer-events-auto">
          <button 
            onClick={() => handleZoom("in")} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleZoom("out")} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <span className="font-extrabold text-sm select-none leading-none">-</span>
          </button>
          <button 
            onClick={() => handleZoom("reset")} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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
          animation: strokeFlow 1.2s linear infinite;
        }
      `}</style>
    </div>
  );

}
