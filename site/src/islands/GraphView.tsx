import { useEffect, useRef, useState } from "preact/hooks";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import type { GraphData } from "../lib/types";
import type { GraphNode, GraphLink, ResolvedLink } from "../lib/graphUtils";
import { getNodeColor, getNodeRadius } from "../lib/graphUtils";

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
}

export default function GraphView({ data, width, height }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Use container dimensions if no explicit size provided
    const container = svgRef.current.parentElement;
    const w = width || container?.clientWidth || 800;
    const h = height || container?.clientHeight || 600;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", w).attr("height", h);

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
    setReady(true);

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
        window.location.href = d.is_hub ? `/hubs/${d.slug}` : `/posts/${d.slug}`;
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
      .force("center", forceCenter(w / 2, h / 2))
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
    <>
      {!ready && (
        <div
          class="skeleton"
          style={{ width: "100%", height: "100%" }}
        />
      )}
      <svg
        ref={svgRef}
        width={width || "100%"}
        height={height || "100%"}
        style={{ cursor: "grab", display: ready ? "block" : "none" }}
        aria-label="모든 글의 연결 관계를 보여주는 그래프"
        role="img"
      />
    </>
  );
}
