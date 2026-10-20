// Isolated Astro builds for unit tests that inspect built HTML.
//
// Every build of this project writes its prerender chunks to site/.astro, so
// two builds from test files running in parallel workers delete each other's
// chunks (ERR_MODULE_NOT_FOUND). Builds therefore take turns through a lock
// directory; each still writes to its own --outDir.
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const ASTRO_CLI = resolve(ROOT, 'node_modules/astro/bin/astro.mjs');
const LOCK = join(
  tmpdir(),
  `astro-build-${createHash('sha256').update(ROOT).digest('hex').slice(0, 12)}.lock`
);
/** A lock older than this belongs to a run that died; a build takes seconds. */
const STALE_LOCK_MS = 180_000;
const POLL_MS = 200;

async function acquireLock(): Promise<void> {
  for (;;) {
    try {
      await mkdir(LOCK);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    const held = await stat(LOCK).catch(() => null);
    if (held !== null && Date.now() - held.mtimeMs > STALE_LOCK_MS) {
      await rm(LOCK, { recursive: true, force: true });
      continue;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, POLL_MS));
  }
}

/** Builds the site into `outDir`, one build at a time per checkout. */
export async function buildSiteInto(
  outDir: string,
  timeoutMs = 60_000
): Promise<SpawnSyncReturns<string>> {
  await acquireLock();
  try {
    return spawnSync(process.execPath, [ASTRO_CLI, 'build', '--outDir', outDir], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: timeoutMs,
    });
  } finally {
    await rm(LOCK, { recursive: true, force: true });
  }
}
