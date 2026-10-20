import { useEffect, useState } from 'preact/hooks';
import type { NavTreeData } from '../lib/types';
import { TreeNodeItem, isAncestor } from './TreeNodeItem';

interface Props {
  currentSlug: string;
}

type TreeState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly data: NavTreeData };

/**
 * The hub navigation tree in the outline's 탐색 tab (FR4.2, FR4.5, FR5.4).
 * A failed load shows an error with a retry instead of an empty panel.
 */
export default function NavTree({ currentSlug }: Props) {
  const [state, setState] = useState<TreeState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch('/nav-tree.json')
      .then((response) => {
        if (!response.ok) throw new Error(`nav-tree.json answered ${response.status}`);
        return response.json() as Promise<NavTreeData>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === 'loading') {
    return (
      <p class="outline-status" role="status">
        탐색 목록을 불러오는 중
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <div class="outline-status" role="alert">
        <p>탐색 목록을 불러오지 못했습니다</p>
        <button type="button" class="retry-button" onClick={() => setAttempt((count) => count + 1)}>
          다시 시도
        </button>
      </div>
    );
  }

  const { roots, orphans } = state.data;
  if (roots.length + orphans.length === 0) {
    return <p class="outline-status">표시할 글이 없습니다</p>;
  }

  return (
    <nav class="nav-tree" aria-label="탐색">
      <ul class="nav-tree-root">
        {roots.map((node) => (
          <TreeNodeItem
            key={node.slug}
            node={node}
            currentSlug={currentSlug}
            defaultExpanded={isAncestor(node, currentSlug)}
          />
        ))}
        {orphans.map((node) => (
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
