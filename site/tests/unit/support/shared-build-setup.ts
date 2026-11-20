// Vitest globalSetup for vitest.config.ts (U1-NFR6.6, Build and Test
// loop-back 3). It gives each `vitest run` a fresh token for the shared
// default build in astro-build.ts and removes that build when the run ends.
// It never builds anything itself: the first test file that asks for the
// shared build builds it, so a focused run of a file that does not build
// stays as fast as before. Workers start after this runs and inherit the
// token through the environment.
import { randomUUID } from 'node:crypto';

import { RUN_TOKEN_ENV, removeSharedBuild, removeStaleSharedBuilds } from './astro-build.js';

/** Older than any run of the unit suite; a killed run's folder goes after this. */
const STALE_SHARED_BUILD_MS = 6 * 60 * 60 * 1000;

export default async function setup(): Promise<() => Promise<void>> {
  await removeStaleSharedBuilds(STALE_SHARED_BUILD_MS);
  const runToken = `${process.pid}-${randomUUID()}`;
  process.env[RUN_TOKEN_ENV] = runToken;
  return async () => {
    await removeSharedBuild(runToken);
    delete process.env[RUN_TOKEN_ENV];
  };
}
