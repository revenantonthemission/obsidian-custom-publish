import { useEffect, useRef } from "preact/hooks";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import type { GraphData } from "../lib/types";

interface GraphNode extends SimulationNodeDatum {
  slug: string;
  title: string;
  tags: string[];
  is_hub: boolean;
  backlink_count: number;
}

type GraphLink = SimulationLinkDatum<GraphNode>;

interface ResolvedLink {
  source: GraphNode;
  target: GraphNode;
}

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
}

const HUB_COLORS: Record<string, string> = {
  os: "#3b82f6",
  web: "#10b981",
  db: "#f59e0b",
  network: "#8b5cf6",
};

function getNodeColor(node: GraphNode): string {
  if (node.is_hub) return "#ef4444";
  for (const tag of node.tags) {
    if (HUB_COLORS[tag]) return HUB_COLORS[tag];
  }
  return "#6b7280";
}

function getNodeRadius(node: GraphNode): number {
  return Math.max(4, Math.min(12, 4 + node.backlink_count * 2));
}

export default function GraphView({ data, width = 800, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const links: GraphLink[] = data.edges.map((e) => ({ ...e }));

    // Container group for zoom/pan
    const g = svg.append("g");

    // Zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);

    // Draw edges
    const linkElements = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(150, 150, 150, 0.3)")
      .attr("stroke-width", 1);

    // Draw nodes
    const nodeElements = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("cursor", "pointer")
      .on("click", (_event, d) => {
        window.location.href = `/posts/${d.slug}`;
      });

    // Draw labels
    const labelElements = g
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.title)
      .attr("font-size", "11px")
      .attr("text-anchor", "middle")
      .attr("fill", "var(--c-text, #1c1917)")
      .attr("pointer-events", "none");

    // Simulation
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.slug)
          .distance(80)
      )
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(20));

    sim.on("tick", () => {
      linkElements
        .attr("x1", (d) => (d as unknown as ResolvedLink).source.x!)
        .attr("y1", (d) => (d as unknown as ResolvedLink).source.y!)
        .attr("x2", (d) => (d as unknown as ResolvedLink).target.x!)
        .attr("y2", (d) => (d as unknown as ResolvedLink).target.y!);

      nodeElements.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);

      labelElements
        .attr("x", (d) => d.x!)
        .attr("y", (d) => d.y! + getNodeRadius(d) + 14);
    });

    return () => {
      sim.stop();
    };
  }, [data, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: "grab" }}
    />
  );
}
