import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { GraphNode as RawGraphNode } from "./types";

/** A graph node enriched with d3 simulation position data. */
export interface GraphNode extends RawGraphNode, SimulationNodeDatum {}

/** A graph link between two GraphNodes, typed for d3 simulation. */
export type GraphLink = SimulationLinkDatum<GraphNode>;

/** A link after d3 simulation has resolved source/target to node objects. */
export interface ResolvedLink {
  source: GraphNode;
  target: GraphNode;
}

/** Tag-based color palette for hub categories. */
const HUB_COLORS: Record<string, string> = {
  os: "#3b82f6",
  web: "#10b981",
  db: "#f59e0b",
  network: "#8b5cf6",
};

const HUB_COLOR = "#ef4444";
const DEFAULT_NODE_COLOR = "#6b7280";
const MIN_RADIUS = 4;
const MAX_RADIUS = 12;
const RADIUS_SCALE = 2;

/** Node fill color based on hub status and tags. */
export function getNodeColor(node: GraphNode): string {
  if (node.is_hub) return HUB_COLOR;
  for (const tag of node.tags) {
    if (HUB_COLORS[tag]) return HUB_COLORS[tag];
  }
  return DEFAULT_NODE_COLOR;
}

/** Node radius scaled by backlink count. */
export function getNodeRadius(node: GraphNode): number {
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, MIN_RADIUS + node.backlink_count * RADIUS_SCALE));
}
