#!/usr/bin/env node
// U3 LC-U3-07 — cross-unit internal link integrity sweep (NFR-U3-003).
// Walks site/dist statically and verifies every root-relative href/src
// resolves to an emitted file. No browser, no network, no preview server.
// Exit 0 with a summary line on success; exit 1 listing every broken link.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(SITE_ROOT, 'dist');

// /resume.pdf is a deferred internal document: the release store tracks it
// independently of the astro build (U1 precedent in profile-routes.spec.ts).
const DEFERRED_INTERNAL_TARGETS = new Set(['/resume.pdf']);

const ATTR_RE = /(?:href|src)="([^"]*)"/g;

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function targetExists(target) {
  const decoded = decodeURIComponent(target);
  const base = join(DIST, decoded);
  const candidates = decoded.endsWith('/')
    ? [join(base, 'index.html')]
    : [base, join(base, 'index.html'), `${base}.html`];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

if (!existsSync(DIST)) {
  console.error(`link-sweep: build output missing at ${DIST} — run \`npx astro build\` first`);
  process.exit(1);
}

const pages = walkHtml(DIST);
const failures = [];
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(ATTR_RE)) {
    const raw = match[1];
    if (!raw.startsWith('/') || raw.startsWith('//')) continue;
    const target = raw.split('#')[0].split('?')[0];
    if (target === '' || DEFERRED_INTERNAL_TARGETS.has(target)) continue;
    checked += 1;
    if (!targetExists(target)) {
      failures.push({ page: page.slice(DIST.length), target: raw });
    }
  }
}

if (failures.length > 0) {
  for (const { page, target } of failures) {
    console.error(`link-sweep: ${page} -> ${target} has no emitted target`);
  }
  console.error(`link-sweep: ${failures.length} broken internal link(s) across ${pages.length} pages`);
  process.exit(1);
}

console.log(`link-sweep: ${checked} internal references across ${pages.length} pages all resolve`);
