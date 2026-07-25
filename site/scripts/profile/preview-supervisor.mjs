import { lstat, open, realpath } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertOwnedProcessObservationSupport,
  assertOwnedProcessTreeSupport,
  freezeOwnedProcessTree,
  monitorOwnedDescendants,
  prepareOwnedSpawn,
} from './owned-process-registry.mjs';

const LOOPBACK_HOST = '127.0.0.1';
const CHILD_ARGUMENT = '--profile-static-preview-child';
const CHILD_START_MESSAGE = 'profile-preview:start';
const CHILD_READY_MESSAGE = 'profile-preview:ready';
const CHILD_ERROR_MESSAGE = 'profile-preview:error';
const CHILD_STOP_MESSAGE = 'profile-preview:stop';
const DEFAULT_STARTUP_TIMEOUT_MS = 5_000;
const DEFAULT_READINESS_TIMEOUT_MS = 10_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 750;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 1_500;
const DEFAULT_OUTPUT_LIMIT_BYTES = 64 * 1024;
const MAX_TIMEOUT_MS = 120_000;

const MIME_TYPES = Object.freeze({
  '.avif': 'image/avif',
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
});

export class PreviewSupervisorError extends Error {
  constructor(message, {
    code,
    stage,
    retryable = false,
    details = {},
    cause,
  }) {
    super(message, { cause });
    this.name = 'PreviewSupervisorError';
    this.code = code;
    this.stage = stage;
    this.retryable = retryable;
    this.details = deepFreeze(structuredClone(details));
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stage: this.stage,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

/**
 * Starts a new leaf child process that serves one immutable production output
 * root on a kernel-selected loopback port. The caller owns the returned lease
 * and must await lease.cleanup() in a finally block.
 */
export async function startStaticPreview({
  distRoot,
  buildIdentity,
  requiredRoutes,
  startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
  readinessTimeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  shutdownTimeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
  outputLimitBytes = DEFAULT_OUTPUT_LIMIT_BYTES,
} = {}) {
  assertOwnedProcessTreeSupport();
  await assertOwnedProcessObservationSupport();
  const canonicalDistRoot = await validateDistRoot(distRoot);
  const immutableBuildIdentity = cloneIdentity(buildIdentity);
  const normalizedRoutes = normalizeRequiredRoutes(requiredRoutes);
  const timeouts = Object.freeze({
    startup: validateDuration(startupTimeoutMs, 'startupTimeoutMs'),
    readiness: validateDuration(readinessTimeoutMs, 'readinessTimeoutMs'),
    request: validateDuration(requestTimeoutMs, 'requestTimeoutMs'),
    shutdown: validateDuration(shutdownTimeoutMs, 'shutdownTimeoutMs'),
  });
  const outputLimit = validatePositiveInteger(outputLimitBytes, 'outputLimitBytes');
  const instanceId = randomUUID();
  const startedAt = new Date().toISOString();
  const output = createBoundedOutput(outputLimit);

  const spawnGuard = prepareOwnedSpawn('profile-static-preview');
  let child;
  let ownership;
  let descendantMonitor;
  try {
    child = fork(fileURLToPath(import.meta.url), [CHILD_ARGUMENT], {
      cwd: canonicalDistRoot,
      detached: process.platform !== 'win32',
      env: {},
      execArgv: [],
      execPath: process.execPath,
      serialization: 'json',
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    ownership = spawnGuard.adopt(child);
    descendantMonitor = monitorOwnedDescendants({
      rootPid: child.pid,
      label: 'profile-static-preview',
      isRootHandleCurrent: () =>
        child.exitCode === null &&
        child.signalCode === null,
    });
  } catch (cause) {
    spawnGuard.cancel();
    throw startupError(
      'PREVIEW_CHILD_SPAWN_FAILED',
      'The static preview child process could not be spawned.',
      { distRoot: canonicalDistRoot, instanceId },
      cause,
    );
  }

  output.capture('stdout', child.stdout);
  output.capture('stderr', child.stderr);

  const owner = createChildOwner({
    child,
    instanceId,
    output,
    ownership,
    descendantMonitor,
    shutdownTimeoutMs: timeouts.shutdown,
  });

  try {
    await descendantMonitor.ready();
    child.send({
      type: CHILD_START_MESSAGE,
      distRoot: canonicalDistRoot,
      instanceId,
    });

    const ready = await owner.waitUntilListening(timeouts.startup);
    const baseURL = `http://${LOOPBACK_HOST}:${ready.port}`;
    const readyRoutes = await probeRequiredRoutes({
      baseURL,
      routes: normalizedRoutes,
      owner,
      readinessTimeoutMs: timeouts.readiness,
      requestTimeoutMs: timeouts.request,
    });

    owner.assertRunning('The preview exited after readiness checks.');

    const processIdentity = deepFreeze({
      instanceId,
      pid: child.pid,
      processGroupId: process.platform === 'win32' ? null : child.pid,
      host: LOOPBACK_HOST,
      port: ready.port,
      startedAt,
    });

    return Object.freeze({
      kind: 'profile-static-preview',
      baseURL,
      processIdentity,
      buildIdentity: immutableBuildIdentity,
      routes: readyRoutes,
      cleanup: owner.cleanup,
      diagnostics: owner.diagnostics,
      assertActive: owner.assertRunning,
    });
  } catch (error) {
    let cleanup;
    try {
      cleanup = await owner.cleanup();
    } catch (cleanupError) {
      throw new PreviewSupervisorError(
        'The preview failed to start and its isolated process could not be fully cleaned up.',
        {
          code: 'PREVIEW_CLEANUP_FAILED',
          stage: 'cleanup.preview',
          details: {
            instanceId,
            originalError: serializeError(error),
            cleanupError: serializeError(cleanupError),
          },
          cause: cleanupError,
        },
      );
    }
    throw normalizeStartupFailure(error, {
      instanceId,
      distRoot: canonicalDistRoot,
      cleanup,
    });
  }
}

function createChildOwner({
  child,
  instanceId,
  output,
  ownership,
  descendantMonitor,
  shutdownTimeoutMs,
}) {
  let port = null;
  let exitSnapshot = null;
  let processErrorSnapshot = null;
  let cleanupPromise = null;

  child.once('exit', (code, signal) => {
    exitSnapshot = deepFreeze({
      code,
      signal,
      at: new Date().toISOString(),
    });
  });
  child.on('error', (error) => {
    processErrorSnapshot = deepFreeze({
      ...serializeError(error),
      at: new Date().toISOString(),
    });
  });

  function diagnostics() {
    return deepFreeze({
      instanceId,
      pid: child.pid ?? null,
      port,
      running: exitSnapshot === null,
      exit: exitSnapshot,
      processError: processErrorSnapshot,
      output: output.snapshot(),
    });
  }

  function assertRunning(message = 'The preview process is not running.') {
    if (exitSnapshot !== null || child.exitCode !== null || child.signalCode !== null) {
      throw readinessError(
        'PREVIEW_CHILD_EXITED',
        message,
        {
          instanceId,
          pid: child.pid ?? null,
          port,
          exit: exitSnapshot,
          output: output.snapshot(),
        },
      );
    }
  }

  async function waitUntilListening(timeoutMs) {
    if (
      exitSnapshot !== null ||
      child.exitCode !== null ||
      child.signalCode !== null
    ) {
      throw startupError(
        'PREVIEW_CHILD_EXITED_DURING_LAUNCH',
        'The static preview child exited before the readiness listener was armed.',
        {
          instanceId,
          pid: child.pid ?? null,
          exit: exitSnapshot,
          output: output.snapshot(),
        },
      );
    }
    return new Promise((resolvePromise, rejectPromise) => {
      let settled = false;
      const timeout = setTimeout(() => {
        settleReject(startupError(
          'PREVIEW_CHILD_START_TIMEOUT',
          'The static preview child did not bind its loopback socket before the startup deadline.',
          {
            instanceId,
            pid: child.pid ?? null,
            timeoutMs,
            output: output.snapshot(),
          },
        ));
      }, timeoutMs);

      function removeListeners() {
        clearTimeout(timeout);
        child.off('message', onMessage);
        child.off('error', onError);
        child.off('exit', onExit);
        child.off('disconnect', onDisconnect);
      }

      function settleResolve(value) {
        if (settled) return;
        settled = true;
        removeListeners();
        resolvePromise(value);
      }

      function settleReject(error) {
        if (settled) return;
        settled = true;
        removeListeners();
        rejectPromise(error);
      }

      function onMessage(message) {
        if (
          !message ||
          message.instanceId !== instanceId ||
          typeof message.type !== 'string'
        ) {
          return;
        }

        if (message.type === CHILD_ERROR_MESSAGE) {
          settleReject(startupError(
            'PREVIEW_CHILD_LAUNCH_FAILED',
            'The static preview child rejected its startup configuration.',
            {
              instanceId,
              pid: child.pid ?? null,
              childError: message.error ?? null,
              output: output.snapshot(),
            },
          ));
          return;
        }

        if (message.type !== CHILD_READY_MESSAGE) return;

        if (
          message.pid !== child.pid ||
          message.host !== LOOPBACK_HOST ||
          !Number.isSafeInteger(message.port) ||
          message.port < 1 ||
          message.port > 65_535
        ) {
          settleReject(startupError(
            'PREVIEW_CHILD_IDENTITY_INVALID',
            'The static preview child returned an invalid process or loopback identity.',
            {
              instanceId,
              expectedPid: child.pid ?? null,
              readyMessage: message,
            },
          ));
          return;
        }

        port = message.port;
        settleResolve(Object.freeze({
          pid: message.pid,
          host: message.host,
          port: message.port,
        }));
      }

      function onError(error) {
        settleReject(startupError(
          'PREVIEW_CHILD_SPAWN_FAILED',
          'The static preview child emitted a process launch error.',
          {
            instanceId,
            pid: child.pid ?? null,
            output: output.snapshot(),
          },
          error,
        ));
      }

      function onExit(code, signal) {
        settleReject(startupError(
          'PREVIEW_CHILD_EXITED_DURING_LAUNCH',
          'The static preview child exited before binding its loopback socket.',
          {
            instanceId,
            pid: child.pid ?? null,
            code,
            signal,
            output: output.snapshot(),
          },
        ));
      }

      function onDisconnect() {
        settleReject(startupError(
          'PREVIEW_CHILD_IPC_DISCONNECTED',
          'The static preview child disconnected before reporting its loopback socket.',
          {
            instanceId,
            pid: child.pid ?? null,
            output: output.snapshot(),
          },
        ));
      }

      child.on('message', onMessage);
      child.once('error', onError);
      child.once('exit', onExit);
      child.once('disconnect', onDisconnect);
    });
  }

  function cleanup() {
    cleanupPromise ??= performCleanup();
    return cleanupPromise;
  }

  async function performCleanup() {
    const cleanupStartedAt = new Date().toISOString();

    if (exitSnapshot === null && child.connected) {
      try {
        child.send({ type: CHILD_STOP_MESSAGE, instanceId });
      } catch {
        // The signal escalation below is the authoritative cleanup path.
      }
    }

    const pid = child.pid ?? null;
    let exited = await waitForChildExit(
      child,
      Math.min(500, shutdownTimeoutMs),
    );
    const childActive =
      child.exitCode === null && child.signalCode === null;
    if (childActive && pid !== null && isProcessGroupAlive(pid)) {
      signalOwnedProcess(child, 'SIGSTOP');
    }
    const descendantProcessTree = await descendantMonitor.stop();
    const rootProcessGroupIds = new Set(
      descendantProcessTree.activeProcessGroupIds,
    );
    if (
      pid !== null &&
      (childActive || descendantProcessTree.activeRootProcessGroup)
    ) {
      rootProcessGroupIds.add(pid);
    }
    const frozen = rootProcessGroupIds.size === 0
      ? null
      : await freezeOwnedProcessTree({
          rootProcessGroupIds: [...rootProcessGroupIds],
          label: 'profile-static-preview-tree',
        });
    const frozenProcessTree = frozen?.evidence ?? {
      processIds: [],
      processGroupIds: [],
    };
    const processGroupIds = [...frozenProcessTree.processGroupIds];
    let processGroupsReleased = processGroupIds.every(
      (processGroupId) => !isProcessGroupAlive(processGroupId),
    );
    if (!exited || !processGroupsReleased) {
      signalProcessGroups(processGroupIds, 'SIGKILL');
      await Promise.all([
        waitForChildExit(child, shutdownTimeoutMs),
        waitForProcessGroupsRelease(
          processGroupIds,
          shutdownTimeoutMs,
        ),
      ]);
      exited = child.exitCode !== null || child.signalCode !== null;
      processGroupsReleased = processGroupIds.every(
        (processGroupId) => !isProcessGroupAlive(processGroupId),
      );
    }

    const pidReleased =
      !childActive || pid === null || !isProcessAlive(pid);
    const ownershipReleaseSafe =
      pidReleased && processGroupsReleased;
    const processTreeReleased =
      ownershipReleaseSafe &&
      descendantProcessTree.failures.length === 0;
    const portReleased = port === null
      ? null
      : await canBindLoopbackPort(port);
    if (ownershipReleaseSafe) {
      frozen?.releaseVerified();
      descendantMonitor.releaseVerified();
      ownership.release();
    }

    if (!exited || !pidReleased || !processTreeReleased || portReleased === false) {
      throw new PreviewSupervisorError(
        'The static preview process, process group, or loopback port remained owned after cleanup.',
        {
          code: 'PREVIEW_CLEANUP_FAILED',
          stage: 'cleanup.preview',
          details: {
            instanceId,
            pid: child.pid ?? null,
            port,
            exited,
            pidReleased,
            processTreeReleased,
            portReleased,
            output: output.snapshot(),
          },
        },
      );
    }

    return deepFreeze({
      instanceId,
      pid: child.pid ?? null,
      port,
      cleanupStartedAt,
      cleanupCompletedAt: new Date().toISOString(),
      processExited: exited,
      processTreeReleased,
      descendantProcessTree,
      frozenProcessTree,
      portReleased,
      output: output.snapshot(),
    });
  }

  return Object.freeze({
    waitUntilListening,
    assertRunning,
    cleanup,
    diagnostics,
  });
}

async function waitForProcessGroupsRelease(processGroupIds, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      processGroupIds.every(
        (processGroupId) => !isProcessGroupAlive(processGroupId),
      )
    ) {
      return true;
    }
    await delay(Math.min(25, Math.max(1, deadline - Date.now())));
  }
  return processGroupIds.every(
    (processGroupId) => !isProcessGroupAlive(processGroupId),
  );
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

async function probeRequiredRoutes({
  baseURL,
  routes,
  owner,
  readinessTimeoutMs,
  requestTimeoutMs,
}) {
  const deadline = Date.now() + readinessTimeoutMs;
  const observations = [];

  for (const route of routes) {
    let lastConnectionError = null;
    let routeReady = false;

    while (Date.now() < deadline) {
      owner.assertRunning(`The preview exited while probing ${route.path}.`);
      const remainingMs = deadline - Date.now();
      const timeoutMs = Math.max(1, Math.min(requestTimeoutMs, remainingMs));

      try {
        const response = await fetch(`${baseURL}${route.path}`, {
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.status !== 200) {
          await response.body?.cancel();
          throw staticResponseError(
            'PREVIEW_STATIC_STATUS_INVALID',
            `The ready static preview returned HTTP ${response.status} for ${route.path}.`,
            {
              route: route.path,
              expectedStatus: 200,
              actualStatus: response.status,
            },
          );
        }

        const contentType = normalizeMime(response.headers.get('content-type'));
        if (contentType !== route.expectedMime) {
          await response.body?.cancel();
          throw staticResponseError(
            'PREVIEW_STATIC_MIME_INVALID',
            `The ready static preview returned ${contentType || 'no MIME type'} for ${route.path}.`,
            {
              route: route.path,
              expectedMime: route.expectedMime,
              actualMime: contentType || null,
            },
          );
        }

        const body = await readFirstBodyChunk(response);
        if (body.bytes === 0) {
          throw staticResponseError(
            'PREVIEW_STATIC_BODY_EMPTY',
            `The ready static preview returned an empty body for ${route.path}.`,
            {
              route: route.path,
              expectedMime: route.expectedMime,
              actualMime: contentType,
            },
          );
        }

        observations.push(deepFreeze({
          path: route.path,
          expectedMime: route.expectedMime,
          status: response.status,
          contentType,
          observedBodyBytes: body.bytes,
          declaredContentLength: parseContentLength(
            response.headers.get('content-length'),
          ),
        }));
        routeReady = true;
        lastConnectionError = null;
        break;
      } catch (error) {
        if (error instanceof PreviewSupervisorError) throw error;
        lastConnectionError = error;
        if (Date.now() < deadline) {
          await delay(Math.min(50, deadline - Date.now()));
        }
      }
    }

    if (!routeReady) {
      throw readinessError(
        'PREVIEW_READINESS_TIMEOUT',
        `The loopback preview did not become reachable for ${route.path} before the readiness deadline.`,
        {
          route: route.path,
          baseURL,
          readinessTimeoutMs,
          cause: lastConnectionError === null
            ? null
            : serializeError(lastConnectionError),
          diagnostics: owner.diagnostics(),
        },
        lastConnectionError ?? undefined,
      );
    }
  }

  return deepFreeze(observations);
}

async function readFirstBodyChunk(response) {
  if (response.body === null) return Object.freeze({ bytes: 0 });
  const reader = response.body.getReader();
  try {
    const { value, done } = await reader.read();
    if (done || !value || value.byteLength === 0) {
      return Object.freeze({ bytes: 0 });
    }
    return Object.freeze({ bytes: value.byteLength });
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function normalizeRequiredRoutes(requiredRoutes) {
  if (!Array.isArray(requiredRoutes) || requiredRoutes.length === 0) {
    throw new TypeError('requiredRoutes must be a non-empty array');
  }

  const seen = new Set();
  const routes = requiredRoutes.map((entry, index) => {
    const route = typeof entry === 'string'
      ? { path: entry, expectedMime: inferExpectedMime(entry) }
      : entry;

    if (!route || typeof route !== 'object' || Array.isArray(route)) {
      throw new TypeError(`requiredRoutes[${index}] must be a route string or object`);
    }

    const path = validateExactRoute(route.path, `requiredRoutes[${index}].path`);
    const expectedMime = normalizeMime(route.expectedMime);
    if (!expectedMime || expectedMime.includes('*')) {
      throw new TypeError(
        `requiredRoutes[${index}].expectedMime must be one exact MIME type`,
      );
    }
    if (seen.has(path)) {
      throw new TypeError(`requiredRoutes contains the duplicate exact path ${path}`);
    }
    seen.add(path);
    return Object.freeze({ path, expectedMime });
  });

  return Object.freeze(routes);
}

function validateExactRoute(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('?') ||
    value.includes('#') ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    throw new TypeError(`${label} must be one exact absolute-path route`);
  }

  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new TypeError(`${label} contains invalid percent encoding`);
  }

  if (
    decoded.includes('?') ||
    decoded.includes('#') ||
    decoded.includes('\\') ||
    hasUnsafePathSegments(decoded)
  ) {
    throw new TypeError(`${label} must be a normalized route without traversal`);
  }

  return value;
}

function inferExpectedMime(route) {
  const extension = extname(route).toLowerCase();
  return MIME_TYPES[extension] ?? 'text/html';
}

async function validateDistRoot(distRoot) {
  if (typeof distRoot !== 'string' || !isAbsolute(distRoot)) {
    throw new TypeError('distRoot must be an absolute path');
  }

  const resolvedRoot = resolve(distRoot);
  let rootStat;
  try {
    rootStat = await lstat(resolvedRoot);
  } catch (cause) {
    throw new TypeError(`distRoot is not readable: ${cause.message}`);
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new TypeError('distRoot must be a real directory, not a symbolic link');
  }

  return realpath(resolvedRoot);
}

function cloneIdentity(buildIdentity) {
  if (
    buildIdentity === null ||
    (typeof buildIdentity !== 'object' && typeof buildIdentity !== 'string')
  ) {
    throw new TypeError('buildIdentity must be a string or structured object');
  }
  return deepFreeze(structuredClone(buildIdentity));
}

function validateDuration(value, label) {
  const validated = validatePositiveInteger(value, label);
  if (validated > MAX_TIMEOUT_MS) {
    throw new RangeError(`${label} must not exceed ${MAX_TIMEOUT_MS}`);
  }
  return validated;
}

function validatePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function startupError(code, message, details, cause) {
  return new PreviewSupervisorError(message, {
    code,
    stage: 'startup.preview.launch',
    retryable: true,
    details,
    cause,
  });
}

function readinessError(code, message, details, cause) {
  return new PreviewSupervisorError(message, {
    code,
    stage: 'startup.preview.readiness',
    retryable: true,
    details,
    cause,
  });
}

function staticResponseError(code, message, details) {
  return new PreviewSupervisorError(message, {
    code,
    stage: 'semantic.static.response',
    details,
  });
}

function normalizeStartupFailure(error, context) {
  if (error instanceof PreviewSupervisorError) {
    return new PreviewSupervisorError(error.message, {
      code: error.code,
      stage: error.stage,
      retryable: error.retryable,
      details: {
        ...error.details,
        ...context,
      },
      cause: error,
    });
  }
  return startupError(
    'PREVIEW_START_FAILED',
    'The isolated static preview failed during startup.',
    {
      ...context,
      error: serializeError(error),
    },
    error,
  );
}

function serializeError(error) {
  if (error instanceof PreviewSupervisorError) return error.toJSON();
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: typeof error.code === 'string' ? error.code : null,
    };
  }
  return { name: typeof error, message: String(error), code: null };
}

function normalizeMime(value) {
  if (typeof value !== 'string') return '';
  return value.split(';', 1)[0].trim().toLowerCase();
}

function parseContentLength(value) {
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
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
      const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += next.byteLength;
      buffer = Buffer.concat([buffer, next]);
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

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }

  return new Promise((resolvePromise) => {
    let settled = false;
    const timeout = setTimeout(() => settle(false), timeoutMs);

    function settle(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.off('exit', onExit);
      resolvePromise(value);
    }

    function onExit() {
      settle(true);
    }

    child.once('exit', onExit);
  });
}

function signalOwnedProcess(child, signal) {
  if (!child.pid) return;
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        try {
          child.kill(signal);
        } catch {
          // Verification after the signal is authoritative.
        }
      }
      return;
    }
  }

  try {
    child.kill(signal);
  } catch {
    // Verification after the signal is authoritative.
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

function canBindLoopbackPort(port) {
  return new Promise((resolvePromise) => {
    const server = createNetServer();
    server.unref();
    server.once('error', () => resolvePromise(false));
    server.listen({ host: LOOPBACK_HOST, port, exclusive: true }, () => {
      server.close((error) => resolvePromise(!error));
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
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

async function runStaticPreviewChild() {
  let server = null;
  let instanceId = null;
  let shuttingDown = false;
  let startupTimer;

  async function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    clearTimeout(startupTimer);

    if (server) {
      server.closeIdleConnections?.();
      const closed = new Promise((resolvePromise) => {
        server.close(() => resolvePromise());
      });
      const forceTimer = setTimeout(() => server.closeAllConnections?.(), 250);
      forceTimer.unref();
      await closed;
      clearTimeout(forceTimer);
    }

    if (process.connected) process.disconnect();
    process.exit(exitCode);
  }

  function send(message) {
    if (!process.connected) return;
    process.send(message, () => undefined);
  }

  async function onStart(message) {
    if (
      server !== null ||
      !message ||
      message.type !== CHILD_START_MESSAGE ||
      typeof message.instanceId !== 'string'
    ) {
      return;
    }

    instanceId = message.instanceId;
    clearTimeout(startupTimer);

    try {
      const distRoot = await validateDistRoot(message.distRoot);
      server = createHttpServer((request, response) => {
        void serveStaticRequest({
          request,
          response,
          distRoot,
          expectedHost: `${LOOPBACK_HOST}:${server.address().port}`,
        });
      });
      server.keepAliveTimeout = 2_000;
      server.headersTimeout = 3_000;
      server.requestTimeout = 5_000;
      server.on('clientError', (_error, socket) => {
        if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      });
      server.on('error', (error) => {
        send({
          type: CHILD_ERROR_MESSAGE,
          instanceId,
          error: serializeError(error),
        });
        void shutdown(1);
      });

      await new Promise((resolvePromise, rejectPromise) => {
        server.once('error', rejectPromise);
        server.listen(
          { host: LOOPBACK_HOST, port: 0, exclusive: true },
          resolvePromise,
        );
      });

      const address = server.address();
      if (
        !address ||
        typeof address === 'string' ||
        address.address !== LOOPBACK_HOST ||
        !Number.isSafeInteger(address.port)
      ) {
        throw new Error('Preview did not bind the required IPv4 loopback interface.');
      }

      process.stdout.write(
        `[profile-preview] listening ${LOOPBACK_HOST}:${address.port} ${instanceId}\n`,
      );
      send({
        type: CHILD_READY_MESSAGE,
        instanceId,
        pid: process.pid,
        host: LOOPBACK_HOST,
        port: address.port,
      });
    } catch (error) {
      process.stderr.write(`[profile-preview] launch failed: ${error.message}\n`);
      send({
        type: CHILD_ERROR_MESSAGE,
        instanceId,
        error: serializeError(error),
      });
      await shutdown(1);
    }
  }

  process.on('message', (message) => {
    if (
      message?.type === CHILD_STOP_MESSAGE &&
      message.instanceId === instanceId
    ) {
      void shutdown(0);
      return;
    }
    void onStart(message);
  });
  process.once('disconnect', () => void shutdown(0));
  process.once('SIGINT', () => void shutdown(130));
  process.once('SIGTERM', () => void shutdown(143));

  startupTimer = setTimeout(() => {
    process.stderr.write('[profile-preview] no startup configuration received\n');
    void shutdown(1);
  }, DEFAULT_STARTUP_TIMEOUT_MS);
  startupTimer.unref();
}

async function serveStaticRequest({
  request,
  response,
  distRoot,
  expectedHost,
}) {
  try {
    if (request.headers.host !== expectedHost) {
      sendText(response, 400, 'Invalid Host header.\n');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      sendText(response, 405, 'Method not allowed.\n');
      return;
    }

    const resolvedFile = await resolveStaticFile(distRoot, request.url);
    if (resolvedFile === null) {
      sendText(response, 404, 'Static file not found.\n');
      return;
    }

    const fileHandle = await open(resolvedFile.path, 'r');
    let handleOwnedByStream = false;
    try {
      const fileStat = await fileHandle.stat();
      if (!fileStat.isFile()) {
        sendText(response, 404, 'Static file not found.\n');
        return;
      }

      const contentType = MIME_TYPES[extname(resolvedFile.path).toLowerCase()]
        ?? 'application/octet-stream';
      const range = parseByteRange(request.headers.range, fileStat.size);
      if (range === false) {
        response.statusCode = 416;
        response.setHeader('Content-Range', `bytes */${fileStat.size}`);
        sendCommonHeaders(response, 'text/plain', 0);
        response.end();
        return;
      }

      const status = range ? 206 : 200;
      const start = range?.start ?? 0;
      const end = range?.end ?? Math.max(0, fileStat.size - 1);
      const contentLength = fileStat.size === 0 ? 0 : end - start + 1;
      response.statusCode = status;
      sendCommonHeaders(response, contentType, contentLength);
      response.setHeader('Accept-Ranges', 'bytes');
      if (range) {
        response.setHeader(
          'Content-Range',
          `bytes ${start}-${end}/${fileStat.size}`,
        );
      }

      if (request.method === 'HEAD' || fileStat.size === 0) {
        response.end();
        return;
      }

      handleOwnedByStream = true;
      const stream = fileHandle.createReadStream({
        autoClose: true,
        start,
        end,
      });
      stream.once('error', (error) => response.destroy(error));
      stream.pipe(response);
    } finally {
      if (!handleOwnedByStream) await fileHandle.close();
    }
  } catch (error) {
    if (!response.headersSent) {
      sendText(response, 400, 'Invalid static request.\n');
    } else {
      response.destroy(error);
    }
  }
}

async function resolveStaticFile(distRoot, rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('/')) return null;
  const rawPath = rawUrl.split('?', 1)[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw new Error('Invalid percent encoding.');
  }
  if (
    decodedPath.includes('\0') ||
    decodedPath.includes('\\') ||
    decodedPath.includes('?') ||
    decodedPath.includes('#') ||
    decodedPath.startsWith('//') ||
    hasUnsafePathSegments(decodedPath)
  ) {
    throw new Error('Unsafe static path.');
  }

  const segments = decodedPath.split('/').filter(Boolean);
  const candidates = [];
  if (segments.length === 0 || decodedPath.endsWith('/')) {
    candidates.push([...segments, 'index.html']);
  } else if (extname(segments.at(-1)) === '') {
    candidates.push([...segments, 'index.html'], [
      ...segments.slice(0, -1),
      `${segments.at(-1)}.html`,
    ]);
  } else {
    candidates.push(segments);
  }

  for (const candidate of candidates) {
    const target = resolve(distRoot, ...candidate);
    if (!isWithinRoot(distRoot, target)) continue;
    if (!await isRegularNonSymlinkPath(distRoot, candidate)) continue;
    const canonicalTarget = await realpath(target);
    if (!isWithinRoot(distRoot, canonicalTarget)) continue;
    return Object.freeze({ path: canonicalTarget });
  }
  return null;
}

async function isRegularNonSymlinkPath(root, segments) {
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = resolve(current, segments[index]);
    let fileStat;
    try {
      fileStat = await lstat(current);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
      throw error;
    }
    if (fileStat.isSymbolicLink()) return false;
    if (index < segments.length - 1 && !fileStat.isDirectory()) return false;
    if (index === segments.length - 1 && !fileStat.isFile()) return false;
  }
  return true;
}

function hasUnsafePathSegments(pathname) {
  const segments = pathname.split('/');
  return segments.some(
    (segment, index) =>
      segment === '.' ||
      segment === '..' ||
      (segment === '' && index !== 0 && index !== segments.length - 1),
  );
}

function isWithinRoot(root, target) {
  const fromRoot = relative(root, target);
  return (
    fromRoot !== '' &&
    fromRoot !== '..' &&
    !fromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(fromRoot)
  );
}

function parseByteRange(header, size) {
  if (header === undefined) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || size === 0) return false;

  let start;
  let end;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) return false;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= size ||
      end < start
    ) {
      return false;
    }
    end = Math.min(end, size - 1);
  }
  return Object.freeze({ start, end });
}

function sendCommonHeaders(response, contentType, contentLength) {
  response.setHeader(
    'Content-Type',
    contentType.startsWith('text/') ||
      contentType === 'application/json' ||
      contentType.endsWith('+xml') ||
      contentType === 'application/xml'
      ? `${contentType}; charset=utf-8`
      : contentType,
  );
  response.setHeader('Content-Length', String(contentLength));
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

function sendText(response, status, body) {
  const content = Buffer.from(body, 'utf8');
  response.statusCode = status;
  sendCommonHeaders(response, 'text/plain', content.byteLength);
  response.end(content);
}

if (process.argv[2] === CHILD_ARGUMENT) {
  await runStaticPreviewChild();
}

export const previewSupervisorTesting = Object.freeze({
  inferExpectedMime,
  normalizeStartupFailure,
  normalizeRequiredRoutes,
  validateExactRoute,
});
