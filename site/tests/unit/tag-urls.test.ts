// U3 address module (functional design rules.md BR2.1, BR2.2; frontend-components.md
// "Address module"). One module owns every tag and graph address, old and new:
// it sanitizes the tag the way the tag index is keyed, returns the decoded
// address the redirect table stores, and the encoded address markup and a
// Location header use, each segment encoded exactly once.
import { describe, expect, test } from 'vitest';

import {
  encodePath,
  graphPath,
  legacyGraphPath,
  legacyTagIndexPath,
  legacyTagPath,
  sanitizeTag,
  tagHref,
  tagIndexPath,
  tagPath,
} from '../../src/lib/tag-urls.mjs';

/** Today's data.ts rule, written out (BR2.1: the same key the tag index uses). */
const TODAY_KEYS = Object.freeze([
  ['OS', 'os'],
  ['a/b', 'a-b'],
  ['two words', 'two-words'],
  ['운영체제', '운영체제'],
  ['node.js', 'node.js'],
] as const);

const KOREAN_ENCODED = '%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C';

describe('tag key (BR2.1)', () => {
  test('sanitizeTag gives the key data.ts gives today', () => {
    for (const [tag, key] of TODAY_KEYS) {
      expect(sanitizeTag(tag), tag).toBe(key);
    }
  });

  test('a key passes through unchanged, so a key and its tag give one address', () => {
    for (const [tag, key] of TODAY_KEYS) {
      expect(sanitizeTag(key), key).toBe(key);
      expect(tagPath(key), key).toBe(tagPath(tag));
      expect(tagHref(key), key).toBe(tagHref(tag));
    }
  });
});

describe('addresses (BR2.1, BR2.2)', () => {
  test('tagPath is the decoded new address of the sanitized key', () => {
    expect(tagPath('운영체제')).toBe('/writing/tags/운영체제');
    expect(tagPath('OS')).toBe('/writing/tags/os');
    expect(tagPath('a/b')).toBe('/writing/tags/a-b');
  });

  test('tagHref encodes each segment exactly once', () => {
    expect(tagHref('운영체제')).toBe(`/writing/tags/${KOREAN_ENCODED}`);
    expect(tagHref('node.js')).toBe('/writing/tags/node.js');
    expect(tagHref('100%')).toBe('/writing/tags/100%25');
    // The encoder the module uses: a space becomes %20, a dot and the
    // separators stay, and one decode gives the decoded address back.
    expect(encodePath('/writing/tags/two words')).toBe('/writing/tags/two%20words');
    expect(encodePath('/tags/node.js')).toBe('/tags/node.js');
    for (const tag of ['운영체제', 'node.js', '100%', 'OS']) {
      expect(decodeURIComponent(tagHref(tag)), tag).toBe(tagPath(tag));
    }
  });

  test('legacyTagPath is the old address /tags/<key>', () => {
    expect(legacyTagPath('운영체제')).toBe('/tags/운영체제');
    expect(legacyTagPath('OS')).toBe('/tags/os');
    expect(legacyTagPath('node.js')).toBe('/tags/node.js');
  });

  test('the fixed addresses: tag index and graph, new and old', () => {
    expect(tagIndexPath()).toBe('/writing/tags');
    expect(graphPath()).toBe('/writing/graph');
    expect(legacyTagIndexPath()).toBe('/tags');
    expect(legacyGraphPath()).toBe('/graph');
  });

  test('a key that sanitizes to empty, or to a dot segment, is refused with TAG001', () => {
    for (const tag of ['', '.', '..']) {
      for (const build of [tagPath, tagHref, legacyTagPath]) {
        let caught: unknown = null;
        try {
          build(tag);
        } catch (error) {
          caught = error;
        }
        expect(caught, `${build.name}(${JSON.stringify(tag)})`).toBeInstanceOf(Error);
        expect((caught as Error & { code?: string }).code).toBe('TAG001');
        expect((caught as Error).message).toMatch(/^TAG001 /);
      }
    }
  });

  test('every function is pure: the same input gives the same output, in any order', () => {
    const calls = [
      () => sanitizeTag('A/B c'),
      () => tagPath('A/B c'),
      () => tagHref('A/B c'),
      () => legacyTagPath('A/B c'),
      () => encodePath('/a b/c'),
      () => tagIndexPath(),
      () => graphPath(),
      () => legacyTagIndexPath(),
      () => legacyGraphPath(),
    ];
    const first = calls.map((call) => call());
    const reversed = [...calls]
      .reverse()
      .map((call) => call())
      .reverse();
    expect(reversed).toEqual(first);
    expect(first).toEqual([
      'a-b-c',
      '/writing/tags/a-b-c',
      '/writing/tags/a-b-c',
      '/tags/a-b-c',
      '/a%20b/c',
      '/writing/tags',
      '/writing/graph',
      '/tags',
      '/graph',
    ]);
  });
});
