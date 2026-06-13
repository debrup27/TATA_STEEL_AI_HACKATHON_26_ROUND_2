"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { FlowNode } from "./types";

interface WorkflowAddMenuProps {
  node: FlowNode;
  cardWidth: number;
  allNodes: FlowNode[];
  onClose: () => void;
  onAddNodeAfter: (parentId: string, type: string) => void;
  onToggleConnection: (targetId: string) => void;
}

export default function WorkflowAddMenu({
  node,
  cardWidth,
  allNodes,
  onClose,
  onAddNodeAfter,
  onToggleConnection,
}: WorkflowAddMenuProps) {
  return (
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
      onClick={(e) => e.stopPropagation()} // Prevent parent handlers
    >
      <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5 mb-2 px-1">
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Node Actions</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add new node templates section */}
      <div className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1 px-1">Insert Template</div>
      <div className="flex flex-col gap-0.5 text-[9.5px] border-b border-zinc-100 pb-2 mb-2">
        <button 
          onClick={() => onAddNodeAfter(node.id, "telemetry")} 
          className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ingest Telemetry
        </button>
        <button 
          onClick={() => onAddNodeAfter(node.id, "classifier")} 
          className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Threshold Classifier
        </button>
        <button 
          onClick={() => onAddNodeAfter(node.id, "action")} 
          className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Deploy cooling action
        </button>
        <button 
          onClick={() => onAddNodeAfter(node.id, "alert")} 
          className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Trigger alerts
        </button>
        <button 
          onClick={() => onAddNodeAfter(node.id, "end")} 
          className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded text-left text-zinc-700 cursor-pointer w-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> State saved log
        </button>
      </div>

      {/* Connect preexisting nodes section */}
      <div className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">Connect Existing Node</div>
      <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1 text-[9.5px]">
        {allNodes
          .filter((n) => n.id !== node.id)
          .map((targetNode) => {
            const isConnected = node.nextNodes.includes(targetNode.id);
            return (
              <button
                key={targetNode.id}
                onClick={() => onToggleConnection(targetNode.id)}
                className={`flex items-center justify-between p-1 hover:bg-zinc-100 rounded text-left cursor-pointer transition-colors ${
                  isConnected ? "bg-zinc-100 text-zinc-800 font-medium" : "text-zinc-650"
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
  );
}
