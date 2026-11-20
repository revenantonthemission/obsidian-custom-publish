// U3 redirect-table writer (rules.md BR3.1; NFR4.9, NFR5.23, NFR5.25;
// security-design.md §5.2 and §6 Rule 2). The writer derives the rules from
// the tag pages a build produced, so a rule cannot exist without its page; it
// runs the server's own G1–G8 validator and checks every target before it
// writes, and fails the build rather than ship a table the server would reject
// or one that names a missing page. Each test runs over a temporary build
// output under the OS temp dir.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeRedirectTable } from '../../scripts/build/legacy-redirects-integration.mjs';

let outDir = '';

function page(relative: string): void {
  const file = join(outDir, relative, 'index.html');
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, '<!doctype html><title>t</title>');
}

function seedBuild(keys: readonly string[]): void {
  page('writing/tags');
  page('writing/graph');
  for (const key of keys) page(`writing/tags/${key}`);
}

function tablePath(): string {
  return join(outDir, '_redirects.json');
}

function readTable(): { version: number; rules: { from: string; to: string }[] } {
  return JSON.parse(readFileSync(tablePath(), 'utf8'));
}

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'u3-legacy-redirects-'));
});

afterEach(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('writeRedirectTable (BR3.1)', () => {
  test('one rule per built tag page plus /tags and /graph', async () => {
    seedBuild(['test', '운영체제', 'os']);
    const written = await writeRedirectTable(outDir);
    const table = readTable();
    expect(table).toEqual({
      version: 1,
      rules: [
        { from: '/graph', to: '/writing/graph' },
        { from: '/tags', to: '/writing/tags' },
        { from: '/tags/os', to: '/writing/tags/os' },
        { from: '/tags/test', to: '/writing/tags/test' },
        { from: '/tags/운영체제', to: '/writing/tags/운영체제' },
      ],
    });
    expect(written).toEqual(table);
  });

  test('the rules are sorted by `from` and unique', async () => {
    seedBuild(['zeta', 'alpha', 'b.c', '한글', 'a-b', 'ab']);
    await writeRedirectTable(outDir);
    const froms = readTable().rules.map((rule) => rule.from);
    expect(froms).toEqual([...froms].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    expect(new Set(froms).size).toBe(froms.length);
    expect(froms).toHaveLength(8);
  });

  test('two runs over the same output give byte-identical files', async () => {
    seedBuild(['test', '운영체제', 'node.js']);
    await writeRedirectTable(outDir);
    const first = readFileSync(tablePath());
    await writeRedirectTable(outDir);
    expect(readFileSync(tablePath()).equals(first)).toBe(true);
  });

  test('a dotted key gets its rule (BR3.6)', async () => {
    seedBuild(['node.js']);
    await writeRedirectTable(outDir);
    expect(readTable().rules).toContainEqual({
      from: '/tags/node.js',
      to: '/writing/tags/node.js',
    });
  });

  test('a tag page without its index.html throws REDIRECT_TARGET_MISSING and writes no table', async () => {
    seedBuild(['test', 'os']);
    rmSync(join(outDir, 'writing/tags/test/index.html'));
    await expect(writeRedirectTable(outDir)).rejects.toMatchObject({
      code: 'REDIRECT_TARGET_MISSING',
      message: expect.stringMatching(
        /^REDIRECT_TARGET_MISSING \/tags\/test -> \/writing\/tags\/test/
      ),
    });
    expect(existsSync(tablePath())).toBe(false);
  });

  test('a missing writing/graph/index.html throws the same error', async () => {
    seedBuild(['test']);
    rmSync(join(outDir, 'writing/graph'), { recursive: true });
    await expect(writeRedirectTable(outDir)).rejects.toMatchObject({
      code: 'REDIRECT_TARGET_MISSING',
      message: expect.stringContaining('/graph -> /writing/graph'),
    });
    expect(existsSync(tablePath())).toBe(false);
  });

  test("a key that breaks the grammar fails with the validator's code and writes no table", async () => {
    // A tag spelled "50%25" keeps its escape-shaped name as a key (G8).
    seedBuild(['test', '50%25']);
    await expect(writeRedirectTable(outDir)).rejects.toMatchObject({
      code: 'REDIRECT_PATH_INVALID',
      message: expect.stringContaining('G8'),
    });
    expect(existsSync(tablePath())).toBe(false);
  });

  test("no rule's `to` equals any rule's `from` (NFR5.23: no loop)", async () => {
    seedBuild(['test', 'tags', 'graph', 'writing', '운영체제']);
    const table = await writeRedirectTable(outDir);
    const froms = new Set(table.rules.map((rule) => rule.from));
    expect(table.rules.filter((rule) => froms.has(rule.to))).toEqual([]);
    expect(table.rules).toHaveLength(7);
  });
});
