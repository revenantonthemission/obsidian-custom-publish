// U2 empty-week homepage (AC3.4.1; BR2.1; US3.4; Build and Test run 5).
//
// One isolated build, never site/dist, with the build date pinned to a week
// that holds no fixture post: the fixture vault's newest posts are published
// on 2025-08-12 and 2025-08-14, so the week of Monday 2025-08-18 to Sunday
// 2025-08-24 is empty while the site still holds every post. The week list
// must then be one plain secondary row and the "모든 글 보기" row, with no
// "오늘 발행된 글" section.
//
// The same expectation is checked in a browser by tests/e2e/homepage.spec.ts,
// which runs only under the evidence-sealed `npm run test:e2e`; this build
// check runs inside `npm run test:unit`, so the requirement is proved without
// the maintainer's manual accessibility record.
//
// Needs the fixture content first (`just preprocess`), as the unit suite does.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildSiteInto } from './support/astro-build.js';

/** A Wednesday whose Monday–Sunday week holds no fixture post. */
const EMPTY_WEEK_BUILD_DATE = '2025-08-20';
const EMPTY_TEXT = '이번 주에 발행한 글이 없습니다.';
const ALL_POSTS_HREF = '/writing/all';

let root = '';
let outDir = '';

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'u2-homepage-empty-week-'));
  outDir = join(root, 'dist');
  // The repository's build budget: the helper fails a build past 60 s.
  const result = await buildSiteInto(outDir, 60_000, {
    HOMEPAGE_TODAY_OVERRIDE: EMPTY_WEEK_BUILD_DATE,
  });
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

function homepage(): string {
  return readFileSync(join(outDir, 'index.html'), 'utf8');
}

/** The `<section data-testid="week-list">` of the built homepage. */
function weekSection(): string {
  const match = /<section[^>]*data-testid="week-list"[^>]*>([\s\S]*?)<\/section>/.exec(homepage());
  expect(match, 'the built homepage has a "이번 주 글" section').not.toBeNull();
  return match![1]!;
}

/** Every built stylesheet of this build, concatenated. */
function builtCss(): string {
  const dir = join(outDir, '_astro');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n');
}

describe('homepage built in a week without a post (AC3.4.1)', () => {
  test('the week list is one plain empty row', () => {
    const section = weekSection();
    expect(section).toContain('이번 주 글');
    expect(section).toMatch(new RegExp(`data-testid="empty-row"[^>]*>\\s*${EMPTY_TEXT}\\s*</li>`));
  });

  test('the only row is the "모든 글 보기" link', () => {
    const section = weekSection();
    expect(section.match(/class="grouped-row"/g) ?? []).toHaveLength(1);
    expect(section).toMatch(
      new RegExp(`href="${ALL_POSTS_HREF}"[^>]*data-testid="all-posts-link"`)
    );
    expect(section).not.toContain('href="/posts/');
  });

  test('no "오늘 발행된 글" section appears', () => {
    expect(homepage()).not.toContain('오늘 발행된 글');
  });

  test('the site still holds posts outside the build week', () => {
    const all = readFileSync(join(outDir, 'writing', 'all', 'index.html'), 'utf8');
    expect(all.match(/href="\/posts\//g) ?? []).not.toHaveLength(0);
  });

  test('the empty row is styled with the secondary text token', () => {
    // The browser check in homepage.spec.ts holds the painted colour at
    // rgb(99, 99, 102); at build level the same colour is the rule's token
    // plus that token's light value.
    const html = homepage();
    expect(html).toMatch(/\.grouped-empty\{[^}]*color:var\(--c-text-secondary\)/);
    expect(`${builtCss()}\n${html}`).toContain('--c-text-secondary:#636366');
  });
});
