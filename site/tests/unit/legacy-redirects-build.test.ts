// U3 built output (rules.md BR1.1, BR1.2, BR3.1; NFR4.9, NFR6.13, NFR6.14;
// performance-design.md §1.1, §3.2). Reads the run's shared default build
// (support/astro-build.ts) and only reads it, never site/dist:
// - the build's own build-done hook writes `_redirects.json`, one rule per
//   built tag page plus the two fixed rules;
// - the three pages live only under /writing;
// - grouped.css, now carrying the back link's rules, stays inlined, under
//   Vite's 4096-byte per-stylesheet inline limit, so no page gains a request;
// - no hashed asset carries a selector only grouped.css defines.
// Needs the fixture content first (`just preprocess`), as the unit suite does.
import { beforeAll, describe, expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { sharedDefaultBuild } from './support/astro-build.js';

const INLINE_LIMIT_BYTES = 4096;
/** Selectors grouped.css alone defines (`.grouped-list` is post.css's too). */
const GROUPED_ONLY_SELECTORS = Object.freeze([
  '.grouped-row',
  '.tag-chip',
  '.listing-header',
  '.grouped-empty',
  '.back-link',
  '.back-link-chevron',
]);
const GROUPED_FIRST_RULE = '.site-main:has(.listing-header)';

let outDir = '';

beforeAll(async () => {
  // The repository's build budget: the helper fails a build past 60 s.
  outDir = await sharedDefaultBuild();
}, 75_000);

function tagPageKeys(): string[] {
  return readdirSync(join(outDir, 'writing', 'tags'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe('the built site (U3)', () => {
  test('holds _redirects.json with one rule per built tag page plus two', () => {
    const table = JSON.parse(readFileSync(join(outDir, '_redirects.json'), 'utf8')) as {
      version: number;
      rules: { from: string; to: string }[];
    };
    const keys = tagPageKeys();
    expect(keys.length).toBeGreaterThan(5);
    expect(table.version).toBe(1);
    expect(table.rules).toHaveLength(keys.length + 2);
    expect(table.rules).toContainEqual({ from: '/tags', to: '/writing/tags' });
    expect(table.rules).toContainEqual({ from: '/graph', to: '/writing/graph' });
    for (const key of keys) {
      expect(table.rules).toContainEqual({ from: `/tags/${key}`, to: `/writing/tags/${key}` });
    }
  });

  test('builds the three pages under /writing and none at the old addresses', () => {
    for (const page of ['writing/tags', 'writing/graph', 'writing/tags/test']) {
      expect(existsSync(join(outDir, page, 'index.html')), page).toBe(true);
    }
    expect(existsSync(join(outDir, 'tags'))).toBe(false);
    expect(existsSync(join(outDir, 'graph'))).toBe(false);
    // The graph data is a file at the root, not an old address (BR2.4).
    expect(existsSync(join(outDir, 'graph.json'))).toBe(true);
  });

  test("the tag index's grouped.css block is inlined under 4096 bytes and carries .back-link", () => {
    const html = readFileSync(join(outDir, 'writing', 'tags', 'index.html'), 'utf8');
    const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '');
    const grouped = blocks.filter((css) => css.includes(GROUPED_FIRST_RULE));
    expect(grouped).toHaveLength(1);
    const css = grouped[0] ?? '';
    expect(Buffer.byteLength(css, 'utf8')).toBeLessThan(INLINE_LIMIT_BYTES);
    expect(css).toContain('.back-link');
    expect(css).toContain('.back-link-chevron');
  });

  test('no file under _astro/ carries a selector only grouped.css defines', () => {
    const astroDir = join(outDir, '_astro');
    const offenders: string[] = [];
    for (const file of readdirSync(astroDir)) {
      if (!/\.(css|js|mjs)$/.test(file)) continue;
      const text = readFileSync(join(astroDir, file), 'utf8');
      for (const selector of GROUPED_ONLY_SELECTORS) {
        if (text.includes(selector)) offenders.push(`${file}: ${selector}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
