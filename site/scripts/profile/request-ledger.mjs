const LEDGER_RULE = 'PERF-02/LC-U1-06';
const PROFILE_ROUTES = Object.freeze(['/resume', '/portfolio']);
const DEFAULT_FINALIZE_TIMEOUT_MS = 5_000;
const MAX_FINALIZE_TIMEOUT_MS = 120_000;
const installedContexts = new WeakSet();

export class BrowserRequestLedgerError extends Error {
  constructor(message, { code, stage = 'request.ledger', details = {}, cause }) {
    super(message, { cause });
    this.name = 'BrowserRequestLedgerError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = LEDGER_RULE;
    this.details = deepFreeze(structuredClone(details));
  }
}

/**
 * Must be awaited immediately after BrowserContext creation and before a page
 * is created. The route guard aborts every non-supervised-origin request before
 * a response can exist and preserves attempted/blocked/successful evidence.
 */
export async function installRequestLedger(
  context,
  {
    baseURL,
    emittedAssets = [],
    buildIdentity,
  } = {},
) {
  validateContext(context);
  if (installedContexts.has(context)) {
    throw ledgerError(
      'REQUEST_LEDGER_ALREADY_INSTALLED',
      'A request ledger is already installed on this browser context.',
    );
  }
  if (context.pages().length !== 0) {
    throw ledgerError(
      'REQUEST_LEDGER_INSTALLED_TOO_LATE',
      'The request ledger must be installed before the first page is created.',
      { pageCount: context.pages().length },
    );
  }

  const supervisedOrigin = validateSupervisedOrigin(baseURL);
  const assetIndex = indexEmittedAssets(emittedAssets);
  const immutableBuildIdentity = cloneJson(buildIdentity, 'buildIdentity');
  const attempted = [];
  const blocked = [];
  const successful = [];
  const requestRecords = new WeakMap();
  const pendingHandlers = new Set();
  const inFlightRequests = new Set();
  const bypassedRequests = [];
  let sequence = 0;
  let phase = 'active';
  let eventFailure = null;
  let routeRegistration;

  const routeHandler = (route) => {
    const operation = handleRoute(route);
    pendingHandlers.add(operation);
    void operation.then(
      () => pendingHandlers.delete(operation),
      () => pendingHandlers.delete(operation),
    );
    return operation;
  };

  const handleRoute = async (route) => {
    const request = route.request();
    const record = observeRequest({
      id: ++sequence,
      request,
      supervisedOrigin,
      assetIndex,
    });
    attempted.push(record);
    requestRecords.set(request, record);
    inFlightRequests.add(request);

    if (!record.sameOrigin || phase !== 'active') {
      blocked.push(
        deepFreeze({
          ...record,
          blockedBeforeResponse: true,
          abortReason: 'blockedbyclient',
          blockClass: record.sameOrigin
            ? 'ledger-finalization-barrier'
            : 'non-supervised-origin',
        }),
      );
      await route.abort('blockedbyclient');
      inFlightRequests.delete(request);
      return;
    }

    await route.continue();
  };

  const responseHandler = (response) => {
    let request;
    try {
      request = response.request();
      let initial = requestRecords.get(request);
      if (initial === undefined) {
        initial = observeRequest({
          id: ++sequence,
          request,
          supervisedOrigin,
          assetIndex,
        });
        attempted.push(initial);
        requestRecords.set(request, initial);
        bypassedRequests.push(initial);
      }
      const responseURL = safeUrl(response.url());
      successful.push(
        deepFreeze({
          ...initial,
          url: responseURL.href,
          sameOrigin: responseURL.origin === supervisedOrigin,
          status: response.status(),
        }),
      );
      inFlightRequests.delete(request);
    } catch (error) {
      if (request !== undefined) inFlightRequests.delete(request);
      eventFailure ??= error;
    }
  };

  const requestFailedHandler = (request) => {
    inFlightRequests.delete(request);
  };

  routeRegistration = await context.route('**/*', routeHandler);
  context.on('response', responseHandler);
  context.on('requestfailed', requestFailedHandler);
  if (context.pages().length !== 0) {
    await disposeRouteRegistration({
      context,
      routeHandler,
      routeRegistration,
    });
    context.off('response', responseHandler);
    context.off('requestfailed', requestFailedHandler);
    throw ledgerError(
      'REQUEST_LEDGER_INSTALLATION_RACED',
      'A page was created before request interception finished installing.',
      { pageCount: context.pages().length },
    );
  }
  installedContexts.add(context);

  return Object.freeze({
    kind: 'profile-browser-request-ledger',
    supervisedOrigin,
    buildIdentity: immutableBuildIdentity,
    async finalize({
      requireProfileRoutes = true,
      staticAssetEvidence,
      timeoutMs = DEFAULT_FINALIZE_TIMEOUT_MS,
    } = {}) {
      if (phase !== 'active') {
        throw ledgerError(
          'REQUEST_LEDGER_ALREADY_FINALIZED',
          'The request ledger can only be finalized once.',
        );
      }
      if (context.pages().length !== 0) {
        throw ledgerError(
          'REQUEST_LEDGER_ACTIVE_PAGES',
          'All browser pages must be closed before final request evidence is sealed.',
          { pageCount: context.pages().length },
        );
      }
      validateFinalizeTimeout(timeoutMs);
      phase = 'finalizing';
      let guardEvidence;
      try {
        const disposal = await disposeRouteRegistration({
          context,
          routeHandler,
          routeRegistration,
        });
        await drainLedger({
          pendingHandlers,
          inFlightRequests,
          timeoutMs,
        });
        context.off('response', responseHandler);
        context.off('requestfailed', requestFailedHandler);
        phase = 'finalized';
        guardEvidence = deepFreeze({
          routeRegistration: disposal,
          pendingHandlers: pendingHandlers.size,
          inFlightRequests: inFlightRequests.size,
          pages: context.pages().length,
        });
      } catch (cause) {
        context.off('response', responseHandler);
        context.off('requestfailed', requestFailedHandler);
        phase = 'finalized';
        throw ledgerError(
          'REQUEST_LEDGER_FINALIZATION_FAILED',
          'The request guard could not be disposed and drained cleanly.',
          {
            pendingHandlers: pendingHandlers.size,
            inFlightRequests: inFlightRequests.size,
          },
          cause,
        );
      }
      if (eventFailure !== null) {
        throw ledgerError(
          'REQUEST_LEDGER_EVENT_FAILED',
          'A browser request event could not be recorded.',
          {},
          eventFailure,
        );
      }
      const evidence = createEvidence({
        supervisedOrigin,
        buildIdentity: immutableBuildIdentity,
        attempted,
        blocked,
        successful,
        requireProfileRoutes,
        staticAssetEvidence,
        bypassedRequests,
        guardEvidence,
      });
      if (evidence.interceptionBypassed.length > 0) {
        throw ledgerError(
          'REQUEST_INTERCEPTION_BYPASSED',
          'A browser response was observed without passing through the request guard.',
          evidence,
        );
      }
      if (evidence.external.attempted > 0) {
        throw ledgerError(
          'NON_LOOPBACK_REQUEST_ATTEMPTED',
          'A profile browser attempted a non-loopback request; it was blocked before response.',
          evidence,
        );
      }
      if (evidence.external.successful > 0) {
        throw ledgerError(
          'NON_LOOPBACK_RESPONSE_OBSERVED',
          'A non-loopback request produced a response despite the guard.',
          evidence,
        );
      }
      if (requireProfileRoutes && evidence.missingProfileRoutes.length > 0) {
        throw ledgerError(
          'PROFILE_ROUTE_REQUEST_EVIDENCE_MISSING',
          'The request ledger lacks successful document evidence for a required profile route.',
          evidence,
        );
      }
      if (evidence.missingEmittedAssetIdentities.length > 0) {
        throw ledgerError(
          'EMITTED_ASSET_IDENTITY_MISSING',
          'A successful supervised response cannot be mapped to emitted build output.',
          evidence,
        );
      }
      return evidence;
    },
    snapshot() {
      return createEvidence({
        supervisedOrigin,
        buildIdentity: immutableBuildIdentity,
        attempted,
        blocked,
        successful,
        requireProfileRoutes: false,
        bypassedRequests,
        guardEvidence: {
          routeRegistration: phase === 'active' ? 'installed' : 'disposed',
          pendingHandlers: pendingHandlers.size,
          inFlightRequests: inFlightRequests.size,
          pages: context.pages().length,
        },
      });
    },
  });
}

function observeRequest({ id, request, supervisedOrigin, assetIndex }) {
  const url = safeUrl(request.url());
  const resourceType = safeMethod(request, 'resourceType', 'unknown');
  const initiator = observeInitiator(request);
  const logicalRoute = observeLogicalRoute({
    request,
    url,
    resourceType,
  });
  const pathname = url.origin === supervisedOrigin ? url.pathname : null;
  return deepFreeze({
    id,
    url: url.href,
    resourceType,
    initiator,
    logicalRoute,
    sameOrigin: url.origin === supervisedOrigin,
    emittedAssetIdentity:
      pathname === null ? null : assetIndex.resolve(pathname),
  });
}

function observeInitiator(request) {
  try {
    const frameURL = request.frame()?.url();
    return typeof frameURL === 'string' && frameURL.length > 0
      ? frameURL
      : null;
  } catch {
    return null;
  }
}

function observeLogicalRoute({ request, url, resourceType }) {
  if (
    resourceType === 'document' ||
    safeMethod(request, 'isNavigationRequest', false) === true
  ) {
    return normalizeProfileRoute(url.pathname);
  }
  const initiator = observeInitiator(request);
  if (initiator === null) return null;
  try {
    return normalizeProfileRoute(new URL(initiator).pathname);
  } catch {
    return null;
  }
}

function normalizeProfileRoute(pathname) {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return PROFILE_ROUTES.includes(normalized) ? normalized : null;
}

function createEvidence({
  supervisedOrigin,
  buildIdentity,
  attempted,
  blocked,
  successful,
  requireProfileRoutes,
  staticAssetEvidence,
  bypassedRequests = [],
  guardEvidence = null,
}) {
  const attemptedSnapshot = attempted.map(cloneFrozen);
  const blockedSnapshot = blocked.map(cloneFrozen);
  const successfulSnapshot = successful.map(cloneFrozen);
  const successfulProfileDocuments = new Set(
    successfulSnapshot
      .filter(
        ({ logicalRoute, resourceType, sameOrigin, status }) =>
          logicalRoute !== null &&
          resourceType === 'document' &&
          sameOrigin &&
          status === 200,
      )
      .map(({ logicalRoute }) => logicalRoute),
  );
  const missingProfileRoutes = requireProfileRoutes
    ? PROFILE_ROUTES.filter((route) => !successfulProfileDocuments.has(route))
    : [];
  const externalAttempted = attemptedSnapshot.filter(
    ({ sameOrigin }) => !sameOrigin,
  );
  const externalBlocked = blockedSnapshot.filter(
    ({ sameOrigin }) => !sameOrigin,
  );
  const externalSuccessful = successfulSnapshot.filter(
    ({ sameOrigin }) => !sameOrigin,
  );
  const missingEmittedAssetIdentities = successfulSnapshot.filter(
    ({ sameOrigin, status, emittedAssetIdentity }) =>
      sameOrigin &&
      status === 200 &&
      emittedAssetIdentity === null,
  );

  return deepFreeze({
    schemaVersion: 1,
    rule: LEDGER_RULE,
    supervisedOrigin,
    buildIdentity,
    attempted: attemptedSnapshot,
    blocked: blockedSnapshot,
    successful: successfulSnapshot,
    external: {
      attempted: externalAttempted.length,
      blocked: externalBlocked.length,
      successful: externalSuccessful.length,
    },
    missingProfileRoutes,
    missingEmittedAssetIdentities,
    interceptionBypassed: bypassedRequests.map(cloneFrozen),
    guard: guardEvidence === null
      ? null
      : cloneJson(guardEvidence, 'guardEvidence'),
    staticAssetEvidence:
      staticAssetEvidence === undefined
        ? null
        : cloneJson(staticAssetEvidence, 'staticAssetEvidence'),
  });
}

function validateContext(context) {
  if (
    context === null ||
    typeof context !== 'object' ||
    typeof context.pages !== 'function' ||
    typeof context.route !== 'function' ||
    typeof context.on !== 'function' ||
    typeof context.off !== 'function'
  ) {
    throw new TypeError('context must implement the Playwright BrowserContext contract');
  }
}

function validateSupervisedOrigin(baseURL) {
  let parsed;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new TypeError('baseURL must be an absolute supervised loopback URL');
  }
  if (
    parsed.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    parsed.port.length === 0 ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new TypeError(
      'baseURL must be one exact http loopback origin with an explicit port',
    );
  }
  return parsed.origin;
}

function indexEmittedAssets(assets) {
  if (!Array.isArray(assets)) {
    throw new TypeError('emittedAssets must be an array');
  }
  const result = new Map();
  for (const asset of assets) {
    if (
      !asset ||
      typeof asset.path !== 'string' ||
      asset.path.startsWith('/') ||
      asset.path.includes('\\') ||
      asset.path.includes('\0') ||
      asset.path.split('/').some(
        (segment) => segment === '' || segment === '.' || segment === '..',
      ) ||
      !/^[a-f0-9]{64}$/u.test(asset.sha256) ||
      !Number.isSafeInteger(asset.bytes) ||
      asset.bytes < 0
    ) {
      throw new TypeError('emittedAssets contains an invalid identity');
    }
    if (result.has(asset.path)) {
      throw new TypeError(`emittedAssets contains duplicate path ${asset.path}`);
    }
    result.set(
      asset.path,
      deepFreeze({
        path: asset.path,
        sha256: asset.sha256,
        bytes: asset.bytes,
      }),
    );
  }
  return Object.freeze({
    resolve(pathname) {
      const candidates = staticOutputCandidates(pathname);
      for (const candidate of candidates) {
        const identity = result.get(candidate);
        if (identity !== undefined) return identity;
      }
      return null;
    },
    entries: Object.freeze([...result.entries()]),
  });
}

function staticOutputCandidates(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return [];
  }
  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    decoded.includes('\0') ||
    decoded.includes('?') ||
    decoded.includes('#')
  ) {
    return [];
  }
  const segments = decoded.split('/').filter(Boolean);
  if (
    decoded.split('/').some(
      (segment, index, entries) =>
        segment === '.' ||
        segment === '..' ||
        (segment === '' && index !== 0 && index !== entries.length - 1),
    )
  ) {
    return [];
  }
  if (segments.length === 0 || decoded.endsWith('/')) {
    return [[...segments, 'index.html'].join('/')];
  }
  const finalSegment = segments.at(-1);
  if (finalSegment.lastIndexOf('.') <= 0) {
    return [
      [...segments, 'index.html'].join('/'),
      [...segments.slice(0, -1), `${finalSegment}.html`].join('/'),
    ];
  }
  return [segments.join('/')];
}

async function disposeRouteRegistration({
  context,
  routeHandler,
  routeRegistration,
}) {
  if (
    routeRegistration !== null &&
    typeof routeRegistration === 'object' &&
    typeof routeRegistration.dispose === 'function'
  ) {
    await routeRegistration.dispose();
    return 'playwright-disposable';
  }
  if (typeof context.unroute === 'function') {
    await context.unroute('**/*', routeHandler);
    return 'context-unroute-fallback';
  }
  throw ledgerError(
    'REQUEST_LEDGER_ROUTE_DISPOSAL_UNAVAILABLE',
    'The installed request guard does not expose a disposal operation.',
  );
}

async function drainLedger({
  pendingHandlers,
  inFlightRequests,
  timeoutMs,
}) {
  const deadline = Date.now() + timeoutMs;
  while (pendingHandlers.size > 0 || inFlightRequests.size > 0) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw ledgerError(
        'REQUEST_LEDGER_DRAIN_TIMEOUT',
        'Request handlers or continued requests remained active at finalization.',
        {
          timeoutMs,
          pendingHandlers: pendingHandlers.size,
          inFlightRequests: inFlightRequests.size,
        },
      );
    }
    await new Promise((resolvePromise) =>
      setTimeout(resolvePromise, Math.min(10, remainingMs))
    );
  }
}

function validateFinalizeTimeout(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_FINALIZE_TIMEOUT_MS
  ) {
    throw new TypeError(
      `timeoutMs must be a positive safe integer no greater than ${MAX_FINALIZE_TIMEOUT_MS}`,
    );
  }
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch (cause) {
    throw ledgerError(
      'REQUEST_URL_INVALID',
      'The browser exposed an invalid request URL.',
      { value: String(value) },
      cause,
    );
  }
}

function safeMethod(target, method, fallback) {
  try {
    const value = target[method]();
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function cloneJson(value, label) {
  if (value === undefined) return null;
  try {
    return deepFreeze(structuredClone(value));
  } catch (cause) {
    throw new TypeError(`${label} must be structured-clone compatible`, {
      cause,
    });
  }
}

function cloneFrozen(value) {
  return deepFreeze(structuredClone(value));
}

function ledgerError(code, message, details = {}, cause) {
  return new BrowserRequestLedgerError(message, {
    code,
    details,
    cause,
  });
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

export const requestLedgerTesting = Object.freeze({
  createEvidence,
  indexEmittedAssets,
  staticOutputCandidates,
  validateSupervisedOrigin,
});
