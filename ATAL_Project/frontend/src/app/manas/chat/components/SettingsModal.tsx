"use client";

import React from "react";
import { X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextEnabled: boolean;
  onToggleContext: (val: boolean) => void;
  alertsEnabled: boolean;
  onToggleAlerts: (val: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  contextEnabled,
  onToggleContext,
  alertsEnabled,
  onToggleAlerts,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-[#FAF9F5] border border-zinc-200/85 rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 text-[#1b253c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Accents */}
        <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>
        <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-250/80 shrink-0">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
              Settings
            </h3>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-bold">
              Configure your diagnostic environment preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-zinc-150 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 flex-1">
          {/* Toggle for Concierge Context */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-xs font-bold text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                Concierge Context Actions
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Enable contextual document selection menu options inside the prompt input.
              </p>
            </div>
            <button
              onClick={() => onToggleContext(!contextEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                contextEnabled ? "bg-[#4A582E]" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  contextEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle for System Alerts */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-xs font-bold text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                System Alerts & Toasts
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Show real-time visual alerts and upload status notifications on the top-right of the screen.
              </p>
            </div>
            <button
              onClick={() => onToggleAlerts(!alertsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alertsEnabled ? "bg-[#4A582E]" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  alertsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="h-10 px-6 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
