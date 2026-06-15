"use client";

import { FileCheck, X } from "lucide-react";

interface WorkOrderRaisedModalProps {
  open: boolean;
  assetName?: string;
  workOrderId?: string;
  priority?: string;
  onClose: () => void;
}

export default function WorkOrderRaisedModal({
  open,
  assetName,
  workOrderId,
  priority,
  onClose,
}: WorkOrderRaisedModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="wo-raised-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Work order raised</p>
              <h2 id="wo-raised-title" className="text-lg font-black text-[#1b253c] mt-0.5">
                Maintenance ticket created
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
          {assetName ? (
            <>
              A work order for <span className="font-semibold text-zinc-800">{assetName}</span> has been
              scheduled in the maintenance system.
            </>
          ) : (
            "The work order has been scheduled in the maintenance system."
          )}
        </p>
        {(workOrderId || priority) && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono bg-zinc-50 border border-zinc-100 rounded-xl p-3">
            {workOrderId ? (
              <>
                <dt className="text-zinc-400 uppercase">Order ID</dt>
                <dd className="text-zinc-800 font-bold truncate">{workOrderId}</dd>
              </>
            ) : null}
            {priority ? (
              <>
                <dt className="text-zinc-400 uppercase">Priority</dt>
                <dd className="text-orange-600 font-bold">{priority}</dd>
              </>
            ) : null}
          </dl>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-[#1b253c] text-white text-xs font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors cursor-pointer"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
