#!/usr/bin/env node
// U3 LC-U3-07 — cross-unit internal link integrity sweep (NFR-U3-003).
// Walks site/dist statically and verifies every root-relative href/src
// resolves to an emitted file. No browser, no network, no preview server.
//
// U1 Step 18a (NFR3, AC7.1.3): the fixture vault keeps one deliberately broken
// image for the preprocessor's warning test, so known-broken-links.json
// declares it. The run passes only when the broken links equal the declared
// set exactly, page for page: an undeclared broken link fails, and so does a
// declaration that no longer matches (its target resolves, or the link moved
// to another page). Exit 0 with a summary line on success; exit 1 otherwise.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(SCRIPT_DIR, '..', '..');
const DIST = join(SITE_ROOT, 'dist');
const KNOWN_BROKEN_FILE = join(SCRIPT_DIR, 'known-broken-links.json');

// /resume.pdf is a deferred internal document: the release store tracks it
// independently of the astro build (U1 precedent in profile-routes.spec.ts).
const DEFERRED_INTERNAL_TARGETS = new Set(['/resume.pdf']);

const ATTR_RE = /(?:href|src)="([^"]*)"/g;

function walkHtml(dir, out = []) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function targetExists(distDir, target) {
  const decoded = decodeURIComponent(target);
  const base = join(distDir, decoded);
  const candidates = decoded.endsWith('/')
    ? [join(base, 'index.html')]
    : [base, join(base, 'index.html'), `${base}.html`];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

const keyOf = (page, target) => `${page}\u0000${target}`;

/**
 * Sweeps a built site and compares its broken links with the declared set.
 * `expected` are broken links that match a declaration, `unexpected` are
 * broken links that match none, and `stale` are declarations that matched no
 * broken link. `ok` is true only when both `unexpected` and `stale` are empty.
 *
 * @param {string} distDir built site root
 * @param {ReadonlyArray<{page: string, target: string}>} knownBroken declarations
 */
export function sweep(distDir, knownBroken) {
  const declared = new Map(knownBroken.map((d) => [keyOf(d.page, d.target), d]));
  const pages = walkHtml(distDir);
  const matched = new Set();
  const expected = [];
  const unexpected = [];
  let checked = 0;

  for (const file of pages) {
    const page = file.slice(distDir.length);
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(ATTR_RE)) {
      const raw = match[1];
      if (!raw.startsWith('/') || raw.startsWith('//')) continue;
      const target = raw.split('#')[0].split('?')[0];
      if (target === '' || DEFERRED_INTERNAL_TARGETS.has(target)) continue;
      checked += 1;
      if (targetExists(distDir, target)) continue;
      const key = keyOf(page, target);
      if (declared.has(key)) {
        matched.add(key);
        expected.push({ page, target: raw });
      } else {
        unexpected.push({ page, target: raw });
      }
    }
  }

  const stale = [...declared.entries()]
    .filter(([key]) => !matched.has(key))
    .map(([, d]) => ({ page: d.page, target: d.target }));

  return Object.freeze({
    pages: pages.length,
    checked,
    expected,
    unexpected,
    stale,
    ok: unexpected.length === 0 && stale.length === 0,
  });
}

/** Reads and validates the declaration file; fails closed on a bad shape. */
export function loadKnownBroken(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const valid =
    Array.isArray(parsed) &&
    parsed.every(
      (d) =>
        d !== null &&
        typeof d === 'object' &&
        typeof d.page === 'string' &&
        typeof d.target === 'string' &&
        typeof d.reason === 'string' &&
        d.reason.trim() !== ''
    );
  if (!valid) {
    throw new Error(
      `LINK001 ${file} must be an array of { page, target, reason } entries with a non-empty reason`
    );
  }
  return Object.freeze(parsed.map((d) => Object.freeze({ ...d })));
}

function main() {
  if (!existsSync(DIST)) {
    console.error(`link-sweep: build output missing at ${DIST} — run \`npx astro build\` first`);
    process.exit(1);
  }

  let knownBroken;
  try {
    knownBroken = loadKnownBroken(KNOWN_BROKEN_FILE);
  } catch (error) {
    console.error(`link-sweep: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const result = sweep(DIST, knownBroken);

  for (const { page, target } of result.expected) {
    console.log(`link-sweep: expected known broken link ${page} -> ${target}`);
  }
  for (const { page, target } of result.unexpected) {
    console.error(`link-sweep: ${page} -> ${target} has no emitted target`);
  }
  for (const { page, target } of result.stale) {
    console.error(
      `link-sweep: declared known broken link ${page} -> ${target} was not found broken; update known-broken-links.json`
    );
  }

  if (!result.ok) {
    console.error(
      `link-sweep: ${result.unexpected.length} undeclared broken link(s) and ${result.stale.length} stale declaration(s) across ${result.pages} pages`
    );
    process.exit(1);
  }

  console.log(
    `link-sweep: ${result.checked} internal references across ${result.pages} pages resolve, apart from ${result.expected.length} declared known broken link(s)`
  );
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  main();
}
