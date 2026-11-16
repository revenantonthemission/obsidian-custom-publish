import { describe, expect, test } from 'vitest';

import { filterTodayPosts, resolveBuildDate } from '../../src/lib/homepage.js';

// U1 removed the homepage artifact, its profile slot and HP001–HP004; the
// build date and today filter remain for the interim "오늘 발행된 글" list.
describe('build date injection (PD-U2-04, NFR-U2-006)', () => {
  const fixedNow = () => new Date('2026-05-05T09:00:00Z');

  test('well-formed override wins', () => {
    expect(resolveBuildDate({ HOMEPAGE_TODAY_OVERRIDE: '2024-03-01' }, fixedNow)).toBe(
      '2024-03-01'
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
