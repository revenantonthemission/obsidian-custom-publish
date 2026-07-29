import * as fc from 'fast-check';

const SIGNED_INT32_MIN = -2_147_483_648;
const SIGNED_INT32_MAX = 2_147_483_647;
const COUNTEREXAMPLE_PATH = /^(?:0|[1-9]\d*)(?::(?:0|[1-9]\d*))*$/;

function requiredInteger(name: 'PBT_RUNS' | 'PBT_SEED'): number {
  const raw = process.env[name];
  if (raw === undefined || !/^-?\d+$/.test(raw)) {
    throw new Error(`${name} must be provided by pbt-runner.mjs as a decimal integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer`);
  }

  return value;
}

const numRuns = requiredInteger('PBT_RUNS');
if (numRuns <= 0) {
  throw new Error('PBT_RUNS must be a positive safe integer');
}

const seed = requiredInteger('PBT_SEED');
if (seed < SIGNED_INT32_MIN || seed > SIGNED_INT32_MAX) {
  throw new Error('PBT_SEED must be a signed 32-bit integer');
}

const replayPath = process.env.PBT_PATH;
if (replayPath !== undefined && !COUNTEREXAMPLE_PATH.test(replayPath)) {
  throw new Error('PBT_PATH must be a fast-check counterexample path');
}

const fastCheckParameters = Object.freeze({
  numRuns,
  seed,
  ...(replayPath === undefined ? {} : { path: replayPath }),
});

fc.configureGlobal(fastCheckParameters);

export const pbtRunConfig = Object.freeze({
  numRuns,
  seed,
  path: replayPath,
  file: process.env.PBT_FILE,
  focus: process.env.PBT_FOCUS,
});
