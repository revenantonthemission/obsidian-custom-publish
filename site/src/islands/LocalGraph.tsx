import { useEffect, useRef, useState } from "preact/hooks";
import type { GraphData } from "../lib/types";
import type { ResolvedLink } from "../lib/graphUtils";
import { getNodeColor } from "../lib/graphUtils";
import { prepareGraphData, createSimulation, observeThemeChange, navigateToNode } from "../lib/graphSim";

const CANVAS_SIZE = 240;

interface Props {
  slug: string;
  data: GraphData;
}

export default function LocalGraph({ slug, data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!data || !canvasRef.current || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    const { nodes, links } = prepareGraphData(data);

    const sim = createSimulation(nodes, links, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      linkDistance: 50,
      chargeStrength: -120,
      collideRadius: 15,
    });

    /** Read current theme colors from CSS variables. */
    function readThemeColors() {
      const styles = getComputedStyle(document.documentElement);
      return {
        accent: styles.getPropertyValue("--c-accent").trim() || "#0d9488",
        text: styles.getPropertyValue("--c-text").trim() || "#1c1917",
        border: styles.getPropertyValue("--c-border").trim() || "#e7e5e4",
      };
    }

    let colors = readThemeColors();
    setReady(true);

    const CURRENT_RADIUS = 6;
    const DEFAULT_RADIUS = 4;

    sim.on("tick", () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.strokeStyle = colors.border;
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
        ctx.arc(node.x!, node.y!, isCurrent ? CURRENT_RADIUS : DEFAULT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? colors.accent : getNodeColor(node);
        ctx.fill();
      }

      ctx.fillStyle = colors.text;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      for (const node of nodes) {
        ctx.fillText(node.title, node.x!, node.y! + 14);
      }
    });

    const disconnectObserver = observeThemeChange(() => {
      colors = readThemeColors();
      sim.alpha(0.1).restart();
    });

    const HIT_RADIUS_SQ = 100;
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const node of nodes) {
        const dx = x - node.x!;
        const dy = y - node.y!;
        if (dx * dx + dy * dy < HIT_RADIUS_SQ && node.slug !== slug) {
          navigateToNode(node);
          break;
        }
      }
    };
    canvas.addEventListener("click", handleClick);

    return () => {
      sim.stop();
      disconnectObserver();
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
      {!ready && (
        <div
          class="skeleton"
          style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
        />
      )}
      <canvas
        ref={canvasRef}
        aria-label="현재 글과 연결된 글들의 관계를 보여주는 로컬 그래프"
        role="img"
        style={{
          width: `${CANVAS_SIZE}px`,
          height: `${CANVAS_SIZE}px`,
          cursor: "pointer",
          display: ready ? "block" : "none",
        }}
      />
    </div>
  );
}
