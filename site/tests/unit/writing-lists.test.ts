// U2 WritingLists (functional-design rules.md BR1.1–BR1.7; AC3.3.1–AC3.3.3,
// AC4.1.1–AC4.1.4, AC4.2.1–AC4.2.3; NFR4.7). Pure functions: the metadata and
// the build date are arguments, so no test here reads files or the clock.
import { describe, expect, test } from 'vitest';

import {
  UNDATED_LABEL,
  comparePosts,
  postsByYear,
  recentPosts,
  resolveKoreanBuildDate,
  topics,
  weekBounds,
  weekPosts,
} from '../../src/lib/writing-lists.js';
import type { PostMeta } from '../../src/lib/types.js';

/** A valid post; tests change only the fields they are about. */
function post(slug: string, overrides: Partial<PostMeta> = {}): PostMeta {
  return {
    slug,
    title: slug,
    tags: [],
    published: '2026-11-18',
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

function hub(slug: string, title: string, forward_links: string[]): PostMeta {
  return post(slug, { title, forward_links, is_hub: true, published: '2025-01-01' });
}

const slugs = (posts: readonly PostMeta[]): string[] => posts.map((p) => p.slug);
const clock = (iso: string) => () => new Date(iso);

describe('Korean build date (BR1.2)', () => {
  test('a valid override is taken as the Korean date, whatever the clock says', () => {
    expect(
      resolveKoreanBuildDate({ HOMEPAGE_TODAY_OVERRIDE: '2026-11-18' }, clock('2030-01-01T00:00Z'))
    ).toBe('2026-11-18');
  });

  test('without an override the date is the clock plus 9 hours (15:30Z is the next Korean day)', () => {
    expect(resolveKoreanBuildDate({}, clock('2026-11-15T15:30:00Z'))).toBe('2026-11-16');
    expect(resolveKoreanBuildDate({}, clock('2026-11-15T14:59:59Z'))).toBe('2026-11-15');
  });

  test('a malformed or impossible override is ignored (new calendar check)', () => {
    const now = clock('2026-11-15T15:30:00Z');
    for (const bad of ['2026-13-45', '2026-02-30', '2025-02-29', 'tomorrow', '2026-1-5', '']) {
      expect(resolveKoreanBuildDate({ HOMEPAGE_TODAY_OVERRIDE: bad }, now), bad).toBe('2026-11-16');
    }
    expect(resolveKoreanBuildDate({ HOMEPAGE_TODAY_OVERRIDE: '2024-02-29' }, now)).toBe(
      '2024-02-29'
    );
  });
});

describe('week window (BR1.2; AC3.3.1, AC3.3.3)', () => {
  test('a Wednesday, a Sunday and a Monday all give the same Monday–Sunday week', () => {
    const week = { monday: '2026-11-16', sunday: '2026-11-22' };
    expect(weekBounds('2026-11-18')).toEqual(week);
    expect(weekBounds('2026-11-22')).toEqual(week);
    expect(weekBounds('2026-11-16')).toEqual(week);
  });

  test('a week can cross a month and a year boundary', () => {
    expect(weekBounds('2026-01-01')).toEqual({ monday: '2025-12-29', sunday: '2026-01-04' });
  });

  test('the 2026-11-15T15:30Z build instant falls in the week of Monday 2026-11-16', () => {
    const date = resolveKoreanBuildDate({}, clock('2026-11-15T15:30:00Z'));
    expect(weekBounds(date)).toEqual({ monday: '2026-11-16', sunday: '2026-11-22' });
  });
});

describe('this week (BR1.1, BR1.3; AC3.3.1, AC3.3.2)', () => {
  test('keeps ordinary dated posts inside the week, both ends included, newest first', () => {
    const meta = [
      post('before', { published: '2026-11-15' }),
      post('monday', { published: '2026-11-16' }),
      post('sunday', { published: '2026-11-22' }),
      post('after', { published: '2026-11-23' }),
      post('undated', { published: null }),
      hub('hub', 'Hub', []),
    ];
    expect(slugs(weekPosts(meta, '2026-11-18'))).toEqual(['sunday', 'monday']);
  });

  test('a later post in the same week is included even when it is after the build date', () => {
    const meta = [post('thursday', { published: '2026-11-19' })];
    expect(slugs(weekPosts(meta, '2026-11-18'))).toEqual(['thursday']);
  });

  test('an empty week gives an empty list', () => {
    expect(weekPosts([post('old', { published: '2020-01-01' })], '2026-11-18')).toEqual([]);
  });
});

describe('order (BR1.3; NFR4.7)', () => {
  test('same date: title by UTF-16 code unit, so Latin sorts before Korean', () => {
    const meta = [
      post('ko', { title: '한글 제목' }),
      post('b', { title: 'beta' }),
      post('a', { title: 'Alpha' }),
    ];
    expect(slugs(recentPosts(meta, 5))).toEqual(['a', 'b', 'ko']);
  });

  test('same date and title: the slug breaks the tie', () => {
    const meta = [post('z-slug', { title: 'Same' }), post('a-slug', { title: 'Same' })];
    expect(slugs(recentPosts(meta, 5))).toEqual(['a-slug', 'z-slug']);
    expect(comparePosts(meta[1]!, meta[0]!)).toBeLessThan(0);
  });
});

describe('recent posts (BR1.4; AC4.1.1, AC4.1.2)', () => {
  const dated = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      post(`p${i}`, { published: `2026-11-${String(10 + i).padStart(2, '0')}` })
    );

  test('seven posts give the five newest', () => {
    expect(slugs(recentPosts(dated(7), 5))).toEqual(['p6', 'p5', 'p4', 'p3', 'p2']);
  });

  test('three posts give all three; none gives none', () => {
    expect(slugs(recentPosts(dated(3), 5))).toEqual(['p2', 'p1', 'p0']);
    expect(recentPosts([], 5)).toEqual([]);
  });

  test('undated posts and hubs are left out', () => {
    const meta = [post('undated', { published: null }), hub('hub', 'Hub', []), ...dated(1)];
    expect(slugs(recentPosts(meta, 5))).toEqual(['p0']);
  });
});

describe('all posts by year (BR1.5; AC4.2.1–AC4.2.3)', () => {
  test('years newest first, newest first inside a year, "날짜 없음" last by title', () => {
    const meta = [
      post('y24', { published: '2024-03-01' }),
      post('y25-old', { published: '2025-01-15' }),
      post('y25-new', { published: '2025-08-14' }),
      post('undated-b', { title: 'B', published: null }),
      post('undated-a', { title: 'A', published: null }),
      hub('hub', 'Hub', []),
    ];
    const groups = postsByYear(meta);
    expect(groups.map((g) => g.label)).toEqual(['2025', '2024', UNDATED_LABEL]);
    expect(groups.map((g) => slugs(g.posts))).toEqual([
      ['y25-new', 'y25-old'],
      ['y24'],
      ['undated-a', 'undated-b'],
    ]);
    expect(UNDATED_LABEL).toBe('날짜 없음');
  });

  test('no undated post means no "날짜 없음" group, and no posts means no group', () => {
    expect(postsByYear([post('a', { published: '2025-01-01' })]).map((g) => g.label)).toEqual([
      '2025',
    ]);
    expect(postsByYear([hub('hub', 'Hub', [])])).toEqual([]);
  });
});

describe('topics (BR1.6; AC4.1.4)', () => {
  test('one topic per hub by title, counting only forward links that resolve', () => {
    const meta = [
      post('a'),
      post('b'),
      hub('cs', 'Computer Science', ['a', 'b', 'missing']),
      hub('ce', 'Computer Engineering', ['cs']),
      hub('empty', 'Zero', []),
    ];
    expect(topics(meta)).toEqual([
      { slug: 'ce', title: 'Computer Engineering', count: 1 },
      { slug: 'cs', title: 'Computer Science', count: 2 },
      { slug: 'empty', title: 'Zero', count: 0 },
    ]);
  });

  test('no hubs gives no topics', () => {
    expect(topics([post('a')])).toEqual([]);
  });
});

describe('pure and frozen (BR1.7)', () => {
  const meta = [
    post('a', { published: '2026-11-17' }),
    post('b', { published: '2025-05-05' }),
    post('c', { published: null }),
    hub('h', 'Hub', ['a']),
  ];

  test('every list is frozen, down to the groups and topics, and the input is untouched', () => {
    const before = JSON.stringify(meta);
    const lists = [
      weekPosts(meta, '2026-11-18'),
      recentPosts(meta, 5),
      postsByYear(meta),
      topics(meta),
    ];
    for (const list of lists) expect(Object.isFrozen(list)).toBe(true);
    for (const group of postsByYear(meta)) {
      expect(Object.isFrozen(group)).toBe(true);
      expect(Object.isFrozen(group.posts)).toBe(true);
    }
    for (const topic of topics(meta)) expect(Object.isFrozen(topic)).toBe(true);
    expect(JSON.stringify(meta)).toBe(before);
  });

  test('the same input, in any order, gives byte-equal list JSON (deterministic output)', () => {
    const render = (input: readonly PostMeta[]) =>
      JSON.stringify([
        weekPosts(input, '2026-11-18'),
        recentPosts(input, 5),
        postsByYear(input),
        topics(input),
      ]);
    expect(render(meta)).toBe(render(meta));
    expect(render([...meta].reverse())).toBe(render(meta));
  });
});
