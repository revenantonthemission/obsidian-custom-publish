// The redirect-table writer (U3 BR3.1; contract C4; NFR4.9, NFR5.23, NFR5.25;
// security-design.md §5.2 and §6 Rule 2; performance-design.md §1.1).
//
// An Astro integration whose `astro:build:done` hook writes `_redirects.json`
// into the build's own output directory, so `just site-build` and the Jenkins
// Build Site step keep running the same `npx astro build` and no pipeline stage
// is added. The rules come from the tag pages the build produced, so a rule
// cannot exist without its page. Before writing, the table must pass the same
// G1–G8 validator the server uses, carry no duplicate `from` and no loop, and
// name only targets present in the same output; anything else fails the build
// with a coded error and writes no table, so the nightly deploy never runs.

import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  graphPath,
  legacyGraphPath,
  legacyTagIndexPath,
  legacyTagPath,
  tagIndexPath,
  tagPath,
} from '../../src/lib/tag-urls.mjs';
import {
  REDIRECT_TABLE_FILE,
  REDIRECT_TABLE_VERSION,
  validateRedirectTable,
} from '../redirect-table.mjs';

function codedError(code, detail) {
  return Object.assign(new Error(`${code} ${detail}`), { code });
}

/** The validator's own error, already prefixed with its code. */
function validationError(tableError) {
  return Object.assign(new Error(tableError.message), { code: tableError.code });
}

/** The tag keys: one per `writing/tags/<key>/` directory the build produced. */
async function builtTagKeys(outDir) {
  const tagsDir = join(outDir, ...tagIndexPath().split('/'));
  const entries = await readdir(tagsDir, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function byFrom(left, right) {
  return left.from < right.from ? -1 : left.from > right.from ? 1 : 0;
}

/** The two fixed rules plus one rule per key, sorted by `from` (BR3.1). */
function buildRules(keys) {
  const rules = [
    { from: legacyTagIndexPath(), to: tagIndexPath() },
    { from: legacyGraphPath(), to: graphPath() },
    // One key gives both sides, so a rule never mixes keys (BR2.1).
    ...keys.map((key) => ({ from: legacyTagPath(key), to: tagPath(key) })),
  ];
  return rules.sort(byFrom);
}

/** The writer's own guarantees beyond the server's grammar (§5.2). */
function assertUniqueAndLoopFree(rules) {
  const froms = new Set();
  for (const rule of rules) {
    if (froms.has(rule.from)) throw codedError('REDIRECT_TABLE_DUPLICATE', rule.from);
    froms.add(rule.from);
  }
  const loop = rules.find((rule) => froms.has(rule.to));
  if (loop !== undefined) {
    throw codedError('REDIRECT_TABLE_LOOP', `${loop.from} -> ${loop.to} is itself redirected`);
  }
}

async function isFile(path) {
  return stat(path).then(
    (info) => info.isFile(),
    () => false
  );
}

/** Every target must be a page in this output (§6 Rule 2): fail, never drop. */
async function assertTargetsBuilt(outDir, rules) {
  for (const rule of rules) {
    const page = join(outDir, ...rule.to.split('/'), 'index.html');
    if (!(await isFile(page))) {
      throw codedError('REDIRECT_TARGET_MISSING', `${rule.from} -> ${rule.to}: ${page} is missing`);
    }
  }
}

/**
 * Writes `<outDir>/_redirects.json` from the tag pages in `outDir` and returns
 * the table. Two runs over the same output give the same bytes.
 */
export async function writeRedirectTable(outDir) {
  const root = outDir instanceof URL ? fileURLToPath(outDir) : outDir;
  const candidate = {
    version: REDIRECT_TABLE_VERSION,
    rules: buildRules(await builtTagKeys(root)),
  };
  const result = validateRedirectTable(candidate);
  if (!result.ok) throw validationError(result.error);
  assertUniqueAndLoopFree(result.rules);
  await assertTargetsBuilt(root, result.rules);
  const table = Object.freeze({ version: REDIRECT_TABLE_VERSION, rules: result.rules });
  await writeFile(join(root, REDIRECT_TABLE_FILE), `${JSON.stringify(table, null, 2)}\n`);
  return table;
}

export default function legacyRedirectsIntegration() {
  return {
    name: 'rvnnt-legacy-redirects',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const table = await writeRedirectTable(dir);
        logger.info(`wrote ${REDIRECT_TABLE_FILE} (${table.rules.length} rules)`);
      },
    },
  };
}
