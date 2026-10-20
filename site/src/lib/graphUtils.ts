import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { GraphData, GraphEdge, GraphNode as RawGraphNode } from "./types";

/** A graph node enriched with d3 simulation position data. */
export interface GraphNode extends RawGraphNode, SimulationNodeDatum {}

/** A graph link between two GraphNodes, typed for d3 simulation. */
export type GraphLink = SimulationLinkDatum<GraphNode>;

/** A link after d3 simulation has resolved source/target to node objects. */
export interface ResolvedLink {
  source: GraphNode;
  target: GraphNode;
}

/**
 * Graph categories (FR5.6; design-system-mapping.md "Data Visualization").
 * A note's first category tag decides its category, and a hub is always a
 * hub. Each category has a shape, a Korean label and a color token
 * (--c-graph-<category> in tokens.css), so none relies on hue alone.
 */
const CATEGORY_TAGS = ["os", "web", "db", "network"] as const;
type CategoryTag = (typeof CATEGORY_TAGS)[number];

export type LegendKey = CategoryTag | "hub" | "etc";

export type NodeShape = "circle" | "square" | "diamond" | "triangle" | "star" | "ring";

export const SHAPES: readonly NodeShape[] = ["circle", "square", "diamond", "triangle", "star", "ring"];

export const CATEGORY_SHAPES: Readonly<Record<LegendKey, NodeShape>> = {
  os: "circle",
  web: "square",
  db: "diamond",
  network: "triangle",
  hub: "star",
  etc: "ring",
};

/** The 24 px transparent hit area every node gets, whatever its drawn size. */
export const HIT_RADIUS = 12;

const MIN_RADIUS = 4;
const MAX_RADIUS = 12;
const RADIUS_SCALE = 2;

function isCategoryTag(tag: string): tag is CategoryTag {
  return (CATEGORY_TAGS as readonly string[]).includes(tag);
}

/** The custom property that holds a category's color in the current appearance. */
export function categoryToken(key: LegendKey): `--c-graph-${LegendKey}` {
  return `--c-graph-${key}`;
}

/** Node paint as a CSS color: the category token, which follows the appearance. */
export function getNodeColor(node: GraphNode): string {
  return `var(${categoryToken(legendKey(node))})`;
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Polygon through the points, closed. */
function polygon(points: readonly (readonly [number, number])[]): string {
  return `${points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`).join(" ")} Z`;
}

/**
 * An SVG path for the shape, centered on 0,0, sized so every shape covers
 * about the area of a circle of radius r. The ring is the circle's outline;
 * it differs from the circle only in paint (stroke, no fill).
 */
export function shapePath(shape: NodeShape, r: number): string {
  switch (shape) {
    case "circle":
    case "ring":
      return `M${round(-r)} 0 A${round(r)} ${round(r)} 0 1 0 ${round(r)} 0 A${round(r)} ${round(r)} 0 1 0 ${round(-r)} 0 Z`;
    case "square": {
      const s = r * 0.9;
      return polygon([[-s, -s], [s, -s], [s, s], [-s, s]]);
    }
    case "diamond": {
      const d = r * 1.25;
      return polygon([[0, -d], [d, 0], [0, d], [-d, 0]]);
    }
    case "triangle":
      return polygon([[0, -r * 1.2], [r * 1.1, r * 0.75], [-r * 1.1, r * 0.75]]);
    case "star": {
      const outer = r * 1.3;
      const inner = outer * 0.48;
      const points = Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * index - Math.PI / 2;
        return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
      });
      return polygon(points);
    }
  }
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

/** A node's category: a hub is a hub, otherwise its first category tag, otherwise etc. */
export function legendKey(node: RawGraphNode): LegendKey {
  if (node.is_hub) return "hub";
  return node.tags.find(isCategoryTag) ?? "etc";
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

export interface LegendItem {
  readonly key: LegendKey;
  readonly label: string;
  readonly shape: NodeShape;
}

/** The legend in the design's order: shape, color and a Korean label per category. */
export const LEGEND_ITEMS: readonly LegendItem[] = [
  { key: "os", label: "운영체제", shape: CATEGORY_SHAPES.os },
  { key: "web", label: "웹", shape: CATEGORY_SHAPES.web },
  { key: "db", label: "데이터베이스", shape: CATEGORY_SHAPES.db },
  { key: "network", label: "네트워크", shape: CATEGORY_SHAPES.network },
  { key: "hub", label: "허브", shape: CATEGORY_SHAPES.hub },
  { key: "etc", label: "기타", shape: CATEGORY_SHAPES.etc },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNode(value: unknown): RawGraphNode | null {
  if (!isRecord(value)) return null;
  const { slug, title, tags, is_hub, backlink_count } = value;
  if (typeof slug !== "string" || typeof title !== "string") return null;
  return {
    slug,
    title,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [],
    is_hub: is_hub === true,
    backlink_count: typeof backlink_count === "number" ? backlink_count : 0,
  };
}

/**
 * Validates graph.json, which arrives over the network. Malformed nodes are
 * dropped, and edges must join two known nodes; anything that is not a graph
 * at all throws.
 */
export function parseGraphData(value: unknown): GraphData {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error("graph.json is not a graph");
  }
  const nodes = value.nodes.map(toNode).filter((node): node is RawGraphNode => node !== null);
  const known = new Set(nodes.map((node) => node.slug));
  const edges = value.edges.filter(
    (edge): edge is GraphEdge =>
      isRecord(edge) &&
      typeof edge.source === "string" &&
      typeof edge.target === "string" &&
      known.has(edge.source) &&
      known.has(edge.target),
  );
  return { nodes, edges };
}
