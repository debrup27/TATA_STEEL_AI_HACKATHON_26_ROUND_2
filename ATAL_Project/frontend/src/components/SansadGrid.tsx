"use client";

import React from "react";
import { motion } from "framer-motion";

const GRID_A = [
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
];

const gridCells = GRID_A.flatMap((row, r) =>
  row.map((isActive, c) => ({ row: r, col: c, isActive: isActive === 1 }))
);

const GridCell = React.memo(function GridCell({
  cell,
  idx,
  animated,
  cellSizeClass,
}: {
  cell: { isActive: boolean };
  idx: number;
  animated: boolean;
  cellSizeClass: string;
}) {
  return (
    <motion.div
      {...(animated
        ? {
            initial: { scale: 0, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            transition: {
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: idx * 0.006,
            },
          }
        : {})}
      whileHover={
        cell.isActive
          ? { scale: 1.25, rotate: 90, backgroundColor: "#ea580c" }
          : { scale: 1.2, backgroundColor: "rgba(249, 115, 22, 0.2)" }
      }
      className={`${cellSizeClass} rounded-[4px] cursor-pointer transition-shadow ${
        cell.isActive
          ? "bg-[#f97316] shadow-md shadow-orange-500/20 border border-black/15"
          : "border border-black/15 bg-[#FAF9F5]/60 hover:border-orange-300"
      }`}
    />
  );
});

interface SansadGridProps {
  animated?: boolean;
  className?: string;
  cellSizeClass?: string;
  children?: React.ReactNode;
}

export default function SansadGrid({
  animated = false,
  className = "p-12 bg-[#FAF6EE]/40 border border-black/20 rounded-3xl",
  cellSizeClass = "w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8",
  children,
}: SansadGridProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute top-3 left-12 right-12 flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
        <span>0.0</span>
        <span className="opacity-40 tracking-[0.25em] font-black uppercase">X-AXIS</span>
        <span>9.0</span>
      </div>

      <div className="absolute bottom-3 left-12 right-12 flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
        <span>0.0</span>
        <span className="text-orange-500 font-bold tracking-[0.25em] uppercase">SYS_OK</span>
        <span>9.0</span>
      </div>

      <div className="absolute left-3 top-12 bottom-12 flex flex-col justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
        <span>9.0</span>
        <span className="origin-center rotate-90 opacity-40 tracking-[0.25em] font-black uppercase my-4">SANSAD</span>
        <span>0.0</span>
      </div>

      <div className="absolute right-3 top-12 bottom-12 flex flex-col justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
        <span>9.0</span>
        <span className="origin-center rotate-90 opacity-40 tracking-[0.25em] font-black uppercase my-4">ATAL</span>
        <span>0.0</span>
      </div>

      <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#FAF9F5] border border-black/20 rounded-xl relative">
        <div className="absolute -top-1.5 -left-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
        <div className="absolute -top-1.5 -right-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
        <div className="absolute -bottom-1.5 -left-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
        <div className="absolute -bottom-1.5 -right-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>

        {gridCells.map((cell, idx) => (
          <GridCell key={idx} cell={cell} idx={idx} animated={animated} cellSizeClass={cellSizeClass} />
        ))}
      </div>
      {children}
    </div>
  );
}
