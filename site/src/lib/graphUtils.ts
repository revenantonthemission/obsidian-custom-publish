import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { GraphEdge, GraphNode as RawGraphNode } from "./types";

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

/** Bidirectional neighbor map keyed by slug. Nodes without edges are absent. */
export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const { source, target } of edges) {
    if (!adjacency.has(source)) adjacency.set(source, new Set());
    if (!adjacency.has(target)) adjacency.set(target, new Set());
    adjacency.get(source)!.add(target);
    adjacency.get(target)!.add(source);
  }
  return adjacency;
}

export interface FitTransform {
  k: number;
  x: number;
  y: number;
}

const FIT_PADDING = 40;
const FIT_MIN_SCALE = 0.2;
const FIT_MAX_SCALE = 1;

/** Zoom transform that fits all points inside a container, never zooming in past 1. */
export function computeFitTransform(
  points: ReadonlyArray<{ x?: number; y?: number }>,
  width: number,
  height: number,
  padding: number = FIT_PADDING,
): FitTransform {
  if (points.length === 0) return { k: 1, x: 0, y: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const px = p.x ?? 0;
    const py = p.y ?? 0;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  const rawScale = Math.min(
    boxWidth > 0 ? (width - padding * 2) / boxWidth : Infinity,
    boxHeight > 0 ? (height - padding * 2) / boxHeight : Infinity,
  );
  const k = Math.max(FIT_MIN_SCALE, Math.min(FIT_MAX_SCALE, rawScale));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { k, x: width / 2 - k * centerX, y: height / 2 - k * centerY };
}

const LABEL_FADE_START = 1.0;
const LABEL_FADE_END = 1.5;

/** Label opacity by zoom scale. Hubs are always visible; others fade in between thresholds. */
export function getLabelOpacity(zoomScale: number, isHub: boolean): number {
  if (isHub) return 1;
  const t = (zoomScale - LABEL_FADE_START) / (LABEL_FADE_END - LABEL_FADE_START);
  return Math.max(0, Math.min(1, t));
}

/** Case-insensitive substring match against title and tags. Blank query matches all. */
export function matchesQuery(node: RawGraphNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  if (node.title.toLowerCase().includes(q)) return true;
  return node.tags.some((tag) => tag.toLowerCase().includes(q));
}

export type LegendKey = "hub" | keyof typeof HUB_COLORS | "etc";

/** Legend category for a node, mirroring getNodeColor precedence. */
export function legendKey(node: RawGraphNode): LegendKey {
  if (node.is_hub) return "hub";
  for (const tag of node.tags) {
    if (HUB_COLORS[tag]) return tag as LegendKey;
  }
  return "etc";
}

/** Interaction state that determines how strongly each node is drawn. */
export interface EmphasisContext {
  /** Slug of the node under the pointer, or null. */
  hoveredSlug: string | null;
  /** Current search box text (may be blank). */
  query: string;
  /** Active legend filter, or null when no filter selected. */
  tagFilter: LegendKey | null;
  /** Bidirectional neighbor map from buildAdjacency. */
  adjacency: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * focus  → full opacity, label always shown
 * normal → default rendering (label visibility follows zoom)
 * dim    → faded into the background
 */
export type Emphasis = "focus" | "normal" | "dim";

/**
 * Decide how a node is emphasized given hover, search query, and legend filter.
 * Policy: hover always wins (hovered = focus, neighbors = normal, rest = dim);
 * otherwise search and legend filter intersect (match = focus, miss = dim).
 */
export function getNodeEmphasis(node: RawGraphNode, ctx: EmphasisContext): Emphasis {
  if (ctx.hoveredSlug !== null) {
    if (node.slug === ctx.hoveredSlug) return "focus";
    if (ctx.adjacency.get(ctx.hoveredSlug)?.has(node.slug)) return "normal";
    return "dim";
  }

  const hasQuery = ctx.query.trim() !== "";
  if (!hasQuery && ctx.tagFilter === null) return "normal";

  const matches =
    matchesQuery(node, ctx.query) &&
    (ctx.tagFilter === null || legendKey(node) === ctx.tagFilter);
  return matches ? "focus" : "dim";
}

/** Ordered legend entries for the graph page UI. */
export const LEGEND_ITEMS: ReadonlyArray<{ key: LegendKey; label: string; color: string }> = [
  { key: "hub", label: "허브", color: HUB_COLOR },
  { key: "os", label: "os", color: HUB_COLORS.os },
  { key: "web", label: "web", color: HUB_COLORS.web },
  { key: "db", label: "db", color: HUB_COLORS.db },
  { key: "network", label: "network", color: HUB_COLORS.network },
  { key: "etc", label: "기타", color: DEFAULT_NODE_COLOR },
];
