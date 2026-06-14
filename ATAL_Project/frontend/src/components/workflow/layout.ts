import type { FlowNode } from "./types";

/** Collapsed equipment card size */
export const CARD_WIDTH_COLLAPSED = 300;
export const CARD_HEIGHT_COLLAPSED = 184;

/** Expanded detail panel — tall enough for sensors + actions without clipping */
export const CARD_WIDTH_EXPANDED = 420;
export const CARD_HEIGHT_EXPANDED = 480;

/** Horizontal spacing between nodes in the default factory layout */
export const NODE_LAYOUT_STEP = CARD_WIDTH_COLLAPSED + 72;

/** SVG connector layer origin — must cover negative node Y when dragging upward */
export const CANVAS_ORIGIN = -1200;
export const CANVAS_EXTENT = 5200;

export function getCardWidth(isExpanded: boolean, nodeId?: string, expandedNodeId?: string | null): number {
  const expanded = isExpanded || (nodeId != null && expandedNodeId === nodeId);
  return expanded ? CARD_WIDTH_EXPANDED : CARD_WIDTH_COLLAPSED;
}

export function getCardHeight(isExpanded: boolean, nodeId?: string, expandedNodeId?: string | null): number {
  const expanded = isExpanded || (nodeId != null && expandedNodeId === nodeId);
  return expanded ? CARD_HEIGHT_EXPANDED : CARD_HEIGHT_COLLAPSED;
}

export interface NodesBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export function computeNodesBounds(nodes: FlowNode[]): NodesBounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + CARD_WIDTH_COLLAPSED);
    maxY = Math.max(maxY, node.y + CARD_HEIGHT_COLLAPSED);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/** Pan offset so the node group's centroid sits at the viewport center. */
export function computeCenterPan(
  bounds: NodesBounds,
  containerWidth: number,
  containerHeight: number,
  zoom = 1,
): { x: number; y: number } {
  return {
    x: Math.round(containerWidth / 2 - bounds.centerX * zoom),
    y: Math.round(containerHeight / 2 - bounds.centerY * zoom),
  };
}
