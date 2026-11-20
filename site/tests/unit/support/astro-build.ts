// Astro builds for unit tests that inspect built HTML.
//
// Every build of this project writes its prerender chunks to site/.astro, so
// two builds from test files running in parallel workers delete each other's
// chunks (ERR_MODULE_NOT_FOUND). Builds therefore take turns through a lock
// directory; each still writes to its own --outDir.
//
// The test files that read the default fixture site share one build per
// `vitest run` (U1-NFR6.6, Build and Test loop-back 3): the first caller builds
// it under the lock, and later callers, in any worker, reuse its folder. The
// folder is keyed to the run token that shared-build-setup.ts (the config's
// globalSetup) sets, and that setup removes it when the run ends, so one run
// never reads another run's build. A build with its own `env` (for example the
// test-only CONTENT_DIR_OVERRIDE) still goes through buildSiteInto into its own
// folder.
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const ASTRO_CLI = resolve(ROOT, 'node_modules/astro/bin/astro.mjs');
const ROOT_KEY = createHash('sha256').update(ROOT).digest('hex').slice(0, 12);
const LOCK = join(tmpdir(), `astro-build-${ROOT_KEY}.lock`);
/** A lock older than this belongs to a run that died; a build takes seconds. */
const STALE_LOCK_MS = 180_000;
const POLL_MS = 200;
const DEFAULT_TIMEOUT_MS = 60_000;

/** The environment variable that carries the current run's token to workers. */
export const RUN_TOKEN_ENV = 'ASTRO_SHARED_BUILD_RUN';
const SHARED_PREFIX = `astro-shared-build-${ROOT_KEY}-`;
const RUN_TOKEN_PATTERN = /^[A-Za-z0-9-]+$/;
/** Marks a shared build that finished; a folder without it is never read. */
const COMPLETE_MARKER = 'complete';

/** Runs one Astro build into `outDir`; tests replace it with a stub. */
export type SiteBuilder = (
  outDir: string,
  timeoutMs: number,
  env: Readonly<Record<string, string>>
) => SpawnSyncReturns<string> | Promise<SpawnSyncReturns<string>>;

export interface SharedBuildOptions {
  /** Defaults to the token the globalSetup put in RUN_TOKEN_ENV. */
  readonly runToken?: string;
  readonly timeoutMs?: number;
  readonly builder?: SiteBuilder;
}

const spawnAstroBuild: SiteBuilder = (outDir, timeoutMs, env) =>
  spawnSync(process.execPath, [ASTRO_CLI, 'build', '--outDir', outDir], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: { ...process.env, ...env },
  });

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

async function withBuildLock<T>(work: () => Promise<T>): Promise<T> {
  await acquireLock();
  try {
    return await work();
  } finally {
    await rm(LOCK, { recursive: true, force: true });
  }
}

/**
 * Builds the site into `outDir`, one build at a time per checkout. `env` adds
 * variables to the build's environment only (for example the test-only
 * `CONTENT_DIR_OVERRIDE`), never to this process.
 */
export async function buildSiteInto(
  outDir: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  env: Readonly<Record<string, string>> = {},
  builder: SiteBuilder = spawnAstroBuild
): Promise<SpawnSyncReturns<string>> {
  return withBuildLock(async () => builder(outDir, timeoutMs, env));
}

/** The folder that holds one run's shared build (its `dist/` and marker). */
export function sharedBuildRoot(runToken: string): string {
  if (!RUN_TOKEN_PATTERN.test(runToken)) {
    throw new Error(`ASTRO_SHARED_BUILD_BAD_RUN: run token "${runToken}" is not [A-Za-z0-9-]+.`);
  }
  return join(tmpdir(), `${SHARED_PREFIX}${runToken}`);
}

function requireRunToken(runToken: string | undefined): string {
  if (runToken === undefined || runToken === '') {
    throw new Error(
      `ASTRO_SHARED_BUILD_NO_RUN: no run token in ${RUN_TOKEN_ENV}. Run through ` +
        'vitest.config.ts, whose globalSetup (tests/unit/support/shared-build-setup.ts) sets it.'
    );
  }
  return runToken;
}

function buildFailure(result: SpawnSyncReturns<string>): Error {
  return new Error(
    [
      'The shared Astro build failed.',
      result.error?.message ?? '',
      result.stdout,
      result.stderr,
    ].join('\n')
  );
}

/**
 * The default fixture site, built at most once per run, and the folder it is
 * in. Callers only read it: none may write into it, because every other test
 * file of the run reads the same files. Throws when the build fails; a failed
 * build is not kept, so the next caller builds again.
 */
export async function sharedDefaultBuild(options: SharedBuildOptions = {}): Promise<string> {
  const runToken = requireRunToken(options.runToken ?? process.env[RUN_TOKEN_ENV]);
  const root = sharedBuildRoot(runToken);
  const outDir = join(root, 'dist');
  const marker = join(root, COMPLETE_MARKER);
  const builder = options.builder ?? spawnAstroBuild;
  return withBuildLock(async () => {
    if (await stat(marker).catch(() => null)) return outDir;
    await rm(outDir, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    const result = await builder(outDir, options.timeoutMs ?? DEFAULT_TIMEOUT_MS, {});
    if (result.status !== 0 || result.error !== undefined) throw buildFailure(result);
    await writeFile(marker, `${new Date().toISOString()}\n`);
    return outDir;
  });
}

/** Deletes one run's shared build; the run's globalSetup teardown calls it. */
export async function removeSharedBuild(runToken: string): Promise<void> {
  await rm(sharedBuildRoot(runToken), { recursive: true, force: true });
}

/**
 * Deletes shared builds that a killed run left behind. Only folders older than
 * `maxAgeMs` go, so a run still going in this checkout keeps its own; a new
 * run never reads them either way, because its token is new.
 */
export async function removeStaleSharedBuilds(maxAgeMs: number): Promise<void> {
  const entries = await readdir(tmpdir(), { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SHARED_PREFIX)) continue;
    const path = join(tmpdir(), entry.name);
    const found = await stat(path).catch(() => null);
    if (found !== null && Date.now() - found.mtimeMs > maxAgeMs) {
      await rm(path, { recursive: true, force: true });
    }
  }
}
