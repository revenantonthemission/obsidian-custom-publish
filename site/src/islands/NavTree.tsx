import { useState, useEffect } from "preact/hooks";
import type { NavTreeData } from "../lib/types";
import { TreeNodeItem, isAncestor } from "./TreeNodeItem";

interface Props {
  currentSlug: string;
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
          <TreeNodeItem
            key={node.slug}
            node={node}
            currentSlug={currentSlug}
            defaultExpanded={isAncestor(node, currentSlug)}
          />
        ))}
        {data.orphans.map((node) => (
          <TreeNodeItem
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
