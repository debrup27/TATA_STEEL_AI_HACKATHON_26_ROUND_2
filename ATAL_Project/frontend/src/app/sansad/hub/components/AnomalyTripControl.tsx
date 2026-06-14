"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Square, Loader2, ChevronDown } from "lucide-react";
import { usePlantSnapshot } from "@/hooks/usePlantSnapshot";
import { clearAnomalyTrip, triggerAnomalyTrip } from "@/services/simulate";
import type { DiagnosticAsset } from "@/services/sansadOutputs";

function EquipmentPicker({
  assets,
  value,
  disabled,
  onChange,
}: {
  assets: DiagnosticAsset[];
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = assets.find((a) => a.id === value);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-[130px] max-w-[170px]">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((prev) => !prev);
        }}
        className="w-full inline-flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border border-zinc-300 bg-white text-[10px] font-semibold text-zinc-800 hover:border-orange-300 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">
          {selected?.name ?? "Select equipment"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[200] max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {assets.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                role="option"
                aria-selected={asset.id === value}
                onClick={() => {
                  onChange(asset.id);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-[11px] font-medium hover:bg-orange-50 cursor-pointer ${
                  asset.id === value ? "bg-orange-50 text-orange-800" : "text-zinc-700"
                }`}
              >
                <span className="block truncate">{asset.name}</span>
                <span className="block text-[9px] font-mono uppercase tracking-wide text-zinc-400 truncate">
                  {asset.factory} · {asset.stage}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function AnomalyTripControl() {
  const { assets, snapshot, loading } = usePlantSnapshot();
  const [assetId, setAssetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulationActive = useMemo(() => {
    const injectedIds = snapshot?.anomaly_flags?.injected_asset_ids ?? [];
    if (injectedIds.length > 0) return true;
    return assets.some((a) => a.faultInjected);
  }, [assets, snapshot]);

  const activeAssetId = useMemo(() => {
    const injected = assets.find((a) => a.faultInjected);
    return injected?.id ?? snapshot?.anomaly_flags?.injected_asset_ids?.[0] ?? "";
  }, [assets, snapshot]);

  const defaultAssetId = useMemo(() => {
    if (activeAssetId) return activeAssetId;
    const hhpd = assets.find((a) => a.stage.toLowerCase().includes("descaler"));
    if (hhpd) return hhpd.id;
    const worst = [...assets].sort((a, b) => a.health - b.health)[0];
    return worst?.id ?? assets[0]?.id ?? "";
  }, [assets, activeAssetId]);

  useEffect(() => {
    if (!assetId && defaultAssetId) setAssetId(defaultAssetId);
  }, [assetId, defaultAssetId]);

  useEffect(() => {
    if (simulationActive && activeAssetId) setAssetId(activeAssetId);
  }, [simulationActive, activeAssetId]);

  const runGenerate = async () => {
    if (!assetId || simulationActive || busy) return;
    setBusy(true);
    setError(null);
    try {
      await triggerAnomalyTrip({ assetId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate abnormality");
    } finally {
      setBusy(false);
    }
  };

  const runStop = async () => {
    if (!simulationActive || busy) return;
    setBusy(true);
    setError(null);
    try {
      await clearAnomalyTrip();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop abnormality");
    } finally {
      setBusy(false);
    }
  };

  if (!assets.length) {
    return (
      <div className="flex items-center gap-2 flex-wrap opacity-70 pointer-events-auto">
        <span className="text-[10px] font-mono text-zinc-500">
          {loading ? "Loading equipment…" : "Equipment list unavailable"}
        </span>
      </div>
    );
  }

  const generateDisabled = busy || !assetId || simulationActive;
  const stopDisabled = busy || !simulationActive;

  return (
    <div
      className="relative z-[60] flex items-center gap-1.5 flex-nowrap pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <EquipmentPicker
        assets={assets}
        value={assetId}
        disabled={busy || simulationActive}
        onChange={setAssetId}
      />

      <button
        type="button"
        disabled={generateDisabled}
        onClick={(e) => {
          e.stopPropagation();
          void runGenerate();
        }}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase border border-orange-400 bg-orange-100 text-orange-800 hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        title={
          simulationActive
            ? "Stop the active simulation before generating a new one"
            : "Inject a random abnormality on selected equipment"
        }
      >
        {busy && !simulationActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        Generate Abnormality
      </button>

      <button
        type="button"
        disabled={stopDisabled}
        onClick={(e) => {
          e.stopPropagation();
          void runStop();
        }}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase border border-zinc-400 bg-white text-zinc-800 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        title={
          simulationActive
            ? "Clear injected abnormality and restore nominal readings"
            : "No active simulation to stop"
        }
      >
        {busy && simulationActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
        Stop
      </button>

      {error ? (
        <span className="text-[10px] font-mono text-rose-600 max-w-[240px]">{error}</span>
      ) : null}
    </div>
  );
}
