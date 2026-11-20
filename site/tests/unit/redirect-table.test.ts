// U3 redirect table: grammar, loader and lookup (rules.md BR3.2–BR3.5; NFR
// design security-design.md §3–§5 and §8, performance-design.md §2.1). The
// server's request-time decision lives in this module, so it is tested here
// without binding a port. Every rejection is a whole-table rejection with one
// error, for `from` and for `to` alike (G1–G8, NFR5.23, NFR5.24).
import { describe, expect, test } from 'vitest';

import {
  isHeaderValueSafe,
  isHostileQuery,
  loadRedirectTable,
  matchRedirect,
  parseRedirectTable,
  redirectLocation,
  validateRedirectTable,
  type RedirectTableState,
} from '../../scripts/redirect-table.mjs';

const GOOD_RULES = Object.freeze([
  Object.freeze({ from: '/graph', to: '/writing/graph' }),
  Object.freeze({ from: '/tags', to: '/writing/tags' }),
  Object.freeze({ from: '/tags/node.js', to: '/writing/tags/node.js' }),
  Object.freeze({ from: '/tags/운영체제', to: '/writing/tags/운영체제' }),
]);

function table(rules: readonly unknown[]): unknown {
  return { version: 1, rules };
}

/**
 * A table holding the good rules plus one rule whose `from` (then whose `to`)
 * is the hostile path must be rejected whole, with one error that names the
 * grammar condition, and must carry no rule.
 */
function expectRejectedPath(path: string, condition: string): void {
  for (const field of ['from', 'to'] as const) {
    const bad =
      field === 'from' ? { from: path, to: '/writing/tags' } : { from: '/tags/x', to: path };
    const result = validateRedirectTable(table([...GOOD_RULES, bad]));
    expect(result.ok, `${field} ${JSON.stringify(path)}`).toBe(false);
    if (result.ok) return;
    expect(result.error.code, `${field} ${JSON.stringify(path)}`).toBe('REDIRECT_PATH_INVALID');
    expect(result.error.message, `${field} ${JSON.stringify(path)}`).toContain(condition);
    expect(result.error.message).toContain(`rules[${GOOD_RULES.length}].${field}`);
    expect('rules' in result).toBe(false);
  }
}

describe('table acceptance (BR3.4; security-design.md §5.1)', () => {
  test('a valid version-1 table is accepted, decoded Korean and dotted paths included', () => {
    const result = validateRedirectTable(table(GOOD_RULES));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rules).toEqual(GOOD_RULES);
    expect(Object.isFrozen(result.rules)).toBe(true);
    expect(result.rules.every((rule) => Object.isFrozen(rule))).toBe(true);
    const parsed = parseRedirectTable(JSON.stringify(table(GOOD_RULES)));
    expect(parsed.ok && parsed.rules).toEqual(GOOD_RULES);
  });

  test('a path that is not absolute or names another host is refused (G1, G2, G6)', () => {
    expectRejectedPath('tags/relative', 'G1');
    expectRejectedPath('//evil.example/x', 'G1');
    expectRejectedPath('https://elsewhere.example/x', 'G1');
    expectRejectedPath('/\\evil.example/x', 'G2');
  });

  test('a NUL byte or a line-feed byte is refused (G3)', () => {
    expectRejectedPath('/tags/a\u0000b', 'G3');
    expectRejectedPath('/tags/a\nLocation: //evil.example', 'G3');
  });

  test('a query or a fragment is refused (G4)', () => {
    expectRejectedPath('/tags?x=1', 'G4');
    expectRejectedPath('/tags#x', 'G4');
  });

  test('a dot segment is refused (G5)', () => {
    expectRejectedPath('/tags/../evil', 'G5');
    expectRejectedPath('/tags/./x', 'G5');
  });

  test('a trailing slash, and the root itself, are refused (G7)', () => {
    expectRejectedPath('/tags/', 'G7');
    expectRejectedPath('/', 'G7');
  });

  test('a percent-escape, such as an encoded host, is refused (G8)', () => {
    expectRejectedPath('/%2F%2Fevil.example', 'G8');
  });

  test('a wrong version, a non-list `rules` and invalid JSON are refused whole', () => {
    const wrongVersion = validateRedirectTable({ version: 2, rules: GOOD_RULES });
    expect(wrongVersion.ok || wrongVersion.error.code).toBe('REDIRECT_TABLE_VERSION');
    for (const shape of [{ version: 1, rules: {} }, { version: 1 }, [], null, 'x']) {
      const result = validateRedirectTable(shape);
      expect(result.ok || result.error.code, JSON.stringify(shape)).toBe('REDIRECT_TABLE_SHAPE');
    }
    const badRule = validateRedirectTable(table([{ from: '/tags' }]));
    expect(badRule.ok || badRule.error.code).toBe('REDIRECT_TABLE_SHAPE');
    const invalidJson = parseRedirectTable('{"version": 1, "rules": [');
    expect(invalidJson.ok || invalidJson.error.code).toBe('REDIRECT_TABLE_JSON');
  });
});

describe('lookup (BR3.2, BR3.3; security-design.md §3, §4)', () => {
  test('matchRedirect matches exactly, after stripping one trailing slash', () => {
    expect(matchRedirect(GOOD_RULES, '/tags')).toBe('/writing/tags');
    expect(matchRedirect(GOOD_RULES, '/tags/')).toBe('/writing/tags');
    expect(matchRedirect(GOOD_RULES, '/tags/운영체제')).toBe('/writing/tags/운영체제');
    expect(matchRedirect(GOOD_RULES, '/tags/node.js/')).toBe('/writing/tags/node.js');
    expect(matchRedirect(GOOD_RULES, '/graph.json')).toBeNull();
    expect(matchRedirect(GOOD_RULES, '/tagsold')).toBeNull();
    expect(matchRedirect(GOOD_RULES, '/tags//')).toBeNull();
    expect(matchRedirect(GOOD_RULES, '/TAGS')).toBeNull();
    expect(matchRedirect(GOOD_RULES, '/')).toBeNull();
    expect(matchRedirect([], '/tags')).toBeNull();
  });

  test('redirectLocation encodes the target once and appends the raw query byte for byte', () => {
    expect(redirectLocation('/writing/tags', null)).toBe('/writing/tags');
    expect(redirectLocation('/writing/tags/운영체제', null)).toBe(
      '/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C'
    );
    expect(redirectLocation('/writing/tags/100%', null)).toBe('/writing/tags/100%25');
    expect(redirectLocation('/writing/tags', 'x=a b')).toBe('/writing/tags?x=a b');
    expect(redirectLocation('/writing/tags', 'q=%ED%95%9C')).toBe('/writing/tags?q=%ED%95%9C');
    expect(redirectLocation('/writing/tags/node.js', 'from=post')).toBe(
      '/writing/tags/node.js?from=post'
    );
  });

  test('isHostileQuery refuses encoded control bytes and nothing else', () => {
    for (const query of ['x=%0d', 'x=%0A', 'x=%00', 'a=1&b=%1f', 'x=%7F']) {
      expect(isHostileQuery(query), query).toBe(true);
    }
    for (const query of ['x=%20', 'x=%2F', 'q=%ED%95%9C%EA%B8%80', 'x=a b', '', null]) {
      expect(isHostileQuery(query), String(query)).toBe(false);
    }
  });
});

// Review R-02 (NFR5.22; security-design.md §4): the two last-resort guards the
// server keeps "because the checks above can be wrong". The grammar (G1–G8)
// accepts a lone surrogate in `to`, so these are reachable from a valid table.
describe('last-resort guards (NFR5.22; security-design.md §4)', () => {
  test('isHeaderValueSafe accepts an ordinary encoded Location, tab, space and 0x80–0xff', () => {
    for (const value of [
      '/writing/tags',
      '/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C?q=%ED%95%9C&x=a b',
      '/writing/tags?x=a\tb',
      '/writing/tags/\u0080\u00ff',
    ]) {
      expect(isHeaderValueSafe(value), JSON.stringify(value)).toBe(true);
    }
  });

  test('isHeaderValueSafe refuses CR, LF, NUL and DEL', () => {
    for (const value of [
      '/writing/tags\r',
      '/writing/tags\nLocation: //evil.example',
      '/writing/tags\u0000',
      '/writing/tags\u007f',
    ]) {
      expect(isHeaderValueSafe(value), JSON.stringify(value)).toBe(false);
    }
  });

  test('a lone-surrogate `to` passes the grammar but redirectLocation throws on it', () => {
    const loneSurrogate = '/writing/tags/\ud800';
    const result = validateRedirectTable(table([{ from: '/tags/x', to: loneSurrogate }]));
    expect(result.ok).toBe(true);
    expect(() => redirectLocation(loneSurrogate, null)).toThrow(URIError);
  });
});

/** An in-memory table file with counting `readFile` and `stat` (the loader's seam). */
function fakeTableFile(initial: { text: string; mtimeMs: number } | null) {
  let file = initial;
  const counts = { reads: 0, stats: 0 };
  const reports: RedirectTableState[] = [];
  const io = {
    readFile: (path: string): string => {
      counts.reads += 1;
      if (file === null) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' });
      return file.text;
    },
    stat: (path: string): { mtimeMs: number; size: number } => {
      counts.stats += 1;
      if (file === null) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' });
      return { mtimeMs: file.mtimeMs, size: file.text.length };
    },
    onRead: (state: RedirectTableState): void => {
      reports.push(state);
    },
  };
  return {
    io,
    counts,
    reports,
    write(text: string, mtimeMs: number): void {
      file = { text, mtimeMs };
    },
    remove(): void {
      file = null;
    },
  };
}

const GOOD_TEXT = JSON.stringify(table(GOOD_RULES));

describe('loader (BR3.4, BR3.5; NFR4.10)', () => {
  test('100 lookups between changes read the file 0 extra times', () => {
    const disk = fakeTableFile({ text: GOOD_TEXT, mtimeMs: 1000 });
    const handle = loadRedirectTable('/web/_redirects.json', disk.io);
    for (let i = 0; i < 100; i += 1) {
      expect(matchRedirect(handle.current().rules, '/tags')).toBe('/writing/tags');
    }
    expect(disk.counts.reads).toBe(1);
    expect(handle.current().status).toBe('loaded');
  });

  test('a modification-time change re-reads the table once', () => {
    const disk = fakeTableFile({ text: GOOD_TEXT, mtimeMs: 1000 });
    const handle = loadRedirectTable('/web/_redirects.json', disk.io);
    handle.current();
    disk.write(JSON.stringify(table([{ from: '/graph', to: '/writing/graph' }])), 2000);
    for (let i = 0; i < 10; i += 1) handle.current();
    expect(disk.counts.reads).toBe(2);
    expect(matchRedirect(handle.current().rules, '/tags')).toBeNull();
    expect(matchRedirect(handle.current().rules, '/graph')).toBe('/writing/graph');
  });

  test('a table that appears after a "missing" start is picked up', () => {
    const disk = fakeTableFile(null);
    const handle = loadRedirectTable('/web/_redirects.json', disk.io);
    expect(handle.current()).toEqual({ status: 'none', rules: [], error: null });
    disk.write(GOOD_TEXT, 3000);
    expect(handle.current().status).toBe('loaded');
    expect(matchRedirect(handle.current().rules, '/tags/운영체제')).toBe('/writing/tags/운영체제');
  });

  test('a table that disappears clears the rules', () => {
    const disk = fakeTableFile({ text: GOOD_TEXT, mtimeMs: 1000 });
    const handle = loadRedirectTable('/web/_redirects.json', disk.io);
    expect(handle.current().rules).toHaveLength(GOOD_RULES.length);
    disk.remove();
    expect(handle.current()).toEqual({ status: 'none', rules: [], error: null });
    expect(matchRedirect(handle.current().rules, '/tags')).toBeNull();
  });

  test('an invalid table clears the rules and reports one error per read, not per request', () => {
    const disk = fakeTableFile({ text: GOOD_TEXT, mtimeMs: 1000 });
    const handle = loadRedirectTable('/web/_redirects.json', disk.io);
    expect(handle.current().status).toBe('loaded');
    disk.write(JSON.stringify(table([{ from: '//evil.example', to: '/writing/tags' }])), 2000);
    for (let i = 0; i < 50; i += 1) {
      expect(matchRedirect(handle.current().rules, '/tags')).toBeNull();
    }
    disk.write('not json', 3000);
    for (let i = 0; i < 50; i += 1) handle.current();
    const rejected = disk.reports.filter((state) => state.status === 'rejected');
    expect(rejected.map((state) => state.error?.code)).toEqual([
      'REDIRECT_PATH_INVALID',
      'REDIRECT_TABLE_JSON',
    ]);
    expect(disk.counts.reads).toBe(3);
    expect(handle.current().rules).toEqual([]);
  });
});
