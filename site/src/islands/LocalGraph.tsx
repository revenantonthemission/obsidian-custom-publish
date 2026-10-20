import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { GraphData, GraphNode as RawGraphNode } from '../lib/types';
import type { ResolvedLink } from '../lib/graphUtils';
import { CATEGORY_SHAPES, categoryToken, legendKey, shapePath } from '../lib/graphUtils';
import {
  prepareGraphData,
  createSimulation,
  observeThemeChange,
  navigateToNode,
} from '../lib/graphSim';

const CANVAS_SIZE = 240;
const CURRENT_RADIUS = 6;
const DEFAULT_RADIUS = 4;
const LABEL_GAP = 14;
const HIT_RADIUS_SQ = 144;

type View = 'graph' | 'list';

const VIEWS: readonly { readonly view: View; readonly label: string }[] = [
  { view: 'graph', label: '그래프' },
  { view: 'list', label: '목록' },
];

interface Props {
  slug: string;
  data: GraphData;
}

function hrefOf(node: RawGraphNode): string {
  return node.is_hub ? `/hubs/${node.slug}` : `/posts/${node.slug}`;
}

/**
 * The local graph below a post (FR5.6; interaction-spec.md "Graph View and
 * Local Graph"). Like the graph page, it pairs the canvas with a 목록 view of
 * the same neighbors as links, behind a 그래프 | 목록 segmented control.
 * Nodes are drawn in their category's shape and token color; labels use the
 * Caption style. PostLayout names the section with its own heading.
 */
export default function LocalGraph({ slug, data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('graph');

  const neighbors = useMemo(
    () =>
      data.nodes
        .filter((node) => node.slug !== slug)
        .sort((a, b) => a.title.localeCompare(b.title, 'ko')),
    [data, slug]
  );

  useEffect(() => {
    if (!data || !canvasRef.current || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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

    /** Reads the current appearance from the tokens and the Caption style from CSS. */
    function readPaint() {
      const root = getComputedStyle(document.documentElement);
      const own = getComputedStyle(canvas);
      return {
        current: root.getPropertyValue('--c-tint').trim(),
        text: root.getPropertyValue('--c-text').trim(),
        line: root.getPropertyValue('--c-separator').trim(),
        font: `${own.fontWeight} ${own.fontSize} ${own.fontFamily}`,
        category: (node: RawGraphNode) =>
          root.getPropertyValue(categoryToken(legendKey(node))).trim(),
      };
    }

    let paint = readPaint();
    setReady(true);

    sim.on('tick', () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.strokeStyle = paint.line;
      ctx.lineWidth = 1;
      for (const link of links as unknown as ResolvedLink[]) {
        ctx.beginPath();
        ctx.moveTo(link.source.x!, link.source.y!);
        ctx.lineTo(link.target.x!, link.target.y!);
        ctx.stroke();
      }

      for (const node of nodes) {
        const isCurrent = node.slug === slug;
        const shape = CATEGORY_SHAPES[legendKey(node)];
        const color = isCurrent ? paint.current : paint.category(node);
        const path = new Path2D(shapePath(shape, isCurrent ? CURRENT_RADIUS : DEFAULT_RADIUS));
        ctx.save();
        ctx.translate(node.x!, node.y!);
        if (shape === 'ring' && !isCurrent) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke(path);
        } else {
          ctx.fillStyle = color;
          ctx.fill(path);
        }
        ctx.restore();
      }

      ctx.fillStyle = paint.text;
      ctx.font = paint.font;
      ctx.textAlign = 'center';
      for (const node of nodes) {
        ctx.fillText(node.title, node.x!, node.y! + LABEL_GAP);
      }
    });

    const disconnectObserver = observeThemeChange(() => {
      paint = readPaint();
      sim.alpha(0.1).restart();
    });

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
    canvas.addEventListener('click', handleClick);

    return () => {
      sim.stop();
      disconnectObserver();
      canvas.removeEventListener('click', handleClick);
    };
  }, [data, slug]);

  const select = (next: View) => {
    setView(next);
    document.getElementById(`local-graph-tab-${next}`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, View> = {
      ArrowLeft: view === 'graph' ? 'list' : 'graph',
      ArrowRight: view === 'graph' ? 'list' : 'graph',
      Home: 'graph',
      End: 'list',
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div class="local-graph">
      <div
        class="local-graph-tabs segmented"
        role="tablist"
        aria-label="로컬 그래프 보기 방식"
        onKeyDown={onKeyDown}
      >
        {VIEWS.map((item) => (
          <button
            key={item.view}
            type="button"
            role="tab"
            id={`local-graph-tab-${item.view}`}
            aria-controls={`local-graph-panel-${item.view}`}
            aria-selected={view === item.view ? 'true' : 'false'}
            tabIndex={view === item.view ? 0 : -1}
            onClick={() => setView(item.view)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="local-graph-panel-graph"
        aria-labelledby="local-graph-tab-graph"
        class="local-graph-canvas"
        hidden={view !== 'graph'}
      >
        {!ready && <div class="skeleton local-graph-skeleton" />}
        <canvas
          ref={canvasRef}
          aria-label="현재 글과 연결된 글들의 관계를 보여주는 로컬 그래프"
          role="img"
          hidden={!ready}
        />
      </div>
      <div
        role="tabpanel"
        id="local-graph-panel-list"
        aria-labelledby="local-graph-tab-list"
        hidden={view !== 'list'}
      >
        {neighbors.length > 0 ? (
          <ul class="local-graph-list">
            {neighbors.map((node) => (
              <li key={node.slug}>
                <a href={hrefOf(node)}>{node.title}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p class="local-graph-empty">연결된 글이 없습니다</p>
        )}
      </div>
    </div>
  );
}
