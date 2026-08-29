import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { drag } from "d3-drag";
import type { GraphData } from "../lib/types";
import type { GraphNode, ResolvedLink, LegendKey, Emphasis } from "../lib/graphUtils";
import {
  getNodeColor,
  getNodeRadius,
  buildAdjacency,
  computeFitTransform,
  getLabelOpacity,
  getNodeEmphasis,
  matchesQuery,
  LEGEND_ITEMS,
} from "../lib/graphUtils";
import { prepareGraphData, createSimulation, observeThemeChange, navigateToNode } from "../lib/graphSim";

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
}

const DIM_NODE_OPACITY = 0.15;
const DIM_LINK_OPACITY = 0.05;
const NORMAL_LINK_OPACITY = 0.6;
const FOCUS_LINK_OPACITY = 0.9;
const SETTLE_TICKS = 300;

export default function GraphView({ data, width, height }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<LegendKey | null>(null);

  // Live mirrors so d3 event handlers see current values without re-binding.
  const queryRef = useRef(query);
  const tagFilterRef = useRef(tagFilter);
  queryRef.current = query;
  tagFilterRef.current = tagFilter;
  const applyEmphasisRef = useRef<(() => void) | null>(null);

  const matchCount = useMemo(() => {
    if (query.trim() === "") return null;
    return data.nodes.filter((n) => matchesQuery(n, query)).length;
  }, [data, query]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const w = width || container?.clientWidth || 800;
    const h = height || container?.clientHeight || 600;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);

    const { nodes, links } = prepareGraphData(data);
    const adjacency = buildAdjacency(data.edges);

    let hoveredSlug: string | null = null;
    let zoomScale = 1;

    // Container group for zoom/pan
    const g = svg.append("g");
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        zoomScale = event.transform.k;
        applyEmphasis();
      });
    svg.call(zoomBehavior);

    // Draw edges
    const linkElements = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--c-border, rgba(150, 150, 150, 0.5))")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", NORMAL_LINK_OPACITY);

    // Draw nodes
    const nodeElements = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("cursor", "pointer")
      .on("click", (_event, d) => navigateToNode(d))
      .on("pointerenter", (_event, d) => {
        hoveredSlug = d.slug;
        applyEmphasis();
      })
      .on("pointerleave", () => {
        hoveredSlug = null;
        applyEmphasis();
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

    const emphasisOf = (d: GraphNode): Emphasis =>
      getNodeEmphasis(d, {
        hoveredSlug,
        query: queryRef.current,
        tagFilter: tagFilterRef.current,
        adjacency,
      });

    function applyEmphasis() {
      const emphasis = new Map<string, Emphasis>();
      for (const n of nodes) emphasis.set(n.slug, emphasisOf(n));

      nodeElements.attr("opacity", (d) =>
        emphasis.get(d.slug) === "dim" ? DIM_NODE_OPACITY : 1,
      );

      labelElements.attr("opacity", (d) => {
        const e = emphasis.get(d.slug);
        if (e === "focus") return 1;
        if (e === "dim") return 0;
        return getLabelOpacity(zoomScale, d.is_hub);
      });

      linkElements.attr("stroke-opacity", (d) => {
        const { source, target } = d as unknown as ResolvedLink;
        const se = emphasis.get(source.slug);
        const te = emphasis.get(target.slug);
        if (se === "dim" || te === "dim") return DIM_LINK_OPACITY;
        if (se === "focus" || te === "focus") return FOCUS_LINK_OPACITY;
        return NORMAL_LINK_OPACITY;
      });
    }
    applyEmphasisRef.current = applyEmphasis;

    // Simulation
    const sim = createSimulation(nodes, links, { width: w, height: h, gravity: 0.06 });

    const renderPositions = () => {
      linkElements
        .attr("x1", (d) => (d as unknown as ResolvedLink).source.x!)
        .attr("y1", (d) => (d as unknown as ResolvedLink).source.y!)
        .attr("x2", (d) => (d as unknown as ResolvedLink).target.x!)
        .attr("y2", (d) => (d as unknown as ResolvedLink).target.y!);

      nodeElements.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);

      labelElements
        .attr("x", (d) => d.x!)
        .attr("y", (d) => d.y! + getNodeRadius(d) + 14);
    };

    // Settle the layout synchronously, then fit the whole graph into view.
    sim.stop();
    sim.tick(SETTLE_TICKS);
    renderPositions();
    const fit = computeFitTransform(nodes, w, h);
    zoomScale = fit.k;
    svg.call(zoomBehavior.transform, zoomIdentity.translate(fit.x, fit.y).scale(fit.k));
    sim.on("tick", renderPositions);

    // Drag: pin while dragging, gently reheat the simulation.
    nodeElements.call(
      drag<SVGCircleElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

    applyEmphasis();
    setReady(true);

    // Force SVG repaint when theme changes so CSS variables re-resolve
    const disconnectObserver = observeThemeChange(() => {
      svg.style("display", "none");
      svgRef.current!.getBoundingClientRect();
      svg.style("display", null);
    });

    return () => {
      sim.stop();
      disconnectObserver();
      applyEmphasisRef.current = null;
    };
  }, [data, width, height]);

  // Re-apply emphasis when search or legend filter changes.
  useEffect(() => {
    applyEmphasisRef.current?.();
  }, [query, tagFilter]);

  return (
    <>
      {!ready && (
        <div
          class="skeleton"
          style={{ width: "100%", height: "100%" }}
        />
      )}
      <div class="graph-ui" hidden={!ready}>
        <input
          type="search"
          class="graph-search"
          placeholder="노트 검색"
          aria-label="그래프에서 노트 검색"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        {matchCount !== null && (
          <span class="graph-match-count" role="status">
            {matchCount}개 일치
          </span>
        )}
        <div class="graph-legend" role="group" aria-label="그래프 범례 및 필터">
          {LEGEND_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              class={`graph-legend-chip${tagFilter === item.key ? " active" : ""}`}
              aria-pressed={tagFilter === item.key}
              onClick={() => setTagFilter((current) => (current === item.key ? null : item.key))}
            >
              <span class="graph-legend-dot" style={{ background: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
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
