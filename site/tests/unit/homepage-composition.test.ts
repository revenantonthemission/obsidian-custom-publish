import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  PROFILE_SLOT_TOKEN,
  assertExactlyOneSlot,
  buildHomepageChunks,
  countSlotTokens,
  filterTodayPosts,
  resolveBuildDate,
  splitAtRecentHeading,
} from '../../src/lib/homepage.js';
import { getHomepage } from '../../src/lib/data.js';

describe('slot token recognition (BR-U2-036~038)', () => {
  test('counts standalone unfenced token lines only', () => {
    const markdown = [
      '문단',
      PROFILE_SLOT_TOKEN,
      '```',
      PROFILE_SLOT_TOKEN,
      '```',
      `앞뒤 텍스트 ${PROFILE_SLOT_TOKEN} 는 단독 줄이 아니다`,
    ].join('\n');
    expect(countSlotTokens(markdown)).toBe(1);
    assertExactlyOneSlot(markdown, 'content/homepage/index.md');
  });

  test('zero tokens throw HP003 with the source path', () => {
    expect(() => assertExactlyOneSlot('본문뿐', 'content/homepage/index.md')).toThrow(
      /^HP003 content\/homepage\/index\.md:/,
    );
  });

  test('duplicate tokens throw HP004 with the count', () => {
    const markdown = `${PROFILE_SLOT_TOKEN}\n중간\n${PROFILE_SLOT_TOKEN}`;
    expect(() => assertExactlyOneSlot(markdown, 'x.md')).toThrow(/^HP004 x\.md: 2 /);
  });
});

describe('recent-posts split (BR-U2-041 — verbatim legacy rule)', () => {
  test('replaces the heading section up to the next h2', () => {
    const html =
      '<p>서문</p><h2 id="a">이번주에 작성된 포스트</h2><p>옛 내용</p><h2 id="b">다음 절</h2><p>끝</p>';
    const split = splitAtRecentHeading(html);
    expect(split.found).toBe(true);
    expect(split.before).toBe('<p>서문</p>');
    expect(split.after).toBe('<h2 id="b">다음 절</h2><p>끝</p>');
  });

  test('absent heading returns the input unchanged', () => {
    const split = splitAtRecentHeading('<p>내용</p>');
    expect(split.found).toBe(false);
    expect(split.before).toBe('<p>내용</p>');
    expect(split.after).toBe('');
  });
});

describe('composition plan (BR-U2-040/042, FE-P-U2-03)', () => {
  test('slot and recent substitutions are independent and ordered', () => {
    const html = [
      '<p>인트로</p>',
      PROFILE_SLOT_TOKEN,
      '<h2>이번주에 작성된 포스트</h2><p>옛 목록</p>',
    ].join('\n');
    const kinds = buildHomepageChunks(html, 'x.md').map((c) => c.kind);
    expect(kinds).toEqual(['html', 'slot', 'recent']);
  });

  test('without a matching heading the recent section is appended (legacy)', () => {
    const html = `<p>인트로</p>\n${PROFILE_SLOT_TOKEN}\n<h3>이번주에 작성된 포스트.</h3><p>수동 목록</p>`;
    const kinds = buildHomepageChunks(html, 'x.md').map((c) => c.kind);
    expect(kinds).toEqual(['html', 'slot', 'html', 'recent']);
  });

  test('the token itself never reaches an html chunk', () => {
    const html = `<p>a</p>\n${PROFILE_SLOT_TOKEN}\n<p>b</p>`;
    for (const chunk of buildHomepageChunks(html, 'x.md')) {
      if (chunk.kind === 'html') expect(chunk.html).not.toContain(PROFILE_SLOT_TOKEN);
    }
  });
});

describe('build date injection (PD-U2-04, NFR-U2-006)', () => {
  const fixedNow = () => new Date('2026-05-05T09:00:00Z');

  test('well-formed override wins', () => {
    expect(resolveBuildDate({ HOMEPAGE_TODAY_OVERRIDE: '2024-03-01' }, fixedNow)).toBe(
      '2024-03-01',
    );
  });

  test('malformed or absent override falls back to the real date', () => {
    expect(resolveBuildDate({ HOMEPAGE_TODAY_OVERRIDE: 'tomorrow' }, fixedNow)).toBe('2026-05-05');
    expect(resolveBuildDate({}, fixedNow)).toBe('2026-05-05');
  });

  test('today filter covers both cases deterministically (FE-P-U2-02)', () => {
    const posts = [
      { is_hub: false, published: '2024-03-01' },
      { is_hub: true, published: '2024-03-01' },
      { is_hub: false, published: '2024-02-01' },
    ];
    expect(filterTodayPosts(posts, '2024-03-01')).toHaveLength(1);
    expect(filterTodayPosts(posts, '2030-01-01')).toHaveLength(0);
  });
});

describe('getHomepage fail-closed gateway (BR-U2-033)', () => {
  test('missing artifact throws HP001, never an empty value', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-unit-'));
    try {
      expect(() => getHomepage(dir)).toThrow(/^HP001 /);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('valid artifact reads back title and body', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-unit-'));
    try {
      fs.mkdirSync(path.join(dir, 'homepage'));
      fs.writeFileSync(path.join(dir, 'homepage', 'meta.json'), '{"title":"홈"}');
      fs.writeFileSync(path.join(dir, 'homepage', 'index.md'), '본문\n');
      expect(getHomepage(dir)).toEqual({ title: '홈', body: '본문\n' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
