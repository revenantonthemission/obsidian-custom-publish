// U3 two-copy deploy (NFR5.25; infrastructure-specification.md "The two-copy
// deploy"; infrastructure-design diary 2026-11-20T01:40). One script places the
// build in the web root: the tree first with the table excluded, then the
// table, copied to a temporary name and renamed onto `_redirects.json`, so a
// rule never goes live before its page, the server never reads half a table,
// and the table always gets a fresh modification time the server re-reads on.
// Every test runs against scratch directories under the OS temp dir; nothing
// here touches the real web root or runs `just deploy`.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(process.cwd(), 'scripts/publish-dist.sh');
const PAST = new Date('2020-01-01T00:00:00Z');

let scratch = '';
let dist = '';
let webRoot = '';

function put(root: string, relative: string, body: string): void {
  const file = join(root, relative);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, body);
}

function publish(...args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8', timeout: 20_000 });
}

/** Every file under `root`, relative and sorted. */
function tree(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
    .sort();
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'u3-publish-dist-'));
  dist = join(scratch, 'dist');
  webRoot = join(scratch, 'web');
  put(dist, 'index.html', 'home v2');
  put(dist, 'writing/tags/index.html', 'tag index v2');
  put(dist, 'writing/tags/node.js/index.html', 'node.js v2');
  put(dist, 'writing/graph/index.html', 'graph v2');
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('publish-dist.sh', () => {
  test('mirrors the tree and deletes pages the build no longer has', () => {
    put(webRoot, 'index.html', 'home v1');
    put(webRoot, 'tags/index.html', 'old tag index');
    put(webRoot, 'graph/index.html', 'old graph');
    // A previous deploy's page is older than the new build's; rsync's quick
    // check would skip a same-size page written in the same second.
    utimesSync(join(webRoot, 'index.html'), PAST, PAST);
    const run = publish(dist, webRoot);
    expect(run.status, String(run.stderr)).toBe(0);
    expect(tree(webRoot)).toEqual(tree(dist));
    expect(readFileSync(join(webRoot, 'index.html'), 'utf8')).toBe('home v2');
    expect(existsSync(join(webRoot, 'tags'))).toBe(false);
    expect(existsSync(join(webRoot, 'graph'))).toBe(false);
  });

  test('replaces the table with a fresh mtime, even over an equal-size, equal-mtime table', () => {
    put(dist, '_redirects.json', '{"version":1,"rules":["B"]}');
    put(webRoot, '_redirects.json', '{"version":1,"rules":["A"]}');
    utimesSync(join(dist, '_redirects.json'), PAST, PAST);
    utimesSync(join(webRoot, '_redirects.json'), PAST, PAST);
    const before = statSync(join(webRoot, '_redirects.json'));
    const run = publish(dist, webRoot);
    expect(run.status, String(run.stderr)).toBe(0);
    const after = statSync(join(webRoot, '_redirects.json'));
    expect(readFileSync(join(webRoot, '_redirects.json'), 'utf8')).toBe(
      '{"version":1,"rules":["B"]}'
    );
    expect(after.mtimeMs).toBeGreaterThan(before.mtimeMs);
    // Renamed into place, never rewritten in place: the server sees old or new.
    expect(after.ino).not.toBe(before.ino);
  });

  test('a build with no table removes the web root table', () => {
    put(webRoot, '_redirects.json', '{"version":1,"rules":[]}');
    const run = publish(dist, webRoot);
    expect(run.status, String(run.stderr)).toBe(0);
    expect(existsSync(join(webRoot, '_redirects.json'))).toBe(false);
    expect(tree(webRoot)).toEqual(tree(dist));
  });

  test('leaves no .redirects.json.tmp behind, with or without a table', () => {
    put(webRoot, '.redirects.json.tmp', 'stale');
    put(dist, '_redirects.json', '{"version":1,"rules":[]}');
    expect(publish(dist, webRoot).status).toBe(0);
    expect(existsSync(join(webRoot, '.redirects.json.tmp'))).toBe(false);
    expect(existsSync(join(webRoot, '_redirects.json'))).toBe(true);
    put(webRoot, '.redirects.json.tmp', 'stale again');
    rmSync(join(dist, '_redirects.json'));
    expect(publish(dist, webRoot).status).toBe(0);
    expect(existsSync(join(webRoot, '.redirects.json.tmp'))).toBe(false);
    expect(existsSync(join(webRoot, '_redirects.json'))).toBe(false);
  });

  test('a missing argument exits non-zero with a usage line and touches nothing', () => {
    put(webRoot, 'index.html', 'home v1');
    const distBefore = tree(dist);
    for (const args of [[], [dist], ['', webRoot], [dist, '']]) {
      const run = publish(...args);
      expect(run.status, JSON.stringify(args)).not.toBe(0);
      expect(String(run.stderr), JSON.stringify(args)).toMatch(/^usage: /m);
    }
    expect(tree(webRoot)).toEqual(['index.html']);
    expect(readFileSync(join(webRoot, 'index.html'), 'utf8')).toBe('home v1');
    expect(tree(dist)).toEqual(distBefore);
  });

  test('places the pages before the table: a failure after the mirror leaves the old table untouched', () => {
    // Review R-01 (NFR5.25): stop the script between the mirror and the table
    // placement with a `cp` that fails, found first on the child's PATH only.
    // The tables differ in bytes and size, so rsync would copy the new one if
    // the exclude were gone (`_` sorts before `w`, so it would land first).
    const shim = join(scratch, 'shim');
    put(shim, 'cp', '#!/bin/sh\nexit 1\n');
    chmodSync(join(shim, 'cp'), 0o755);
    const oldTable = '{"version":1,"rules":[{"from":"/tags","to":"/writing/tags"}]}';
    put(webRoot, '_redirects.json', oldTable);
    put(webRoot, 'tags/index.html', 'old tag index');
    put(dist, '_redirects.json', '{"version":1,"rules":["new table, different bytes"]}');
    put(dist, '.redirects.json.tmp', 'must not travel');
    const run = spawnSync('bash', [SCRIPT, dist, webRoot], {
      encoding: 'utf8',
      timeout: 20_000,
      env: { ...process.env, PATH: `${shim}:${process.env.PATH ?? ''}` },
    });
    expect(run.status, String(run.stderr)).not.toBe(0);
    expect(readFileSync(join(webRoot, '_redirects.json'), 'utf8')).toBe(oldTable);
    expect(readFileSync(join(webRoot, 'writing/tags/node.js/index.html'), 'utf8')).toBe(
      'node.js v2'
    );
    expect(readFileSync(join(webRoot, 'writing/graph/index.html'), 'utf8')).toBe('graph v2');
    expect(existsSync(join(webRoot, 'tags'))).toBe(false);
    expect(existsSync(join(webRoot, '.redirects.json.tmp'))).toBe(false);
  });

  test('creates the web root when it is absent', () => {
    const nested = join(scratch, 'Sites', 'obsidian-blog');
    put(dist, '_redirects.json', '{"version":1,"rules":[]}');
    const run = publish(dist, nested);
    expect(run.status, String(run.stderr)).toBe(0);
    expect(tree(nested)).toEqual(tree(dist));
  });
});
