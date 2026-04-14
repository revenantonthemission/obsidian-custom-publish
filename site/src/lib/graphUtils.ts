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

/** Node fill color based on hub status and tags. */
export function getNodeColor(node: GraphNode): string {
  if (node.is_hub) return "#ef4444";
  for (const tag of node.tags) {
    if (HUB_COLORS[tag]) return HUB_COLORS[tag];
  }
  return "#6b7280";
}

/** Node radius scaled by backlink count (4-12px range). */
export function getNodeRadius(node: GraphNode): number {
  return Math.max(4, Math.min(12, 4 + node.backlink_count * 2));
}
