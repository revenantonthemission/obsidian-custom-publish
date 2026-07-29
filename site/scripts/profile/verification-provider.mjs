import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeProfileAssets } from './asset-budget.mjs';
import { cleanProfileBuild } from './clean-profile-build.mjs';
import { ensureHomepageFixtureContent } from './homepage-fixture-content.mjs';
import { startStaticPreview } from './preview-supervisor.mjs';
import {
  assertOwnedProcessObservationSupport,
  assertOwnedProcessTreeSupport,
  beginOwnedProcessScope,
  freezeOwnedProcessTree,
  monitorOwnedDescendants,
  prepareOwnedSpawn,
} from './owned-process-registry.mjs';
import {
  ACCESSIBILITY_REVIEW_SUBJECT_DOMAIN,
  ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION,
  REQUIRED_MANUAL_CHECKS,
  REQUIRED_MANUAL_MATRIX,
  REVIEW_SUBJECT_SOURCE_DIRECTORIES,
  REVIEW_SUBJECT_SOURCE_FILES,
} from './accessibility-review-contract.mjs';
import { PROFILE_PATHS } from './profile-paths.mjs';
import {
  assertFreshStartupIdentity,
  runWithStartupRetry,
  StartupStageError,
} from './startup-retry.mjs';

const PROVIDER_RULE = 'LC-U1-18/LC-U1-19';
const REQUIRED_PREVIEW_ROUTES = Object.freeze(['/resume', '/portfolio']);
const PRIVATE_RUN_EVIDENCE = Object.freeze([
  PROFILE_PATHS.browserEvidencePath,
  PROFILE_PATHS.linkMetadataEvidencePath,
  PROFILE_PATHS.requestLedgerEvidencePath,
  PROFILE_PATHS.browserStartupFailurePath,
  PROFILE_PATHS.e2eVerificationPath,
]);
const DEFAULT_PLAYWRIGHT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_OUTPUT_LIMIT_BYTES = 512 * 1024;
const PROFILE_CSS_LIMIT_BYTES = 24 * 1024;
const REQUIRED_INHERITED_CLIENT_ENTRIES = Object.freeze([
  'node_modules/@astrojs/preact/dist/client.js',
  'src/islands/Search.tsx',
  'src/islands/ThemeToggle.tsx',
]);

const REQUIRED_BROWSER_SPEC_FILES = Object.freeze([
  'profile-routes.spec.ts',
  'profile-responsive.spec.ts',
  'profile-accessibility.spec.ts',
  'profile-cross-browser.spec.ts',
  'profile-print.spec.ts',
  'profile-resources.spec.ts',
]);
const REQUIRED_BROWSER_OBLIGATIONS = Object.freeze([
  'actual-route-readiness',
  'responsive-boundaries',
  'javascript-on-off',
  'keyboard-and-focus',
  'native-details',
  'axe-wcag-2.2-aa',
  'overflow-clipping-truncation',
  'print-contract',
  'rendered-manifest',
  'local-resource-policy',
]);
const REQUIRED_LINK_CHECKS = Object.freeze([
  'approved-url-mapping',
  'external-url-human-evidence',
  'internal-route-closure',
  'json-ld-visible-fact-parity',
  'metadata-visible-summary-parity',
]);
const REQUIRED_BROWSER_MATRIX = createRequiredBrowserMatrix();

export class VerificationProviderError extends Error {
  constructor(message, { code, stage, details = {}, cause }) {
    super(message, { cause });
    this.name = 'VerificationProviderError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = PROVIDER_RULE;
    this.details = deepFreeze(structuredClone(details));
  }
}

/**
 * Pure, read-only composition boundary. It never turns missing, stale, skipped,
 * or failed browser/manual evidence into success.
 */
export function composeVerificationEvidence({
  command = 'test:e2e',
  buildIdentity,
  accessibilityReviewSubject,
  browserEvidence,
  linkMetadataEvidence,
  assetBudgetEvidence,
  requestLedgerEvidence,
  manualWebAccessibilityRecord,
  buildManifest,
} = {}) {
  if (command !== 'test:e2e') {
    throw providerError(
      'VERIFICATION_COMMAND_INVALID',
      'The verification composition command must be exactly test:e2e.',
      'verification.compose',
      { command },
    );
  }
  const build = requireBuildIdentity(buildIdentity);
  const manifestEvidence = requireBuildManifest(buildManifest, build);
  const reviewSubject = requireAccessibilityReviewSubject(
    accessibilityReviewSubject,
  );
  const browser = requireBrowserEvidence(
    browserEvidence,
    build.id,
    reviewSubject.digest,
  );
  const linkMetadata = requireLinkMetadataEvidence(
    linkMetadataEvidence,
    build.id,
    reviewSubject.digest,
  );
  const assetBudget = requireAssetBudget(
    assetBudgetEvidence,
    build.id,
    manifestEvidence.routeDocuments,
  );
  const requestLedger = requireRequestLedger(
    requestLedgerEvidence,
    build,
    manifestEvidence.outputs,
  );
  const manual = requireManualRecord(
    manualWebAccessibilityRecord,
    reviewSubject.digest,
  );

  return deepFreeze({
    schemaVersion: 1,
    command,
    rule: PROVIDER_RULE,
    result: 'pass',
    buildIdentity: build,
    accessibilityReviewSubject: reviewSubject,
    groups: {
      browser,
      linkMetadata,
      resource: {
        result: 'pass',
        assetBudget,
        requestLedger,
      },
      manualWebAccessibility: manual,
    },
  });
}

export async function runE2EVerification({
  playwrightTimeoutMs = DEFAULT_PLAYWRIGHT_TIMEOUT_MS,
  outputLimitBytes = DEFAULT_OUTPUT_LIMIT_BYTES,
} = {}) {
  validatePositiveInteger(playwrightTimeoutMs, 'playwrightTimeoutMs');
  validatePositiveInteger(outputLimitBytes, 'outputLimitBytes');
  await clearPrivateRunEvidence();

  await ensureHomepageFixtureContent();
  const buildIdentity = await cleanProfileBuild();
  const assetBudgetEvidence = await analyzeProfileAssets();
  await writePrivateJson(
    PROFILE_PATHS.assetBudgetEvidencePath,
    assetBudgetEvidence,
  );
  const manifest = await readJsonFile(
    PROFILE_PATHS.buildManifestPath,
    'PROFILE_BUILD_MANIFEST_MISSING',
  );

  let successfulLease;
  let successfulPreviewCleanup;
  let startupEvidence;
  let previewEvidence;
  let browserPreflightEvidence;
  let playwrightEvidence;
  try {
    const result = await runWithStartupRetry({
      createAttempt: ({ attempt, previousIdentity }) => {
        const nonce = randomUUID();
        let lease;
        let previewFailureCleanup;
        let browserPreflight;
        let browserPreflightResult;
        let playwright;
        let previewLaunchStarted = false;
        let browserPreflightStarted = false;
        let playwrightStarted = false;
        const runtimeIdentity = {};
        const identity = {
          attemptId: `e2e-${attempt}-${nonce}`,
        };

        return {
          identity,
          getRuntimeIdentity() {
            return runtimeIdentity;
          },
          async run() {
            await removeFixedPrivateFile(
              PROFILE_PATHS.browserStartupFailurePath,
            );
            try {
              previewLaunchStarted = true;
              lease = await startStaticPreview({
                distRoot: buildIdentity.root,
                buildIdentity,
                requiredRoutes: REQUIRED_PREVIEW_ROUTES,
              });
              Object.assign(runtimeIdentity, {
                previewInstanceId:
                  lease.processIdentity.instanceId,
                previewPid: lease.processIdentity.pid,
                previewPort: lease.processIdentity.port,
              });
              assertFreshStartupIdentity(previousIdentity, {
                ...identity,
                ...runtimeIdentity,
              });
            } catch (error) {
              previewFailureCleanup =
                readPreviewFailureCleanup(error);
              if (previewFailureCleanup !== null) {
                Object.assign(
                  runtimeIdentity,
                  previewRuntimeIdentity(previewFailureCleanup),
                );
              }
              throw error;
            }

            try {
              browserPreflightStarted = true;
              browserPreflight = await runBrowserLaunchPreflight({
                attempt,
                buildIdentity,
                playwrightTimeoutMs,
                outputLimitBytes,
                onStarted({ pid }) {
                  runtimeIdentity.browserProcessId = pid;
                  assertFreshStartupIdentity(previousIdentity, {
                    ...identity,
                    ...runtimeIdentity,
                  });
                },
              });
            } catch (error) {
              browserPreflight = readOwnedProcessFailure(error) ??
                undefined;
              if (browserPreflight !== undefined) {
                runtimeIdentity.browserProcessId =
                  browserPreflight.pid;
              }
              throw error;
            }
            runtimeIdentity.browserProcessId =
              browserPreflight.pid;

            if (
              browserPreflight.exitCode !== 0 ||
              browserPreflight.signal !== null
            ) {
              const launchFailure = await readBrowserLaunchFailure({
                attempt,
                buildId: buildIdentity.id,
              });
              if (launchFailure !== null) {
                if (!isEligibleIsolatedBrowserLaunchFailure({
                  executionPhase: 'browser-preflight',
                  processEvidence: browserPreflight,
                  launchFailure,
                })) {
                  throw providerError(
                    'BROWSER_STARTUP_CLASSIFICATION_INVALID',
                    'A startup marker may classify only an isolated preflight exit code 1 without a signal.',
                    'startup.browser.preflight',
                    {
                      exitCode: browserPreflight.exitCode,
                      signal: browserPreflight.signal,
                    },
                  );
                }
                runtimeIdentity.browserContextIds =
                  launchFailure.createdContextIds;
                throw new StartupStageError({
                  stage: 'startup.browser.launch',
                  errorCode: launchFailure.errorCode,
                  message: 'The pinned browser failed during classified launch.',
                  details: launchFailure,
                });
              }
              throw providerError(
                'BROWSER_PREFLIGHT_FAILED_UNCLASSIFIED',
                'The isolated browser-launch preflight failed without an exact startup-only classification.',
                'startup.browser.preflight',
                browserPreflight,
              );
            }

            browserPreflightResult = parseBrowserPreflightPass({
              processEvidence: browserPreflight,
              attempt,
              buildId: buildIdentity.id,
            });
            runtimeIdentity.browserContextIds =
              browserPreflightResult.engines.map(
                ({ contextId }) => contextId,
              );
            assertFreshStartupIdentity(previousIdentity, {
              ...identity,
              ...runtimeIdentity,
            });

            try {
              playwrightStarted = true;
              playwright = await runPlaywright({
                attempt,
                buildIdentity,
                baseURL: lease.baseURL,
                playwrightTimeoutMs,
                outputLimitBytes,
                onStarted({ pid }) {
                  runtimeIdentity.playwrightProcessId = pid;
                  assertFreshStartupIdentity(previousIdentity, {
                    ...identity,
                    ...runtimeIdentity,
                  });
                },
              });
            } catch (error) {
              playwright = readOwnedProcessFailure(error) ?? undefined;
              if (playwright !== undefined) {
                runtimeIdentity.playwrightProcessId =
                  playwright.pid;
              }
              throw error;
            }
            runtimeIdentity.playwrightProcessId = playwright.pid;
            if (playwright.exitCode !== 0 || playwright.signal !== null) {
              throw providerError(
                'PLAYWRIGHT_VERIFICATION_FAILED',
                'The Playwright verification process failed; test, assertion, accessibility, network, and budget failures are never startup-retried.',
                'test.e2e',
                playwright,
              );
            }
            return {
              lease,
              preview: {
                baseURL: lease.baseURL,
                buildIdentity: lease.buildIdentity,
                processIdentity: lease.processIdentity,
                routes: lease.routes,
              },
              browserPreflight: {
                ...browserPreflight,
                result: browserPreflightResult,
              },
              playwright,
            };
          },
          async teardown({ attempt: failedAttempt, identity: failedIdentity }) {
            const cleanup = lease === undefined
              ? previewFailureCleanup
              : await lease.cleanup();
            requireReleasedAttemptResources({
              cleanup,
              previewCleanupRequired: previewLaunchStarted,
              browserPreflight,
              browserPreflightRequired: browserPreflightStarted,
              playwright,
              playwrightRequired: playwrightStarted,
            });
            return {
              status: 'succeeded',
              attempt: failedAttempt,
              identity: failedIdentity,
              residualResources: 0,
              cleanup: {
                preview: cleanup,
                browserPreflight:
                  processCleanupEvidence(browserPreflight),
                playwright: processCleanupEvidence(playwright),
              },
            };
          },
        };
      },
    });
    successfulLease = result.value.lease;
    previewEvidence = result.value.preview;
    browserPreflightEvidence = result.value.browserPreflight;
    playwrightEvidence = result.value.playwright;
    startupEvidence = result.evidence;
  } finally {
    if (successfulLease !== undefined) {
      successfulPreviewCleanup = await successfulLease.cleanup();
    }
  }

  const [
    browserEvidence,
    linkMetadataEvidence,
    requestLedgerEvidence,
    manualWebAccessibilityRecord,
  ] = await Promise.all([
    readJsonFile(
      PROFILE_PATHS.browserEvidencePath,
      'BROWSER_EVIDENCE_MISSING',
    ),
    readJsonFile(
      PROFILE_PATHS.linkMetadataEvidencePath,
      'LINK_METADATA_EVIDENCE_MISSING',
    ),
    readJsonFile(
      PROFILE_PATHS.requestLedgerEvidencePath,
      'REQUEST_LEDGER_EVIDENCE_MISSING',
    ),
    readJsonFile(
      PROFILE_PATHS.manualWebAccessibilityPath,
      'MANUAL_WEB_ACCESSIBILITY_RECORD_MISSING',
    ),
  ]);
  const accessibilityReviewSubject =
    await computeAccessibilityReviewSubject({
      manifest,
      siteRoot: PROFILE_PATHS.siteRoot,
    });

  const evidence = composeVerificationEvidence({
    buildIdentity,
    accessibilityReviewSubject,
    browserEvidence,
    linkMetadataEvidence,
    assetBudgetEvidence,
    requestLedgerEvidence,
    manualWebAccessibilityRecord,
    buildManifest: manifest,
  });
  const result = deepFreeze({
    ...evidence,
    execution: {
      startup: startupEvidence,
      preview: previewEvidence,
      browserPreflight: browserPreflightEvidence,
      playwright: playwrightEvidence,
      cleanup: {
        preview: successfulPreviewCleanup,
        browserPreflight:
          processCleanupEvidence(browserPreflightEvidence),
        playwright: processCleanupEvidence(playwrightEvidence),
      },
      staticManifest: {
        path: relative(
          PROFILE_PATHS.siteRoot,
          PROFILE_PATHS.buildManifestPath,
        ),
        outputCount: manifest.outputFiles.length,
      },
    },
  });
  await writePrivateJson(PROFILE_PATHS.e2eVerificationPath, result);
  return result;
}

async function runPlaywright({
  attempt,
  buildIdentity,
  baseURL,
  playwrightTimeoutMs,
  outputLimitBytes,
  onStarted,
}) {
  const processEvidence = await runOwnedNodeProcess({
    arguments: [
      PROFILE_PATHS.playwrightCliPath,
      'test',
      '--config',
      'playwright.config.ts',
    ],
    environment: {
      PROFILE_BASE_URL: baseURL,
      PROFILE_BUILD_ID: buildIdentity.id,
      PROFILE_BUILD_MANIFEST_PATH: PROFILE_PATHS.buildManifestPath,
      PROFILE_ASSET_BUDGET_PATH: PROFILE_PATHS.assetBudgetEvidencePath,
      PROFILE_BROWSER_EVIDENCE_PATH: PROFILE_PATHS.browserEvidencePath,
      PROFILE_LINK_METADATA_EVIDENCE_PATH:
        PROFILE_PATHS.linkMetadataEvidencePath,
      PROFILE_REQUEST_LEDGER_EVIDENCE_PATH:
        PROFILE_PATHS.requestLedgerEvidencePath,
      PROFILE_STARTUP_ATTEMPT: String(attempt),
    },
    timeoutMs: playwrightTimeoutMs,
    outputLimitBytes,
    operation: 'Playwright verification',
    stage: 'test.e2e',
    errorPrefix: 'PLAYWRIGHT_VERIFICATION',
    minimumSuccessfulDescendantGroups: 3,
    onStarted,
  });

  return deepFreeze({
    attempt,
    ...processEvidence,
    command: Object.freeze([
      process.execPath,
      relative(
        PROFILE_PATHS.siteRoot,
        PROFILE_PATHS.playwrightCliPath,
      ),
      'test',
      '--config',
      'playwright.config.ts',
    ]),
  });
}

async function runBrowserLaunchPreflight({
  attempt,
  buildIdentity,
  playwrightTimeoutMs,
  outputLimitBytes,
  onStarted,
}) {
  const timeoutMs = Math.min(playwrightTimeoutMs, 120_000);
  const processEvidence = await runOwnedNodeProcess({
    arguments: [PROFILE_PATHS.browserLaunchPreflightPath],
    environment: {
      PROFILE_BUILD_ID: buildIdentity.id,
      PROFILE_STARTUP_ATTEMPT: String(attempt),
    },
    timeoutMs,
    outputLimitBytes,
    operation: 'browser launch preflight',
    stage: 'startup.browser.preflight',
    errorPrefix: 'BROWSER_PREFLIGHT',
    minimumSuccessfulDescendantGroups: 3,
    onStarted,
  });
  return deepFreeze({
    attempt,
    ...processEvidence,
    command: Object.freeze([
      process.execPath,
      relative(
        PROFILE_PATHS.siteRoot,
        PROFILE_PATHS.browserLaunchPreflightPath,
      ),
    ]),
  });
}

async function runOwnedNodeProcess({
  arguments: childArguments,
  environment,
  timeoutMs,
  outputLimitBytes,
  operation,
  stage,
  errorPrefix,
  minimumSuccessfulDescendantGroups = 0,
  onStarted,
}) {
  assertOwnedProcessTreeSupport();
  await assertOwnedProcessObservationSupport();
  const output = createBoundedOutput(outputLimitBytes);
  const ownershipLabel = `profile-${operation}`;
  const spawnGuard = prepareOwnedSpawn(ownershipLabel);
  const bootstrapToken = randomUUID();
  // Opened before the first spawn so the baseline excludes pre-existing
  // processes and the token reaches the whole verification subtree.
  const ownedScope = await beginOwnedProcessScope(ownershipLabel);
  let child;
  let ownership;
  let descendantMonitor;
  let bootstrapReady;
  try {
    child = spawn(
      process.execPath,
      [PROFILE_PATHS.ownedNodeBootstrapPath, ...childArguments],
      {
      cwd: PROFILE_PATHS.siteRoot,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        ...environment,
        ...ownedScope.environment,
        PROFILE_OWNED_BOOTSTRAP_TOKEN: bootstrapToken,
      },
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
      label: ownershipLabel,
      isRootHandleCurrent: () =>
        child.exitCode === null &&
        child.signalCode === null,
    });
  } catch (cause) {
    spawnGuard.cancel();
    await bootstrapReady?.catch(() => undefined);
    throw providerError(
      `${errorPrefix}_PROCESS_LAUNCH_FAILED`,
      `The ${operation} process could not be launched.`,
      stage,
      {
        executable: process.execPath,
        arguments: childArguments,
        pid: null,
        cleanup: {
          pid: null,
          pidReleased: true,
          processTreeReleased: true,
        },
      },
      cause,
    );
  }
  output.capture('stdout', child.stdout);
  output.capture('stderr', child.stderr);

  try {
    await bootstrapReady;
    await descendantMonitor.ready();
    if (typeof onStarted === 'function') {
      await onStarted(
        Object.freeze({
          pid: child.pid,
          processGroupId: child.pid,
        }),
      );
    }
    await startOwnedBootstrap(child, bootstrapToken);
  } catch (cause) {
    const cleanup = await releaseProcessTree(
      child,
      descendantMonitor,
      ownedScope,
    );
    if (cleanup.ownershipReleaseSafe) {
      ownership.release();
    }
    throw providerError(
      `${errorPrefix}_PROCESS_START_REJECTED`,
      `The ${operation} process identity was rejected before semantic work.`,
      cause?.stage ?? 'startup.attempt.identity',
      {
        pid: child.pid ?? null,
        cleanup,
        failure: serializeProviderFailure(cause),
        output: output.snapshot(),
      },
      cause,
    );
  }

  let processResult;
  try {
    processResult = await waitForProcess(child, timeoutMs, {
      operation,
      stage,
      errorPrefix,
    });
  } catch (cause) {
    const cleanup = await releaseProcessTree(
      child,
      descendantMonitor,
      ownedScope,
    );
    if (cleanup.ownershipReleaseSafe) {
      ownership.release();
    }
    if (!cleanup.pidReleased || !cleanup.processTreeReleased) {
      throw providerError(
        `${errorPrefix}_PROCESS_CLEANUP_FAILED`,
        `The ${operation} process tree remained alive after a process failure.`,
        'cleanup.browser',
        {
          pid: child.pid ?? null,
          cleanup,
          output: output.snapshot(),
        },
        cause,
      );
    }
    throw providerError(
      `${errorPrefix}_PROCESS_FAILED`,
      `The ${operation} process failed after its process tree was released.`,
      cause?.stage ?? stage,
      {
        pid: child.pid ?? null,
        cleanup,
        failure: serializeProviderFailure(cause),
        output: output.snapshot(),
      },
      cause,
    );
  }

  const cleanup = await releaseProcessTree(
      child,
      descendantMonitor,
      ownedScope,
    );
  if (cleanup.ownershipReleaseSafe) {
    ownership.release();
  }
  if (!cleanup.pidReleased || !cleanup.processTreeReleased) {
    throw providerError(
      `${errorPrefix}_PROCESS_CLEANUP_FAILED`,
      `The ${operation} process tree remained alive after execution.`,
      'cleanup.browser',
      {
        pid: child.pid ?? null,
        cleanup,
        output: output.snapshot(),
      },
    );
  }
  if (
    processResult.code === 0 &&
    processResult.signal === null &&
    cleanup.descendantProcessTree.observedProcessGroupIds.length <
      minimumSuccessfulDescendantGroups
  ) {
    throw providerError(
      `${errorPrefix}_DESCENDANT_OBSERVATION_INCOMPLETE`,
      `The ${operation} succeeded without the required browser process-group observations.`,
      'cleanup.browser',
      {
        minimumSuccessfulDescendantGroups,
        cleanup,
        output: output.snapshot(),
      },
    );
  }
  if (processResult.timedOut) {
    throw providerError(
      `${errorPrefix}_TIMEOUT`,
      `The ${operation} process exceeded its deadline.`,
      stage,
      {
        timeoutMs,
        pid: child.pid ?? null,
        exitCode: processResult.code,
        signal: processResult.signal,
        cleanup,
        output: output.snapshot(),
      },
    );
  }

  return deepFreeze({
    pid: child.pid ?? null,
    exitCode: processResult.code,
    signal: processResult.signal,
    pidReleased: cleanup.pidReleased,
    processTreeReleased: cleanup.processTreeReleased,
    descendantProcessTree: cleanup.descendantProcessTree,
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

async function waitForProcess(
  child,
  timeoutMs,
  { operation, stage, errorPrefix },
) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return {
      code: child.exitCode,
      signal: child.signalCode,
      timedOut: false,
    };
  }
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      settleResolve({
        code: child.exitCode,
        signal: child.signalCode,
        timedOut,
      });
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      child.off('error', onError);
      child.off('exit', onExit);
    }
    function settleResolve(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolvePromise(value);
    }
    function settleReject(error) {
      if (settled) return;
      settled = true;
      cleanup();
      rejectPromise(error);
    }
    function onError(cause) {
      settleReject(
        providerError(
          `${errorPrefix}_PROCESS_LAUNCH_FAILED`,
          `The local ${operation} process could not be launched.`,
          stage,
          { executable: process.execPath },
          cause,
        ),
      );
    }
    function onExit(code, signal) {
      settleResolve({ code, signal, timedOut });
    }

    child.once('error', onError);
    child.once('exit', onExit);
  });
}

async function releaseProcessTree(child, descendantMonitor, ownedScope) {
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
        label: 'profile-browser-process-tree',
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
    await waitForProcessTreeRelease(
      processIds,
      processGroupIds,
      1_000,
    );
    pidReleased = processIds.every(
      (processId) => !isProcessAlive(processId),
    );
    processGroupsReleased = processGroupIds.every(
      (processGroupId) => !isProcessGroupAlive(processGroupId),
    );
  }

  // Ancestry can only prove what it can still reach. The token sweep closes
  // the double-detach gap before any ownership lease is released. Callers that
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

async function waitForProcessTreeRelease(
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
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds)
  );
}

function readPreviewFailureCleanup(error) {
  const cleanup = error?.details?.cleanup;
  if (!isPlainRecord(cleanup)) return null;
  if (
    typeof cleanup.instanceId !== 'string' ||
    cleanup.instanceId.length === 0 ||
    (
      cleanup.pid !== null &&
      (!Number.isSafeInteger(cleanup.pid) || cleanup.pid < 1)
    ) ||
    (
      cleanup.port !== null &&
      (
        !Number.isSafeInteger(cleanup.port) ||
        cleanup.port < 1 ||
        cleanup.port > 65_535
      )
    ) ||
    cleanup.processExited !== true ||
    cleanup.processTreeReleased !== true ||
    ![true, null].includes(cleanup.portReleased)
  ) {
    throw providerError(
      'PREVIEW_FAILURE_CLEANUP_EVIDENCE_INVALID',
      'A failed preview startup returned incomplete cleanup evidence.',
      'cleanup.preview',
    );
  }
  return deepFreeze(structuredClone(cleanup));
}

function previewRuntimeIdentity(cleanup) {
  return {
    previewInstanceId: cleanup.instanceId,
    ...(cleanup.pid === null ? {} : { previewPid: cleanup.pid }),
    ...(cleanup.port === null ? {} : { previewPort: cleanup.port }),
  };
}

function processCleanupEvidence(value) {
  if (!isPlainRecord(value)) return null;
  const pid = value.pid ?? null;
  const pidReleased = value.pidReleased;
  const processTreeReleased = value.processTreeReleased;
  const descendantProcessTree =
    value.descendantProcessTree ?? null;
  if (
    (
      pid !== null &&
      (!Number.isSafeInteger(pid) || pid < 1)
    ) ||
    typeof pidReleased !== 'boolean' ||
    typeof processTreeReleased !== 'boolean' ||
    (
      pid !== null &&
      !isDescendantProcessTreeEvidence(descendantProcessTree)
    )
  ) {
    return null;
  }
  return deepFreeze({
    pid,
    pidReleased,
    processTreeReleased,
    descendantProcessTree,
  });
}

function serializeProviderFailure(error) {
  return deepFreeze({
    name: typeof error?.name === 'string' ? error.name : typeof error,
    errorCode:
      typeof (error?.errorCode ?? error?.code) === 'string'
        ? (error.errorCode ?? error.code)
        : null,
    stage: typeof error?.stage === 'string' ? error.stage : null,
    message: error instanceof Error ? error.message : String(error),
  });
}

function readOwnedProcessFailure(error) {
  const cleanup = error?.details?.cleanup;
  const pid = error?.details?.pid ?? cleanup?.pid ?? null;
  const descendantProcessTree =
    cleanup?.descendantProcessTree ?? null;
  if (
    !isPlainRecord(cleanup) ||
    (
      pid !== null &&
      (!Number.isSafeInteger(pid) || pid < 1)
    ) ||
    typeof cleanup.pidReleased !== 'boolean' ||
    typeof cleanup.processTreeReleased !== 'boolean' ||
    (
      pid !== null &&
      !isDescendantProcessTreeEvidence(descendantProcessTree)
    )
  ) {
    return null;
  }
  return deepFreeze({
    pid,
    pidReleased: cleanup.pidReleased,
    processTreeReleased: cleanup.processTreeReleased,
    descendantProcessTree,
    failure: serializeProviderFailure(error),
  });
}

function isDescendantProcessTreeEvidence(value) {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, [
      'failures',
      'activeProcessGroupIds',
      'activeRootProcessGroup',
      'observedProcessGroupIds',
      'observedProcessIds',
      'rootPid',
      'rootProcessIdentity',
      'sampleCount',
    ]) &&
    Number.isSafeInteger(value.rootPid) &&
    value.rootPid > 0 &&
    isPlainRecord(value.rootProcessIdentity) &&
    hasExactKeys(value.rootProcessIdentity, [
      'pgid',
      'pid',
      'ppid',
      'sessionId',
      'startedAt',
    ]) &&
    value.rootProcessIdentity.pid === value.rootPid &&
    Number.isSafeInteger(value.rootProcessIdentity.ppid) &&
    value.rootProcessIdentity.ppid > 0 &&
    value.rootProcessIdentity.pgid === value.rootPid &&
    Number.isSafeInteger(value.rootProcessIdentity.sessionId) &&
    value.rootProcessIdentity.sessionId >= 0 &&
    typeof value.rootProcessIdentity.startedAt === 'string' &&
    value.rootProcessIdentity.startedAt.length > 0 &&
    Number.isSafeInteger(value.sampleCount) &&
    value.sampleCount > 0 &&
    isUniquePositiveIntegerArray(value.observedProcessIds) &&
    isUniquePositiveIntegerArray(value.observedProcessGroupIds) &&
    isUniquePositiveIntegerArray(value.activeProcessGroupIds) &&
    typeof value.activeRootProcessGroup === 'boolean' &&
    Array.isArray(value.failures) &&
    (
      value.failures.length === 0 ||
      value.failures.every(
        (failure) =>
          hasExactKeys(failure, ['message', 'name']) &&
          typeof failure.name === 'string' &&
          failure.name.length > 0 &&
          typeof failure.message === 'string' &&
          failure.message.length > 0
      )
    )
  );
}

function isUniquePositiveIntegerArray(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) => Number.isSafeInteger(entry) && entry > 0,
    ) &&
    new Set(value).size === value.length
  );
}

function requireReleasedAttemptResources({
  cleanup,
  previewCleanupRequired,
  browserPreflight,
  browserPreflightRequired,
  playwright,
  playwrightRequired,
}) {
  if (previewCleanupRequired && cleanup === null) {
    throw providerError(
      'PREVIEW_CLEANUP_EVIDENCE_MISSING',
      'The failed startup scope cannot prove whether its preview resources were released.',
      'cleanup.preview',
    );
  }
  if (
    cleanup !== null &&
    (
      cleanup.processExited !== true ||
      cleanup.processTreeReleased !== true ||
      ![true, null].includes(cleanup.portReleased)
    )
  ) {
    throw providerError(
      'PREVIEW_CLEANUP_EVIDENCE_INVALID',
      'The failed startup scope did not release its preview resources.',
      'cleanup.preview',
    );
  }
  for (const [name, evidence, required] of [
    [
      'browserPreflight',
      browserPreflight,
      browserPreflightRequired,
    ],
    ['playwright', playwright, playwrightRequired],
  ]) {
    if (evidence === undefined && !required) continue;
    const proof = processCleanupEvidence(evidence);
    if (
      proof === null ||
      proof.pidReleased !== true ||
      proof.processTreeReleased !== true
    ) {
      throw providerError(
        'BROWSER_PROCESS_CLEANUP_EVIDENCE_INVALID',
        'The failed startup scope did not release every owned browser process tree.',
        'cleanup.browser',
        { name },
      );
    }
  }
}

function parseBrowserPreflightPass({
  processEvidence,
  attempt,
  buildId,
}) {
  const lines = processEvidence.output?.stdout?.text
    ?.split(/\r?\n/u)
    .filter((line) => line.length > 0);
  if (!Array.isArray(lines) || lines.length !== 1) {
    throw providerError(
      'BROWSER_PREFLIGHT_EVIDENCE_INVALID',
      'The browser launch preflight did not emit one exact evidence record.',
      'startup.browser.preflight',
      { lineCount: Array.isArray(lines) ? lines.length : null },
    );
  }
  let evidence;
  try {
    evidence = JSON.parse(lines[0]);
  } catch (cause) {
    throw providerError(
      'BROWSER_PREFLIGHT_EVIDENCE_INVALID',
      'The browser launch preflight evidence is not valid JSON.',
      'startup.browser.preflight',
      {},
      cause,
    );
  }

  const expectedEngines = ['chromium', 'firefox', 'webkit'];
  if (
    !isPlainRecord(evidence) ||
    !hasExactKeys(evidence, [
      'attempt',
      'buildId',
      'engines',
      'invocationId',
      'result',
      'schemaVersion',
      'stage',
    ]) ||
    evidence.schemaVersion !== 1 ||
    evidence.stage !== 'startup.browser.launch' ||
    evidence.result !== 'pass' ||
    evidence.attempt !== attempt ||
    evidence.buildId !== buildId ||
    !isUuid(evidence.invocationId) ||
    !Array.isArray(evidence.engines) ||
    evidence.engines.length !== expectedEngines.length ||
    !evidence.engines.every((engine, index) =>
      isPlainRecord(engine) &&
      hasExactKeys(engine, [
        'browserClosed',
        'contextClosed',
        'contextCreated',
        'contextId',
        'engine',
      ]) &&
      engine.engine === expectedEngines[index] &&
      engine.browserClosed === true &&
      engine.contextClosed === true &&
      engine.contextCreated === true &&
      isUuid(engine.contextId)
    ) ||
    new Set(
      evidence.engines.map(({ contextId }) => contextId),
    ).size !== expectedEngines.length
  ) {
    throw providerError(
      'BROWSER_PREFLIGHT_EVIDENCE_INVALID',
      'The browser launch preflight evidence is incomplete or stale.',
      'startup.browser.preflight',
      { attempt, buildId },
    );
  }
  return deepFreeze(evidence);
}

function isEligibleIsolatedBrowserLaunchFailure({
  executionPhase,
  processEvidence,
  launchFailure,
}) {
  return (
    executionPhase === 'browser-preflight' &&
    isPlainRecord(processEvidence) &&
    processEvidence.exitCode === 1 &&
    processEvidence.signal === null &&
    isPlainRecord(launchFailure) &&
    launchFailure.stage === 'startup.browser.launch' &&
    launchFailure.result === 'fail' &&
    launchFailure.errorCode === 'BROWSER_ENGINE_LAUNCH_FAILED'
  );
}

async function readBrowserLaunchFailure({ attempt, buildId }) {
  const failure = await readOptionalJsonFile(
    PROFILE_PATHS.browserStartupFailurePath,
  );
  if (failure === null) return null;
  if (
    !isPlainRecord(failure) ||
    !hasExactKeys(failure, [
      'attempt',
      'buildId',
      'createdContextIds',
      'engine',
      'error',
      'errorCode',
      'invocationId',
      'result',
      'schemaVersion',
      'stage',
    ]) ||
    failure.schemaVersion !== 1 ||
    failure.stage !== 'startup.browser.launch' ||
    failure.result !== 'fail' ||
    failure.errorCode !== 'BROWSER_ENGINE_LAUNCH_FAILED' ||
    failure.attempt !== attempt ||
    failure.buildId !== buildId ||
    !['chromium', 'firefox', 'webkit'].includes(failure.engine) ||
    !isUuid(failure.invocationId) ||
    !isUniqueUuidArray(failure.createdContextIds, 3) ||
    !isSerializedProcessError(failure.error)
  ) {
    throw providerError(
      'BROWSER_STARTUP_CLASSIFICATION_INVALID',
      'The browser startup failure marker is invalid or stale.',
      'test.e2e',
      { attempt, buildId },
    );
  }
  return deepFreeze(failure);
}

function requireBuildIdentity(value) {
  if (
    !isPlainRecord(value) ||
    !isSha256(value.id) ||
    !isSha256(value.manifestSha256) ||
    !Array.isArray(value.routes) ||
    !REQUIRED_PREVIEW_ROUTES.every((route) => value.routes.includes(route))
  ) {
    throw providerError(
      'VERIFICATION_BUILD_IDENTITY_INVALID',
      'Verification evidence requires one complete clean-build identity.',
      'verification.compose',
    );
  }
  return deepFreeze(structuredClone(value));
}

function requireBuildManifest(value, buildIdentity) {
  if (
    !isPlainRecord(value) ||
    !isPlainRecord(value.buildIdentity) ||
    value.buildIdentity.id !== buildIdentity.id ||
    !Array.isArray(value.outputFiles) ||
    !Array.isArray(value.routeOutputs) ||
    !isPlainRecord(value.pageGraph) ||
    !isPlainRecord(value.initialRollupGraphs) ||
    !isPlainRecord(value.rollupGraphs) ||
    !isPlainRecord(value.viteManifest)
  ) {
    throw providerError(
      'VERIFICATION_BUILD_MANIFEST_INVALID',
      'Verification evidence requires the exact clean-build output inventory.',
      'verification.compose',
    );
  }
  const outputs = indexManifestOutputs(value.outputFiles);
  const sourceGraphSha256 = sha256(
    Buffer.from(
      JSON.stringify({
        pageGraph: value.pageGraph,
        routeOutputs: value.routeOutputs,
        initialRollupGraphs: value.initialRollupGraphs,
        rollupGraphs: value.rollupGraphs,
        viteManifest: value.viteManifest,
      }),
    ),
  );
  const outputSha256 = sha256(
    Buffer.from(JSON.stringify(value.outputFiles)),
  );
  const id = sha256(
    Buffer.from(
      JSON.stringify({
        sourceGraphSha256,
        outputSha256,
        builtRoutes: value.buildIdentity.routes,
      }),
    ),
  );
  if (
    value.buildIdentity.sourceGraphSha256 !== sourceGraphSha256 ||
    value.buildIdentity.outputSha256 !== outputSha256 ||
    value.buildIdentity.id !== id ||
    buildIdentity.sourceGraphSha256 !== sourceGraphSha256 ||
    buildIdentity.outputSha256 !== outputSha256
  ) {
    throw providerError(
      'VERIFICATION_BUILD_MANIFEST_IDENTITY_MISMATCH',
      'The verification build manifest does not match its clean-build identity.',
      'verification.compose',
    );
  }
  const routeDocuments = new Map(
    REQUIRED_PREVIEW_ROUTES.map((route) => [
      route,
      resolveManifestRouteDocumentPath(
        value.routeOutputs,
        outputs,
        route,
      ),
    ]),
  );
  return { outputs, routeDocuments };
}

function requireAccessibilityReviewSubject(value) {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'algorithm',
      'authoredFiles',
      'buildAssets',
      'digest',
      'domain',
      'schemaVersion',
      'tools',
    ]) ||
    value.schemaVersion !== ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION ||
    value.domain !== ACCESSIBILITY_REVIEW_SUBJECT_DOMAIN ||
    value.algorithm !== 'sha256' ||
    !isSha256(value.digest) ||
    !isReviewAuthoredFileList(value.authoredFiles) ||
    value.authoredFiles.length === 0 ||
    !isBuildAssetIdentityList(value.buildAssets) ||
    value.buildAssets.length === 0 ||
    !isReviewToolRecord(value.tools) ||
    digestAccessibilityReviewSubject(value) !== value.digest
  ) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_SUBJECT_INVALID',
      'The accessibility review subject is incomplete or does not match its field-ordered digest.',
      'verification.compose',
    );
  }
  return deepFreeze(structuredClone(value));
}

function requireBrowserEvidence(value, buildId, reviewSubjectDigest) {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'buildId',
      'completedMatrix',
      'group',
      'obligations',
      'result',
      'reviewSubjectDigest',
      'reviewSubjectSchemaVersion',
      'schemaVersion',
      'skippedReasons',
      'specFiles',
      'summary',
      'tools',
    ]) ||
    value.schemaVersion !== 1 ||
    value.group !== 'browser' ||
    value.result !== 'pass' ||
    value.buildId !== buildId ||
    value.reviewSubjectSchemaVersion !==
      ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION ||
    value.reviewSubjectDigest !== reviewSubjectDigest ||
    !isExactStringArray(value.specFiles, REQUIRED_BROWSER_SPEC_FILES) ||
    !isExactStringArray(value.completedMatrix, REQUIRED_BROWSER_MATRIX) ||
    !isPassMap(value.obligations, REQUIRED_BROWSER_OBLIGATIONS) ||
    !isEmptyArray(value.skippedReasons) ||
    !isCompleteBrowserSummary(value.summary) ||
    !isBrowserToolRecord(value.tools)
  ) {
    throw providerError(
      'BROWSER_EVIDENCE_INCOMPLETE',
      'Browser evidence is missing, stale, skipped, failed, or does not close the required matrix.',
      'verification.compose',
      { buildId, reviewSubjectDigest },
    );
  }
  return deepFreeze(structuredClone(value));
}

function requireLinkMetadataEvidence(value, buildId, reviewSubjectDigest) {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'buildId',
      'checks',
      'externalUrlEvidence',
      'group',
      'result',
      'reviewSubjectDigest',
      'reviewSubjectSchemaVersion',
      'routes',
      'schemaVersion',
      'skippedReasons',
    ]) ||
    value.schemaVersion !== 1 ||
    value.group !== 'link-metadata' ||
    value.result !== 'pass' ||
    value.buildId !== buildId ||
    value.reviewSubjectSchemaVersion !==
      ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION ||
    value.reviewSubjectDigest !== reviewSubjectDigest ||
    !isPassMap(value.checks, REQUIRED_LINK_CHECKS) ||
    !isLinkRouteEvidence(value.routes) ||
    !isExternalUrlEvidence(value.externalUrlEvidence) ||
    !isEmptyArray(value.skippedReasons)
  ) {
    throw providerError(
      'LINK_METADATA_EVIDENCE_INCOMPLETE',
      'Link and metadata evidence is missing, stale, skipped, failed, or incomplete.',
      'verification.compose',
      { buildId, reviewSubjectDigest },
    );
  }
  return deepFreeze(structuredClone(value));
}

function requireAssetBudget(value, buildId, routeDocuments) {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'buildIdentity',
      'css',
      'javaScript',
      'result',
      'routes',
      'rule',
      'schemaVersion',
    ]) ||
    value.schemaVersion !== 1 ||
    value.rule !== 'PERF-01/LC-U1-04/LC-U1-05' ||
    value.result !== 'pass' ||
    value.buildIdentity?.id !== buildId ||
    !isCompleteAssetCssEvidence(value.css) ||
    !isCompleteAssetJavaScriptEvidence(value.javaScript, routeDocuments) ||
    !isAssetRouteEvidence(value.routes, routeDocuments)
  ) {
    throw providerError(
      'ASSET_BUDGET_EVIDENCE_INCOMPLETE',
      'Asset budget evidence is missing, stale, or failed.',
      'verification.compose',
      { buildId },
    );
  }
  return deepFreeze(structuredClone(value));
}

function requireRequestLedger(value, buildIdentity, manifestOutputs) {
  const buildId = buildIdentity.id;
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'attempted',
      'blocked',
      'buildIdentity',
      'external',
      'guard',
      'interceptionBypassed',
      'missingEmittedAssetIdentities',
      'missingProfileRoutes',
      'rule',
      'schemaVersion',
      'staticAssetEvidence',
      'successful',
      'supervisedOrigin',
    ]) ||
    value.schemaVersion !== 1 ||
    value.rule !== 'PERF-02/LC-U1-06' ||
    value.buildIdentity?.id !== buildId ||
    value.buildIdentity?.manifestSha256 !==
      buildIdentity.manifestSha256 ||
    !isSupervisedOrigin(value.supervisedOrigin) ||
    !isCompleteRequestLedger(
      value,
      buildIdentity,
      manifestOutputs,
    )
  ) {
    throw providerError(
      'REQUEST_LEDGER_EVIDENCE_INCOMPLETE',
      'Request ledger evidence is missing, stale, or records an external or unobserved route.',
      'verification.compose',
      { buildId },
    );
  }
  return deepFreeze(structuredClone(value));
}

function requireManualRecord(value, reviewSubjectDigest) {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'result',
      'reviewSubjectDigest',
      'reviewSubjectSchemaVersion',
      'reviewedAt',
      'reviewer',
      'schemaVersion',
      'skippedReasons',
      'states',
      'targetSizeExceptions',
    ]) ||
    value.schemaVersion !== 1 ||
    value.result !== 'pass' ||
    value.reviewSubjectSchemaVersion !==
      ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION ||
    value.reviewSubjectDigest !== reviewSubjectDigest ||
    typeof value.reviewer !== 'string' ||
    value.reviewer.trim().length === 0 ||
    !isIsoTimestamp(value.reviewedAt) ||
    !isManualStateEvidence(value.states) ||
    !isTargetSizeExceptionEvidence(value.targetSizeExceptions) ||
    !isEmptyArray(value.skippedReasons)
  ) {
    throw providerError(
      'MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE',
      'Manual web accessibility evidence is missing, stale, or failed.',
      'verification.compose',
      { reviewSubjectDigest },
    );
  }
  return deepFreeze(structuredClone(value));
}

export async function computeAccessibilityReviewSubject({
  manifest,
  siteRoot = PROFILE_PATHS.siteRoot,
} = {}) {
  if (
    !isPlainRecord(manifest) ||
    !isPlainRecord(manifest.buildIdentity) ||
    !Array.isArray(manifest.outputFiles) ||
    !Array.isArray(manifest.routeOutputs) ||
    !isPlainRecord(manifest.tools)
  ) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_MANIFEST_INVALID',
      'The clean-build manifest cannot define an accessibility review subject.',
      'verification.subject',
    );
  }
  if (
    typeof siteRoot !== 'string' ||
    siteRoot.length === 0 ||
    resolve(siteRoot) !== siteRoot
  ) {
    throw new TypeError('siteRoot must be one fixed absolute path');
  }

  const sourcePaths = new Set(REVIEW_SUBJECT_SOURCE_FILES);
  for (const directory of REVIEW_SUBJECT_SOURCE_DIRECTORIES) {
    for (const path of await listReviewSourceFiles(siteRoot, directory)) {
      sourcePaths.add(path);
    }
  }
  const authoredFiles = [];
  for (const path of [...sourcePaths].sort()) {
    authoredFiles.push(
      await readFixedFileIdentity(siteRoot, path, 'authored-source'),
    );
  }

  const outputIndex = indexManifestOutputs(manifest.outputFiles);
  const buildAssets = [];
  const pageEntries = Array.isArray(manifest.pageGraph)
    ? manifest.pageGraph
    : manifest.pageGraph?.pages;
  if (!Array.isArray(pageEntries)) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_ROUTE_GRAPH_INVALID',
      'The clean-build route graph is missing from the review subject.',
      'verification.subject',
    );
  }

  for (const route of REQUIRED_PREVIEW_ROUTES) {
    const outputPath = resolveManifestRouteDocumentPath(
      manifest.routeOutputs,
      outputIndex,
      route,
    );
    const htmlIdentity = await requireCurrentBuildAsset({
      siteRoot,
      outputIndex,
      path: outputPath,
      kind: 'route-html',
      route,
    });
    buildAssets.push(htmlIdentity);
    const html = await readFile(resolve(siteRoot, 'dist', outputPath), 'utf8');

    for (const referencedPath of extractRouteAssetPaths(html)) {
      buildAssets.push(
        await requireCurrentBuildAsset({
          siteRoot,
          outputIndex,
          path: referencedPath,
          kind: referencedPath.endsWith('.css') ? 'route-css' : 'route-js',
          route,
        }),
      );
    }

    const page = pageEntries.find(
      (entry) =>
        isPlainRecord(entry) &&
        (entry.route?.pathname ?? entry.route?.route) === route,
    );
    if (!isPlainRecord(page) || !Array.isArray(page.styles)) {
      throw providerError(
        'ACCESSIBILITY_REVIEW_ROUTE_GRAPH_INVALID',
        'A required profile route lacks style reachability evidence.',
        'verification.subject',
        { route },
      );
    }
    for (const style of page.styles) {
      if (style?.sheet?.type === 'external') {
        buildAssets.push(
          await requireCurrentBuildAsset({
            siteRoot,
            outputIndex,
            path: style.sheet.src,
            kind: 'route-css',
            route,
          }),
        );
      } else if (
        style?.sheet?.type === 'inline' &&
        Number.isSafeInteger(style.sheet.bytes) &&
        style.sheet.bytes >= 0 &&
        isSha256(style.sheet.sha256) &&
        typeof style.sheet.contentBase64 === 'string'
      ) {
        const bytes = Buffer.from(style.sheet.contentBase64, 'base64');
        if (
          bytes.byteLength !== style.sheet.bytes ||
          sha256(bytes) !== style.sheet.sha256
        ) {
          throw providerError(
            'ACCESSIBILITY_REVIEW_INLINE_STYLE_INVALID',
            'An inline profile style does not match its build identity.',
            'verification.subject',
            { route },
          );
        }
        buildAssets.push({
          path: `inline:${route}:${style.sheet.sha256}`,
          bytes: style.sheet.bytes,
          sha256: style.sheet.sha256,
          kind: 'route-css',
          route,
        });
      } else {
        throw providerError(
          'ACCESSIBILITY_REVIEW_ROUTE_GRAPH_INVALID',
          'A profile style lacks a traceable external or inline identity.',
          'verification.subject',
          { route },
        );
      }
    }
  }

  const packageLock = JSON.parse(
    await readFile(resolve(siteRoot, 'package-lock.json'), 'utf8'),
  );
  const tools = {
    node: requireToolVersion(manifest.tools.node, 'node'),
    astro: requireToolVersion(manifest.tools.astro, 'astro'),
    vite: requireToolVersion(manifest.tools.vite, 'vite'),
    playwright: requireLockedToolVersion(
      packageLock,
      'node_modules/@playwright/test',
    ),
    axe: requireLockedToolVersion(
      packageLock,
      'node_modules/@axe-core/playwright',
    ),
  };
  if (tools.node !== process.versions.node) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_TOOL_STALE',
      'The clean-build Node version differs from the current verifier.',
      'verification.subject',
      { build: tools.node, verifier: process.versions.node },
    );
  }

  const subject = {
    schemaVersion: ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION,
    domain: ACCESSIBILITY_REVIEW_SUBJECT_DOMAIN,
    algorithm: 'sha256',
    authoredFiles: authoredFiles.sort(compareIdentity),
    buildAssets: deduplicateBuildAssets(buildAssets),
    tools,
  };
  return deepFreeze({
    ...subject,
    digest: digestAccessibilityReviewSubject(subject),
  });
}

function digestAccessibilityReviewSubject(value) {
  const hash = createHash('sha256');
  appendDigestField(hash, value.domain);
  appendDigestField(hash, String(value.schemaVersion));
  for (const file of value.authoredFiles) {
    appendDigestField(hash, 'authored');
    appendDigestField(hash, file.path);
    appendDigestField(hash, String(file.bytes));
    appendDigestField(hash, file.sha256);
  }
  // `buildAssets` is deliberately not hashed — see the schema-version note in
  // accessibility-review-contract.mjs. Their paths carry content hashes that
  // shift with chunking, so a full-site build and a profile-only build
  // disagreed from identical authored source and the tracked record could not
  // be merged between branches. The assets remain on the subject as evidence.
  for (const name of ['node', 'astro', 'vite', 'playwright', 'axe']) {
    appendDigestField(hash, `tool:${name}`);
    appendDigestField(hash, value.tools[name]);
  }
  return hash.digest('hex');
}

function appendDigestField(hash, value) {
  const bytes = Buffer.from(value, 'utf8');
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(bytes.byteLength);
  hash.update(length);
  hash.update(bytes);
}

async function listReviewSourceFiles(siteRoot, relativeDirectory) {
  const root = resolveFixedPath(siteRoot, relativeDirectory);
  const result = [];
  await walk(root, relativeDirectory);
  return result.sort();

  async function walk(directory, prefix) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw providerError(
          'ACCESSIBILITY_REVIEW_SOURCE_SYMLINK',
          'A review-subject source path is a symbolic link.',
          'verification.subject',
          { path },
        );
      }
      if (entry.isDirectory()) {
        await walk(resolveFixedPath(siteRoot, path), path);
      } else if (entry.isFile()) {
        result.push(path);
      } else {
        throw providerError(
          'ACCESSIBILITY_REVIEW_SOURCE_NOT_REGULAR',
          'A review-subject source path is not a regular file.',
          'verification.subject',
          { path },
        );
      }
    }
  }
}

async function readFixedFileIdentity(siteRoot, path, kind) {
  const absolutePath = resolveFixedPath(siteRoot, path);
  const fileStat = await lstat(absolutePath).catch((cause) => {
    throw providerError(
      'ACCESSIBILITY_REVIEW_SOURCE_MISSING',
      'A required review-subject source file is missing.',
      'verification.subject',
      { path, kind },
      cause,
    );
  });
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_SOURCE_NOT_REGULAR',
      'A required review-subject source is not a regular file.',
      'verification.subject',
      { path, kind },
    );
  }
  const bytes = await readFile(absolutePath);
  return deepFreeze({
    path,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
  });
}

function resolveFixedPath(siteRoot, path) {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.split('/').some((segment) => ['', '.', '..'].includes(segment))
  ) {
    throw new TypeError('review-subject path must be normalized and relative');
  }
  const absolutePath = resolve(siteRoot, ...path.split('/'));
  const fromRoot = relative(siteRoot, absolutePath);
  if (
    fromRoot === '' ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`)
  ) {
    throw new TypeError('review-subject path must stay inside siteRoot');
  }
  return absolutePath;
}

function resolveManifestRouteDocumentPath(
  routeOutputs,
  outputIndex,
  route,
) {
  const matches = routeOutputs.filter(
    (entry) => isPlainRecord(entry) && entry.route === route,
  );
  if (
    matches.length !== 1 ||
    !Array.isArray(matches[0].outputs)
  ) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_ROUTE_OUTPUT_AMBIGUOUS',
      'A required route does not map to one exact output set.',
      'verification.subject',
      { route, matches: matches.length },
    );
  }
  const documents = matches[0].outputs.filter(
    (path) =>
      isNormalizedRelativePath(path) &&
      path.endsWith('.html') &&
      outputIndex.has(path),
  );
  if (documents.length !== 1) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_ROUTE_OUTPUT_AMBIGUOUS',
      'A required route must map to exactly one emitted HTML document.',
      'verification.subject',
      { route, documents },
    );
  }
  return documents[0];
}

function indexManifestOutputs(outputs) {
  const index = new Map();
  for (const output of outputs) {
    if (
      !isPlainRecord(output) ||
      typeof output.path !== 'string' ||
      !Number.isSafeInteger(output.bytes) ||
      output.bytes < 0 ||
      !isSha256(output.sha256) ||
      index.has(output.path)
    ) {
      throw providerError(
        'ACCESSIBILITY_REVIEW_OUTPUT_IDENTITY_INVALID',
        'The build output identity set is incomplete or ambiguous.',
        'verification.subject',
      );
    }
    index.set(output.path, output);
  }
  return index;
}

async function requireCurrentBuildAsset({
  siteRoot,
  outputIndex,
  path,
  kind,
  route,
}) {
  const expected = outputIndex.get(path);
  if (expected === undefined) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_OUTPUT_UNTRACEABLE',
      'A route-reachable build asset is absent from the output manifest.',
      'verification.subject',
      { route, path },
    );
  }
  const current = await readFixedFileIdentity(
    siteRoot,
    `dist/${path}`,
    kind,
  );
  if (
    current.bytes !== expected.bytes ||
    current.sha256 !== expected.sha256
  ) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_OUTPUT_STALE',
      'A route-reachable build asset differs from its clean-build identity.',
      'verification.subject',
      { route, path },
    );
  }
  return deepFreeze({
    path,
    bytes: expected.bytes,
    sha256: expected.sha256,
    kind,
    route,
  });
}

function extractRouteAssetPaths(html) {
  const paths = [];
  const pattern =
    /(?:href|src)=["']\/([^"'?#]+\.(?:css|js|mjs))(?:[?#][^"']*)?["']/gu;
  for (const match of html.matchAll(pattern)) {
    paths.push(match[1]);
  }
  return [...new Set(paths)].sort();
}

function requireToolVersion(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw providerError(
      'ACCESSIBILITY_REVIEW_TOOL_MISSING',
      'A required accessibility review tool version is missing.',
      'verification.subject',
      { name },
    );
  }
  return value;
}

function requireLockedToolVersion(packageLock, path) {
  return requireToolVersion(packageLock?.packages?.[path]?.version, path);
}

function deduplicateBuildAssets(assets) {
  const result = new Map();
  for (const asset of assets) {
    const key = `${asset.route}\0${asset.kind}\0${asset.path}`;
    const prior = result.get(key);
    if (
      prior !== undefined &&
      (prior.bytes !== asset.bytes || prior.sha256 !== asset.sha256)
    ) {
      throw providerError(
        'ACCESSIBILITY_REVIEW_OUTPUT_AMBIGUOUS',
        'One route asset has multiple build identities.',
        'verification.subject',
        { route: asset.route, path: asset.path },
      );
    }
    result.set(key, asset);
  }
  return [...result.values()].sort(compareBuildAsset);
}

function compareIdentity(left, right) {
  return compareText(left.path, right.path);
}

function compareBuildAsset(left, right) {
  return (
    compareText(left.route, right.route) ||
    compareText(left.kind, right.kind) ||
    compareText(left.path, right.path)
  );
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function clearPrivateRunEvidence() {
  for (const path of PRIVATE_RUN_EVIDENCE) {
    await removeFixedPrivateFile(path);
  }
}

async function removeFixedPrivateFile(path) {
  const fileStat = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (fileStat === undefined) return;
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw providerError(
      'PRIVATE_EVIDENCE_TARGET_INVALID',
      'A fixed private evidence target is not a regular file.',
      'verification.prepare',
      { path },
    );
  }
  await unlink(path);
}

async function readJsonFile(path, missingCode) {
  const value = await readOptionalJsonFile(path);
  if (value === null) {
    throw providerError(
      missingCode,
      'A required verification evidence file is missing.',
      'verification.compose',
      { path },
    );
  }
  return value;
}

async function readOptionalJsonFile(path) {
  const fileStat = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (fileStat === undefined) return null;
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw providerError(
      'VERIFICATION_EVIDENCE_FILE_INVALID',
      'A verification evidence path is not a regular file.',
      'verification.compose',
      { path },
    );
  }
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (cause) {
    throw providerError(
      'VERIFICATION_EVIDENCE_JSON_INVALID',
      'A verification evidence file is not valid JSON.',
      'verification.compose',
      { path },
      cause,
    );
  }
}

async function writePrivateJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const existing = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (
    existing !== undefined &&
    (existing.isSymbolicLink() || !existing.isFile())
  ) {
    throw providerError(
      'PRIVATE_EVIDENCE_TARGET_INVALID',
      'A fixed private evidence target is not a regular file.',
      'verification.persist',
      { path },
    );
  }
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(value, null, 2)}\n`,
    { flag: 'wx', mode: 0o600 },
  );
  try {
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
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

function signalProcessTree(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The process exit event is authoritative.
    }
  }
}

function providerError(code, message, stage, details = {}, cause) {
  return new VerificationProviderError(message, {
    code,
    stage,
    details,
    cause,
  });
}

function validatePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
}

function createRequiredBrowserMatrix() {
  const keys = [];
  for (const route of ['/resume', '/portfolio']) {
    for (const viewport of [
      '320x800',
      '479x900',
      '480x900',
      '767x1024',
      '768x1024',
      '1440x900',
      '390x844',
    ]) {
      keys.push(`responsive|chromium|${route}|${viewport}`);
    }
    for (const engine of ['firefox', 'webkit']) {
      for (const viewport of ['320x800', '1280x800']) {
        for (const javaScript of ['enabled', 'disabled']) {
          keys.push(
            `compatibility|${engine}|${route}|${viewport}|js-${javaScript}`,
          );
        }
      }
    }
    for (const viewport of ['320x800', '1440x900']) {
      for (const theme of ['light', 'dark']) {
        for (const details of ['closed', 'all-open']) {
          keys.push(
            `axe|chromium|${route}|${viewport}|${theme}|${details}`,
          );
        }
      }
    }
  }
  keys.push('print|chromium|/resume|A4');
  keys.push('print|chromium|/resume|Letter');
  return Object.freeze(keys.sort());
}

function hasExactKeys(value, keys) {
  if (!isPlainRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isExactStringArray(value, expected) {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index])
  );
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function isPassMap(value, requiredKeys) {
  return (
    hasExactKeys(value, requiredKeys) &&
    requiredKeys.every((key) => value[key] === 'pass')
  );
}

function isCompleteBrowserSummary(value) {
  return (
    hasExactKeys(value, [
      'didNotRun',
      'discovered',
      'failed',
      'passed',
      'skipped',
    ]) &&
    Number.isSafeInteger(value.discovered) &&
    value.discovered >= REQUIRED_BROWSER_SPEC_FILES.length &&
    value.passed === value.discovered &&
    value.failed === 0 &&
    value.skipped === 0 &&
    value.didNotRun === 0
  );
}

function isBrowserToolRecord(value) {
  return (
    hasExactKeys(value, [
      'axe',
      'chromium',
      'firefox',
      'playwright',
      'webkit',
    ]) &&
    Object.values(value).every(
      (version) =>
        typeof version === 'string' && version.trim().length > 0,
    )
  );
}

function isLinkRouteEvidence(value) {
  if (!Array.isArray(value) || value.length !== REQUIRED_PREVIEW_ROUTES.length) {
    return false;
  }
  const routes = new Set();
  for (const entry of value) {
    if (
      !hasExactKeys(entry, [
        'bodyBytes',
        'canonical',
        'contentType',
        'jsonLdVisibleFactParity',
        'metadataUnique',
        'route',
        'status',
        'visibleSummaryMatchesDescription',
      ]) ||
      !REQUIRED_PREVIEW_ROUTES.includes(entry.route) ||
      routes.has(entry.route) ||
      entry.status !== 200 ||
      entry.contentType !== 'text/html' ||
      !Number.isSafeInteger(entry.bodyBytes) ||
      entry.bodyBytes < 1 ||
      entry.canonical !== `https://rvnnt.dev${entry.route}` ||
      entry.metadataUnique !== true ||
      entry.visibleSummaryMatchesDescription !== true ||
      entry.jsonLdVisibleFactParity !== true
    ) {
      return false;
    }
    routes.add(entry.route);
  }
  return REQUIRED_PREVIEW_ROUTES.every((route) => routes.has(route));
}

function isExternalUrlEvidence(value) {
  if (
    !hasExactKeys(value, ['destinations', 'runtimeReachabilityRequests']) ||
    value.runtimeReachabilityRequests !== 0 ||
    !Array.isArray(value.destinations) ||
    value.destinations.length === 0
  ) {
    return false;
  }
  const urls = new Set();
  for (const destination of value.destinations) {
    if (
      !hasExactKeys(destination, [
        'checkedAt',
        'result',
        'url',
        'verifier',
      ]) ||
      destination.result !== 'approved' ||
      typeof destination.verifier !== 'string' ||
      destination.verifier.trim().length === 0 ||
      !isIsoTimestamp(destination.checkedAt) ||
      !isHttpUrl(destination.url) ||
      urls.has(destination.url)
    ) {
      return false;
    }
    urls.add(destination.url);
  }
  return true;
}

function isCompleteAssetCssEvidence(value) {
  if (
    !hasExactKeys(value, [
      'assets',
      'buildTools',
      'gzip',
      'limitGzipBytes',
      'totalGzipBytes',
      'uniqueAssetCount',
    ]) ||
    value.limitGzipBytes !== PROFILE_CSS_LIMIT_BYTES ||
    !Number.isSafeInteger(value.totalGzipBytes) ||
    value.totalGzipBytes < 0 ||
    value.totalGzipBytes > PROFILE_CSS_LIMIT_BYTES ||
    !Number.isSafeInteger(value.uniqueAssetCount) ||
    value.uniqueAssetCount < 1 ||
    !Array.isArray(value.assets) ||
    value.assets.length !== value.uniqueAssetCount ||
    !hasExactKeys(value.gzip, ['implementation', 'node', 'options']) ||
    value.gzip.implementation !== 'node:zlib.gzipSync' ||
    !hasExactKeys(value.gzip.options, ['level', 'mtime']) ||
    value.gzip.options.level !== 9 ||
    value.gzip.options.mtime !== 0 ||
    !isReviewToolSubset(value.buildTools)
  ) {
    return false;
  }
  const identities = new Set();
  let gzipTotal = 0;
  for (const asset of value.assets) {
    if (
      !hasExactKeys(asset, [
        'emittedAssetPaths',
        'finalLocations',
        'gzipBytes',
        'kind',
        'path',
        'profileStyleRoots',
        'provenanceChunks',
        'rawBytes',
        'routes',
        'sha256',
        'sourceRollupAssetPaths',
      ]) ||
      !['external', 'inline'].includes(asset.kind) ||
      typeof asset.path !== 'string' ||
      asset.path.length === 0 ||
      !isSha256(asset.sha256) ||
      !Number.isSafeInteger(asset.rawBytes) ||
      asset.rawBytes < 1 ||
      !Number.isSafeInteger(asset.gzipBytes) ||
      asset.gzipBytes < 1 ||
      !isNonEmptyUniqueStrings(asset.emittedAssetPaths) ||
      !asset.emittedAssetPaths.every(isNormalizedRelativePath) ||
      !isNonEmptyUniqueStrings(asset.profileStyleRoots) ||
      !isNonEmptyUniqueStrings(asset.provenanceChunks) ||
      !isProfileRouteSubset(asset.routes) ||
      !isCssFinalLocationList(asset.finalLocations, asset) ||
      !isUniqueNormalizedPathList(
        asset.sourceRollupAssetPaths,
        asset.kind === 'inline',
      ) ||
      (
        asset.kind === 'external' &&
        (
          asset.finalLocations.length !== 0 ||
          asset.sourceRollupAssetPaths.length !== 0 ||
          !asset.emittedAssetPaths.includes(asset.path)
        )
      ) ||
      (
        asset.kind === 'inline' &&
        (
          asset.finalLocations.length === 0 ||
          asset.sourceRollupAssetPaths.length === 0 ||
          !asset.finalLocations.every(({ documentPath }) =>
            asset.emittedAssetPaths.includes(documentPath)
          ) ||
          !asset.finalLocations.some(
            ({ documentPath, styleIndex }) =>
              asset.path === `${documentPath}#style-${styleIndex}`,
          )
        )
      ) ||
      identities.has(asset.sha256)
    ) {
      return false;
    }
    identities.add(asset.sha256);
    gzipTotal += asset.gzipBytes;
  }
  return gzipTotal === value.totalGzipBytes;
}

function isCssFinalLocationList(value, asset) {
  if (!Array.isArray(value)) return false;
  const identities = new Set();
  for (const location of value) {
    if (
      !hasExactKeys(location, [
        'documentPath',
        'documentRawBytes',
        'documentSha256',
        'endByte',
        'rawBytes',
        'sha256',
        'startByte',
        'styleIndex',
      ]) ||
      !isNormalizedRelativePath(location.documentPath) ||
      !isSha256(location.documentSha256) ||
      !Number.isSafeInteger(location.documentRawBytes) ||
      location.documentRawBytes < 1 ||
      !Number.isSafeInteger(location.styleIndex) ||
      location.styleIndex < 0 ||
      !Number.isSafeInteger(location.startByte) ||
      location.startByte < 0 ||
      !Number.isSafeInteger(location.endByte) ||
      location.endByte <= location.startByte ||
      location.endByte > location.documentRawBytes ||
      location.endByte - location.startByte !== location.rawBytes ||
      location.rawBytes !== asset.rawBytes ||
      location.sha256 !== asset.sha256
    ) {
      return false;
    }
    const identity = `${location.documentPath}#${location.styleIndex}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
  }
  return true;
}

function isUniqueNormalizedPathList(value, requireNonEmpty) {
  return (
    Array.isArray(value) &&
    (!requireNonEmpty || value.length > 0) &&
    value.every(isNormalizedRelativePath) &&
    new Set(value).size === value.length
  );
}

function isCompleteAssetJavaScriptEvidence(value, routeDocuments) {
  if (
    !hasExactKeys(value, [
      'inheritedClientChunkCount',
      'inheritedEntryAllowlist',
      'profileChunks',
      'profileEntries',
      'profileOwnedHydratedComponents',
      'profileOwnedNewClientChunks',
      'reachableChunks',
      'reachableEntries',
      'unknownReachableEntries',
    ]) ||
    value.profileOwnedHydratedComponents !== 0 ||
    value.profileOwnedNewClientChunks !== 0 ||
    !Number.isSafeInteger(value.inheritedClientChunkCount) ||
    value.inheritedClientChunkCount < 0 ||
    !isExactStringArray(
      value.inheritedEntryAllowlist,
      REQUIRED_INHERITED_CLIENT_ENTRIES,
    ) ||
    !isEmptyArray(value.unknownReachableEntries) ||
    !isEmptyArray(value.profileEntries) ||
    !isEmptyArray(value.profileChunks) ||
    !Array.isArray(value.reachableEntries) ||
    !Array.isArray(value.reachableChunks) ||
    value.reachableChunks.length !== value.inheritedClientChunkCount
  ) {
    return false;
  }

  const chunkFiles = new Set();
  for (const chunk of value.reachableChunks) {
    if (
      !hasExactKeys(chunk, [
        'file',
        'manifestKeys',
        'modules',
        'rawBytes',
        'routes',
        'sha256',
      ]) ||
      !isNormalizedRelativePath(chunk.file) ||
      chunkFiles.has(chunk.file) ||
      !isSha256(chunk.sha256) ||
      !Number.isSafeInteger(chunk.rawBytes) ||
      chunk.rawBytes < 1 ||
      !isProfileRouteSubset(chunk.routes) ||
      !isNonEmptyUniqueStrings(chunk.manifestKeys) ||
      !isNonEmptyUniqueStrings(chunk.modules)
    ) {
      return false;
    }
    chunkFiles.add(chunk.file);
  }

  for (const entry of value.reachableEntries) {
    if (
      !hasExactKeys(entry, [
        'documentPath',
        'manifestKey',
        'path',
        'role',
        'route',
        'source',
      ]) ||
      !REQUIRED_PREVIEW_ROUTES.includes(entry.route) ||
      entry.documentPath !== routeDocuments?.get(entry.route) ||
      !['component', 'modulepreload', 'renderer', 'script'].includes(
        entry.role,
      ) ||
      !isNormalizedRelativePath(entry.path) ||
      !chunkFiles.has(entry.path) ||
      typeof entry.manifestKey !== 'string' ||
      entry.manifestKey.length === 0 ||
      !REQUIRED_INHERITED_CLIENT_ENTRIES.includes(entry.source)
    ) {
      return false;
    }
  }
  return true;
}

function isProfileRouteDocumentEvidence(value, expectedDocumentPath) {
  return (
    hasExactKeys(value, [
      'clientRoots',
      'externalStyles',
      'inlineScripts',
      'inlineStyles',
      'path',
      'rawBytes',
      'sha256',
    ]) &&
    value.path === expectedDocumentPath &&
    isSha256(value.sha256) &&
    Number.isSafeInteger(value.rawBytes) &&
    value.rawBytes > 0 &&
    isUniqueNormalizedPathList(value.externalStyles, false) &&
    Array.isArray(value.inlineStyles) &&
    value.inlineStyles.every(
      (style) =>
        hasExactKeys(style, [
          'endByte',
          'rawBytes',
          'sha256',
          'startByte',
          'styleIndex',
        ]) &&
        Number.isSafeInteger(style.styleIndex) &&
        style.styleIndex >= 0 &&
        Number.isSafeInteger(style.startByte) &&
        style.startByte >= 0 &&
        Number.isSafeInteger(style.endByte) &&
        style.endByte > style.startByte &&
        style.endByte <= value.rawBytes &&
        style.endByte - style.startByte === style.rawBytes &&
        isSha256(style.sha256)
    ) &&
    Array.isArray(value.inlineScripts) &&
    value.inlineScripts.every(
      (script) =>
        hasExactKeys(script, [
          'endByte',
          'executable',
          'rawBytes',
          'scriptIndex',
          'sha256',
          'startByte',
          'type',
        ]) &&
        Number.isSafeInteger(script.scriptIndex) &&
        script.scriptIndex >= 0 &&
        (script.type === null ||
          (typeof script.type === 'string' &&
            script.type === script.type.trim().toLowerCase() &&
            script.type.length > 0)) &&
        typeof script.executable === 'boolean' &&
        script.executable === (script.type !== 'application/ld+json') &&
        Number.isSafeInteger(script.startByte) &&
        script.startByte >= 0 &&
        Number.isSafeInteger(script.endByte) &&
        script.endByte >= script.startByte &&
        script.endByte <= value.rawBytes &&
        script.endByte - script.startByte === script.rawBytes &&
        Number.isSafeInteger(script.rawBytes) &&
        script.rawBytes >= 0 &&
        isSha256(script.sha256)
    ) &&
    Array.isArray(value.clientRoots) &&
    value.clientRoots.every(
      (root) =>
        hasExactKeys(root, ['path', 'role']) &&
        ['component', 'modulepreload', 'renderer', 'script'].includes(
          root.role,
        ) &&
        isNormalizedRelativePath(root.path)
    )
  );
}

function isProfileRouteStyleEvidence(style) {
  if (!isPlainRecord(style)) return false;
  const commonKeys = [
    'depth',
    'kind',
    'order',
    'ownership',
    'path',
    'profileStyleRoots',
    'provenanceChunks',
    'rawBytes',
    'sha256',
  ];
  const inlineKeys = [
    ...commonKeys,
    'emittedAssetPath',
    'finalLocation',
    'preInlineAssetIdentity',
    'sourceRollupAssetPath',
  ];
  if (
    !hasExactKeys(
      style,
      style.kind === 'inline' ? inlineKeys : commonKeys,
    ) ||
    !['external', 'inline'].includes(style.kind) ||
    !Number.isSafeInteger(style.depth) ||
    style.depth < 0 ||
    !Number.isSafeInteger(style.order) ||
    style.order < 0 ||
    !['baseline', 'profile'].includes(style.ownership) ||
    typeof style.path !== 'string' ||
    style.path.length === 0 ||
    !isSha256(style.sha256) ||
    !Number.isSafeInteger(style.rawBytes) ||
    style.rawBytes < 1 ||
    !Array.isArray(style.profileStyleRoots) ||
    !style.profileStyleRoots.every(
      (root) => typeof root === 'string' && root.length > 0,
    ) ||
    (
      style.ownership === 'profile' &&
      style.profileStyleRoots.length === 0
    ) ||
    (
      style.ownership === 'baseline' &&
      style.profileStyleRoots.length !== 0
    ) ||
    !isNonEmptyUniqueStrings(style.provenanceChunks)
  ) {
    return false;
  }
  if (style.kind === 'external') {
    return isNormalizedRelativePath(style.path);
  }
  return (
    isNormalizedRelativePath(style.emittedAssetPath) &&
    isNormalizedRelativePath(style.sourceRollupAssetPath) &&
    hasExactKeys(style.preInlineAssetIdentity, ['rawBytes', 'sha256']) &&
    Number.isSafeInteger(style.preInlineAssetIdentity.rawBytes) &&
    style.preInlineAssetIdentity.rawBytes > 0 &&
    isSha256(style.preInlineAssetIdentity.sha256) &&
    isCssFinalLocationList(
      [style.finalLocation],
      { rawBytes: style.rawBytes, sha256: style.sha256 },
    ) &&
    style.path ===
      `${style.finalLocation.documentPath}#style-${style.finalLocation.styleIndex}` &&
    style.emittedAssetPath === style.finalLocation.documentPath
  );
}

function isAssetRouteEvidence(value, routeDocuments) {
  if (!Array.isArray(value) || value.length !== REQUIRED_PREVIEW_ROUTES.length) {
    return false;
  }
  const routes = new Set();
  for (const entry of value) {
    if (
      !hasExactKeys(entry, [
        'component',
        'document',
        'route',
        'styles',
      ]) ||
      !REQUIRED_PREVIEW_ROUTES.includes(entry.route) ||
      routes.has(entry.route) ||
      typeof entry.component !== 'string' ||
      entry.component.length === 0 ||
      !isProfileRouteDocumentEvidence(
        entry.document,
        routeDocuments?.get(entry.route),
      ) ||
      !Array.isArray(entry.styles) ||
      !entry.styles.every(isProfileRouteStyleEvidence) ||
      !entry.styles.some(
        (style) =>
          style?.ownership === 'profile' &&
          isNonEmptyUniqueStrings(style.profileStyleRoots),
      )
    ) {
      return false;
    }
    routes.add(entry.route);
  }
  return REQUIRED_PREVIEW_ROUTES.every((route) => routes.has(route));
}

function isReviewToolSubset(value) {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, ['astro', 'gzip', 'node', 'vite']) &&
    ['node', 'astro', 'vite', 'gzip'].every(
      (name) =>
        typeof value[name] === 'string' &&
        value[name].trim().length > 0,
    )
  );
}

function isCompleteRequestLedger(
  value,
  buildIdentity,
  manifestOutputs,
) {
  const buildId = buildIdentity.id;
  if (
    !Array.isArray(value.attempted) ||
    value.attempted.length === 0 ||
    !isEmptyArray(value.blocked) ||
    !Array.isArray(value.successful) ||
    value.successful.length === 0 ||
    !isEmptyArray(value.interceptionBypassed) ||
    !isEmptyArray(value.missingEmittedAssetIdentities) ||
    !isRequestGuardEvidence(value.guard) ||
    !hasExactKeys(value.external, ['attempted', 'blocked', 'successful']) ||
    value.external.attempted !== 0 ||
    value.external.blocked !== 0 ||
    value.external.successful !== 0 ||
    !isEmptyArray(value.missingProfileRoutes) ||
    !isStaticAssetEvidence(
      value.staticAssetEvidence,
      buildIdentity,
    )
  ) {
    return false;
  }

  const attemptedIds = new Set();
  const attemptedById = new Map();
  for (const record of value.attempted) {
    if (
      !isRequestRecord(record, 'attempted', value.supervisedOrigin) ||
      attemptedIds.has(record.id)
    ) {
      return false;
    }
    attemptedIds.add(record.id);
    attemptedById.set(record.id, record);
  }
  const successfulIds = new Set();
  const profileDocuments = new Set();
  let observedCss = false;
  let observedWoff2 = false;
  const observedAssets = new Map();
  for (const record of value.successful) {
    if (
      !isRequestRecord(record, 'successful', value.supervisedOrigin) ||
      successfulIds.has(record.id) ||
      !attemptedIds.has(record.id) ||
      !sameRequestObservation(record, attemptedById.get(record.id)) ||
      record.emittedAssetIdentity === null ||
      !sameAssetIdentity(
        record.emittedAssetIdentity,
        manifestOutputs.get(record.emittedAssetIdentity.path),
      ) ||
      record.status < 200 ||
      record.status >= 400
    ) {
      return false;
    }
    successfulIds.add(record.id);
    if (
      record.resourceType === 'document' &&
      record.status >= 200 &&
      record.status < 400 &&
      REQUIRED_PREVIEW_ROUTES.includes(record.logicalRoute)
    ) {
      profileDocuments.add(record.logicalRoute);
    }
    if (record.emittedAssetIdentity !== null) {
      observedAssets.set(
        record.emittedAssetIdentity.path,
        record.emittedAssetIdentity,
      );
      observedCss ||= record.emittedAssetIdentity.path.endsWith('.css');
      observedWoff2 ||= record.emittedAssetIdentity.path.endsWith('.woff2');
    }
  }
  if (
    attemptedIds.size !== successfulIds.size ||
    !REQUIRED_PREVIEW_ROUTES.every((route) => profileDocuments.has(route)) ||
    !observedCss ||
    !observedWoff2
  ) {
    return false;
  }

  const staticPaths = new Set();
  for (const asset of value.staticAssetEvidence.observedAssets) {
    if (
      !isEmittedAssetIdentity(asset) ||
      staticPaths.has(asset.path) ||
      !sameAssetIdentity(asset, manifestOutputs.get(asset.path)) ||
      !sameAssetIdentity(asset, observedAssets.get(asset.path))
    ) {
      return false;
    }
    staticPaths.add(asset.path);
  }
  return staticPaths.size === observedAssets.size;
}

function isRequestGuardEvidence(value) {
  return (
    hasExactKeys(value, [
      'inFlightRequests',
      'pages',
      'pendingHandlers',
      'routeRegistration',
    ]) &&
    ['context-unroute-fallback', 'playwright-disposable'].includes(
      value.routeRegistration,
    ) &&
    value.pendingHandlers === 0 &&
    value.inFlightRequests === 0 &&
    value.pages === 0
  );
}

function sameRequestObservation(response, attempted) {
  return (
    attempted !== undefined &&
    response.id === attempted.id &&
    response.url === attempted.url &&
    response.resourceType === attempted.resourceType &&
    response.initiator === attempted.initiator &&
    response.logicalRoute === attempted.logicalRoute &&
    response.sameOrigin === attempted.sameOrigin &&
    ((response.emittedAssetIdentity === null &&
      attempted.emittedAssetIdentity === null) ||
      sameAssetIdentity(
        response.emittedAssetIdentity,
        attempted.emittedAssetIdentity,
      ))
  );
}

function isRequestRecord(record, kind, supervisedOrigin) {
  const extraKeys =
    kind === 'successful'
      ? ['status']
      : kind === 'blocked'
        ? ['abortReason', 'blockedBeforeResponse']
        : [];
  if (
    !hasExactKeys(record, [
      'emittedAssetIdentity',
      'id',
      'initiator',
      'logicalRoute',
      'resourceType',
      'sameOrigin',
      'url',
      ...extraKeys,
    ]) ||
    !Number.isSafeInteger(record.id) ||
    record.id < 1 ||
    typeof record.resourceType !== 'string' ||
    record.resourceType.length === 0 ||
    (record.initiator !== null && typeof record.initiator !== 'string') ||
    (record.logicalRoute !== null &&
      !REQUIRED_PREVIEW_ROUTES.includes(record.logicalRoute)) ||
    record.sameOrigin !== true ||
    !sameOrigin(record.url, supervisedOrigin) ||
    (record.emittedAssetIdentity !== null &&
      !isEmittedAssetIdentity(record.emittedAssetIdentity))
  ) {
    return false;
  }
  if (
    kind === 'successful' &&
    (!Number.isSafeInteger(record.status) ||
      record.status < 100 ||
      record.status > 599)
  ) {
    return false;
  }
  return true;
}

function isStaticAssetEvidence(value, buildIdentity) {
  return (
    hasExactKeys(value, [
      'buildId',
      'manifestSha256',
      'observedAssets',
      'schemaVersion',
    ]) &&
    value.schemaVersion === 1 &&
    value.buildId === buildIdentity.id &&
    value.manifestSha256 === buildIdentity.manifestSha256 &&
    Array.isArray(value.observedAssets) &&
    value.observedAssets.length > 0
  );
}

function isEmittedAssetIdentity(value) {
  return (
    hasExactKeys(value, ['bytes', 'path', 'sha256']) &&
    typeof value.path === 'string' &&
    value.path.length > 0 &&
    !value.path.startsWith('/') &&
    Number.isSafeInteger(value.bytes) &&
    value.bytes > 0 &&
    isSha256(value.sha256)
  );
}

function sameAssetIdentity(left, right) {
  return (
    right !== undefined &&
    left.path === right.path &&
    left.bytes === right.bytes &&
    left.sha256 === right.sha256
  );
}

function isManualStateEvidence(value) {
  if (
    !Array.isArray(value) ||
    value.length !== REQUIRED_MANUAL_MATRIX.length
  ) {
    return false;
  }
  const keys = [];
  for (const state of value) {
    if (
      !hasExactKeys(state, [
        'checks',
        'details',
        'engine',
        'route',
        'theme',
        'viewport',
      ]) ||
      !REQUIRED_PREVIEW_ROUTES.includes(state.route) ||
      state.engine !== 'chromium' ||
      !['320x800', '1440x900'].includes(state.viewport) ||
      !['light', 'dark'].includes(state.theme) ||
      !['closed', 'all-open', 'not-applicable'].includes(state.details) ||
      (state.route === '/resume' && state.details === 'not-applicable') ||
      (state.route === '/portfolio' && state.details !== 'not-applicable') ||
      !isPassMap(state.checks, REQUIRED_MANUAL_CHECKS)
    ) {
      return false;
    }
    keys.push(
      [
        state.route,
        state.engine,
        state.viewport,
        state.theme,
        state.details,
      ].join('|'),
    );
  }
  return isExactStringArray(keys.sort(), REQUIRED_MANUAL_MATRIX);
}

function isTargetSizeExceptionEvidence(value) {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      hasExactKeys(entry, ['element', 'rationale', 'wcagException']) &&
      [entry.element, entry.rationale, entry.wcagException].every(
        (field) =>
          typeof field === 'string' && field.trim().length > 0,
      ),
  );
}

function isReviewAuthoredFileList(value) {
  if (!Array.isArray(value)) return false;
  const paths = new Set();
  const valid = value.every((entry, index) => {
    const valid =
      hasExactKeys(entry, ['bytes', 'path', 'sha256']) &&
      isNormalizedRelativePath(entry.path) &&
      Number.isSafeInteger(entry.bytes) &&
      entry.bytes >= 0 &&
      isSha256(entry.sha256) &&
      !paths.has(entry.path) &&
      (REVIEW_SUBJECT_SOURCE_FILES.includes(entry.path) ||
        REVIEW_SUBJECT_SOURCE_DIRECTORIES.some((directory) =>
          entry.path.startsWith(`${directory}/`),
        )) &&
      (index === 0 ||
        compareIdentity(value[index - 1], entry) < 0);
    paths.add(entry.path);
    return valid;
  });
  return (
    valid &&
    REVIEW_SUBJECT_SOURCE_FILES.every((path) => paths.has(path)) &&
    REVIEW_SUBJECT_SOURCE_DIRECTORIES.every((directory) =>
      [...paths].some((path) => path.startsWith(`${directory}/`)),
    )
  );
}

function isBuildAssetIdentityList(value) {
  if (!Array.isArray(value)) return false;
  const identities = new Set();
  const valid = value.every((entry, index) => {
    const key = `${entry?.route}\0${entry?.kind}\0${entry?.path}`;
    const valid =
      hasExactKeys(entry, ['bytes', 'kind', 'path', 'route', 'sha256']) &&
      REQUIRED_PREVIEW_ROUTES.includes(entry.route) &&
      ['route-css', 'route-html', 'route-js'].includes(entry.kind) &&
      (
        isNormalizedRelativePath(entry.path) ||
        (
          entry.kind === 'route-css' &&
          typeof entry.path === 'string' &&
          entry.path.startsWith('inline:')
        )
      ) &&
      Number.isSafeInteger(entry.bytes) &&
      entry.bytes >= 0 &&
      isSha256(entry.sha256) &&
      !identities.has(key) &&
      (index === 0 ||
        compareBuildAsset(value[index - 1], entry) < 0);
    identities.add(key);
    return valid;
  });
  return (
    valid &&
    REQUIRED_PREVIEW_ROUTES.every(
      (route) =>
        value.filter(
          (entry) =>
            entry.route === route &&
            entry.kind === 'route-html',
        ).length === 1 &&
        value.some(
          (entry) =>
            entry.route === route &&
            entry.kind === 'route-css',
        ),
    )
  );
}

function isNormalizedRelativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    value
      .split('/')
      .every((segment) => !['', '.', '..'].includes(segment))
  );
}

function isReviewToolRecord(value) {
  return (
    hasExactKeys(value, ['astro', 'axe', 'node', 'playwright', 'vite']) &&
    Object.values(value).every(
      (version) =>
        typeof version === 'string' && version.trim().length > 0,
    )
  );
}

function isProfileRouteSubset(value) {
  return (
    isNonEmptyUniqueStrings(value) &&
    value.every((route) => REQUIRED_PREVIEW_ROUTES.includes(route))
  );
}

function isNonEmptyUniqueStrings(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (entry) => typeof entry === 'string' && entry.length > 0,
    ) &&
    new Set(value).size === value.length
  );
}

function isSupervisedOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      url.port.length > 0 &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === '' &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

function sameOrigin(value, expectedOrigin) {
  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.hostname !== 'localhost' &&
      url.hostname !== '::1' &&
      url.hostname !== '[::1]' &&
      !/^127(?:\.\d{1,3}){3}$/u.test(url.hostname)
    );
  } catch {
    return false;
  }
}

function isIsoTimestamp(value) {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    value === new Date(value).toISOString()
  );
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
      .test(value)
  );
}

function isUniqueUuidArray(value, maximumLength) {
  return (
    Array.isArray(value) &&
    value.length <= maximumLength &&
    value.every(isUuid) &&
    new Set(value).size === value.length
  );
}

function isSerializedProcessError(value) {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, ['code', 'message', 'name']) &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.message === 'string' &&
    value.message.length > 0 &&
    (value.code === null || typeof value.code === 'string')
  );
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
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

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== 'e2e') {
    throw providerError(
      'U1_COMMAND_INVALID',
      'Usage: node scripts/profile/verification-provider.mjs e2e',
      'command.route',
    );
  }
  const result = await runE2EVerification();
  process.stdout.write(
    `${JSON.stringify({
      command: result.command,
      result: result.result,
      buildId: result.buildIdentity.id,
      evidencePath: relative(
        PROFILE_PATHS.siteRoot,
        PROFILE_PATHS.e2eVerificationPath,
      ),
    })}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    const diagnostic = {
      name: error?.name ?? typeof error,
      errorCode:
        error?.errorCode ?? error?.code ?? 'U1_COMMAND_FAILED',
      stage: error?.stage ?? 'command.unknown',
      rule: error?.rule ?? null,
      attempt:
        Number.isSafeInteger(error?.attempt) ? error.attempt : null,
      identities:
        Array.isArray(error?.identities) ? error.identities : [],
      details:
        isPlainRecord(error?.details) ? error.details : {},
    };
    process.stderr.write(`${JSON.stringify(diagnostic)}\n`);
    process.exitCode = 1;
  });
}

export const verificationEvidenceSchema = deepFreeze({
  schemaVersion: 1,
  accessibilityReviewSubjectSchemaVersion:
    ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION,
  browserSpecFiles: [...REQUIRED_BROWSER_SPEC_FILES],
  browserObligations: [...REQUIRED_BROWSER_OBLIGATIONS],
  browserMatrix: [...REQUIRED_BROWSER_MATRIX],
  linkChecks: [...REQUIRED_LINK_CHECKS],
  manualChecks: [...REQUIRED_MANUAL_CHECKS],
  manualMatrix: [...REQUIRED_MANUAL_MATRIX],
  reviewSubjectSourceFiles: [...REVIEW_SUBJECT_SOURCE_FILES],
  reviewSubjectSourceDirectories: [
    ...REVIEW_SUBJECT_SOURCE_DIRECTORIES,
  ],
});

/**
 * Read-only revalidation of whatever is currently tracked.
 *
 * Any lock or journal means a release is in flight or was interrupted, and
 * this command stops there. It holds no mutation authority, so "repair it" is
 * not an option it could take even if that looked helpful — an incomplete
 * release reported as current is exactly what this exists to prevent.
 */
export async function verifyCurrentRelease({
  buildTimeoutMs,
  renderTimeoutMs,
} = {}) {
  const { inspectReleaseState, readCurrentReleasePair } = await import(
    './release-store.mjs'
  );
  const state = await inspectReleaseState();
  // A lock with no journal is not an interrupted transaction. The journal is
  // removed only at finalize, so this is a release that completed and then
  // could not unlink its own lock. The two need opposite handling — one needs
  // rollback, the other only needs the lock removed — and reporting both as
  // RELEASE_INCOMPLETE left the operator unable to tell which they had.
  if (state.lockPresent && !state.journalPresent) {
    throw providerError(
      'RELEASE_LOCK_ORPHANED',
      'A release lock remains with no journal: the last release completed but could not remove its lock. Remove the lock file to unblock further releases; no rollback is required.',
      'verification.release.current',
      { lockPresent: true, journalPresent: false, state: state.state },
    );
  }
  if (state.active) {
    throw providerError(
      'RELEASE_INCOMPLETE',
      'An unresolved release journal is present; the tracked pair cannot be verified as current.',
      'verification.release.current',
      {
        state: state.state,
        lockPresent: state.lockPresent,
        journalPresent: state.journalPresent,
      },
    );
  }

  const pair = await readCurrentReleasePair();
  if (!pair.present) {
    throw providerError(
      'RELEASE_ABSENT',
      'No tracked résumé release exists yet.',
      'verification.release.current',
      {},
    );
  }

  const { loadProfileReleaseTools } = await import(
    './compile-profile-tools.mjs'
  );
  const tools = await loadProfileReleaseTools();
  const manifest = await tools.buildCurrentResumeManifest();
  const receipt = pair.receipt.value;

  // The receipt must describe the bytes on disk *and* the current source. One
  // that only agrees with itself would let a stale release survive a source
  // change unnoticed.
  if (receipt?.pdfSha256 !== pair.pdf.sha256) {
    throw providerError(
      'RELEASE_PAIR_MISMATCH',
      'The tracked receipt does not name the public PDF on disk.',
      'verification.release.current',
      {},
    );
  }
  if (
    receipt.sourceIdentity?.digest !== manifest.sourceIdentity.digest ||
    receipt.manifestFingerprint?.digest !== manifest.fingerprint.digest
  ) {
    throw providerError(
      'RELEASE_STALE',
      'The tracked release was approved against a different source or manifest.',
      'verification.release.current',
      {},
    );
  }

  // Everything above is cheap correspondence and runs first so a stale or
  // mismatched pair fails before a multi-minute build. Everything below is the
  // §5.2 obligation proper: the tracked PDF is re-inspected against surfaces
  // freshly rendered from current source, because digests only prove the
  // receipt and the bytes agree — not that those bytes still say what the site
  // says today.
  const reinspection = await reinspectTrackedRelease({
    pair,
    manifest,
    tools,
    buildTimeoutMs,
    renderTimeoutMs,
  });

  return deepFreeze({
    rule: PROVIDER_RULE,
    group: 'document',
    result: 'pass',
    releaseState: state.state,
    candidateId: receipt.candidateId,
    pdfSha256: pair.pdf.sha256,
    receiptSha256: pair.receipt.sha256,
    sourceIdentity: manifest.sourceIdentity.digest,
    manifestFingerprint: manifest.fingerprint.digest,
    buildId: reinspection.buildId,
    pageCount: reinspection.pageCount,
    mappedFacts: reinspection.mappedFacts,
    surfaceParity: reinspection.surfaceParity,
  });
}

/** Routes for the supervised preview the reinspection observes. */
const REINSPECTION_ROUTES = Object.freeze(['/resume', '/portfolio']);

/**
 * Unwraps a pure result, which reports issues instead of throwing.
 *
 * Reading `.value` without checking would hand the caller `undefined` and let a
 * structurally valid verdict describe nothing — the exact failure shape this
 * unit has produced five times.
 */
function requireReinspectionValue(result, what) {
  if (result?.ok) return result.value;
  throw providerError(
    'RELEASE_REINSPECTION_INVALID',
    `The tracked release failed reinspection at the ${what} stage.`,
    'verification.release.reinspect',
    { what, issues: result?.issues ?? null },
  );
}

/**
 * Clean build, supervised preview, and full four-surface reinspection of the
 * PDF already on disk.
 *
 * The tracked PDF is never re-rendered. Re-rendering would compare the source
 * against a second render of itself and always agree, while the file actually
 * published went unchecked — and since the renderer is not byte-reproducible,
 * a fresh render could not be compared to the tracked bytes anyway. So the
 * surfaces are observed fresh and the *existing* bytes are extracted and
 * matched against them.
 *
 * This mutates nothing tracked. The build writes gitignored `dist/`, the
 * preview is a local loopback process, and the inspector only reads.
 */
async function reinspectTrackedRelease({
  pair,
  manifest,
  tools,
  buildTimeoutMs,
  renderTimeoutMs,
}) {
  const { renderResumePdfCandidate } = await import('./pdf-renderer.mjs');
  const { inspectResumePdfCandidate } = await import('./pdf-inspector.mjs');

  await ensureHomepageFixtureContent();
  const buildIdentity = await cleanProfileBuild(
    buildTimeoutMs === undefined ? {} : { timeoutMs: buildTimeoutMs },
  );

  let lease;
  try {
    lease = await startStaticPreview({
      distRoot: buildIdentity.root,
      buildIdentity,
      requiredRoutes: REINSPECTION_ROUTES,
    });

    // The ledger maps each response back to a file the build emitted, so the
    // identities must come from the build manifest. An empty list does not
    // disable the check; it makes every response unmappable.
    const buildManifest = JSON.parse(
      await readFile(buildIdentity.manifestPath, 'utf8'),
    );

    const observed = await renderResumePdfCandidate({
      baseURL: lease.baseURL,
      buildIdentity,
      manifest,
      schemaVersion: tools.RESUME_EVIDENCE_SCHEMA_VERSION,
      emittedAssets: buildManifest.outputFiles,
      // No candidate is minted. This call is here for its observations only.
      emitCandidate: false,
      ...(renderTimeoutMs === undefined ? {} : { timeoutMs: renderTimeoutMs }),
    });

    const snapshot = (
      await inspectResumePdfCandidate({
        candidatePath: pair.pdf.path,
        candidate: Object.freeze({
          candidateId: pair.receipt.value.candidateId,
          pdfSha256: pair.pdf.sha256,
        }),
        sourceIdentity: manifest.sourceIdentity,
        manifestFingerprint: manifest.fingerprint,
        skeleton: observed.skeleton,
        tools: observed.tools,
      })
    ).snapshot;

    const web = requireReinspectionValue(
      tools.compareRenderedManifest(manifest, observed.webSurface),
      'web surface',
    );
    const print = requireReinspectionValue(
      tools.compareRenderedManifest(manifest, observed.printSurface),
      'print surface',
    );
    const pdfEvidence = requireReinspectionValue(
      tools.mapPdfEvidence(manifest, snapshot),
      'PDF evidence',
    );
    requireReinspectionValue(
      tools.compareResumeSurfaces({
        expected: manifest,
        web,
        print,
        pdf: pdfEvidence,
      }),
      'cross-surface comparison',
    );

    return Object.freeze({
      // The field is `id` on the build identity, not `buildId`. Naming it
      // wrong produced no error at all — JSON.stringify simply omitted the
      // undefined value, so the verdict silently lost a field it claimed.
      buildId: buildIdentity.id,
      pageCount: snapshot.pageCount,
      mappedFacts: pdfEvidence.mappings.length,
      surfaceParity: 'pass',
    });
  } finally {
    if (lease !== undefined) {
      await lease.cleanup();
    }
  }
}

/**
 * Transaction-scoped observation of a pending pair, for the promote process
 * only.
 *
 * The capability is resolved by the store that issued it, so this cannot be
 * aimed at another transaction. The verdict is explicitly not a claim that the
 * pair is the current release — the neutral CLI still has to route it to
 * `finalize` or `rollback`.
 */
export async function verifyPendingRelease(capability, secondBuildIdentity) {
  const { describePendingRelease, readCurrentReleasePair } = await import(
    './release-store.mjs'
  );
  const pending = describePendingRelease(capability);
  if (pending.state !== 'PDF_COMMITTED') {
    throw providerError(
      'RELEASE_PENDING_STATE_INVALID',
      'A pending release may only be observed at the public commit point.',
      'verification.release.pending',
      { state: pending.state },
    );
  }
  if (typeof secondBuildIdentity?.id !== 'string') {
    throw providerError(
      'RELEASE_SECOND_BUILD_INVALID',
      'A pending release verification requires the clean second build identity.',
      'verification.release.pending',
      {},
    );
  }

  const pair = await readCurrentReleasePair();
  if (
    !pair.present ||
    pair.pdf.sha256 !== pending.pdfSha256 ||
    pair.receipt.sha256 !== pending.receiptSha256
  ) {
    throw providerError(
      'RELEASE_PENDING_PAIR_MISMATCH',
      'The tracked pair is not the exact pair this transaction committed.',
      'verification.release.pending',
      {},
    );
  }

  // The second build must have consumed the promoted PDF as ordinary static
  // input. A dist without it means the release would ship a route pointing at
  // a document the build never saw.
  const distPdf = resolve(PROFILE_PATHS.distRoot, 'resume.pdf');
  let distSha256;
  try {
    distSha256 = createHash('sha256')
      .update(await readFile(distPdf))
      .digest('hex');
  } catch {
    throw providerError(
      'RELEASE_SECOND_BUILD_MISSING_PDF',
      'The clean second build did not materialize the promoted résumé PDF.',
      'verification.release.pending',
      { distPdf },
    );
  }
  if (distSha256 !== pending.pdfSha256) {
    throw providerError(
      'RELEASE_SECOND_BUILD_PDF_MISMATCH',
      'The second build emitted different résumé PDF bytes than were promoted.',
      'verification.release.pending',
      {},
    );
  }

  return deepFreeze({
    rule: PROVIDER_RULE,
    group: 'document',
    result: 'pass',
    scope: 'pending-transaction',
    journalId: pending.journalId,
    buildId: secondBuildIdentity.id,
    pdfSha256: pending.pdfSha256,
    receiptSha256: pending.receiptSha256,
  });
}

export const verificationProviderTesting = Object.freeze({
  digestAccessibilityReviewSubject,
  isEligibleIsolatedBrowserLaunchFailure,
  parseBrowserPreflightPass,
  processCleanupEvidence,
  requireAssetBudget,
  requireAccessibilityReviewSubject,
  requireBrowserEvidence,
  requireLinkMetadataEvidence,
  requireManualRecord,
  requireRequestLedger,
});
