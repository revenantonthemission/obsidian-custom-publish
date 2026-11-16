// U1 site data layer (code-generation plan Step 13; BR6.1, BR6.5; FR2.4,
// FR3.4; NFR7.2). The site reads no homepage artifact any more, and it exposes
// ordinary posts and hubs separately so the homepage's interim list and U2's
// weekly list never treat a hub as a post. Needs fixture content first
// (`just preprocess`), like the rest of the unit suite.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import * as data from '../../src/lib/data.js';
import { getAllPostMeta, getHubs, getOrdinaryPosts } from '../../src/lib/data.js';
import { filterTodayPosts, resolveBuildDate } from '../../src/lib/homepage.js';
import type { PostMeta } from '../../src/lib/types.js';

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

// U2 WR001 (NFR5.19; NFR-design Major): the data layer takes a content folder
// as a test seam and fails closed when the preprocessor's manifest is missing
// or the meta files on disk differ from it, instead of shipping a silently
// empty or partial site. Temporary folders live under the gitignored
// .artifacts/, never outside the project.
describe('content seam and WR001 (NFR5.19)', () => {
  const TMP_ROOT = resolve('.artifacts/tmp');
  const made: string[] = [];

  function postMeta(slug: string, overrides: Partial<PostMeta> = {}): PostMeta {
    return {
      slug,
      title: slug,
      tags: [],
      published: '2025-01-15',
      updated: null,
      backlinks: [],
      forward_links: [],
      is_hub: false,
      hub_parent: null,
      description: null,
      reading_time_min: 1,
      word_count: 10,
      ...overrides,
    };
  }

  /** A content folder with the given meta files and, when given, a manifest. */
  function contentDir(metas: readonly PostMeta[], manifest: readonly string[] | null): string {
    mkdirSync(TMP_ROOT, { recursive: true });
    const dir = mkdtempSync(join(TMP_ROOT, 'content-'));
    made.push(dir);
    mkdirSync(join(dir, 'meta'));
    for (const meta of metas) {
      writeFileSync(join(dir, 'meta', `${meta.slug}.json`), JSON.stringify(meta));
    }
    if (manifest !== null) writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
    return dir;
  }

  afterEach(() => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  test('a missing manifest throws WR001 naming the manifest path', () => {
    const dir = contentDir([postMeta('a')], null);
    expect(() => getAllPostMeta(dir)).toThrow(
      `WR001 ${join(dir, 'manifest.json')}: content manifest missing — run the preprocessor`
    );
  });

  test('meta files that differ from the manifest throw WR001 naming the meta folder', () => {
    const extra = contentDir([postMeta('a'), postMeta('stray')], ['meta/a.json', 'posts/a.md']);
    expect(() => getAllPostMeta(extra)).toThrow(
      `WR001 ${join(extra, 'meta')}: meta files differ from manifest`
    );
    const missing = contentDir([postMeta('a')], ['meta/a.json', 'meta/b.json']);
    expect(() => getAllPostMeta(missing)).toThrow(
      `WR001 ${join(missing, 'meta')}: meta files differ from manifest`
    );
  });

  test('a manifest that matches the meta files returns their entries', () => {
    const dir = contentDir(
      [
        postMeta('older', { published: '2024-01-01' }),
        postMeta('newer', { published: '2025-02-02' }),
      ],
      ['graph.json', 'meta/newer.json', 'meta/older.json', 'posts/newer.md', 'posts/older.md']
    );
    expect(getAllPostMeta(dir).map((p) => p.slug)).toEqual(['newer', 'older']);
  });

  test('an empty manifest and an empty meta folder give no entries', () => {
    const dir = contentDir([], []);
    expect(getAllPostMeta(dir)).toEqual([]);
  });
});
