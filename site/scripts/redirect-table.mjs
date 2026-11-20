// The redirect table's grammar, loader and lookup (U3 BR3.2–BR3.5; contract C4;
// NFR design security-design.md §3–§5, performance-design.md §2.1).
//
// The table `_redirects.json` is public and world-readable, and the server puts
// a rule's target into a response header, so the table is untrusted input. It
// is accepted only whole and only in the grammar G1–G8 (security-design.md
// §5.1); anything else means no redirect at all (BR3.4, NFR5.23, NFR5.24). The
// writer runs the same validator before it writes (NFR5.25), so a build can
// never ship a table the server would reject.
//
// Pure apart from the loader's injected `readFile`/`stat`, and importable
// without side effects, so the unit tests never bind the server's port. It
// imports nothing from src/: the launchd agent runs the server from the
// working copy, and the restart precondition names exactly this file and
// local-server.mjs (infrastructure-specification.md "Restart policy").

import { readFileSync, statSync } from 'node:fs';

export const REDIRECT_TABLE_FILE = '_redirects.json';
export const REDIRECT_TABLE_VERSION = 1;

/** A percent-encoded control byte, %00–%1f or %7f, either case (NFR5.22, §4). */
export const HOSTILE_QUERY = Object.freeze(/%(?:[01][0-9a-f]|7f)/i);

const CONTROL_BYTE = /[\u0000-\u001f\u007f]/;
const PERCENT_ESCAPE = /%[0-9a-f]{2}/i;
// The bytes Node's HTTP layer refuses in a header value (§4, second line).
const INVALID_HEADER_CHAR = /[^\t\x20-\x7e\x80-\xff]/;
// Only for G6: a path parsed against this base must stay on it.
const SENTINEL_ORIGIN = 'http://redirect-table.invalid';

const EMPTY_RULES = Object.freeze([]);
const NO_TABLE = Object.freeze({ status: 'none', rules: EMPTY_RULES, error: null });

/**
 * The first grammar condition the path breaks, or null when it is a decoded
 * absolute path without a trailing slash (security-design.md §5.1, G1–G8).
 */
export function checkRedirectPath(path) {
  if (!path.startsWith('/') || path.startsWith('//')) return 'G1';
  if (path.includes('\\')) return 'G2';
  if (CONTROL_BYTE.test(path)) return 'G3';
  if (path.includes('?') || path.includes('#')) return 'G4';
  if (path.split('/').some((segment) => segment === '.' || segment === '..')) return 'G5';
  if (!staysOnOrigin(path)) return 'G6';
  if (path.endsWith('/')) return 'G7';
  if (PERCENT_ESCAPE.test(path)) return 'G8';
  return null;
}

/** G6 is implied by G1–G2; checked anyway so no parser quirk can add an authority. */
function staysOnOrigin(path) {
  try {
    return new URL(path, SENTINEL_ORIGIN).origin === SENTINEL_ORIGIN;
  } catch {
    return false;
  }
}

function rejection(code, detail) {
  return Object.freeze({ ok: false, error: Object.freeze({ code, message: `${code} ${detail}` }) });
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Accepts a parsed table only in contract C4's shape with every path in the
 * grammar; one bad rule rejects the whole table, with one error (BR3.4).
 */
export function validateRedirectTable(value) {
  if (!isRecord(value)) return rejection('REDIRECT_TABLE_SHAPE', 'the table is not an object');
  if (value.version !== REDIRECT_TABLE_VERSION) {
    return rejection('REDIRECT_TABLE_VERSION', `version ${JSON.stringify(value.version)} is not 1`);
  }
  if (!Array.isArray(value.rules)) {
    return rejection('REDIRECT_TABLE_SHAPE', '`rules` is not a list');
  }
  const rules = [];
  for (const [index, rule] of value.rules.entries()) {
    if (!isRecord(rule) || typeof rule.from !== 'string' || typeof rule.to !== 'string') {
      return rejection('REDIRECT_TABLE_SHAPE', `rules[${index}] is not { from, to } strings`);
    }
    for (const field of ['from', 'to']) {
      const condition = checkRedirectPath(rule[field]);
      if (condition !== null) {
        return rejection(
          'REDIRECT_PATH_INVALID',
          `rules[${index}].${field} breaks ${condition}: ${JSON.stringify(rule[field])}`
        );
      }
    }
    rules.push(Object.freeze({ from: rule.from, to: rule.to }));
  }
  return Object.freeze({ ok: true, rules: Object.freeze(rules) });
}

/** JSON text to a validated table; invalid JSON is REDIRECT_TABLE_JSON. */
export function parseRedirectTable(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return rejection('REDIRECT_TABLE_JSON', `not valid JSON: ${errorText(error)}`);
  }
  return validateRedirectTable(value);
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * A handle on the table file. `current()` costs one `stat` per call and
 * re-reads the file only when its presence or its stat signature (modification
 * time, plus size and inode) changed since the last read (BR3.5, NFR4.10), so a
 * table that appears, changes or disappears is picked up without a restart.
 * `onRead` is called once per read, never per request (BR3.4: one log line).
 */
export function loadRedirectTable(tablePath, io = {}) {
  const readFile = io.readFile ?? ((path) => readFileSync(path, 'utf8'));
  const stat = io.stat ?? ((path) => statSync(path));
  const onRead = io.onRead ?? (() => undefined);
  let signature = null;
  let state = NO_TABLE;

  function current() {
    const next = probe(stat, tablePath);
    if (next !== signature) {
      signature = next;
      state = readState(readFile, tablePath, next);
      onRead(state);
    }
    return state;
  }

  current();
  return Object.freeze({ current });
}

function probe(stat, tablePath) {
  try {
    const info = stat(tablePath);
    return `present:${info.mtimeMs}:${info.size ?? ''}:${info.ino ?? ''}`;
  } catch (error) {
    const code = error?.code;
    return code === 'ENOENT' || code === 'ENOTDIR' ? 'missing' : `unreadable:${code ?? 'unknown'}`;
  }
}

function readState(readFile, tablePath, signature) {
  if (signature === 'missing') return NO_TABLE;
  let text;
  try {
    text = readFile(tablePath);
  } catch (error) {
    // Removed between the stat and the read: the next request re-probes.
    if (error?.code === 'ENOENT') return NO_TABLE;
    return rejectedState({
      code: 'REDIRECT_TABLE_UNREADABLE',
      message: `REDIRECT_TABLE_UNREADABLE ${errorText(error)}`,
    });
  }
  const result = parseRedirectTable(text);
  if (!result.ok) return rejectedState(result.error);
  return Object.freeze({ status: 'loaded', rules: result.rules, error: null });
}

function rejectedState(error) {
  return Object.freeze({ status: 'rejected', rules: EMPTY_RULES, error: Object.freeze(error) });
}

// One private index per rules list: a Map lookup per request (§2.1), and the
// frozen list stays the only thing a caller can see.
const INDEXES = new WeakMap();

function indexOf(rules) {
  let index = INDEXES.get(rules);
  if (index === undefined) {
    index = new Map();
    for (const rule of rules) {
      if (!index.has(rule.from)) index.set(rule.from, rule.to);
    }
    INDEXES.set(rules, index);
  }
  return index;
}

/**
 * The target of the rule whose `from` equals the decoded path with one
 * trailing slash stripped, or null. Exact, never a prefix match (BR3.2).
 */
export function matchRedirect(rules, decodedPath) {
  const key =
    decodedPath.length > 1 && decodedPath.endsWith('/') ? decodedPath.slice(0, -1) : decodedPath;
  return indexOf(rules).get(key) ?? null;
}

/**
 * The Location value: the target with each segment encoded exactly once, then
 * the raw query byte for byte, never decoded or re-encoded (BR3.3, §3). The
 * same encoding as the address module's `encodePath` (BR2.2).
 */
export function redirectLocation(to, rawQuery) {
  const path = to.split('/').map(encodeURIComponent).join('/');
  return rawQuery === null || rawQuery === undefined ? path : `${path}?${rawQuery}`;
}

/** True when the raw query carries a percent-encoded control byte (NFR5.22). */
export function isHostileQuery(rawQuery) {
  return typeof rawQuery === 'string' && HOSTILE_QUERY.test(rawQuery);
}

/** False when Node would refuse the value in a header (§4, the post-assembly check). */
export function isHeaderValueSafe(value) {
  return !INVALID_HEADER_CHAR.test(value);
}
