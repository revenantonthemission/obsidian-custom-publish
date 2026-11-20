import { test } from '@fast-check/vitest';
import { expect } from 'vitest';
import * as fc from 'fast-check';

import { filterTodayPosts, resolveBuildDate } from '../../../src/lib/homepage.js';

// U1 removed the homepage artifact, its profile slot and HP001–HP004, and with
// them their properties (FD-P-C06-01/02, FD-P-C10-01/02). The today filter and
// the build date that feed the interim "오늘 발행된 글" list remain.

// FE-P-U2-02 support: the today filter is an exact partition on the given date.
test.prop([
  fc.array(
    fc.record({
      is_hub: fc.boolean(),
      published: fc.option(fc.constantFrom('2024-03-01', '2024-03-02'), { nil: undefined }),
    }),
    { maxLength: 12 }
  ),
])('filterTodayPosts keeps exactly the non-hub posts of the given date', (posts) => {
  const today = '2024-03-01';
  const picked = filterTodayPosts(posts, today);
  for (const p of picked) {
    expect(p.is_hub).toBe(false);
    expect(p.published).toBe(today);
  }
  const expected = posts.filter((p) => !p.is_hub && p.published === today).length;
  expect(picked).toHaveLength(expected);
});

// PD-U2-04: a well-formed override always wins; anything else is ignored.
test.prop([
  fc.oneof(
    fc
      .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31'), noInvalidDate: true })
      .map((d) => d.toISOString().slice(0, 10)),
    fc.string({ maxLength: 12 })
  ),
])('resolveBuildDate takes only a well-formed override', (override) => {
  const now = () => new Date('2026-05-05T09:00:00Z');
  const resolved = resolveBuildDate({ HOMEPAGE_TODAY_OVERRIDE: override }, now);
  const wellFormed = /^\d{4}-\d{2}-\d{2}$/.test(override);
  expect(resolved).toBe(wellFormed ? override : '2026-05-05');
});
