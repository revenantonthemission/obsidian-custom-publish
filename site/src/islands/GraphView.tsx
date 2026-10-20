import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { drag } from "d3-drag";
import type { GraphData } from "../lib/types";
import type { GraphNode, ResolvedLink, LegendKey, Emphasis } from "../lib/graphUtils";
import {
  CATEGORY_SHAPES,
  HIT_RADIUS,
  LEGEND_ITEMS,
  buildAdjacency,
  computeFitTransform,
  getLabelOpacity,
  getNodeEmphasis,
  getNodeRadius,
  legendKey,
  matchesQuery,
  parseGraphData,
  shapePath,
} from "../lib/graphUtils";
import { prepareGraphData, createSimulation, navigateToNode } from "../lib/graphSim";

interface Props {
  /** The id of the text that describes the graph and points to its list view. */
  descriptionId?: string;
}

type GraphState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: GraphData };

const DIM_NODE_OPACITY = 0.15;
const DIM_LINK_OPACITY = 0.05;
const NORMAL_LINK_OPACITY = 0.6;
const FOCUS_LINK_OPACITY = 0.9;
const SETTLE_TICKS = 300;
const LABEL_GAP = 14;
const LEGEND_SHAPE_RADIUS = 5;

/**
 * The global graph (FR5.6; mockups W8). It loads /graph.json and shows a
 * loading, error-with-retry or empty state (FR4.5). Nodes take their
 * category's shape and token color from data-category (styles/graph.css), and
 * each has a 24 px transparent hit area. The svg is an image with a Korean
 * name; the list view on the page is the keyboard path.
 */
export default function GraphView({ descriptionId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [state, setState] = useState<GraphState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<LegendKey | null>(null);

  // Live mirrors so d3 event handlers see current values without re-binding.
  const queryRef = useRef(query);
  const tagFilterRef = useRef(tagFilter);
  queryRef.current = query;
  tagFilterRef.current = tagFilter;
  const applyEmphasisRef = useRef<(() => void) | null>(null);

  const data = state.status === "ready" ? state.data : null;

  const matchCount = useMemo(() => {
    if (data === null || query.trim() === "") return null;
    return data.nodes.filter((n) => matchesQuery(n, query)).length;
  }, [data, query]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch("/graph.json")
      .then((response) => {
        if (!response.ok) throw new Error(`graph.json answered ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        if (!cancelled) setState({ status: "ready", data: parseGraphData(value) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (data === null || data.nodes.length === 0 || !svgRef.current) return;

    // astro-island wrappers have display:contents (clientWidth 0) — measure the real container.
    const container = svgRef.current.closest<HTMLElement>(".graph-container");
    const w = container?.clientWidth || 800;
    const h = container?.clientHeight || 600;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${w} ${h}`);

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

    const linkElements = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "graph-link")
      .attr("stroke-opacity", NORMAL_LINK_OPACITY);

    // Each node: a transparent 24 px hit area under its category shape.
    const nodeElements = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "graph-node")
      .attr("data-category", (d) => legendKey(d))
      .on("click", (_event, d) => navigateToNode(d))
      .on("pointerenter", (_event, d) => {
        hoveredSlug = d.slug;
        applyEmphasis();
      })
      .on("pointerleave", () => {
        hoveredSlug = null;
        applyEmphasis();
      });
    nodeElements.append("circle").attr("class", "graph-node-hit").attr("r", HIT_RADIUS);
    nodeElements
      .append("path")
      .attr("class", "graph-node-shape")
      .attr("data-shape", (d) => CATEGORY_SHAPES[legendKey(d)])
      .attr("d", (d) => shapePath(CATEGORY_SHAPES[legendKey(d)], getNodeRadius(d)));

    const labelElements = g
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("class", "graph-label")
      .text((d) => d.title)
      .attr("text-anchor", "middle");

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

      nodeElements.attr("opacity", (d) => (emphasis.get(d.slug) === "dim" ? DIM_NODE_OPACITY : 1));

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

    const sim = createSimulation(nodes, links, { width: w, height: h, gravity: 0.06 });

    const renderPositions = () => {
      linkElements
        .attr("x1", (d) => (d as unknown as ResolvedLink).source.x!)
        .attr("y1", (d) => (d as unknown as ResolvedLink).source.y!)
        .attr("x2", (d) => (d as unknown as ResolvedLink).target.x!)
        .attr("y2", (d) => (d as unknown as ResolvedLink).target.y!);

      nodeElements.attr("transform", (d) => `translate(${d.x!},${d.y!})`);

      labelElements.attr("x", (d) => d.x!).attr("y", (d) => d.y! + getNodeRadius(d) + LABEL_GAP);
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
      drag<SVGGElement, GraphNode>()
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

    return () => {
      sim.stop();
      applyEmphasisRef.current = null;
    };
  }, [data]);

  // Re-apply emphasis when search or legend filter changes.
  useEffect(() => {
    applyEmphasisRef.current?.();
  }, [query, tagFilter]);

  if (state.status === "loading") {
    return (
      <div class="graph-state" role="status">
        <span class="graph-spinner" aria-hidden="true" />
        <p>그래프를 불러오는 중</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div class="graph-state" role="alert">
        <p>그래프를 불러오지 못했습니다</p>
        <button type="button" class="retry-button" onClick={() => setAttempt((count) => count + 1)}>
          다시 시도
        </button>
      </div>
    );
  }

  if (state.data.nodes.length === 0) {
    return <p class="graph-state">표시할 노트가 없습니다</p>;
  }

  return (
    <>
      <div class="graph-ui">
        <input
          type="search"
          class="graph-search"
          data-material="regular"
          placeholder="노트 검색"
          aria-label="그래프에서 노트 검색"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        {matchCount !== null && (
          <span class="graph-match-count" data-material="regular" role="status">
            {matchCount}개 일치
          </span>
        )}
        <div class="graph-legend" role="group" aria-label="그래프 범례 및 필터">
          {LEGEND_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              class="graph-legend-chip"
              data-material="regular"
              data-category={item.key}
              aria-pressed={tagFilter === item.key ? "true" : "false"}
              onClick={() => setTagFilter((current) => (current === item.key ? null : item.key))}
            >
              <svg
                class="graph-legend-shape"
                data-shape={item.shape}
                width="14"
                height="14"
                viewBox="-7 -7 14 14"
                aria-hidden="true"
                focusable="false"
              >
                <path d={shapePath(item.shape, LEGEND_SHAPE_RADIUS)} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <svg
        ref={svgRef}
        class="graph-svg"
        role="img"
        aria-label="모든 글의 연결 관계를 보여주는 그래프"
        aria-describedby={descriptionId}
      />
    </>
  );
}
