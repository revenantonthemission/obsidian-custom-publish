import { useEffect, useRef, useState } from "preact/hooks";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

interface GraphNode extends SimulationNodeDatum {
  slug: string;
  title: string;
  tags: string[];
  is_hub: boolean;
  backlink_count: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Props {
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

export default function GraphView({ width = 800, height = 600 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    fetch("/graph.json")
      .then((r) => r.json())
      .then((d: GraphData) => setData(d));
  }, []);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const nodes = data.nodes.map((n) => ({ ...n }));
    const links = data.edges.map((e) => ({ ...e }));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, SimulationLinkDatum<GraphNode>>(links as any)
          .id((d: any) => d.slug)
          .distance(80)
      )
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(20));

    sim.on("tick", () => {
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = "rgba(150, 150, 150, 0.3)";
      ctx.lineWidth = 1;
      for (const link of links as any[]) {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        const r = getNodeRadius(node);
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(node);
        ctx.fill();
      }

      // Draw labels
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--c-text")
        .trim() || "#1c1917";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      for (const node of nodes) {
        ctx.fillText(node.title, node.x!, node.y! + getNodeRadius(node) + 12);
      }
    });

    // Click to navigate
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const node of nodes) {
        const dx = x - node.x!;
        const dy = y - node.y!;
        if (dx * dx + dy * dy < 144) {
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
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        cursor: "pointer",
      }}
    />
  );
}
