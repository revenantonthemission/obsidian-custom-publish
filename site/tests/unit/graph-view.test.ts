import { describe, expect, test } from 'vitest';

import {
  buildAdjacency,
  computeFitTransform,
  getLabelOpacity,
  getNodeEmphasis,
  legendKey,
  matchesQuery,
  type EmphasisContext,
} from '../../src/lib/graphUtils.js';
import { createSimulation } from '../../src/lib/graphSim.js';
import type { GraphNode as RawGraphNode } from '../../src/lib/types.js';

function node(overrides: Partial<RawGraphNode> = {}): RawGraphNode {
  return {
    slug: 'a',
    title: 'A*',
    tags: [],
    is_hub: false,
    backlink_count: 0,
    ...overrides,
  };
}

describe('buildAdjacency', () => {
  test('records neighbors in both directions', () => {
    const adj = buildAdjacency([{ source: 'a', target: 'b' }]);
    expect(adj.get('a')?.has('b')).toBe(true);
    expect(adj.get('b')?.has('a')).toBe(true);
  });

  test('deduplicates repeated edges', () => {
    const adj = buildAdjacency([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ]);
    expect(adj.get('a')?.size).toBe(1);
    expect(adj.get('b')?.size).toBe(1);
  });

  test('omits nodes that have no edges', () => {
    const adj = buildAdjacency([{ source: 'a', target: 'b' }]);
    expect(adj.has('c')).toBe(false);
  });
});

describe('computeFitTransform', () => {
  test('returns identity for empty node list', () => {
    expect(computeFitTransform([], 800, 600)).toEqual({ k: 1, x: 0, y: 0 });
  });

  test('centers a single node without zooming in', () => {
    const t = computeFitTransform([{ x: 100, y: 100 }], 800, 600);
    expect(t.k).toBe(1);
    expect(t.x).toBe(300);
    expect(t.y).toBe(200);
  });

  test('scales down a spread-out graph to fit with padding', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1000, y: 500 },
    ];
    const t = computeFitTransform(points, 800, 600, 40);
    // k = min((800-80)/1000, (600-80)/500) = 0.72
    expect(t.k).toBeCloseTo(0.72);
    // bbox center (500, 250) maps to container center (400, 300)
    expect(t.x).toBeCloseTo(400 - 0.72 * 500);
    expect(t.y).toBeCloseTo(300 - 0.72 * 250);
  });

  test('never zooms in past 1 for tight clusters', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(computeFitTransform(points, 800, 600).k).toBe(1);
  });
});

describe('getLabelOpacity', () => {
  test('hub labels are always fully visible', () => {
    expect(getLabelOpacity(0.3, true)).toBe(1);
  });

  test('non-hub labels are hidden when zoomed out', () => {
    expect(getLabelOpacity(0.8, false)).toBe(0);
  });

  test('non-hub labels are fully visible when zoomed in', () => {
    expect(getLabelOpacity(2, false)).toBe(1);
  });

  test('non-hub labels fade between the thresholds', () => {
    const mid = getLabelOpacity(1.25, false);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe('matchesQuery', () => {
  test('empty or whitespace query matches every node', () => {
    expect(matchesQuery(node(), '')).toBe(true);
    expect(matchesQuery(node(), '   ')).toBe(true);
  });

  test('matches title case-insensitively', () => {
    expect(matchesQuery(node({ title: 'Paging과 Segmentation' }), 'paging')).toBe(true);
  });

  test('matches tags', () => {
    expect(matchesQuery(node({ tags: ['network'] }), 'net')).toBe(true);
  });

  test('returns false when neither title nor tags match', () => {
    expect(matchesQuery(node({ title: 'TCP', tags: ['network'] }), 'database')).toBe(false);
  });
});

describe('getNodeEmphasis', () => {
  function ctx(overrides: Partial<EmphasisContext> = {}): EmphasisContext {
    return {
      hoveredSlug: null,
      query: '',
      tagFilter: null,
      adjacency: buildAdjacency([{ source: 'a', target: 'b' }]),
      ...overrides,
    };
  }

  test('no interaction leaves every node normal', () => {
    expect(getNodeEmphasis(node({ slug: 'a' }), ctx())).toBe('normal');
    expect(getNodeEmphasis(node({ slug: 'z' }), ctx())).toBe('normal');
  });

  test('hovered node is focused, its neighbors stay normal, the rest dim', () => {
    const c = ctx({ hoveredSlug: 'a' });
    expect(getNodeEmphasis(node({ slug: 'a' }), c)).toBe('focus');
    expect(getNodeEmphasis(node({ slug: 'b' }), c)).toBe('normal');
    expect(getNodeEmphasis(node({ slug: 'z' }), c)).toBe('dim');
  });

  test('hover wins over an active search', () => {
    const c = ctx({ hoveredSlug: 'a', query: 'zzz-no-match' });
    expect(getNodeEmphasis(node({ slug: 'a', title: 'TCP' }), c)).toBe('focus');
    expect(getNodeEmphasis(node({ slug: 'b', title: 'TCP' }), c)).toBe('normal');
  });

  test('search matches are focused and non-matches dimmed', () => {
    const c = ctx({ query: 'tcp' });
    expect(getNodeEmphasis(node({ slug: 'a', title: 'TCP 흐름 제어' }), c)).toBe('focus');
    expect(getNodeEmphasis(node({ slug: 'b', title: 'Paging' }), c)).toBe('dim');
  });

  test('legend filter focuses its category and dims the rest', () => {
    const c = ctx({ tagFilter: 'os' });
    expect(getNodeEmphasis(node({ slug: 'a', tags: ['os'] }), c)).toBe('focus');
    expect(getNodeEmphasis(node({ slug: 'b', tags: ['network'] }), c)).toBe('dim');
  });

  test('search and legend filter intersect', () => {
    const c = ctx({ query: 'tcp', tagFilter: 'os' });
    expect(getNodeEmphasis(node({ slug: 'a', title: 'TCP', tags: ['network'] }), c)).toBe('dim');
    expect(getNodeEmphasis(node({ slug: 'b', title: 'TCP', tags: ['os'] }), c)).toBe('focus');
  });
});

describe('createSimulation', () => {
  test('adds centering x/y forces only when gravity is configured', () => {
    const withGravity = createSimulation([], [], { width: 100, height: 100, gravity: 0.05 });
    withGravity.stop();
    expect(withGravity.force('x')).toBeDefined();
    expect(withGravity.force('y')).toBeDefined();

    const withoutGravity = createSimulation([], [], { width: 100, height: 100 });
    withoutGravity.stop();
    expect(withoutGravity.force('x')).toBeUndefined();
    expect(withoutGravity.force('y')).toBeUndefined();
  });
});

describe('legendKey', () => {
  test('hub wins even when a colored tag is present', () => {
    expect(legendKey(node({ is_hub: true, tags: ['os'] }))).toBe('hub');
  });

  test('first colored tag in node order determines the key', () => {
    expect(legendKey(node({ tags: ['algorithm', 'db', 'os'] }))).toBe('db');
  });

  test('falls back to etc when no colored tag exists', () => {
    expect(legendKey(node({ tags: ['algorithm'] }))).toBe('etc');
  });
});
