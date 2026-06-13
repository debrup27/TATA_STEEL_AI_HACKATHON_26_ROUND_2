"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, Plus, Trash2, Copy, Edit3, X, AlertTriangle
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
  rulDays?: number;
}

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
  const setNodes = (newNodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => {
    setFactoryNodes((prev) => {
      const updated = typeof newNodes === "function" ? newNodes(prev[activeFactory]) : newNodes;
      return {
        ...prev,
        [activeFactory]: updated
      };
    });
  };

  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
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

  // Bezier curve path constructor
  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = (x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Node dimensions based on expansion state
  const getCardWidth = (id: string) => (expandedNodeId === id ? 340 : 240);
  const getCardHeight = (id: string) => (expandedNodeId === id ? 300 : 140);

  // Zoom handlers
  const handleZoom = (type: "in" | "out" | "reset") => {
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
  };

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
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
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
  };

  // Action: Delete Node
  const handleDeleteNode = (nodeId: string) => {
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    const children = targetNode.nextNodes;

    const reconnectedNodes = nodes
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

    setNodes(reconnectedNodes);
    if (expandedNodeId === nodeId) setExpandedNodeId(null);
  };

  // Action: Duplicate Node
  const handleDuplicateNode = (nodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === nodeId);
    if (!sourceNode) return;

    const newId = `${activeFactory}_node_${Date.now()}`;
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

  // ----------------------------------------------------
  // Interactive Anomaly Simulation & Reset handlers
  // ----------------------------------------------------
  const handleSimulateAnomaly = (nodeId: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
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
  };

  const handleResetTelemetry = (nodeId: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
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
  };

  const handleNodeClick = (nodeId: string) => {
    // Toggles inline details expansion
    setExpandedNodeId(expandedNodeId === nodeId ? null : nodeId);
  };

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
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
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

                const startWidth = getCardWidth(sourceNode.id);
                const startHeight = getCardHeight(sourceNode.id);
                const endHeight = getCardHeight(targetNode.id);

                const startX = sourceNode.x + startWidth;
                const startY = sourceNode.y + startHeight / 2;
                const endX = targetNode.x;
                const endY = targetNode.y + endHeight / 2;

                const pathString = getBezierPath(startX, startY, endX, endY);
                const isActive = sourceNode.statusColor === "#ef4444" || (sourceNode.status === "completed" && targetNode.status !== "idle");
                const isCritical = sourceNode.statusColor === "#ef4444";

                return (
                  <g key={`${sourceNode.id}-${targetId}`} className="connector-glow">
                    {/* Core background connection line */}
                    <path
                      d={pathString}
                      stroke={isCritical ? "#ef4444" : isActive ? "#a1a1aa" : "#e4e4e7"}
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      className="transition-[stroke,opacity] duration-300"
                    />
                    {/* Glowing flowing dash overlay */}
                    {isActive && (
                      <path
                        d={pathString}
                        stroke={isCritical ? "#ef4444" : "#71717a"}
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
            const isExpanded = expandedNodeId === node.id;
            const cardWidth = getCardWidth(node.id);
            const cardHeight = getCardHeight(node.id);
            const isNodeCritical = node.statusColor === "#ef4444";

            return (
              <motion.div
                key={node.id}
                animate={{
                  width: cardWidth,
                  height: cardHeight
                }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="absolute group z-10"
                style={{
                  left: node.x,
                  top: node.y,
                  zIndex: isExpanded ? 50 : showAddMenuId === node.id ? 40 : isNodeCritical ? 30 : 10
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
                  onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  onClick={(e) => {
                    if (hasDragged.current) {
                      e.stopPropagation();
                      return;
                    }
                    handleNodeClick(node.id);
                  }}
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
                    <div className="absolute top-4 right-2.5 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                      <button 
                        title="Rename" 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startRenameNode(node); }}
                        className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        title="Duplicate" 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDuplicateNode(node.id); }}
                        className="action-button w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button 
                        title="Delete" 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
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
                      onClick={(e) => { e.stopPropagation(); setExpandedNodeId(null); }}
                      className="action-button absolute top-4 right-4 z-30 size-7 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
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
                                  <span className="font-bold text-zinc-600">{node.valveName}</span>
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
                              onClick={() => handleResetTelemetry(node.id)}
                              className="panel-button flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm transition-all duration-200 cursor-pointer text-center"
                            >
                              Reset Telemetry
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSimulateAnomaly(node.id)}
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
                            backgroundColor: node.statusColor || "#e4e4e7"
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Insert Node "+" floating button (shows next to output port on Hover, only when not expanded) */}
                {!isExpanded && (
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
                )}

                {/* Floating Select Dropdown for node actions */}
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
              </motion.div>
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
