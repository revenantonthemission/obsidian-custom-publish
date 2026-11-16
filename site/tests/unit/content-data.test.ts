// U1 site data layer (code-generation plan Step 13; BR6.1, BR6.5; FR2.4,
// FR3.4; NFR7.2). The site reads no homepage artifact any more, and it exposes
// ordinary posts and hubs separately so the homepage's interim list and U2's
// weekly list never treat a hub as a post. Needs fixture content first
// (`just preprocess`), like the rest of the unit suite.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import * as data from '../../src/lib/data.js';
import { getAllPostMeta, getHubs, getOrdinaryPosts } from '../../src/lib/data.js';
import { filterTodayPosts, resolveBuildDate } from '../../src/lib/homepage.js';

const SOURCE_ROOT = resolve('src');

function sourceFiles(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|astro|mjs|js|css)$/.test(entry.name) ? [path] : [];
  });
}

describe('ordinary posts and hubs (FD R-major; BR6.5)', () => {
  test('getOrdinaryPosts holds every non-hub post and no hub', () => {
    const ordinary = getOrdinaryPosts();
    const all = getAllPostMeta();

    expect(ordinary.length).toBeGreaterThan(0);
    expect(ordinary.every((post) => !post.is_hub)).toBe(true);
    expect(ordinary.map((p) => p.slug)).toEqual(all.filter((p) => !p.is_hub).map((p) => p.slug));
    expect(ordinary.map((p) => p.slug)).not.toContain('hub-page');
  });

  test('getOrdinaryPosts is frozen so a caller cannot reorder the shared list', () => {
    const ordinary = getOrdinaryPosts();
    expect(Object.isFrozen(ordinary)).toBe(true);
    expect(() => (ordinary as unknown as unknown[]).push({})).toThrow(TypeError);
  });

  test('getHubs is unchanged: exactly the hubs, in the shared order', () => {
    const hubs = getHubs();
    expect(hubs.map((p) => p.slug)).toEqual(
      getAllPostMeta()
        .filter((p) => p.is_hub)
        .map((p) => p.slug)
    );
    expect(hubs.map((p) => p.slug)).toContain('hub-page');
  });
});

describe('no homepage artifact (BR6.1; FR2.4)', () => {
  test('the data module exports no homepage reader', () => {
    expect(Object.keys(data)).not.toContain('getHomepage');
    expect(Object.keys(data).filter((name) => /homepage/i.test(name))).toEqual([]);
  });

  test('no file under site/src refers to content/homepage', () => {
    const offenders = sourceFiles(SOURCE_ROOT).filter((file) =>
      /content\/homepage|homepage\/(index\.md|meta\.json)/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});

describe('interim today list (BR6.5; NFR7.2)', () => {
  test('filterTodayPosts over ordinary posts uses the build date override', () => {
    const today = resolveBuildDate({ HOMEPAGE_TODAY_OVERRIDE: '2025-06-10' });
    const picked = filterTodayPosts(getOrdinaryPosts(), today);

    expect(today).toBe('2025-06-10');
    expect(picked.map((p) => p.slug).sort()).toEqual([
      'post-with-block-refs',
      'post-with-footnotes',
      'post-with-formatting',
      'post-with-image',
    ]);
    expect(filterTodayPosts(getOrdinaryPosts(), '1999-01-01')).toEqual([]);
  });
});
