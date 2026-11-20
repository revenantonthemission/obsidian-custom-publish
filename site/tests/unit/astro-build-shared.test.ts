// U1-NFR6.6 (Build and Test loop-back 3): the unit suite builds the default
// fixture site once per `vitest run` and every built-output test file reads
// that one build. These cases drive support/astro-build.ts with a counting
// stub builder, so they never run Astro themselves:
// - two default-build calls in one run share one folder and build once, also
//   when they race (the lock is a directory, so workers race the same way);
// - a different run token never reuses an earlier run's folder;
// - a failed build is not kept, and the next call builds again;
// - a call with an `env` (CONTENT_DIR_OVERRIDE) still gets its own build.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SpawnSyncReturns } from 'node:child_process';
import { afterEach, describe, expect, test } from 'vitest';

import {
  buildSiteInto,
  removeSharedBuild,
  sharedBuildRoot,
  sharedDefaultBuild,
  type SiteBuilder,
} from './support/astro-build.js';

interface BuildCall {
  readonly outDir: string;
  readonly env: Readonly<Record<string, string>>;
}

function spawnResult(status: number): SpawnSyncReturns<string> {
  return {
    pid: 0,
    output: [],
    stdout: status === 0 ? 'built' : '',
    stderr: status === 0 ? '' : 'stub build failed',
    status,
    signal: null,
  };
}

/** A builder that writes one page into `outDir` and records each call. */
function countingBuilder(status = 0): { readonly calls: BuildCall[]; readonly build: SiteBuilder } {
  const calls: BuildCall[] = [];
  const build: SiteBuilder = async (outDir, _timeoutMs, env) => {
    calls.push({ outDir, env });
    if (status === 0) {
      await mkdir(outDir, { recursive: true });
      writeFileSync(join(outDir, 'index.html'), `<p>${calls.length}</p>`);
    }
    return spawnResult(status);
  };
  return { calls, build };
}

const tokens: string[] = [];
const scratch: string[] = [];

function runToken(): string {
  const token = `test-${randomUUID()}`;
  tokens.push(token);
  return token;
}

afterEach(async () => {
  for (const token of tokens.splice(0)) await removeSharedBuild(token);
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('shared default build (support/astro-build.ts)', () => {
  test('two default-build calls in one run return the same folder and build once', async () => {
    const token = runToken();
    const { calls, build } = countingBuilder();

    const first = await sharedDefaultBuild({ runToken: token, builder: build });
    const second = await sharedDefaultBuild({ runToken: token, builder: build });

    expect(second).toBe(first);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.outDir).toBe(first);
    expect(calls[0]!.env).toEqual({});
    expect(first.startsWith(sharedBuildRoot(token))).toBe(true);
    expect(readFileSync(join(first, 'index.html'), 'utf8')).toBe('<p>1</p>');
  });

  test('calls that race in one run still build once', async () => {
    const token = runToken();
    const { calls, build } = countingBuilder();

    const folders = await Promise.all([
      sharedDefaultBuild({ runToken: token, builder: build }),
      sharedDefaultBuild({ runToken: token, builder: build }),
      sharedDefaultBuild({ runToken: token, builder: build }),
    ]);

    expect(new Set(folders).size).toBe(1);
    expect(calls).toHaveLength(1);
  });

  test("a new run never reuses an earlier run's folder", async () => {
    const { calls, build } = countingBuilder();

    const earlier = await sharedDefaultBuild({ runToken: runToken(), builder: build });
    const later = await sharedDefaultBuild({ runToken: runToken(), builder: build });

    expect(later).not.toBe(earlier);
    expect(calls).toHaveLength(2);
  });

  test('a failed build throws, is not kept, and the next call builds again', async () => {
    const token = runToken();
    const failing = countingBuilder(1);

    await expect(sharedDefaultBuild({ runToken: token, builder: failing.build })).rejects.toThrow(
      /stub build failed/
    );

    const passing = countingBuilder();
    const folder = await sharedDefaultBuild({ runToken: token, builder: passing.build });
    expect(failing.calls).toHaveLength(1);
    expect(passing.calls).toHaveLength(1);
    expect(existsSync(join(folder, 'index.html'))).toBe(true);
  });

  test('a call with an env still gets its own isolated build', async () => {
    const token = runToken();
    const { calls, build } = countingBuilder();
    const shared = await sharedDefaultBuild({ runToken: token, builder: build });
    const isolated = mkdtempSync(join(tmpdir(), 'astro-build-shared-env-'));
    scratch.push(isolated);
    const env = { CONTENT_DIR_OVERRIDE: '/tmp/empty-content' };

    const result = await buildSiteInto(isolated, 60_000, env, build);

    expect(result.status).toBe(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ outDir: isolated, env });
    expect(isolated).not.toBe(shared);
    expect(readFileSync(join(shared, 'index.html'), 'utf8')).toBe('<p>1</p>');
  });

  test('without a run token it refuses with a coded error instead of guessing', async () => {
    const { calls, build } = countingBuilder();

    await expect(sharedDefaultBuild({ runToken: '', builder: build })).rejects.toThrow(
      /ASTRO_SHARED_BUILD_NO_RUN/
    );
    expect(calls).toHaveLength(0);
  });

  test("removing a run's shared build deletes its folder", async () => {
    const token = runToken();
    const { build } = countingBuilder();
    await sharedDefaultBuild({ runToken: token, builder: build });
    expect(existsSync(sharedBuildRoot(token))).toBe(true);

    await removeSharedBuild(token);

    expect(existsSync(sharedBuildRoot(token))).toBe(false);
  });
});
