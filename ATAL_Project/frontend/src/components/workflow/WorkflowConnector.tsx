"use client";

import React from "react";

interface WorkflowConnectorProps {
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isActive: boolean;
  isCritical: boolean;
}

const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

const WorkflowConnectorComponent = React.memo(function WorkflowConnector({
  startX,
  startY,
  endX,
  endY,
  isActive,
  isCritical,
}: WorkflowConnectorProps) {
  const pathString = getBezierPath(startX, startY, endX, endY);

  return (
    <g className="connector-glow">
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
}, (prevProps, nextProps) => {
  return (
    prevProps.startX === nextProps.startX &&
    prevProps.startY === nextProps.startY &&
    prevProps.endX === nextProps.endX &&
    prevProps.endY === nextProps.endY &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isCritical === nextProps.isCritical
  );
});

export default WorkflowConnectorComponent;
