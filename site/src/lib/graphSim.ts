import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force';
import type { GraphData } from './types';
import type { GraphNode, GraphLink } from './graphUtils';

interface SimConfig {
  width: number;
  height: number;
  linkDistance?: number;
  chargeStrength?: number;
  collideRadius?: number;
  /** Weak pull toward the center; keeps disconnected clusters together. 0/undefined disables. */
  gravity?: number;
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
  config: SimConfig
): Simulation<GraphNode, GraphLink> {
  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.slug)
        .distance(config.linkDistance ?? 80)
    )
    .force('charge', forceManyBody().strength(config.chargeStrength ?? -200))
    .force('center', forceCenter(config.width / 2, config.height / 2))
    .force('collide', forceCollide().radius(config.collideRadius ?? 20));

  if (config.gravity) {
    sim
      .force('x', forceX(config.width / 2).strength(config.gravity))
      .force('y', forceY(config.height / 2).strength(config.gravity));
  }

  return sim;
}

/**
 * Calls back whenever the rendered appearance may have changed: the reader
 * picked a mode (data-theme and data-appearance on <html>), or, in Automatic
 * mode, the system appearance changed while the page is open (FR3.3).
 * Canvas and SVG graphs repaint from it; CSS-driven parts switch on their own.
 * Returns a cleanup function.
 */
export function observeThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-appearance'],
  });
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  systemDark.addEventListener('change', callback);
  return () => {
    observer.disconnect();
    systemDark.removeEventListener('change', callback);
  };
}

/** Navigate to a graph node's page. */
export function navigateToNode(node: GraphNode): void {
  window.location.href = node.is_hub ? `/hubs/${node.slug}` : `/posts/${node.slug}`;
}
