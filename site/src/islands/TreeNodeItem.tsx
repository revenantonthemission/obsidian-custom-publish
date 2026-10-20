import { useState } from "preact/hooks";
import { ChevronRight } from "lucide-preact";
import type { NavTreeNode } from "../lib/types";

/** Check if a node or any descendant has the target slug. */
export function isAncestor(node: NavTreeNode, slug: string): boolean {
  if (node.slug === slug) return true;
  return node.children.some((child) => isAncestor(child, slug));
}

/**
 * One row of the hub navigation tree. Rows are 44 px tall (FR5.8); a toggle
 * exposes aria-expanded and a Korean name, "‘<제목>’ 펼치기" or "… 접기" (FR5.4,
 * FR5.5), and its chevron turns by transform only.
 */
export function TreeNodeItem({
  node,
  currentSlug,
  defaultExpanded,
}: {
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
            type="button"
            class="nav-tree-toggle"
            aria-expanded={expanded ? "true" : "false"}
            aria-label={`‘${node.title}’ ${expanded ? "접기" : "펼치기"}`}
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronRight class="nav-tree-chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : (
          <span class="nav-tree-spacer" aria-hidden="true" />
        )}
        <a href={href} aria-current={isCurrent ? "page" : undefined}>
          {node.title}
        </a>
      </div>
      {hasChildren && expanded && (
        <ul class="nav-tree-children">
          {node.children.map((child) => (
            <TreeNodeItem
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
