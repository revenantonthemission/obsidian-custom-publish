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
import type { GraphData } from "../lib/types";

interface GraphNode extends SimulationNodeDatum {
  slug: string;
  title: string;
  tags: string[];
  is_hub: boolean;
  backlink_count: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

type GraphLink = SimulationLinkDatum<GraphNode>;

/** A link after d3 has resolved source/target to node objects. */
interface ResolvedLink {
  source: GraphNode;
  target: GraphNode;
}

interface Props {
  slug: string;
  data: GraphData;
}

/** Filter graph to 2-hop neighborhood of the given slug. */
function getNeighborhood(data: GraphData, center: string) {
  const adj = new Map<string, Set<string>>();
  for (const e of data.edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  const nearby = new Set<string>([center]);
  // 1-hop
  for (const n of adj.get(center) || []) nearby.add(n);
  // 2-hop
  const hop1 = [...nearby];
  for (const n of hop1) {
    for (const m of adj.get(n) || []) nearby.add(m);
  }

  const nodes = data.nodes
    .filter((n) => nearby.has(n.slug))
    .map((n) => ({ ...n }));
  const slugSet = new Set(nodes.map((n) => n.slug));
  const edges = data.edges.filter(
    (e) => slugSet.has(e.source) && slugSet.has(e.target)
  );

  return { nodes, edges };
}

export default function LocalGraph({ slug, data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 240;

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const { nodes, edges } = getNeighborhood(data, slug);
    if (nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const links: GraphLink[] = edges.map((e) => ({ ...e }));

    const sim = forceSimulation(nodes as GraphNode[])
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.slug)
          .distance(50)
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(size / 2, size / 2))
      .force("collide", forceCollide().radius(15));

    sim.on("tick", () => {
      ctx.clearRect(0, 0, size, size);

      ctx.strokeStyle = "rgba(150, 150, 150, 0.3)";
      ctx.lineWidth = 1;
      for (const link of links as unknown as ResolvedLink[]) {
        ctx.beginPath();
        ctx.moveTo(link.source.x!, link.source.y!);
        ctx.lineTo(link.target.x!, link.target.y!);
        ctx.stroke();
      }

      for (const node of nodes as GraphNode[]) {
        const isCurrent = node.slug === slug;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, isCurrent ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent
          ? "#2563eb"
          : node.is_hub
            ? "#ef4444"
            : "#6b7280";
        ctx.fill();
      }

      ctx.fillStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--c-text")
          .trim() || "#1c1917";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      for (const node of nodes as GraphNode[]) {
        ctx.fillText(node.title, node.x!, node.y! + 14);
      }
    });

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const node of nodes as GraphNode[]) {
        const dx = x - node.x!;
        const dy = y - node.y!;
        if (dx * dx + dy * dy < 100 && node.slug !== slug) {
          window.location.href = `/posts/${node.slug}`;
          break;
        }
      }
    };
    canvas.addEventListener("click", handleClick);

    return () => {
      sim.stop();
      canvas.removeEventListener("click", handleClick);
    };
  }, [data, slug]);

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h3
        style={{
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--c-text-muted)",
          marginBottom: "0.5rem",
        }}
      >
        로컬 그래프
      </h3>
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px`, cursor: "pointer" }}
      />
    </div>
  );
}
