import { useState, useEffect } from "preact/hooks";
import type { NavTreeData, NavTreeNode } from "../lib/types";

interface Props {
  content: string;
  currentSlug: string;
}

interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

function extractToc(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const re = /<h([2-4])\s+id="([^"]*)"[^>]*>(.*?)<\/h[2-4]>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    entries.push({
      depth: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, ""),
    });
  }
  return entries;
}

function TreeNode({ node, currentSlug, defaultOpen }: {
  node: NavTreeNode;
  currentSlug: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isCurrent = node.slug === currentSlug;
  const hasChildren = node.children.length > 0;

  return (
    <li class="nav-tree-item">
      <div class={`nav-tree-label ${isCurrent ? "current" : ""}`}>
        {hasChildren && (
          <button
            class="nav-tree-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Collapse" : "Expand"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" style={{
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease"
              }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        {!hasChildren && <span class="nav-tree-spacer" />}
        <a href={`/${node.is_hub ? "hubs" : "posts"}/${node.slug}`}>
          {node.title}
        </a>
      </div>
      {hasChildren && open && (
        <ul class="nav-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.slug}
              node={child}
              currentSlug={currentSlug}
              defaultOpen={isAncestor(child, currentSlug)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function isAncestor(node: NavTreeNode, targetSlug: string): boolean {
  if (node.slug === targetSlug) return true;
  return node.children.some((c) => isAncestor(c, targetSlug));
}

export default function MobileSidebar({ content, currentSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"toc" | "nav">("toc");
  const [navTree, setNavTree] = useState<NavTreeData | null>(null);

  const toc = extractToc(content);

  useEffect(() => {
    if (open && !navTree) {
      fetch("/nav-tree.json")
        .then((r) => r.json())
        .then((data: NavTreeData) => setNavTree(data))
        .catch(() => setNavTree({ roots: [], orphans: [] }));
    }
  }, [open]);

  const handleTocClick = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <button
        class="mobile-sidebar-btn"
        onClick={() => setOpen(true)}
        aria-label="목차 열기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      {open && (
        <div class="mobile-sidebar-overlay" onClick={() => setOpen(false)}>
          <div class="mobile-sidebar-card" onClick={(e) => e.stopPropagation()}>
            <div class="mobile-sidebar-header">
              <div class="mobile-sidebar-tabs" role="tablist" aria-label="사이드바 탭">
                <button
                  role="tab"
                  aria-selected={tab === "toc"}
                  aria-controls="panel-toc"
                  class={`mobile-sidebar-tab ${tab === "toc" ? "active" : ""}`}
                  onClick={() => setTab("toc")}
                >
                  목차
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "nav"}
                  aria-controls="panel-nav"
                  class={`mobile-sidebar-tab ${tab === "nav" ? "active" : ""}`}
                  onClick={() => setTab("nav")}
                >
                  탐색
                </button>
              </div>
              <button class="mobile-sidebar-close" aria-label="사이드바 닫기" onClick={() => setOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div class="mobile-sidebar-body">
              {tab === "toc" && (
                <div id="panel-toc" role="tabpanel" aria-label="목차">
                  {toc.length > 0 ? (
                    <ul class="toc-list">
                      {toc.map((entry) => (
                        <li key={entry.id} class={`toc-item toc-depth-${entry.depth}`}>
                          <a href={`#${entry.id}`} onClick={(e) => {
                            e.preventDefault();
                            handleTocClick(entry.id);
                          }}>
                            {entry.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "var(--c-text-muted)", fontSize: "0.875rem" }}>
                      이 글에는 목차가 없습니다.
                    </p>
                  )}
                </div>
              )}

              {tab === "nav" && (
                <div id="panel-nav" role="tabpanel" aria-label="탐색">
                  {navTree && navTree.roots.length > 0 ? (
                    <ul class="nav-tree-root">
                      {navTree.roots.map((root) => (
                        <TreeNode
                          key={root.slug}
                          node={root}
                          currentSlug={currentSlug}
                          defaultOpen={isAncestor(root, currentSlug)}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "var(--c-text-muted)", fontSize: "0.875rem" }}>
                      탐색 트리를 불러오는 중...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
