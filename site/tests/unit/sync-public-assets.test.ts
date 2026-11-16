// U1 shared asset sync (code-generation plan Step 2; infra R-02, NFR4.6,
// US1.1). The Jenkinsfile, both Justfile preprocess recipes and the HIG runner
// call this one function, which replaces site/public/assets with a copy of
// content/assets, so a withdrawn post or page image is never redeployed.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { syncPublicAssets } from '../../scripts/sync-public-assets.mjs';

let root = '';
let src = '';
let dest = '';

function put(base: string, file: string, body: string): void {
  const path = join(base, file);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
}

/** Relative path → content of every file under a folder, sorted. */
function tree(base: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files[relative(base, path)] = readFileSync(path, 'utf8');
    }
  };
  walk(base);
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'u1-sync-assets-'));
  src = join(root, 'content', 'assets');
  dest = join(root, 'site', 'public', 'assets');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('syncPublicAssets (infra R-02, NFR4.6)', () => {
  test('copies content/assets into a fresh public/assets', () => {
    put(src, 'diagram-light.svg', '<svg/>');
    put(src, 'pages/portrait.png', 'png');

    syncPublicAssets(src, dest);

    expect(tree(dest)).toEqual({ 'diagram-light.svg': '<svg/>', 'pages/portrait.png': 'png' });
  });

  test('removes a stale file the source no longer has', () => {
    put(src, 'kept.png', 'kept');
    put(dest, 'withdrawn.png', 'stale');

    syncPublicAssets(src, dest);

    expect(existsSync(join(dest, 'withdrawn.png'))).toBe(false);
    expect(existsSync(join(dest, 'kept.png'))).toBe(true);
  });

  test('removes a stale pages/ image after the site page is withdrawn', () => {
    put(src, 'pages/portrait.png', 'png');
    put(src, 'post.png', 'post');
    syncPublicAssets(src, dest);
    expect(existsSync(join(dest, 'pages', 'portrait.png'))).toBe(true);

    // The next preprocess run no longer publishes the page or its image.
    rmSync(join(src, 'pages'), { recursive: true });
    syncPublicAssets(src, dest);

    expect(existsSync(join(dest, 'pages'))).toBe(false);
    expect(tree(dest)).toEqual({ 'post.png': 'post' });
  });

  test('leaves the target equal to the source, file for file', () => {
    put(src, 'a.svg', 'a');
    put(src, 'nested/b.png', 'b');
    put(dest, 'nested/b.png', 'old b');
    put(dest, 'nested/c.png', 'old c');

    syncPublicAssets(src, dest);

    expect(tree(dest)).toEqual(tree(src));
  });

  test('fails with SYNC001 when the source folder is missing, leaving the target alone', () => {
    put(dest, 'live.png', 'live');

    expect(() => syncPublicAssets(src, dest)).toThrow(/^SYNC001 /);
    expect(tree(dest)).toEqual({ 'live.png': 'live' });
  });

  test('refuses overlapping folders with SYNC002 instead of deleting the source', () => {
    put(src, 'a.png', 'a');

    expect(() => syncPublicAssets(src, join(src, 'nested'))).toThrow(/^SYNC002 /);
    expect(() => syncPublicAssets(src, src)).toThrow(/^SYNC002 /);
    expect(tree(src)).toEqual({ 'a.png': 'a' });
  });
});
