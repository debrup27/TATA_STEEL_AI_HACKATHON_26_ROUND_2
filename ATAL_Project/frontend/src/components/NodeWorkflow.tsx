"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { SPRING_DEFAULT } from "@/lib/constants";
import type { FlowNode } from "./workflow/types";

// Import modular subcomponents
import WorkflowNodeCard from "./workflow/WorkflowNodeCard";
import WorkflowConnector from "./workflow/WorkflowConnector";
import WorkflowZoomControls from "./workflow/WorkflowZoomControls";

// ----------------------------------------------------
// Horizon Foundry (15 Nodes)
// ----------------------------------------------------
const initialHorizonNodes: FlowNode[] = [
  {
    id: "horizon_1",
    title: "Raw Feed Ingest",
    subtitle: "Ingestion System",
    x: 40,
    y: 180,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "completed",
    nextNodes: ["horizon_2"],
    rulDays: 140,
    sensors: [
      { name: "FeedRate", value: "320 T/h", status: "OK" },
      { name: "BeltVibr", value: "2.4 mm/s", status: "OK" }
    ]
  },
  {
    id: "horizon_2",
    title: "Coke Ovens Control",
    subtitle: "Oven Temp Classifier",
    x: 320,
    y: 180,
    type: "classifier",
    statusColor: "#a855f7",
    status: "completed",
    nextNodes: ["horizon_3", "horizon_4"],
    rulDays: 92,
    threshold: { field: "Oven_Temp", operator: ">", value: "1150°C" }
  },
  {
    id: "horizon_3",
    title: "Cooling Jet Pump",
    subtitle: "Sinter Fan Cooler",
    x: 600,
    y: 50,
    type: "action",
    statusColor: "#22c55e",
    status: "completed",
    nextNodes: ["horizon_5"],
    rulDays: 45,
    valveName: "VALVE_4A",
    valveFlow: 250
  },
  {
    id: "horizon_4",
    title: "Recycled Gas Loop",
    subtitle: "Waste Heat Telemetry",
    x: 600,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["horizon_6"],
    rulDays: 120,
    sensors: [
      { name: "Gas_Temp", value: "380°C", status: "OK" },
      { name: "Loop_Pres", value: "1.2b", status: "OK" }
    ]
  },
  {
    id: "horizon_5",
    title: "Furnace Ingress",
    subtitle: "Blast Furnace Temp",
    x: 880,
    y: 50,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "completed",
    nextNodes: ["horizon_7"],
    rulDays: 30,
    sensors: [
      { name: "BF_Temp", value: "1450°C", status: "OK" },
      { name: "BF_Press", value: "3.2b", status: "OK" }
    ]
  },
  {
    id: "horizon_6",
    title: "Recycling Stack",
    subtitle: "BF Gas Extraction",
    x: 880,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["horizon_8"],
    rulDays: 160,
    sensors: [
      { name: "FlowRate", value: "14200 m3/h", status: "OK" },
      { name: "Gas_CO2", value: "22%", status: "OK" }
    ]
  },
  {
    id: "horizon_7",
    title: "Active Taphole Jet",
    subtitle: "BF Taphole Drill",
    x: 1160,
    y: 50,
    type: "action",
    statusColor: "#ef4444",
    status: "completed",
    nextNodes: ["horizon_9"],
    rulDays: 14,
    valveName: "DRILL_COOL_3",
    valveFlow: 350
  },
  {
    id: "horizon_8",
    title: "Slag Hopper Drive",
    subtitle: "Slag Granulator",
    x: 1160,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["horizon_10"],
    rulDays: 75,
    sensors: [
      { name: "Gran_Vibr", value: "3.1 mm/s", status: "OK" },
      { name: "WaterTemp", value: "48°C", status: "OK" }
    ]
  },
  {
    id: "horizon_9",
    title: "Lance Flow Check",
    subtitle: "BOF Lance Controller",
    x: 1440,
    y: 50,
    type: "classifier",
    statusColor: "#a855f7",
    status: "completed",
    nextNodes: ["horizon_11"],
    rulDays: 8,
    threshold: { field: "Lance_Height", operator: "<", value: "1.8m" }
  },
  {
    id: "horizon_10",
    title: "Ladle Induction",
    subtitle: "Ladle Furnace Temp",
    x: 1440,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["horizon_12"],
    rulDays: 50,
    sensors: [
      { name: "Melt_Temp", value: "1620°C", status: "OK" },
      { name: "InducCurrent", value: "12.4 kA", status: "OK" }
    ]
  },
  {
    id: "horizon_11",
    title: "Mold Oscillator",
    subtitle: "Continuous Caster",
    x: 1720,
    y: 50,
    type: "action",
    statusColor: "#22c55e",
    status: "completed",
    nextNodes: ["horizon_13"],
    rulDays: 28,
    valveName: "SPRAY_COOL_B",
    valveFlow: 520
  },
  {
    id: "horizon_12",
    title: "Stopper Rod Servo",
    subtitle: "Tundish Flow Monitor",
    x: 1720,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["horizon_13"],
    rulDays: 60,
    sensors: [
      { name: "Rod_Press", value: "185 bar", status: "OK" },
      { name: "Flow_Speed", value: "1.4 m/s", status: "OK" }
    ]
  },
  {
    id: "horizon_13",
    title: "Coiler Temp Rule",
    subtitle: "Hot Strip Mill",
    x: 2000,
    y: 180,
    type: "classifier",
    statusColor: "#a855f7",
    status: "completed",
    nextNodes: ["horizon_14"],
    rulDays: 45,
    threshold: { field: "Slab_Temp", operator: "<", value: "880°C" }
  },
  {
    id: "horizon_14",
    title: "Coiler Mandrel",
    subtitle: "HSM Roller Coiler",
    x: 2280,
    y: 180,
    type: "action",
    statusColor: "#22c55e",
    status: "completed",
    nextNodes: ["horizon_15"],
    rulDays: 45,
    valveName: "MANDREL_LUB",
    valveFlow: 120
  },
  {
    id: "horizon_15",
    title: "Coil Storage Yard",
    subtitle: "Final Yard Log",
    x: 2560,
    y: 180,
    type: "end",
    statusColor: "#10b981",
    status: "completed",
    nextNodes: [],
    rulDays: 365
  }
];

// ----------------------------------------------------
// Zephyr Core Plant (12 Nodes)
// ----------------------------------------------------
const initialZephyrNodes: FlowNode[] = [
  {
    id: "zephyr_1",
    title: "Raw Batch Ingest",
    subtitle: "Blast Furnace 2 Feed",
    x: 40,
    y: 180,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "completed",
    nextNodes: ["zephyr_2"],
    rulDays: 150,
    sensors: [
      { name: "SkipFlowRate", value: "280 T/h", status: "OK" },
      { name: "ScaleWeight", value: "12.4 T", status: "OK" }
    ]
  },
  {
    id: "zephyr_2",
    title: "Flue Extraction Rule",
    subtitle: "Gas Exhaust Blower",
    x: 320,
    y: 180,
    type: "classifier",
    statusColor: "#a855f7",
    status: "completed",
    nextNodes: ["zephyr_3", "zephyr_4"],
    rulDays: 78,
    threshold: { field: "Flue_Temp", operator: ">", value: "260°C" }
  },
  {
    id: "zephyr_3",
    title: "Air Preheater Blower",
    subtitle: "Air Preheater Fan",
    x: 600,
    y: 50,
    type: "action",
    statusColor: "#22c55e",
    status: "completed",
    nextNodes: ["zephyr_5"],
    rulDays: 32,
    valveName: "FAN_VENT_4",
    valveFlow: 900
  },
  {
    id: "zephyr_4",
    title: "Pulverized Feed Loop",
    subtitle: "Coal Injection Pipe",
    x: 600,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["zephyr_6"],
    rulDays: 110,
    sensors: [
      { name: "CoalFlowSpeed", value: "28 m/s", status: "OK" },
      { name: "PipePressure", value: "4.1 bar", status: "OK" }
    ]
  },
  {
    id: "zephyr_5",
    title: "Hearth Heat Sensors",
    subtitle: "Hearth Thermal Array",
    x: 880,
    y: 50,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "completed",
    nextNodes: ["zephyr_7"],
    rulDays: 42,
    sensors: [
      { name: "HearthTemp", value: "1120°C", status: "OK" },
      { name: "StaveHeatRate", value: "14.2 kW/m2", status: "OK" }
    ]
  },
  {
    id: "zephyr_6",
    title: "Tuyere Water Cooling",
    subtitle: "Tuyere Cooling Array",
    x: 880,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["zephyr_8"],
    rulDays: 95,
    sensors: [
      { name: "CoolingFlow", value: "1420 L/min", status: "OK" },
      { name: "OutletTemp", value: "44°C", status: "OK" }
    ]
  },
  {
    id: "zephyr_7",
    title: "Cast House Drill",
    subtitle: "Cast House Taphole",
    x: 1160,
    y: 50,
    type: "action",
    statusColor: "#ef4444",
    status: "completed",
    nextNodes: ["zephyr_9"],
    rulDays: 10,
    valveName: "DRILL_LUBRICANT",
    valveFlow: 80
  },
  {
    id: "zephyr_8",
    title: "Mud Gun Hydraulic",
    subtitle: "Mud Gun Press Monitor",
    x: 1160,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["zephyr_10"],
    rulDays: 115,
    sensors: [
      { name: "PistonPress", value: "210 bar", status: "OK" },
      { name: "OilTemp", value: "54°C", status: "OK" }
    ]
  },
  {
    id: "zephyr_9",
    title: "Desulphurizing Check",
    subtitle: "Desulphurizing Unit",
    x: 1440,
    y: 50,
    type: "classifier",
    statusColor: "#a855f7",
    status: "completed",
    nextNodes: ["zephyr_11"],
    rulDays: 60,
    threshold: { field: "Sulphur_Percent", operator: ">", value: "0.015%" }
  },
  {
    id: "zephyr_10",
    title: "Ladle Rail Carrier",
    subtitle: "Ladle Carrier System",
    x: 1440,
    y: 310,
    type: "telemetry",
    statusColor: "#3b82f6",
    status: "idle",
    nextNodes: ["zephyr_11"],
    rulDays: 85,
    sensors: [
      { name: "CarrierLoad", value: "140 Tons", status: "OK" },
      { name: "MotorVibration", value: "3.4 mm/s", status: "OK" }
    ]
  },
  {
    id: "zephyr_11",
    title: "Pig Casting Spray",
    subtitle: "Pig Casting Machine",
    x: 1720,
    y: 180,
    type: "action",
    statusColor: "#22c55e",
    status: "completed",
    nextNodes: ["zephyr_12"],
    rulDays: 48,
    valveName: "PC_MOLD_SPRAY",
    valveFlow: 380
  },
  {
    id: "zephyr_12",
    title: "Production Output Log",
    subtitle: "Batch Production Out",
    x: 2000,
    y: 180,
    type: "end",
    statusColor: "#10b981",
    status: "completed",
    nextNodes: [],
    rulDays: 365
  }
];

interface NodeWorkflowProps {
  initialFactory?: "horizon" | "zephyr";
  hidePills?: boolean;
  onBack?: () => void;
}

const getCardWidth = (id: string, expandedNodeId: string | null) => (expandedNodeId === id ? 340 : 240);
const getCardHeight = (id: string, expandedNodeId: string | null) => (expandedNodeId === id ? 300 : 140);

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
    horizon: initialHorizonNodes,
    zephyr: initialZephyrNodes
  });

  const nodes = factoryNodes[activeFactory];

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
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [showAddMenuId, setShowAddMenuId] = useState<string | null>(null);
  
  // Canvas Pan & Zoom States
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 40, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Draggable Node States
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Center nodes vertically in container on mount or activeFactory change
  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        if (height > 0) {
          const nodeYCoords = nodes.map((n) => n.y);
          const minY = nodeYCoords.length > 0 ? Math.min(...nodeYCoords) : 50;
          const maxY = nodeYCoords.length > 0 ? Math.max(...nodeYCoords) : 310;
          const nodesCenterY = (minY + (maxY + 140)) / 2;
          const initialY = Math.round(height / 2 - nodesCenterY);
          setPanOffset({ x: 40, y: initialY });
          setIsCanvasReady(true);
          observer.disconnect();
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeFactory]);

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
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        const nodeYCoords = nodes.map((n) => n.y);
        const minY = nodeYCoords.length > 0 ? Math.min(...nodeYCoords) : 50;
        const maxY = nodeYCoords.length > 0 ? Math.max(...nodeYCoords) : 310;
        const nodesCenterY = (minY + (maxY + 140)) / 2;
        const initialY = Math.round(height / 2 - nodesCenterY);
        setPanOffset({ x: 40, y: initialY });
      } else {
        setPanOffset({ x: 40, y: 0 });
      }
    }
  }, [nodes]);

  // Canvas Drag/Pan Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".node-element") || target.closest(".action-button") || target.closest(".panel-button")) return;
    
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
      // Calculate drag distance
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        hasDragged.current = true;
      }

      const updatedNodes = nodes.map((node) => {
        if (node.id === draggingNodeId) {
          let gridX = Math.round((e.clientX - dragOffset.x - panOffset.x) / zoomScale);
          let gridY = Math.round((e.clientY - dragOffset.y - panOffset.y) / zoomScale);
          
          gridX = Math.max(10, Math.min(3000, gridX));
          gridY = Math.max(10, Math.min(600, gridY));

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
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest(".action-button")) return;

    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - (node.x * zoomScale + panOffset.x),
      y: e.clientY - (node.y * zoomScale + panOffset.y)
    });

    // Initialize drag detection
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
  }, [nodes, zoomScale, panOffset]);

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
        x: parentNode.x + 280,
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
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          const updatedSensors = node.sensors?.map((s) => {
            const lowerName = s.name.toLowerCase();
            if (lowerName.includes("temp") || lowerName.includes("heat")) {
              return { ...s, value: "115°C", status: "CRITICAL" as const };
            }
            if (lowerName.includes("pres") || lowerName.includes("load")) {
              return { ...s, value: "5.8 bar", status: "CRITICAL" as const };
            }
            if (lowerName.includes("vibr")) {
              return { ...s, value: "14.2 mm/s", status: "CRITICAL" as const };
            }
            if (lowerName.includes("rate") || lowerName.includes("flow")) {
              return { ...s, value: "480 T/h", status: "HIGH" as const };
            }
            return { ...s, status: "CRITICAL" as const };
          }) || [{ name: "FaultCode", value: "ERR-902", status: "CRITICAL" as const }];

          return {
            ...node,
            status: "running",
            statusColor: "#ef4444", // Critical Red
            sensors: updatedSensors,
            subtitle: "CRITICAL ANOMALY TRIGGERED",
            valveFlow: node.valveFlow !== undefined ? 650 : undefined,
            rulDays: 1, // Visual RUL drop
            alertChannels: node.alertChannels || [
              { type: "SMS", target: "+91 98301*****", msg: "CRITICAL: " + node.title + " anomaly alert." },
              { type: "Slack", target: "#alerts-active", msg: "CRITICAL: " + node.title + " health failure!" }
            ]
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleResetTelemetry = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          const origHorizon = initialHorizonNodes.find((n) => n.id === nodeId);
          const origZephyr = initialZephyrNodes.find((n) => n.id === nodeId);
          const original = origHorizon || origZephyr;
          if (original) {
            return {
              ...node,
              status: original.status,
              statusColor: original.statusColor,
              subtitle: original.subtitle,
              sensors: original.sensors,
              valveFlow: original.valveFlow,
              alertChannels: original.alertChannels,
              rulDays: original.rulDays
            };
          }
        }
        return node;
      })
    );
  }, [setNodes]);

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
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            opacity: isCanvasReady ? 1 : 0,
            transition: isCanvasReady && enableTransition
              ? "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
              : "opacity 0.15s ease-in",
          }}
        >
          {/* SVG Connecting Edges Path Layer */}
          <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none z-0">
            {/* Render curved connector lines dynamically */}
            {nodes.map((sourceNode) => {
              return sourceNode.nextNodes.map((targetId) => {
                const targetNode = nodes.find((n) => n.id === targetId);
                if (!targetNode) return null;

                const startWidth = getCardWidth(sourceNode.id, expandedNodeId);
                const startHeight = getCardHeight(sourceNode.id, expandedNodeId);
                const endHeight = getCardHeight(targetNode.id, expandedNodeId);

                const startX = sourceNode.x + startWidth;
                const startY = sourceNode.y + startHeight / 2;
                const endX = targetNode.x;
                const endY = targetNode.y + endHeight / 2;

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
          {nodes.map((node) => {
            return (
              <WorkflowNodeCard
                key={node.id}
                node={node}
                isExpanded={expandedNodeId === node.id}
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
                onResetTelemetry={handleResetTelemetry}
                onToggleAddMenu={handleToggleAddMenu}
                onAddNodeAfter={handleAddNodeAfter}
                allNodes={nodes}
                onToggleConnection={handleToggleConnection}
              />
            );
          })}
        </div>

        {/* Floating Zoom Controls Panel */}
        <WorkflowZoomControls
          onZoom={handleZoom}
        />
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
