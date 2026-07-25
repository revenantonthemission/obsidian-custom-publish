import { randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { dirname } from 'node:path';
import { PROFILE_PATHS } from './profile-paths.mjs';

const ENGINES = Object.freeze([
  Object.freeze({ name: 'chromium', browserType: chromium }),
  Object.freeze({ name: 'firefox', browserType: firefox }),
  Object.freeze({ name: 'webkit', browserType: webkit }),
]);

const buildId = requiredSha256(
  process.env.PROFILE_BUILD_ID,
  'PROFILE_BUILD_ID',
);
const attempt = requiredAttempt(process.env.PROFILE_STARTUP_ATTEMPT);
const invocationId = randomUUID();
let currentEngine = 'unknown';
let currentPhase = 'launch';
const createdContextIds = [];

try {
  const engines = [];
  for (const { name, browserType } of ENGINES) {
    currentEngine = name;
    currentPhase = 'launch';
    let browser;
    let context;
    try {
      browser = await browserType.launch({ headless: true });
      currentPhase = 'context';
      context = await browser.newContext();
      const contextId = randomUUID();
      createdContextIds.push(contextId);
      currentPhase = 'cleanup';
      await context.close();
      context = undefined;
      await browser.close();
      browser = undefined;
      engines.push({
        engine: name,
        browserClosed: true,
        contextClosed: true,
        contextId,
        contextCreated: true,
      });
    } finally {
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  }

  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    stage: 'startup.browser.launch',
    result: 'pass',
    attempt,
    buildId,
    invocationId,
    engines,
  })}\n`);
} catch (error) {
  if (currentPhase === 'cleanup') {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 1,
      stage: 'cleanup.browser',
      result: 'fail',
      attempt,
      buildId,
      invocationId,
      errorCode: 'BROWSER_PREFLIGHT_CLEANUP_FAILED',
      engine: currentEngine,
      error: serializeError(error),
    })}\n`);
    process.exitCode = 2;
  } else {
    const evidence = Object.freeze({
      schemaVersion: 1,
      stage: 'startup.browser.launch',
      result: 'fail',
      attempt,
      buildId,
      invocationId,
      errorCode: 'BROWSER_ENGINE_LAUNCH_FAILED',
      engine: currentEngine,
      createdContextIds,
      error: serializeError(error),
    });
    await writePrivateJson(
      PROFILE_PATHS.browserStartupFailurePath,
      evidence,
    );
    process.stderr.write(`${JSON.stringify(evidence)}\n`);
    process.exitCode = 1;
  }
}

async function writePrivateJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await requireAbsentOrRegularFile(path);
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    );
    await rename(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}

async function requireAbsentOrRegularFile(path) {
  try {
    const target = await lstat(path);
    if (target.isSymbolicLink() || !target.isFile()) {
      throw new TypeError(
        'The browser startup evidence target must be absent or a regular file.',
      );
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function requiredSha256(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256 digest.`);
  }
  return value;
}

function requiredAttempt(value) {
  if (!/^[12]$/u.test(value ?? '')) {
    throw new TypeError('PROFILE_STARTUP_ATTEMPT must be 1 or 2.');
  }
  return Number(value);
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: typeof error.code === 'string' ? error.code : null,
    };
  }
  return {
    name: typeof error,
    message: String(error),
    code: null,
  };
}
