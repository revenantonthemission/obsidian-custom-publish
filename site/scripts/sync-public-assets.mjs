#!/usr/bin/env node
// Shared asset sync (U1 code-generation plan Step 2; infra R-02, NFR4.6).
//
// Replaces site/public/assets with a copy of content/assets. The old copy was
// add-only (`cp -r content/assets/* site/public/assets/`), so an image whose
// post or site page was withdrawn stayed in public/ and was redeployed every
// night. The Jenkinsfile, both Justfile preprocess recipes and the HIG runner
// call this one script, so the four copies cannot drift apart again.
//
// Usage: node site/scripts/sync-public-assets.mjs <content/assets> <site/public/assets>
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * True when `inner` is `outer` itself or lies below it.
 * @param {string} outer
 * @param {string} inner
 */
function isSameOrInside(outer, inner) {
  const rel = relative(outer, inner);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Make `dest` an exact copy of `src`: files missing from `src` are removed.
 * Fails closed before touching `dest` when `src` is missing (SYNC001) or the
 * two folders overlap (SYNC002), so a bad call never empties the live assets.
 * @param {string} src content/assets written by the preprocessor
 * @param {string} dest site/public/assets read by the Astro build
 */
export function syncPublicAssets(src, dest) {
  const source = resolve(src);
  const target = resolve(dest);
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    throw new Error(`SYNC001 ${source}: content assets folder not found — run the preprocessor`);
  }
  if (isSameOrInside(source, target) || isSameOrInside(target, source)) {
    throw new Error(`SYNC002 ${target}: public assets folder overlaps ${source}`);
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  const [src, dest] = process.argv.slice(2);
  if (src === undefined || dest === undefined) {
    console.error('usage: sync-public-assets.mjs <content/assets> <site/public/assets>');
    process.exit(2);
  }
  try {
    syncPublicAssets(src, dest);
    console.log(`sync-public-assets: ${resolve(dest)} now mirrors ${resolve(src)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
