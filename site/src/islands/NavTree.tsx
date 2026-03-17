import { useState, useEffect } from "preact/hooks";
import type { NavTreeNode, NavTreeData } from "../lib/types";

interface Props {
  currentSlug: string;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/** Check if a node or any descendant has the target slug. */
function isAncestor(node: NavTreeNode, slug: string): boolean {
  if (node.slug === slug) return true;
  return node.children.some((child) => isAncestor(child, slug));
}

function TreeNode({ node, currentSlug, defaultExpanded }: {
  node: NavTreeNode;
  currentSlug: string;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isCurrent = node.slug === currentSlug;
  const hasChildren = node.children.length > 0;
  const href = node.is_hub ? `/hubs/${node.slug}` : `/posts/${node.slug}`;

  return (
    <li class="nav-tree-item">
      <div class={`nav-tree-label${isCurrent ? " current" : ""}`}>
        {hasChildren ? (
          <button
            class="nav-tree-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronIcon expanded={expanded} />
          </button>
        ) : (
          <span class="nav-tree-spacer" />
        )}
        <a href={href}>{node.title}</a>
      </div>
      {hasChildren && expanded && (
        <ul class="nav-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.slug}
              node={child}
              currentSlug={currentSlug}
              defaultExpanded={isAncestor(child, currentSlug)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function NavTree({ currentSlug }: Props) {
  const [data, setData] = useState<NavTreeData | null>(null);

  useEffect(() => {
    fetch("/nav-tree.json")
      .then((res) => res.json())
      .then((json: NavTreeData) => setData(json))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const allNodes = [...data.roots, ...data.orphans];
  if (allNodes.length === 0) return null;

  return (
    <nav class="nav-tree">
      <h3 class="nav-tree-heading">탐색</h3>
      <ul class="nav-tree-root">
        {data.roots.map((node) => (
          <TreeNode
            key={node.slug}
            node={node}
            currentSlug={currentSlug}
            defaultExpanded={isAncestor(node, currentSlug)}
          />
        ))}
        {data.orphans.map((node) => (
          <TreeNode
            key={node.slug}
            node={node}
            currentSlug={currentSlug}
            defaultExpanded={false}
          />
        ))}
      </ul>
    </nav>
  );
}
