// U2 empty Writing landing (AC4.1.3; BR2.2; loop-back 1 repair, plan Step 12).
// One isolated build, never site/dist, over a temporary content tree that holds
// no posts at all: an empty manifest and an empty meta folder. The tree is
// handed to the build through the test-only CONTENT_DIR_OVERRIDE (data.ts), so
// the shared content/ folder is read by nothing here and stays unchanged.
// Needs the fixture's public JSON files first (`just preprocess`), as the unit
// suite does.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildSiteInto } from './support/astro-build.js';

const EMPTY_ROW = '아직 발행한 글이 없습니다.';

let root = '';
let outDir = '';

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'u2-writing-empty-'));
  const contentDir = join(root, 'content');
  mkdirSync(join(contentDir, 'meta'), { recursive: true });
  writeFileSync(join(contentDir, 'manifest.json'), '[]\n');
  outDir = join(root, 'dist');
  // The repository's build budget: the helper fails a build past 60 s.
  const result = await buildSiteInto(outDir, 60_000, { CONTENT_DIR_OVERRIDE: contentDir });
  if (result.status !== 0 || result.error !== undefined) {
    throw new Error(
      [
        'The isolated Astro build failed.',
        result.error?.message ?? '',
        result.stdout,
        result.stderr,
      ].join('\n')
    );
  }
}, 75_000);

afterAll(() => {
  if (root !== '') rmSync(root, { recursive: true, force: true });
});

/** The `<section data-testid="recent-list">` of the built /writing page. */
function recentSection(): string {
  const html = readFileSync(join(outDir, 'writing', 'index.html'), 'utf8');
  const match = /<section[^>]*data-testid="recent-list"[^>]*>([\s\S]*?)<\/section>/.exec(html);
  expect(match, 'the built /writing page has a "최근 글" section').not.toBeNull();
  return match![1]!;
}

describe('/writing with no ordinary posts (AC4.1.3)', () => {
  test('"최근 글" shows the plain-text row "아직 발행한 글이 없습니다."', () => {
    const section = recentSection();
    expect(section).toContain('최근 글');
    expect(section).toMatch(
      new RegExp(`<li[^>]*data-testid="empty-row"[^>]*>\\s*${EMPTY_ROW}\\s*</li>`)
    );
  });

  test('the empty row is not a link, and no post row or "모든 글 보기" row is offered', () => {
    const section = recentSection();
    expect(section).not.toContain('data-testid="all-posts-link"');
    expect(section).not.toContain('href="/posts/');
    expect(section).not.toMatch(/<a\b/);
  });

  test('with no hubs, the "주제" section is left out', () => {
    const html = readFileSync(join(outDir, 'writing', 'index.html'), 'utf8');
    expect(html).not.toContain('data-testid="topic-row"');
    expect(html).not.toContain('id="topics-heading"');
  });
});
