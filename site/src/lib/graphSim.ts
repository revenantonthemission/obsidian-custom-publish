import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from "d3-force";
import type { GraphData } from "./types";
import type { GraphNode, GraphLink } from "./graphUtils";

interface SimConfig {
  width: number;
  height: number;
  linkDistance?: number;
  chargeStrength?: number;
  collideRadius?: number;
}

/** Prepare nodes and links from raw graph data for d3 simulation. */
export function prepareGraphData(data: GraphData): { nodes: GraphNode[]; links: GraphLink[] } {
  return {
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.edges.map((e) => ({ ...e })),
  };
}

/** Create a d3 force simulation with shared defaults. */
export function createSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  config: SimConfig,
): Simulation<GraphNode, GraphLink> {
  return forceSimulation(nodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.slug)
        .distance(config.linkDistance ?? 80),
    )
    .force("charge", forceManyBody().strength(config.chargeStrength ?? -200))
    .force("center", forceCenter(config.width / 2, config.height / 2))
    .force("collide", forceCollide().radius(config.collideRadius ?? 20));
}

/** Create a MutationObserver that fires on data-theme changes. Returns cleanup function. */
export function observeThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

/** Navigate to a graph node's page. */
export function navigateToNode(node: GraphNode): void {
  window.location.href = node.is_hub ? `/hubs/${node.slug}` : `/posts/${node.slug}`;
}
