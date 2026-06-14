"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { SPRING_DEFAULT } from "@/lib/constants";
import type { FlowNode } from "./workflow/types";
import {
  fetchFactoryWorkflowNodes,
  fetchFactorySnapshot,
  applySnapshotToNodes,
  mergeNodePositions,
  mergeNodeTelemetry,
  applyWsCellsToNodes,
  type FactoryWorkflowKey,
} from "@/services/factoryWorkflow";
import { connectWebSocket } from "@/lib/ws";
import { apiJson } from "@/lib/api";

// Import modular subcomponents
import WorkflowNodeCard from "./workflow/WorkflowNodeCard";
import WorkflowConnector from "./workflow/WorkflowConnector";
import WorkflowZoomControls from "./workflow/WorkflowZoomControls";
import WorkflowFloatingAlerts from "./workflow/WorkflowFloatingAlerts";
import { useFactoryCanvasAlerts } from "@/hooks/useFactoryCanvasAlerts";
import {
  CARD_HEIGHT_COLLAPSED,
  CARD_WIDTH_COLLAPSED,
  computeCenterPan,
  computeNodesBounds,
  NODE_LAYOUT_STEP,
  CANVAS_ORIGIN,
  CANVAS_EXTENT,
} from "./workflow/layout";
// computeNodesBounds kept for centerCanvas usage


interface NodeWorkflowProps {
  initialFactory?: "horizon" | "zephyr";
  hidePills?: boolean;
  onBack?: () => void;
}

export default function NodeWorkflow({ initialFactory = "horizon", hidePills = false }: NodeWorkflowProps) {
  const [activeFactory, setActiveFactory] = useState<"horizon" | "zephyr">(initialFactory);
  const [prevInitialFactory, setPrevInitialFactory] = useState(initialFactory);
  if (initialFactory !== prevInitialFactory) {
    setPrevInitialFactory(initialFactory);
    setActiveFactory(initialFactory);
  }

  // Refs to distinguish drag from click
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDragged = useRef<boolean>(false);

  // Main factory data state wrapper
  const [factoryNodes, setFactoryNodes] = useState<Record<"horizon" | "zephyr", FlowNode[]>>({
    horizon: [],
    zephyr: [],
  });

  const nodes = factoryNodes[activeFactory];
  const canvasAlerts = useFactoryCanvasAlerts(nodes);

  // setNodes helper to dynamically update the active factory
  const setNodes = useCallback((newNodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => {
    setFactoryNodes((prev) => {
      const updated = typeof newNodes === "function" ? newNodes(prev[activeFactory]) : newNodes;
      return {
        ...prev,
        [activeFactory]: updated
      };
    });
  }, [activeFactory]);

  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [simulatingAnomalyIds, setSimulatingAnomalyIds] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [showAddMenuId, setShowAddMenuId] = useState<string | null>(null);
  
  // Canvas Pan & Zoom States
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Draggable Node States (draggingNodeId drives UI; interactionRef drives listeners)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const interactionRef = useRef<{
    mode: "none" | "pan" | "node";
    nodeId: string | null;
    panStartX: number;
    panStartY: number;
    dragOffsetX: number;
    dragOffsetY: number;
  }>({
    mode: "none",
    nodeId: null,
    panStartX: 0,
    panStartY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
  });

  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(10);
  // Store the resolved factory UUID for snapshot polling
  const factoryIdRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const userMovedCanvasRef = useRef(false);
  const hasInitializedCenterRef = useRef(false);
  const panOffsetRef = useRef(panOffset);
  const zoomScaleRef = useRef(zoomScale);
  const nodesRef = useRef(nodes);

  useEffect(() => {
    panOffsetRef.current = panOffset;
    zoomScaleRef.current = zoomScale;
    nodesRef.current = nodes;
  }, [panOffset, zoomScale, nodes]);

  // Load equipment nodes + sensor data from backend
  useEffect(() => {
    let cancelled = false;
    factoryIdRef.current = null;

    fetchFactoryWorkflowNodes(activeFactory as FactoryWorkflowKey)
      .then((loaded) => {
        if (cancelled) return;
        // Store factory UUID from first node for snapshot polling
        if (loaded.length > 0) {
          // Resolve factory ID via the factory list (reuse the already-cached call)
          import("@/lib/api").then(({ apiList }) =>
            apiList<{ id: string; code: string }>("/api/v1/factories/").then((factories) => {
              const code = activeFactory === "horizon" ? "F1" : "F2";
              const f = factories.find((fac) => fac.code === code);
              if (f) factoryIdRef.current = f.id;
            })
          ).catch(() => undefined);
        }
        setFactoryNodes((prev) => ({
          ...prev,
          [activeFactory]: mergeNodePositions(prev[activeFactory], loaded),
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWorkflowError(
          err instanceof Error ? err.message : "Failed to load factory equipment",
        );
      })
      .finally(() => {
        if (!cancelled) setWorkflowLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFactory]);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setRefreshCountdown((c) => (c <= 1 ? 10 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [activeFactory]);

  // Refresh sensor readings + health every 10s via snapshot + full node merge
  useEffect(() => {
    const refreshTelemetry = () => {
      setRefreshCountdown(10);
      const fid = factoryIdRef.current;
      fetchFactoryWorkflowNodes(activeFactory as FactoryWorkflowKey)
        .then((loaded) => {
          setFactoryNodes((prev) => ({
            ...prev,
            [activeFactory]: mergeNodePositions(
              mergeNodeTelemetry(prev[activeFactory], loaded),
              loaded,
            ),
          }));
        })
        .catch(() => undefined);

      if (!fid) return;
      fetchFactorySnapshot(fid)
        .then((snapshot) => {
          setFactoryNodes((prev) => ({
            ...prev,
            [activeFactory]: applySnapshotToNodes(prev[activeFactory], snapshot),
          }));
        })
        .catch(() => undefined);
    };

    const interval = setInterval(refreshTelemetry, 10000);
    return () => clearInterval(interval);
  }, [activeFactory]);

  // Keep fault-injection UI in sync with backend campaign state
  useEffect(() => {
    const syncFaultState = () => {
      apiJson<{ assets: { asset_id: string; fault_injected: boolean }[] }>("/api/v1/simulate/plant/")
        .then((data) => {
          const factoryNodeIds = new Set(nodesRef.current.map((n) => n.id));
          const activeFaults = new Set(
            data.assets
              .filter((a) => a.fault_injected && factoryNodeIds.has(a.asset_id))
              .map((a) => a.asset_id),
          );
          setSimulatingAnomalyIds(activeFaults);
        })
        .catch(() => undefined);
    };
    syncFaultState();
    const interval = setInterval(syncFaultState, 8000);
    return () => clearInterval(interval);
  }, [activeFactory]);

  useEffect(() => {
    const ws = connectWebSocket("/ws/telemetry", (data) => {
      if (data.type !== "telemetry_update" || !Array.isArray(data.cells)) return;
      setFactoryNodes((prev) => ({
        ...prev,
        [activeFactory]: applyWsCellsToNodes(
          prev[activeFactory],
          data.cells as Parameters<typeof applyWsCellsToNodes>[1],
        ),
      }));
    });
    return () => ws.close();
  }, [activeFactory]);

  const centerCanvas = useCallback((force = false) => {
    if (!containerRef.current || nodesRef.current.length === 0) return;
    if (userMovedCanvasRef.current && !force) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const bounds = computeNodesBounds(nodesRef.current);
    setPanOffset(computeCenterPan(bounds, width, height, zoomScaleRef.current));
    setIsCanvasReady(true);
  }, []);

  // Center once when nodes first load — never reset pan on telemetry refresh
  useEffect(() => {
    userMovedCanvasRef.current = false;
    hasInitializedCenterRef.current = false;
  }, [activeFactory]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0 || workflowLoading) return;
    if (hasInitializedCenterRef.current) return;

    centerCanvas(true);
    hasInitializedCenterRef.current = true;

    const observer = new ResizeObserver(() => {
      if (!userMovedCanvasRef.current) centerCanvas(true);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeFactory, nodes.length, workflowLoading, centerCanvas]);

  // Enable transform transitions after the initial correct position paints
  React.useEffect(() => {
    if (!isCanvasReady) return;
    const timer = setTimeout(() => setEnableTransition(true), 60);
    return () => clearTimeout(timer);
  }, [isCanvasReady]);

  // Zoom handlers
  const handleZoom = useCallback((type: "in" | "out" | "reset") => {
    if (type === "in") {
      setZoomScale((prev) => Math.min(prev + 0.1, 1.5));
    } else if (type === "out") {
      setZoomScale((prev) => Math.max(prev - 0.1, 0.5));
    } else {
      setZoomScale(1);
      userMovedCanvasRef.current = false;
      centerCanvas(true);
    }
  }, [centerCanvas]);

  // Always-on window listeners — refs updated synchronously on mousedown (no effect race)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = interactionRef.current;
      if (s.mode === "pan") {
        userMovedCanvasRef.current = true;
        setPanOffset({
          x: e.clientX - s.panStartX,
          y: e.clientY - s.panStartY,
        });
        return;
      }

      if (s.mode !== "node" || !s.nodeId) return;

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        hasDragged.current = true;
      }

      const zoom = zoomScaleRef.current;
      const pan = panOffsetRef.current;
      const nodeId = s.nodeId;
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== nodeId) return node;
          let gridX = Math.round((e.clientX - s.dragOffsetX - pan.x) / zoom);
          let gridY = Math.round((e.clientY - s.dragOffsetY - pan.y) / zoom);
          gridX = Math.max(-500, Math.min(3000, gridX));
          gridY = Math.max(-500, Math.min(2000, gridY));
          return { ...node, x: gridX, y: gridY };
        }),
      );
    };

    const onUp = () => {
      interactionRef.current.mode = "none";
      interactionRef.current.nodeId = null;
      setIsPanning(false);
      setDraggingNodeId(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setNodes]);

  // Canvas pan
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".node-element") ||
      target.closest(".node-drag-handle") ||
      target.closest(".action-button") ||
      target.closest(".panel-button")
    ) {
      return;
    }

    const pan = panOffsetRef.current;
    interactionRef.current = {
      mode: "pan",
      nodeId: null,
      panStartX: e.clientX - pan.x,
      panStartY: e.clientY - pan.y,
      dragOffsetX: 0,
      dragOffsetY: 0,
    };
    setIsPanning(true);
    userMovedCanvasRef.current = true;
  };

  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest(".action-button") ||
      target.closest(".panel-button") ||
      target.closest("[data-no-drag]")
    ) {
      return;
    }

    e.stopPropagation();
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;

    const pan = panOffsetRef.current;
    const zoom = zoomScaleRef.current;
    interactionRef.current = {
      mode: "node",
      nodeId,
      panStartX: 0,
      panStartY: 0,
      dragOffsetX: e.clientX - (node.x * zoom + pan.x),
      dragOffsetY: e.clientY - (node.y * zoom + pan.y),
    };
    setDraggingNodeId(nodeId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
  }, []);

  // Action: Delete Node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => {
      const targetNode = prev.find((n) => n.id === nodeId);
      if (!targetNode) return prev;

      const children = targetNode.nextNodes;

      return prev
        .filter((n) => n.id !== nodeId)
        .map((node) => {
          if (node.nextNodes.includes(nodeId)) {
            const listWithoutDeleted = node.nextNodes.filter((id) => id !== nodeId);
            return {
              ...node,
              nextNodes: [...new Set([...listWithoutDeleted, ...children])]
            };
          }
          return node;
        });
    });
    setExpandedNodeId((prev) => (prev === nodeId ? null : prev));
  }, [setNodes]);

  // Action: Duplicate Node
  const handleDuplicateNode = useCallback((nodeId: string) => {
    setNodes((prev) => {
      const sourceNode = prev.find((n) => n.id === nodeId);
      if (!sourceNode) return prev;

      const newId = `${activeFactory}_node_${Date.now()}`;
      const duplicated: FlowNode = {
        ...sourceNode,
        id: newId,
        title: `${sourceNode.title} Copy`,
        x: sourceNode.x + 40,
        y: sourceNode.y + 40,
        nextNodes: [...sourceNode.nextNodes]
      };

      return [...prev, duplicated];
    });
  }, [activeFactory, setNodes]);

  // Action: Rename Node
  const startRenameNode = useCallback((node: FlowNode) => {
    setEditingNodeId(node.id);
    setEditTitle(node.title);
    setEditSubtitle(node.subtitle);
  }, []);

  const handleSaveRename = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((node) => {
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
  }, [editTitle, editSubtitle, setNodes]);

  // Action: Add Node Next in Sequence
  const handleAddNodeAfter = useCallback((parentId: string, type: string) => {
    setNodes((prev) => {
      const parentNode = prev.find((n) => n.id === parentId);
      if (!parentNode) return prev;

      const newId = `${activeFactory}_node_${Date.now()}`;
      let newNodeTemplate: FlowNode = {
        id: newId,
        title: "New Equipment Feeds",
        subtitle: "Telemetry Ingest",
        x: parentNode.x + NODE_LAYOUT_STEP,
        y: parentNode.y,
        type: "telemetry",
        statusColor: "#3b82f6",
        status: "idle",
        nextNodes: [...parentNode.nextNodes],
        rulDays: 120,
        sensors: [{ name: "Cool_Water", value: "85 L/min", status: "OK" }]
      };

      if (type === "classifier") {
        newNodeTemplate = {
          ...newNodeTemplate,
          title: "Rule Analyze Value",
          subtitle: "Anomaly Classifier",
          type: "classifier",
          statusColor: "#a855f7",
          threshold: { field: "Cool_Water", operator: "<", value: "50 L/min" },
          sensors: undefined
        };
      } else if (type === "action") {
        newNodeTemplate = {
          ...newNodeTemplate,
          title: "Trigger Bypass",
          subtitle: "Active Control Action",
          type: "action",
          statusColor: "#ef4444",
          valveName: "VALVE_BYPASS",
          valveFlow: 180,
          sensors: undefined
        };
      } else if (type === "alert") {
        newNodeTemplate = {
          ...newNodeTemplate,
          title: "Notify Engineer",
          subtitle: "Alert Action",
          type: "alert",
          statusColor: "#f97316",
          alertChannels: [{ type: "Slack", target: "#field-ops", msg: "Bypass anomaly alert!" }],
          sensors: undefined
        };
      } else if (type === "end") {
        newNodeTemplate = {
          ...newNodeTemplate,
          title: "Operational Logged",
          subtitle: "End Pipeline Log",
          type: "end",
          statusColor: "#10b981",
          nextNodes: [],
          sensors: undefined
        };
      }

      return prev.map((n) => {
        if (n.id === parentId) {
          return {
            ...n,
            nextNodes: [newId]
          };
        }
        return n;
      }).concat(newNodeTemplate);
    });

    setShowAddMenuId(null);
  }, [activeFactory, setNodes]);

  // ----------------------------------------------------
  // Interactive Anomaly Simulation & Reset handlers
  // ----------------------------------------------------
  const handleSimulateAnomaly = useCallback((nodeId: string) => {
    setSimulatingAnomalyIds((prev) => new Set([...prev, nodeId]));
    apiJson(`/api/v1/simulate/${nodeId}/`, {
      method: "POST",
      body: JSON.stringify({ action: "inject_fault", fault_type: "bearing_wear" }),
    })
      .then(() => {
        // Reload backend state after celery batch has time to run
        setTimeout(() => {
          fetchFactoryWorkflowNodes(activeFactory as FactoryWorkflowKey)
            .then((loaded) => {
              setFactoryNodes((prev) => ({
                ...prev,
                [activeFactory]: mergeNodePositions(
                  mergeNodeTelemetry(prev[activeFactory], loaded),
                  loaded,
                ),
              }));
            })
            .catch(() => undefined);
        }, 4000);
      })
      .catch(() => {
        setSimulatingAnomalyIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      });
  }, [activeFactory]);

  const handleStopAnomaly = useCallback((nodeId: string) => {
    setSimulatingAnomalyIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
    apiJson(`/api/v1/simulate/${nodeId}/`, {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    })
      .then(() => fetchFactoryWorkflowNodes(activeFactory as FactoryWorkflowKey))
      .then((loaded) => {
        setFactoryNodes((prev) => ({
          ...prev,
          [activeFactory]: mergeNodePositions(
            mergeNodeTelemetry(prev[activeFactory], loaded),
            loaded,
          ),
        }));
      })
      .catch(() => undefined);
  }, [activeFactory]);

  const handleResetTelemetry = useCallback((nodeId: string) => {
    handleStopAnomaly(nodeId);
  }, [handleStopAnomaly]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (hasDragged.current) return;
    setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleToggleAddMenu = useCallback((nodeId: string) => {
    setShowAddMenuId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleToggleConnection = useCallback((parentId: string, targetId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === parentId) {
          const isConnected = n.nextNodes.includes(targetId);
          return {
            ...n,
            nextNodes: isConnected
              ? n.nextNodes.filter((id) => id !== targetId)
              : [...n.nextNodes, targetId]
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  const handleCloseExpand = useCallback(() => {
    setExpandedNodeId(null);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-stretch justify-start font-sans">
      
      {/* Factory Tabs Selection Pill Bar */}
      {!hidePills && (
        <div className="flex bg-zinc-900/10 backdrop-blur-xs p-1.5 rounded-full items-center gap-1.5 min-w-[320px] mb-6 border border-black/5 shadow-2xs relative z-20 select-none mx-auto">
          {(["horizon", "zephyr"] as const).map((fac) => {
            const isActive = activeFactory === fac;
            const label = fac === "horizon" ? "Horizon Foundry" : "Zephyr Core Plant";
            return (
              <button
                key={fac}
                type="button"
                onClick={() => {
                  setWorkflowLoading(true);
                  setActiveFactory(fac);
                  setExpandedNodeId(null);
                  setEditingNodeId(null);
                }}
                className={`relative px-4 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 cursor-pointer select-none z-10 ${
                  isActive ? "text-blue-600" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {label}
                {isActive && (
                  <motion.div
                    layoutId="activeFactoryTab"
                    className="absolute inset-0 bg-white shadow-sm border border-blue-50/50 rounded-full -z-10"
                    transition={{ type: "spring", ...SPRING_DEFAULT }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Flow Canvas Card Container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex-grow min-h-[500px] bg-[#FAF9F5] rounded-3xl border border-zinc-200/80 shadow-2xl overflow-hidden relative cursor-grab active:cursor-grabbing flex flex-col justify-end"
        onMouseDown={handleCanvasMouseDown}
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

        {/* Scalable & Pannable Viewport — overflow-visible so nodes/connectors above y=0 render */}
        <div 
          className="absolute inset-0 z-10 origin-center select-none overflow-visible"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            opacity: isCanvasReady ? 1 : 0,
            transition: isPanning || draggingNodeId
              ? "none"
              : isCanvasReady && enableTransition
                ? "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                : "opacity 0.15s ease-in",
          }}
        >
          {/* SVG connector layer — viewBox includes negative coords so upward drags don't clip */}
          <svg
            className="absolute pointer-events-none z-0 overflow-visible"
            style={{
              left: CANVAS_ORIGIN,
              top: CANVAS_ORIGIN,
              width: CANVAS_EXTENT,
              height: CANVAS_EXTENT,
            }}
            viewBox={`${CANVAS_ORIGIN} ${CANVAS_ORIGIN} ${CANVAS_EXTENT} ${CANVAS_EXTENT}`}
          >
            {/* Render curved connector lines dynamically */}
            {nodes.map((sourceNode) => {
              return sourceNode.nextNodes.map((targetId) => {
                const targetNode = nodes.find((n) => n.id === targetId);
                if (!targetNode) return null;

                // Port circles are w-3 (12px); translate-x-1/2 shifts them 6px outward
                const PORT_HALF = 6;
                const startX = sourceNode.x + CARD_WIDTH_COLLAPSED + PORT_HALF;
                const startY = sourceNode.y + CARD_HEIGHT_COLLAPSED / 2;
                const endX = targetNode.x - PORT_HALF;
                const endY = targetNode.y + CARD_HEIGHT_COLLAPSED / 2;

                const isActive = sourceNode.statusColor === "#ef4444" || (sourceNode.status === "completed" && targetNode.status !== "idle");
                const isCritical = sourceNode.statusColor === "#ef4444";

                return (
                  <WorkflowConnector
                    key={`${sourceNode.id}-${targetId}`}
                    sourceId={sourceNode.id}
                    targetId={targetId}
                    startX={startX}
                    startY={startY}
                    endX={endX}
                    endY={endY}
                    isActive={isActive}
                    isCritical={isCritical}
                  />
                );
              });
            })}
          </svg>

          {/* Render Flow Node Cards */}
          {nodes.map((node, index) => {
            return (
              <WorkflowNodeCard
                key={node.id}
                node={node}
                isExpanded={expandedNodeId === node.id}
                isFirstInChain={index === 0}
                isEditing={editingNodeId === node.id}
                showAddMenu={showAddMenuId === node.id}
                zoomScale={zoomScale}
                activeFactory={activeFactory}
                editTitle={editTitle}
                editSubtitle={editSubtitle}
                setEditTitle={setEditTitle}
                setEditSubtitle={setEditSubtitle}
                onNodeClick={handleNodeClick}
                onCloseExpand={handleCloseExpand}
                onNodeDragStart={handleNodeDragStart}
                onRenameStart={startRenameNode}
                onRenameSave={handleSaveRename}
                onDuplicate={handleDuplicateNode}
                onDelete={handleDeleteNode}
                onSimulateAnomaly={handleSimulateAnomaly}
                onStopAnomaly={handleStopAnomaly}
                isSimulatingAnomaly={simulatingAnomalyIds.has(node.id)}
                onResetTelemetry={handleResetTelemetry}
                onToggleAddMenu={handleToggleAddMenu}
                onAddNodeAfter={handleAddNodeAfter}
                allNodes={nodes}
                onToggleConnection={handleToggleConnection}
                refreshCountdown={refreshCountdown}
              />
            );
          })}

        </div>

        {/* Alerts panel — fixed to bottom of canvas container, outside transform so nodes can't move it */}
        <WorkflowFloatingAlerts messages={canvasAlerts} />

        {/* Floating Zoom Controls Panel */}
        <WorkflowZoomControls
          onZoom={handleZoom}
        />

        {(workflowLoading || workflowError) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-white/90 border border-zinc-200 shadow-sm text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {workflowLoading ? "Loading equipment telemetry…" : workflowError}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes strokeFlow {
          from {
            stroke-dashoffset: 24;
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
