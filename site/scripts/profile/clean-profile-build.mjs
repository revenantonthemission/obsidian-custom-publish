import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  lstat,
  readFile,
  realpath,
  rm,
  stat,
  unlink,
} from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  assertOwnedProcessObservationSupport,
  assertOwnedProcessTreeSupport,
  beginOwnedProcessScope,
  freezeOwnedProcessTree,
  monitorOwnedDescendants,
  prepareOwnedSpawn,
} from './owned-process-registry.mjs';
import { PROFILE_PATHS } from './profile-paths.mjs';

const BUILD_RULE = 'LC-U1-03/VER-02';
const VERIFICATION_BUILD_ENV = 'PROFILE_VERIFICATION_BUILD';
const REQUIRED_ROUTES = Object.freeze(['/resume', '/portfolio']);
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_OUTPUT_LIMIT_BYTES = 256 * 1024;

export class CleanProfileBuildError extends Error {
  constructor(message, { code, stage, details = {}, cause }) {
    super(message, { cause });
    this.name = 'CleanProfileBuildError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = BUILD_RULE;
    this.details = deepFreeze(structuredClone(details));
  }
}

/**
 * Removes only the fixed generated dist root, invokes the lockfile-local Astro
 * CLI, and returns a build identity tied to the private provenance manifest.
 * Build failures are terminal and are never startup-retried.
 */
export async function cleanProfileBuild({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  outputLimitBytes = DEFAULT_OUTPUT_LIMIT_BYTES,
} = {}) {
  validatePositiveInteger(timeoutMs, 'timeoutMs');
  validatePositiveInteger(outputLimitBytes, 'outputLimitBytes');
  assertFixedBuildPaths(PROFILE_PATHS);

  const startedAtMs = Date.now();
  await removeGeneratedDirectory(
    PROFILE_PATHS.distRoot,
    PROFILE_PATHS.siteRoot,
  );
  await removePriorManifest(PROFILE_PATHS.buildManifestPath);

  const processEvidence = await runLocalAstroBuild({
    timeoutMs,
    outputLimitBytes,
  });
  const manifestEvidence = await readFreshBuildManifest({
    manifestPath: PROFILE_PATHS.buildManifestPath,
    distRoot: PROFILE_PATHS.distRoot,
    startedAtMs,
  });

  return deepFreeze({
    ...manifestEvidence.manifest.buildIdentity,
    kind: 'profile-clean-build',
    root: PROFILE_PATHS.distRoot,
    manifestPath: PROFILE_PATHS.buildManifestPath,
    manifestSha256: manifestEvidence.manifestSha256,
    manifestMtimeMs: manifestEvidence.manifestMtimeMs,
    process: processEvidence,
  });
}

async function runLocalAstroBuild({ timeoutMs, outputLimitBytes }) {
  assertOwnedProcessTreeSupport();
  await assertOwnedProcessObservationSupport();
  const output = createBoundedOutput(outputLimitBytes);
  const spawnGuard = prepareOwnedSpawn('profile-clean-build');
  const bootstrapToken = randomUUID();
  // Opened before the first spawn so the baseline excludes every process that
  // already existed, and so the token is inherited by the whole build subtree.
  const ownedScope = await beginOwnedProcessScope('profile-clean-build');
  let child;
  let ownership;
  let descendantMonitor;
  let bootstrapReady;
  try {
    child = spawn(
      process.execPath,
      [
        PROFILE_PATHS.ownedNodeBootstrapPath,
        PROFILE_PATHS.astroCliPath,
        'build',
      ],
      {
        cwd: PROFILE_PATHS.siteRoot,
        detached: process.platform !== 'win32',
        env: Object.freeze({
          ...process.env,
          ...ownedScope.environment,
          [VERIFICATION_BUILD_ENV]: '1',
          PROFILE_OWNED_BOOTSTRAP_TOKEN: bootstrapToken,
        }),
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      },
    );
    bootstrapReady = waitForOwnedBootstrap(
      child,
      bootstrapToken,
      2_000,
    );
    ownership = spawnGuard.adopt(child);
    descendantMonitor = monitorOwnedDescendants({
      rootPid: child.pid,
      label: 'profile-clean-build',
      isRootHandleCurrent: () =>
        child.exitCode === null &&
        child.signalCode === null,
    });
  } catch (cause) {
    spawnGuard.cancel();
    await bootstrapReady?.catch(() => undefined);
    throw new CleanProfileBuildError(
      'The local Astro build process could not be launched.',
      {
        code: 'PROFILE_BUILD_LAUNCH_FAILED',
        stage: 'build.clean',
        details: {
          executable: process.execPath,
          cli: relative(
            PROFILE_PATHS.siteRoot,
            PROFILE_PATHS.astroCliPath,
          ),
        },
        cause,
      },
    );
  }
  output.capture('stdout', child.stdout);
  output.capture('stderr', child.stderr);
  try {
    await bootstrapReady;
    await descendantMonitor.ready();
    await startOwnedBootstrap(child, bootstrapToken);
  } catch (cause) {
    const cleanup = await releaseBuildProcessTree(
      child,
      descendantMonitor,
      ownedScope,
    );
    if (cleanup.ownershipReleaseSafe) {
      ownership.release();
    }
    throw new CleanProfileBuildError(
      'The clean build root process identity could not be observed.',
      {
        code: 'PROFILE_BUILD_PROCESS_IDENTITY_INVALID',
        stage: 'build.cleanup',
        details: {
          pid: child.pid ?? null,
          cleanup,
          output: output.snapshot(),
        },
        cause,
      },
    );
  }

  const result = await waitForBuildProcess(child, timeoutMs);
  const cleanup = await releaseBuildProcessTree(
    child,
    descendantMonitor,
    ownedScope,
  );
  if (cleanup.ownershipReleaseSafe) {
    ownership.release();
  }
  if (
    !cleanup.pidReleased ||
    !cleanup.processTreeReleased
  ) {
    throw new CleanProfileBuildError(
      'The clean Astro build process tree remained alive after signal escalation.',
      {
        code: 'PROFILE_BUILD_CLEANUP_FAILED',
        stage: 'build.cleanup',
        details: {
          timeoutMs,
          pid: child.pid ?? null,
          result,
          cleanup,
          output: output.snapshot(),
        },
        cause: result.launchError ?? undefined,
      },
    );
  }
  if (result.timedOut) {
    throw new CleanProfileBuildError(
      'The clean Astro build exceeded its terminal deadline.',
      {
        code: 'PROFILE_BUILD_TIMEOUT',
        stage: 'build.clean',
        details: {
          timeoutMs,
          pid: child.pid ?? null,
          exitCode: result.code,
          signal: result.signal,
          cleanup,
          output: output.snapshot(),
        },
      },
    );
  }

  if (result.launchError !== null) {
    throw new CleanProfileBuildError(
      'The local Astro build process could not be launched.',
      {
        code: 'PROFILE_BUILD_LAUNCH_FAILED',
        stage: 'build.clean',
        details: {
          executable: process.execPath,
          cli: relative(
            PROFILE_PATHS.siteRoot,
            PROFILE_PATHS.astroCliPath,
          ),
          pid: child.pid ?? null,
          cleanup,
          output: output.snapshot(),
        },
        cause: result.launchError,
      },
    );
  }

  if (result.code !== 0 || result.signal !== null) {
    throw new CleanProfileBuildError(
      'The clean Astro production build failed.',
      {
        code: 'PROFILE_BUILD_FAILED',
        stage: 'build.clean',
        details: {
          exitCode: result.code,
          signal: result.signal,
          cleanup,
          output: output.snapshot(),
        },
      },
    );
  }

  return deepFreeze({
    pid: child.pid ?? null,
    exitCode: result.code,
    signal: result.signal,
    processExited: cleanup.pidReleased,
    processTreeReleased: cleanup.processTreeReleased,
    descendantProcessTree: cleanup.descendantProcessTree,
    command: Object.freeze([
      process.execPath,
      relative(PROFILE_PATHS.siteRoot, PROFILE_PATHS.astroCliPath),
      'build',
    ]),
    output: output.snapshot(),
  });
}

function waitForOwnedBootstrap(child, token, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const timeout = setTimeout(() => {
      settleReject(
        new Error('owned node bootstrap readiness timed out'),
      );
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      child.off('message', onMessage);
      child.off('error', onError);
      child.off('exit', onExit);
      child.off('disconnect', onDisconnect);
    }
    function settleResolve() {
      if (settled) return;
      settled = true;
      cleanup();
      resolvePromise();
    }
    function settleReject(error) {
      if (settled) return;
      settled = true;
      cleanup();
      rejectPromise(error);
    }
    function onMessage(message) {
      if (
        message?.type === 'profile-owned-bootstrap:ready' &&
        message?.token === token &&
        message?.pid === child.pid
      ) {
        settleResolve();
      }
    }
    function onError(error) {
      settleReject(error);
    }
    function onExit(code, signal) {
      settleReject(
        new Error(
          `owned node bootstrap exited before readiness (${code ?? signal ?? 'unknown'})`,
        ),
      );
    }
    function onDisconnect() {
      settleReject(
        new Error('owned node bootstrap disconnected before readiness'),
      );
    }

    child.on('message', onMessage);
    child.once('error', onError);
    child.once('exit', onExit);
    child.once('disconnect', onDisconnect);
  });
}

function startOwnedBootstrap(child, token) {
  return new Promise((resolvePromise, rejectPromise) => {
    if (!child.connected) {
      rejectPromise(
        new Error('owned node bootstrap IPC channel is not connected'),
      );
      return;
    }
    child.send(
      {
        type: 'profile-owned-bootstrap:start',
        token,
      },
      (error) => {
        if (error) rejectPromise(error);
        else resolvePromise();
      },
    );
  });
}

async function waitForBuildProcess(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return {
      code: child.exitCode,
      signal: child.signalCode,
      timedOut: false,
      cleanupDeadlineExceeded: false,
      launchError: null,
    };
  }
  return new Promise((resolvePromise) => {
    let settled = false;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      settleResolve({
        code: child.exitCode,
        signal: child.signalCode,
        timedOut,
        cleanupDeadlineExceeded: false,
        launchError: null,
      });
    }, timeoutMs);

    function cleanupListeners() {
      clearTimeout(timeout);
      child.off('error', onError);
      child.off('exit', onExit);
    }
    function settleResolve(value) {
      if (settled) return;
      settled = true;
      cleanupListeners();
      resolvePromise(value);
    }
    function onError(cause) {
      settleResolve({
        code: child.exitCode,
        signal: child.signalCode,
        timedOut,
        cleanupDeadlineExceeded: false,
        launchError: cause,
      });
    }
    function onExit(code, signal) {
      settleResolve({
        code,
        signal,
        timedOut,
        cleanupDeadlineExceeded: false,
        launchError: null,
      });
    }

    child.once('error', onError);
    child.once('exit', onExit);
  });
}

async function readFreshBuildManifest({
  manifestPath,
  distRoot,
  startedAtMs,
}) {
  const manifestStat = await requireRegularNonSymlinkFile(
    manifestPath,
    'PROFILE_BUILD_MANIFEST_MISSING',
  );
  if (manifestStat.mtimeMs + 1 < startedAtMs) {
    throw new CleanProfileBuildError(
      'The private build manifest predates the clean build invocation.',
      {
        code: 'PROFILE_BUILD_MANIFEST_STALE',
        stage: 'build.identity',
        details: { manifestPath, startedAtMs, mtimeMs: manifestStat.mtimeMs },
      },
    );
  }

  const bytes = await readFile(manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch (cause) {
    throw new CleanProfileBuildError(
      'The private build manifest is not valid JSON.',
      {
        code: 'PROFILE_BUILD_MANIFEST_INVALID',
        stage: 'build.identity',
        details: { manifestPath },
        cause,
      },
    );
  }
  validateManifestShape(manifest);

  const canonicalDistRoot = await requireRealDirectory(distRoot);
  if (canonicalDistRoot !== distRoot) {
    throw new CleanProfileBuildError(
      'The clean dist root did not resolve to the fixed generated path.',
      {
        code: 'PROFILE_BUILD_ROOT_INVALID',
        stage: 'build.identity',
        details: { expected: distRoot, actual: canonicalDistRoot },
      },
    );
  }

  for (const route of REQUIRED_ROUTES) {
    if (!manifest.buildIdentity.routes.includes(route)) {
      throw new CleanProfileBuildError(
        `The clean build manifest is missing ${route}.`,
        {
          code: 'PROFILE_BUILD_ROUTE_MISSING',
          stage: 'build.identity',
          details: { route },
        },
      );
    }
  }

  const outputPaths = new Set(
    manifest.outputFiles.map(({ path }) => path),
  );
  for (const path of ['resume/index.html', 'portfolio/index.html']) {
    if (!outputPaths.has(path)) {
      throw new CleanProfileBuildError(
        `The clean build output is missing ${path}.`,
        {
          code: 'PROFILE_BUILD_OUTPUT_MISSING',
          stage: 'build.identity',
          details: { path },
        },
      );
    }
  }
  if (
    outputPaths.has('.profile-vite-manifest.json') ||
    await exists(resolve(distRoot, '.profile-vite-manifest.json'))
  ) {
    throw new CleanProfileBuildError(
      'The temporary Vite manifest leaked into the production output.',
      {
        code: 'PROFILE_BUILD_PRIVATE_OUTPUT_LEAK',
        stage: 'build.identity',
        details: { path: '.profile-vite-manifest.json' },
      },
    );
  }

  const createdAt = Date.parse(manifest.buildIdentity.createdAt);
  if (!Number.isFinite(createdAt) || createdAt + 1 < startedAtMs) {
    throw new CleanProfileBuildError(
      'The build identity timestamp is stale or invalid.',
      {
        code: 'PROFILE_BUILD_IDENTITY_STALE',
        stage: 'build.identity',
        details: {
          createdAt: manifest.buildIdentity.createdAt,
          startedAtMs,
        },
      },
    );
  }

  return {
    manifest,
    manifestMtimeMs: manifestStat.mtimeMs,
    manifestSha256: sha256(bytes),
  };
}

function validateManifestShape(manifest) {
  if (
    !isPlainRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    !isPlainRecord(manifest.buildIdentity) ||
    !isSha256(manifest.buildIdentity.id) ||
    manifest.buildIdentity.distRoot !== 'dist' ||
    !Array.isArray(manifest.buildIdentity.routes) ||
    !Array.isArray(manifest.outputFiles) ||
    !isPlainRecord(manifest.viteManifest) ||
    !isPlainRecord(manifest.initialRollupGraphs) ||
    !isPlainRecord(manifest.initialRollupGraphs.client) ||
    !isPlainRecord(manifest.initialRollupGraphs.prerender) ||
    !isPlainRecord(manifest.rollupGraphs) ||
    !isPlainRecord(manifest.rollupGraphs.client) ||
    !isPlainRecord(manifest.rollupGraphs.prerender) ||
    !isPlainRecord(manifest.pageGraph)
  ) {
    throw new CleanProfileBuildError(
      'The private build manifest is incomplete or ambiguous.',
      {
        code: 'PROFILE_BUILD_MANIFEST_INVALID',
        stage: 'build.identity',
      },
    );
  }
}

async function removeGeneratedDirectory(path, allowedParent) {
  assertContainedChild(allowedParent, path, 'distRoot');
  const existing = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing === undefined) return;
  if (existing.isSymbolicLink() || !existing.isDirectory()) {
    throw new CleanProfileBuildError(
      'The fixed dist target is not a real generated directory.',
      {
        code: 'PROFILE_BUILD_ROOT_INVALID',
        stage: 'build.clean',
        details: { path },
      },
    );
  }
  await rm(path, { recursive: true });
}

async function removePriorManifest(path) {
  const existing = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing === undefined) return;
  if (existing.isSymbolicLink() || !existing.isFile()) {
    throw new CleanProfileBuildError(
      'The prior private build manifest target is unsafe.',
      {
        code: 'PROFILE_BUILD_MANIFEST_TARGET_INVALID',
        stage: 'build.clean',
        details: { path },
      },
    );
  }
  await unlink(path);
}

async function requireRegularNonSymlinkFile(path, missingCode) {
  let fileStat;
  try {
    fileStat = await lstat(path);
  } catch (cause) {
    throw new CleanProfileBuildError(
      'The clean build did not produce its private manifest.',
      {
        code: missingCode,
        stage: 'build.identity',
        details: { path },
        cause,
      },
    );
  }
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw new CleanProfileBuildError(
      'The private build manifest is not a regular file.',
      {
        code: 'PROFILE_BUILD_MANIFEST_TARGET_INVALID',
        stage: 'build.identity',
        details: { path },
      },
    );
  }
  return fileStat;
}

async function requireRealDirectory(path) {
  const directoryStat = await lstat(path);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new CleanProfileBuildError(
      'The generated output root is not a real directory.',
      {
        code: 'PROFILE_BUILD_ROOT_INVALID',
        stage: 'build.identity',
        details: { path },
      },
    );
  }
  return realpath(path);
}

function assertFixedBuildPaths(paths) {
  for (const [label, path] of Object.entries({
    siteRoot: paths.siteRoot,
    astroCliPath: paths.astroCliPath,
    distRoot: paths.distRoot,
    buildManifestPath: paths.buildManifestPath,
  })) {
    if (typeof path !== 'string' || !isAbsolute(path)) {
      throw new TypeError(`${label} must be an absolute fixed path`);
    }
  }
  assertContainedChild(paths.siteRoot, paths.distRoot, 'distRoot');
  assertContainedChild(
    paths.siteRoot,
    paths.buildManifestPath,
    'buildManifestPath',
  );
}

function assertContainedChild(root, target, label) {
  const fromRoot = relative(root, target);
  if (
    fromRoot === '' ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new TypeError(`${label} must be a fixed child of siteRoot`);
  }
}

function signalProcessTree(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Exit evidence remains authoritative.
    }
  }
}

async function releaseBuildProcessTree(child, suppliedMonitor, ownedScope) {
  const pid = child.pid ?? null;
  if (pid === null) {
    return deepFreeze({
      pid: null,
      pidReleased: true,
      processTreeReleased: true,
      ownershipReleaseSafe: true,
      descendantProcessTree: {
        rootPid: null,
        sampleCount: 0,
        observedProcessIds: [],
        observedProcessGroupIds: [],
        activeProcessGroupIds: [],
        activeRootProcessGroup: false,
        rootProcessIdentity: null,
        failures: [],
      },
      frozenProcessTree: {
        processIds: [],
        processGroupIds: [],
      },
    });
  }

  const descendantMonitor = suppliedMonitor ??
    monitorOwnedDescendants({
      rootPid: pid,
      label: 'profile-clean-build-release',
    });
  const childActive =
    child.exitCode === null && child.signalCode === null;
  if (childActive && isProcessGroupAlive(pid)) {
    signalProcessTree(child, 'SIGSTOP');
  }
  const descendantProcessTree = await descendantMonitor.stop();
  const rootProcessGroupIds = new Set(
    descendantProcessTree.activeProcessGroupIds,
  );
  if (childActive || descendantProcessTree.activeRootProcessGroup) {
    rootProcessGroupIds.add(pid);
  }
  const frozen = rootProcessGroupIds.size === 0
    ? null
    : await freezeOwnedProcessTree({
        rootProcessGroupIds: [...rootProcessGroupIds],
        label: 'profile-clean-build-tree',
      });
  const frozenProcessTree = frozen?.evidence ?? {
    processIds: [],
    processGroupIds: [],
  };
  const processIds = childActive ? [pid] : [];
  const processGroupIds = [...frozenProcessTree.processGroupIds];
  let pidReleased =
    !childActive ||
    processIds.every((processId) => !isProcessAlive(processId));
  let processGroupsReleased = processGroupIds.every(
    (processGroupId) => !isProcessGroupAlive(processGroupId),
  );

  if (!pidReleased || !processGroupsReleased) {
    signalProcessGroups(processGroupIds, 'SIGKILL');
    await waitForProcessRelease(processIds, processGroupIds, 1_000);
    pidReleased = processIds.every(
      (processId) => !isProcessAlive(processId),
    );
    processGroupsReleased = processGroupIds.every(
      (processGroupId) => !isProcessGroupAlive(processGroupId),
    );
  }

  // Ancestry can only prove what it can still reach. The token sweep closes the
  // double-detach gap before any ownership lease is released. Callers that
  // never opened a scope keep their previous behaviour.
  const ownershipResiduals =
    ownedScope === undefined ? null : await ownedScope.reapResiduals();
  const residualsCleared =
    ownershipResiduals === null || ownershipResiduals.verified;
  const ownershipReleaseSafe =
    pidReleased && processGroupsReleased && residualsCleared;
  const processTreeReleased =
    ownershipReleaseSafe &&
    descendantProcessTree.failures.length === 0;
  if (ownershipReleaseSafe) {
    frozen?.releaseVerified();
    descendantMonitor.releaseVerified();
  }
  return deepFreeze({
    pid,
    pidReleased,
    processTreeReleased,
    ownershipReleaseSafe,
    descendantProcessTree,
    frozenProcessTree,
    ownershipResiduals,
  });
}

async function waitForProcessRelease(
  processIds,
  processGroupIds,
  timeoutMs,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pidsReleased = processIds.every(
      (pid) => !isProcessAlive(pid),
    );
    const groupsReleased = processGroupIds.every(
      (pgid) => !isProcessGroupAlive(pgid),
    );
    if (pidsReleased && groupsReleased) return;
    await delay(Math.min(25, Math.max(1, deadline - Date.now())));
  }
}

function signalProcessGroups(processGroupIds, signal) {
  for (const processGroupId of new Set(processGroupIds)) {
    try {
      process.kill(-processGroupId, signal);
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

function isProcessGroupAlive(processGroupId) {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

function createBoundedOutput(limitBytes) {
  const streams = {
    stdout: createTailBuffer(limitBytes),
    stderr: createTailBuffer(limitBytes),
  };
  return Object.freeze({
    capture(name, stream) {
      stream?.on('data', (chunk) => streams[name].append(chunk));
    },
    snapshot() {
      return deepFreeze({
        stdout: streams.stdout.snapshot(),
        stderr: streams.stderr.snapshot(),
      });
    },
  });
}

function createTailBuffer(limitBytes) {
  let buffer = Buffer.alloc(0);
  let totalBytes = 0;
  return Object.freeze({
    append(chunk) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bytes.byteLength;
      buffer = Buffer.concat([buffer, bytes]);
      if (buffer.byteLength > limitBytes) {
        buffer = buffer.subarray(buffer.byteLength - limitBytes);
      }
    },
    snapshot() {
      return Object.freeze({
        text: buffer.toString('utf8'),
        capturedBytes: buffer.byteLength,
        totalBytes,
        truncatedBytes: Math.max(0, totalBytes - buffer.byteLength),
      });
    },
  });
}

function validatePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function deepFreeze(value, seen = new Set()) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function') ||
    seen.has(value)
  ) {
    return value;
  }
  seen.add(value);
  for (const child of Reflect.ownKeys(value)) {
    deepFreeze(value[child], seen);
  }
  return Object.freeze(value);
}

export const cleanProfileBuildTesting = Object.freeze({
  assertFixedBuildPaths,
  releaseBuildProcessTree,
  waitForBuildProcess,
  validateManifestShape,
  readFreshBuildManifest,
});
