// U1 skeleton-checkpoint repair, Step 18a (NFR3, AC7.1.3). The cross-unit link
// sweep fails a build on any unresolved root-relative href/src. The fixture
// vault keeps one deliberately broken image (the PUB warning test), so the
// sweep accepts a declared known-broken list: the build passes only when the
// broken links equal that list exactly, page for page.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sweep } from '../../scripts/crossunit/link-sweep.mjs';

const BROKEN_PAGE = '/posts/post-with-image/index.html';
const BROKEN_TARGET = '/assets/nonexistent-image.png';
const DECLARED = Object.freeze([
  Object.freeze({
    page: BROKEN_PAGE,
    target: BROKEN_TARGET,
    reason: 'deliberate fixture broken image (warning test)',
  }),
]);

let dist = '';

function put(file: string, body: string): void {
  const path = join(dist, file);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
}

function page(file: string, refs: readonly string[]): void {
  put(file, `<html><body>${refs.map((r) => `<a href="${r}">x</a>`).join('')}</body></html>`);
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'u1-link-sweep-'));
  // A resolvable baseline: home links to the post, the post exists.
  page('index.html', ['/posts/post-with-image/', '/assets/real.png']);
  put('assets/real.png', 'png');
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('sweep (NFR3, AC7.1.3)', () => {
  test('passes when the only broken link is a declared known-broken target', () => {
    page('posts/post-with-image/index.html', ['/', BROKEN_TARGET]);

    const result = sweep(dist, DECLARED);

    expect(result.ok).toBe(true);
    expect(result.unexpected).toEqual([]);
    expect(result.stale).toEqual([]);
    expect(result.expected).toEqual([{ page: BROKEN_PAGE, target: BROKEN_TARGET }]);
  });

  test('fails on an undeclared broken link', () => {
    page('posts/post-with-image/index.html', ['/', BROKEN_TARGET, '/posts/missing/']);

    const result = sweep(dist, DECLARED);

    expect(result.ok).toBe(false);
    expect(result.unexpected).toEqual([{ page: BROKEN_PAGE, target: '/posts/missing/' }]);
    expect(result.stale).toEqual([]);
  });

  test('fails when a declared target now resolves (the declaration is stale)', () => {
    page('posts/post-with-image/index.html', ['/', BROKEN_TARGET]);
    put(BROKEN_TARGET.slice(1), 'png');

    const result = sweep(dist, DECLARED);

    expect(result.ok).toBe(false);
    expect(result.unexpected).toEqual([]);
    expect(result.expected).toEqual([]);
    expect(result.stale).toEqual([{ page: BROKEN_PAGE, target: BROKEN_TARGET }]);
  });

  test('fails when a declared target is broken on a page other than its declared page', () => {
    page('posts/post-with-image/index.html', ['/']);
    page('posts/other/index.html', ['/', BROKEN_TARGET]);

    const result = sweep(dist, DECLARED);

    expect(result.ok).toBe(false);
    expect(result.unexpected).toEqual([{ page: '/posts/other/index.html', target: BROKEN_TARGET }]);
    expect(result.stale).toEqual([{ page: BROKEN_PAGE, target: BROKEN_TARGET }]);
  });

  test('with an empty declaration list, behaves as before: every broken link fails', () => {
    page('posts/post-with-image/index.html', ['/', BROKEN_TARGET]);

    const broken = sweep(dist, []);
    expect(broken.ok).toBe(false);
    expect(broken.unexpected).toEqual([{ page: BROKEN_PAGE, target: BROKEN_TARGET }]);
    expect(broken.stale).toEqual([]);

    rmSync(join(dist, 'posts'), { recursive: true });
    page('posts/post-with-image/index.html', ['/', '/assets/real.png']);
    const clean = sweep(dist, []);
    expect(clean.ok).toBe(true);
    expect(clean.pages).toBe(2);
    expect(clean.checked).toBe(4);
  });
});
