import { test } from '@fast-check/vitest';
import { expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  PROFILE_SLOT_TOKEN,
  assertExactlyOneSlot,
  buildHomepageChunks,
  countSlotTokens,
  filterTodayPosts,
} from '../../../src/lib/homepage.js';
import { getHomepage } from '../../../src/lib/data.js';

/** Text that cannot form a slot token or a fence marker. */
const safeLine = fc.stringMatching(/^[a-z가-힣 .,]{0,30}$/);
const safeBlock = fc.array(safeLine, { minLength: 0, maxLength: 5 });

function fence(lines: readonly string[]): string {
  return ['```', ...lines, '```'].join('\n');
}

// FD-P-C06-02 + FE-P-U2-05: only unfenced standalone token lines count, and
// fence bodies pass through the plan byte-preserved.
test.prop([safeBlock, fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 2 })])(
  'countSlotTokens counts unfenced tokens only (FD-P-C06-02)',
  (lines, unfenced, fenced) => {
    const fencedBody = Array.from({ length: fenced }, () => PROFILE_SLOT_TOKEN);
    const parts: string[] = [...lines];
    for (let i = 0; i < unfenced; i += 1) parts.push(PROFILE_SLOT_TOKEN);
    if (fenced > 0) parts.push(fence(fencedBody));
    const markdown = parts.join('\n');

    expect(countSlotTokens(markdown)).toBe(unfenced);

    if (unfenced === 0) {
      expect(() => assertExactlyOneSlot(markdown, 'src.md')).toThrow(/^HP003 src\.md:/);
    } else if (unfenced > 1) {
      expect(() => assertExactlyOneSlot(markdown, 'src.md')).toThrow(/^HP004 src\.md:/);
    } else {
      assertExactlyOneSlot(markdown, 'src.md');
    }
  },
);

// FD-P-C06-01: with exactly one token, the plan holds exactly one slot chunk,
// drops the token, and preserves the surrounding content in order.
test.prop([safeBlock, safeBlock])(
  'buildHomepageChunks replaces the token exactly once (FD-P-C06-01)',
  (before, after) => {
    const html = `${before.join('\n')}\n${PROFILE_SLOT_TOKEN}\n${after.join('\n')}`;
    const chunks = buildHomepageChunks(html, 'src.md');

    expect(chunks.filter((c) => c.kind === 'slot')).toHaveLength(1);
    const joined = chunks
      .filter((c): c is { kind: 'html'; html: string } => c.kind === 'html')
      .map((c) => c.html)
      .join('');
    expect(joined).not.toContain(PROFILE_SLOT_TOKEN);
    for (const line of [...before, ...after]) {
      if (line.trim() !== '') expect(joined).toContain(line);
    }
  },
);

// FD-P-C10-01: every corruption mode fails closed with a coded diagnostic.
const corruptionMode = fc.constantFrom(
  'missing-meta',
  'missing-body',
  'invalid-json',
  'empty-title',
  'empty-body',
);

test.prop([corruptionMode])(
  'getHomepage fails closed on corrupted artifacts (FD-P-C10-01)',
  (mode) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-hp-'));
    try {
      fs.mkdirSync(path.join(dir, 'homepage'));
      const metaPath = path.join(dir, 'homepage', 'meta.json');
      const bodyPath = path.join(dir, 'homepage', 'index.md');
      if (mode !== 'missing-meta') {
        const meta =
          mode === 'invalid-json'
            ? '{ not json'
            : JSON.stringify({ title: mode === 'empty-title' ? '  ' : '홈' });
        fs.writeFileSync(metaPath, meta);
      }
      if (mode !== 'missing-body') {
        fs.writeFileSync(bodyPath, mode === 'empty-body' ? '  \n' : '본문\n');
      }

      const expected = mode.startsWith('missing') ? /^HP001 / : /^HP002 /;
      expect(() => getHomepage(dir)).toThrow(expected);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);

// FD-P-C10-02: a valid artifact reads back exactly (site half of FD-P-C09-01).
test.prop([
  fc.stringMatching(/^[A-Za-z가-힣][A-Za-z가-힣 ]{0,20}$/),
  fc.stringMatching(/^[a-z가-힣 .,\n]{1,80}$/).filter((s) => s.trim() !== ''),
])('getHomepage round-trips a valid artifact (FD-P-C10-02)', (title, body) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-hp-'));
  try {
    fs.mkdirSync(path.join(dir, 'homepage'));
    fs.writeFileSync(path.join(dir, 'homepage', 'meta.json'), JSON.stringify({ title }));
    fs.writeFileSync(path.join(dir, 'homepage', 'index.md'), body);

    const data = getHomepage(dir);
    expect(data.title).toBe(title);
    expect(data.body).toBe(body);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// FE-P-U2-02 support: the today filter is an exact partition on the given date.
test.prop([
  fc.array(
    fc.record({
      is_hub: fc.boolean(),
      published: fc.option(fc.constantFrom('2024-03-01', '2024-03-02'), { nil: undefined }),
    }),
    { maxLength: 12 },
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
