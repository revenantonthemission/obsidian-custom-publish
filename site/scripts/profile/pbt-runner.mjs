import { randomBytes } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  statSync,
  writeSync,
} from 'node:fs';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import * as ts from 'typescript';

const SIGNED_INT32_MIN = -2_147_483_648;
const SIGNED_INT32_MAX = 2_147_483_647;
const COUNTEREXAMPLE_PATH = /^(?:0|[1-9]\d*)(?::(?:0|[1-9]\d*))*$/;
const PBT_FILE = /^tests\/pbt\/u1\/[a-z0-9-]+\.pbt\.test\.ts$/;
const siteRoot = fileURLToPath(new URL('../../', import.meta.url));

class PbtConfigurationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'PbtConfigurationError';
    this.field = field;
  }
}

function hasEnvironmentValue(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name);
}

function parsePositiveSafeInteger(name, fallback) {
  if (!hasEnvironmentValue(name)) {
    return fallback;
  }

  const raw = process.env[name];
  if (!/^\d+$/.test(raw ?? '')) {
    throw new PbtConfigurationError(name, 'must be a positive decimal integer');
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PbtConfigurationError(name, 'must be a positive safe integer');
  }

  return value;
}

function parseSignedInt32(name) {
  if (!hasEnvironmentValue(name)) {
    return undefined;
  }

  const raw = process.env[name];
  if (!/^-?\d+$/.test(raw ?? '')) {
    throw new PbtConfigurationError(name, 'must be a signed decimal integer');
  }

  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < SIGNED_INT32_MIN ||
    value > SIGNED_INT32_MAX
  ) {
    throw new PbtConfigurationError(name, 'must be within the signed 32-bit range');
  }

  return value;
}

function collectFastCheckPropertyNames(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );
  if (source.parseDiagnostics.length > 0) {
    throw new PbtConfigurationError(
      'PBT_FILE',
      'must be syntactically valid TypeScript before focused replay',
    );
  }

  const names = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isCallExpression(node.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.name.text === 'prop' &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      names.push(node.arguments[0].text);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return Object.freeze(names);
}

function parseFocus() {
  const hasFile = hasEnvironmentValue('PBT_FILE');
  const hasFocus = hasEnvironmentValue('PBT_FOCUS');
  if (hasFile !== hasFocus) {
    throw new PbtConfigurationError(
      hasFile ? 'PBT_FOCUS' : 'PBT_FILE',
      'PBT_FILE and PBT_FOCUS must be provided together',
    );
  }

  if (!hasFile) {
    return Object.freeze({ file: undefined, focus: undefined });
  }

  const file = process.env.PBT_FILE;
  if (
    typeof file !== 'string' ||
    !PBT_FILE.test(file) ||
    isAbsolute(file) ||
    posix.normalize(file) !== file
  ) {
    throw new PbtConfigurationError(
      'PBT_FILE',
      'must be an exact tests/pbt/u1/*.pbt.test.ts repository-relative path',
    );
  }

  const absoluteFile = resolve(siteRoot, file);
  const relativeFile = relative(siteRoot, absoluteFile);
  if (
    relativeFile.startsWith(`..${sep}`) ||
    relativeFile === '..' ||
    !existsSync(absoluteFile) ||
    !statSync(absoluteFile).isFile()
  ) {
    throw new PbtConfigurationError('PBT_FILE', 'must identify an existing PBT test file');
  }

  const focus = process.env.PBT_FOCUS;
  if (
    typeof focus !== 'string' ||
    focus.length === 0 ||
    focus.length > 500 ||
    focus.trim() !== focus ||
    /[\u0000-\u001f\u007f]/.test(focus)
  ) {
    throw new PbtConfigurationError(
      'PBT_FOCUS',
      'must be one exact non-empty full test name without control characters',
    );
  }

  const propertyNames = collectFastCheckPropertyNames(absoluteFile);
  const exactMatches = propertyNames.filter((name) => name === focus);
  if (exactMatches.length !== 1) {
    throw new PbtConfigurationError(
      'PBT_FOCUS',
      exactMatches.length === 0
        ? 'must exactly match one test.prop source name in PBT_FILE'
        : 'must identify a unique test.prop source name in PBT_FILE',
    );
  }

  return Object.freeze({ file, focus });
}

function parseReplayPath(explicitSeed, focus) {
  if (!hasEnvironmentValue('PBT_PATH')) {
    return undefined;
  }

  const path = process.env.PBT_PATH;
  if (explicitSeed === undefined) {
    throw new PbtConfigurationError(
      'PBT_PATH',
      'requires an explicitly supplied PBT_SEED',
    );
  }
  if (focus.file === undefined || focus.focus === undefined) {
    throw new PbtConfigurationError(
      'PBT_PATH',
      'requires exact PBT_FILE and PBT_FOCUS values',
    );
  }
  if (typeof path !== 'string' || !COUNTEREXAMPLE_PATH.test(path)) {
    throw new PbtConfigurationError(
      'PBT_PATH',
      'must be a fast-check counterexample path such as 0 or 0:1:2',
    );
  }

  return path;
}

function createRunConfig() {
  const ciDefault = process.env.CI ? 1_000 : 100;
  const numRuns = parsePositiveSafeInteger('PBT_RUNS', ciDefault);
  const explicitSeed = parseSignedInt32('PBT_SEED');
  const seed = explicitSeed ?? randomBytes(4).readInt32BE(0);
  const focus = parseFocus();
  const path = parseReplayPath(explicitSeed, focus);

  return Object.freeze({
    numRuns,
    seed,
    file: focus.file,
    focus: focus.focus,
    path,
  });
}

function localVitestEntrypoint() {
  const entrypoint = resolve(siteRoot, 'node_modules/vitest/vitest.mjs');
  if (!existsSync(entrypoint) || !statSync(entrypoint).isFile()) {
    throw new PbtConfigurationError(
      'vitest',
      'repository-local node_modules/vitest/vitest.mjs is required',
    );
  }

  return entrypoint;
}

function exactTestNamePattern(testName, seed) {
  const runtimeName = `${testName} (with seed=${seed})`;
  return `^${runtimeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

async function run() {
  const config = createRunConfig();
  const vitest = localVitestEntrypoint();
  const childEnvironment = Object.freeze({
    ...process.env,
    PBT_RUNS: String(config.numRuns),
    PBT_SEED: String(config.seed),
    ...(config.file === undefined ? {} : { PBT_FILE: config.file }),
    ...(config.focus === undefined ? {} : { PBT_FOCUS: config.focus }),
    ...(config.path === undefined ? {} : { PBT_PATH: config.path }),
  });
  const args = [vitest, 'run', '--config', 'vitest.pbt.config.ts'];
  if (config.file !== undefined && config.focus !== undefined) {
    args.push(
      config.file,
      '--testNamePattern',
      exactTestNamePattern(config.focus, config.seed),
    );
  }

  writeSync(
    process.stdout.fd,
    `[pbt-run-config] ${JSON.stringify({
      numRuns: config.numRuns,
      seed: config.seed,
      file: config.file ?? null,
      focus: config.focus ?? null,
      path: config.path ?? null,
    })}\n`,
  );

  const child = spawn(process.execPath, args, {
    cwd: siteRoot,
    env: childEnvironment,
    stdio: 'inherit',
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };
  const forwardSigint = () => forwardSignal('SIGINT');
  const forwardSigterm = () => forwardSignal('SIGTERM');
  process.once('SIGINT', forwardSigint);
  process.once('SIGTERM', forwardSigterm);

  const outcome = await new Promise((complete) => {
    child.once('error', (error) => complete({ error }));
    child.once('exit', (code, signal) => complete({ code, signal }));
  });

  process.removeListener('SIGINT', forwardSigint);
  process.removeListener('SIGTERM', forwardSigterm);

  if ('error' in outcome) {
    throw outcome.error;
  }
  if (outcome.signal !== null) {
    writeSync(
      process.stderr.fd,
      `[pbt-run-error] ${JSON.stringify({
        errorCode: 'PBT_RUN_INTERRUPTED',
        signal: outcome.signal,
      })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.exitCode = outcome.code ?? 1;
}

try {
  await run();
} catch (error) {
  const isConfigurationError = error instanceof PbtConfigurationError;
  writeSync(
    process.stderr.fd,
    `[pbt-run-error] ${JSON.stringify({
      errorCode: isConfigurationError ? 'PBT_CONFIG_INVALID' : 'PBT_RUNNER_FAILED',
      field: isConfigurationError ? error.field : null,
      message: error instanceof Error ? error.message : 'Unknown PBT runner failure',
    })}\n`,
  );
  process.exitCode = 1;
}
