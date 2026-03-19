import { useEffect, useRef } from "preact/hooks";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import type { GraphData } from "../lib/types";
import type { GraphNode, GraphLink, ResolvedLink } from "../lib/graphUtils";
import { getNodeColor } from "../lib/graphUtils";

interface Props {
  slug: string;
  data: GraphData;
}

export default function LocalGraph({ slug, data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 240;

  useEffect(() => {
    if (!data || !canvasRef.current || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const links: GraphLink[] = data.edges.map((e) => ({ ...e }));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.slug)
          .distance(50)
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(size / 2, size / 2))
      .force("collide", forceCollide().radius(15));

    const styles = getComputedStyle(document.documentElement);
    const accentColor = styles.getPropertyValue("--c-accent").trim() || "#2563eb";
    const textColor = styles.getPropertyValue("--c-text").trim() || "#1c1917";
    const borderColor = styles.getPropertyValue("--c-border").trim() || "#e7e5e4";

    sim.on("tick", () => {
      ctx.clearRect(0, 0, size, size);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      for (const link of links as unknown as ResolvedLink[]) {
        ctx.beginPath();
        ctx.moveTo(link.source.x!, link.source.y!);
        ctx.lineTo(link.target.x!, link.target.y!);
        ctx.stroke();
      }

      for (const node of nodes) {
        const isCurrent = node.slug === slug;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, isCurrent ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? accentColor : getNodeColor(node);
        ctx.fill();
      }

      ctx.fillStyle = textColor;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      for (const node of nodes) {
        ctx.fillText(node.title, node.x!, node.y! + 14);
      }
    });

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const node of nodes) {
        const dx = x - node.x!;
        const dy = y - node.y!;
        if (dx * dx + dy * dy < 100 && node.slug !== slug) {
          window.location.href = node.is_hub ? `/hubs/${node.slug}` : `/posts/${node.slug}`;
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
        aria-label="현재 글과 연결된 글들의 관계를 보여주는 로컬 그래프"
        role="img"
        style={{ width: `${size}px`, height: `${size}px`, cursor: "pointer" }}
      />
    </div>
  );
}
