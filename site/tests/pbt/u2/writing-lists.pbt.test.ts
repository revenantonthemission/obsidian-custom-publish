import { test } from '@fast-check/vitest';
import { expect } from 'vitest';
import * as fc from 'fast-check';

import {
  comparePosts,
  postsByYear,
  recentPosts,
  topics,
  weekBounds,
  weekPosts,
} from '../../../src/lib/writing-lists.js';
import type { PostMeta } from '../../../src/lib/types.js';

// U2 WritingLists properties (rules.md BR1.3–BR1.7; NFR4.7; security-design.md
// §2). Run through tests/pbt/u1/setup.ts, so PBT_RUNS and PBT_SEED apply.

const isoDate = fc
  .date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2027-12-31T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));

// Titles mix Latin, Korean and identical values so ties are common.
const title = fc.oneof(
  fc.constantFrom('Alpha', 'alpha', '한글', '가나다', 'Same', 'Same '),
  fc.string({ maxLength: 6 }),
  fc.string({ unit: fc.constantFrom('가', '나', 'a', 'B', ' '), maxLength: 4 })
);

// A small date pool makes same-day posts likely, as in the real vault.
const published = fc.option(fc.oneof(isoDate, fc.constantFrom('2025-08-12', '2025-08-14')), {
  nil: null,
  freq: 4,
});

function posts(options: { minLength?: number; maxLength: number }): fc.Arbitrary<PostMeta[]> {
  return fc
    .uniqueArray(
      fc.record({
        slug: fc.stringMatching(/^[a-z0-9-]{1,8}$/),
        title,
        published,
        is_hub: fc.boolean(),
        forward_links: fc.array(fc.stringMatching(/^[a-z0-9-]{1,8}$/), { maxLength: 4 }),
      }),
      { selector: (p) => p.slug, ...options }
    )
    .map((records) =>
      records.map((r): PostMeta => ({
        ...r,
        tags: [],
        updated: null,
        backlinks: [],
        hub_parent: null,
        description: null,
        reading_time_min: 1,
        word_count: 10,
      }))
    );
}

test.prop([posts({ maxLength: 30 })])(
  'postsByYear lists every ordinary post exactly once and never a hub',
  (meta) => {
    const listed = postsByYear(meta).flatMap((group) => group.posts.map((p) => p.slug));
    const ordinary = meta.filter((p) => !p.is_hub).map((p) => p.slug);
    expect([...listed].sort()).toEqual([...ordinary].sort());
    expect(new Set(listed).size).toBe(listed.length);
  }
);

test.prop([posts({ maxLength: 20 })])(
  'comparePosts is a strict total order on distinct posts',
  (meta) => {
    for (const a of meta) {
      expect(comparePosts(a, a)).toBe(0);
      for (const b of meta) {
        if (a === b) continue;
        const ab = Math.sign(comparePosts(a, b));
        // Antisymmetric and never 0 for two posts with different slugs.
        expect(ab).not.toBe(0);
        expect(Math.sign(comparePosts(b, a))).toBe(-ab);
        for (const c of meta) {
          if (ab < 0 && comparePosts(b, c) < 0) expect(comparePosts(a, c)).toBeLessThan(0);
        }
      }
    }
  }
);

test.prop([posts({ maxLength: 30 }), isoDate])(
  'weekPosts keeps exactly the ordinary posts dated Monday to Sunday of the date, newest first',
  (meta, date) => {
    const { monday, sunday } = weekBounds(date);
    const mondayDay = new Date(`${monday}T12:00:00Z`);
    expect(mondayDay.getUTCDay()).toBe(1);
    expect(monday <= date && date <= sunday).toBe(true);
    const listed = weekPosts(meta, date);
    for (const p of listed) {
      expect(p.is_hub).toBe(false);
      expect(p.published !== null && monday <= p.published && p.published <= sunday).toBe(true);
    }
    const expected = meta.filter(
      (p) => !p.is_hub && p.published !== null && monday <= p.published && p.published <= sunday
    );
    expect(listed).toHaveLength(expected.length);
    for (let i = 1; i < listed.length; i += 1) {
      expect(comparePosts(listed[i - 1]!, listed[i]!)).toBeLessThan(0);
    }
  }
);

test.prop([posts({ minLength: 1000, maxLength: 1000 }), isoDate])(
  '1,000 posts build every list within the default property-test timeout',
  (meta, date) => {
    const groups = postsByYear(meta);
    expect(groups.reduce((n, g) => n + g.posts.length, 0)).toBe(
      meta.filter((p) => !p.is_hub).length
    );
    expect(recentPosts(meta, 5).length).toBeLessThanOrEqual(5);
    expect(weekPosts(meta, date).length).toBeLessThanOrEqual(meta.length);
    expect(topics(meta)).toHaveLength(meta.filter((p) => p.is_hub).length);
  }
);
