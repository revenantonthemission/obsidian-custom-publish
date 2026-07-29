const MAX_STARTUP_ATTEMPTS = 2;

export const STARTUP_RETRY_RULE = 'RES-01/LC-U1-02';
export const RETRY_ELIGIBLE_STARTUP_STAGES = Object.freeze([
  'startup.preview.launch',
  'startup.preview.readiness',
  'startup.browser.launch',
]);

const retryEligibleStages = new Set(RETRY_ELIGIBLE_STARTUP_STAGES);
const alreadyCleanedRetryError = Symbol('alreadyCleanedRetryError');
const resourceWords = new Set([
  'context',
  'instance',
  'pid',
  'port',
  'process',
]);
const identitySuffixes = new Set([
  'id',
  'identity',
  'ids',
  'number',
  'token',
]);

export class StartupStageError extends Error {
  constructor({ stage, errorCode, message, details = {}, cause }) {
    super(
      `${checkedText(errorCode, 'errorCode')}: ${checkedText(message, 'message')}`,
      { cause },
    );
    this.name = 'StartupStageError';
    this.stage = checkedText(stage, 'stage');
    this.code = errorCode;
    this.errorCode = errorCode;
    this.failureMessage = message;
    this.rule = STARTUP_RETRY_RULE;
    this.details = snapshotJson(details, 'details');
  }
}

export class StartupRetryError extends Error {
  constructor({
    stage,
    attempt,
    errorCode,
    message,
    identities,
    details = {},
    cause,
  }) {
    super(
      `${checkedText(errorCode, 'errorCode')}: ${checkedText(message, 'message')}`,
      { cause },
    );
    this.name = 'StartupRetryError';
    this.stage = checkedText(stage, 'stage');
    this.attempt = checkedAttempt(attempt);
    this.code = errorCode;
    this.errorCode = errorCode;
    this.rule = STARTUP_RETRY_RULE;
    this.identities = Object.freeze([...identities]);
    this.details = snapshotJson(details, 'details');
  }
}

export function isRetryEligibleStartupStage(stage) {
  return retryEligibleStages.has(stage);
}

export function assertFreshStartupIdentity(
  previousIdentity,
  nextIdentity,
) {
  const next = snapshotIdentity(nextIdentity);
  if (previousIdentity === null || previousIdentity === undefined) {
    return next;
  }
  const previous = snapshotIdentity(previousIdentity);
  const freshnessIssues = findFreshnessIssues(previous, next);
  if (freshnessIssues.length > 0) {
    const failure = freshnessFailure(freshnessIssues);
    throw new StartupStageError({
      stage: failure.stage,
      errorCode: failure.errorCode,
      message: failure.message,
      details: failure.details,
    });
  }
  return next;
}

/**
 * `createAttempt` returns an owned scope with identity, run, and teardown.
 * Launch work belongs in run(), so every launch failure has an owning scope.
 * A failed scope must prove successful cleanup and zero residual resources.
 */
export async function runWithStartupRetry({ createAttempt } = {}) {
  if (typeof createAttempt !== 'function') {
    throw new TypeError('createAttempt must be a function');
  }

  const identities = [];
  const attempts = [];
  let previousIdentity;

  for (let attempt = 1; attempt <= MAX_STARTUP_ATTEMPTS; attempt += 1) {
    let scope;
    try {
      scope = await createAttempt(
        Object.freeze({
          attempt,
          maxAttempts: MAX_STARTUP_ATTEMPTS,
          previousIdentity: previousIdentity ?? null,
          rule: STARTUP_RETRY_RULE,
        }),
      );
    } catch (cause) {
      throw terminalError({
        stage: 'startup.attempt.factory',
        attempt,
        errorCode: 'STARTUP_ATTEMPT_FACTORY_FAILED',
        message:
          'the attempt factory failed before returning an owned startup scope',
        identities,
        attempts,
        retryDecision: 'terminal',
        cause,
      });
    }

    if (
      !isPlainRecord(scope) ||
      typeof scope.run !== 'function' ||
      typeof scope.teardown !== 'function' ||
      (
        scope.getRuntimeIdentity !== undefined &&
        typeof scope.getRuntimeIdentity !== 'function'
      )
    ) {
      throw terminalError({
        stage: 'startup.attempt.factory',
        attempt,
        errorCode: 'STARTUP_ATTEMPT_SCOPE_INVALID',
        message:
          'createAttempt must return identity, run, and teardown members',
        identities,
        attempts,
        retryDecision: 'terminal',
      });
    }

    let identity;
    try {
      identity = snapshotIdentity(scope.identity);
    } catch (cause) {
      throw terminalError({
        stage: 'startup.attempt.identity',
        attempt,
        errorCode: 'STARTUP_ATTEMPT_IDENTITY_INVALID',
        message: 'the startup attempt identity is invalid',
        identities,
        attempts,
        retryDecision: 'terminal',
        cause,
      });
    }
    try {
      const value = await scope.run(
        Object.freeze({
          attempt,
          identity,
          maxAttempts: MAX_STARTUP_ATTEMPTS,
          previousIdentity: previousIdentity ?? null,
          rule: STARTUP_RETRY_RULE,
        }),
      );
      const runtimeIdentity = await resolveRuntimeIdentity(scope, identity);
      identities.push(runtimeIdentity);
      const freshnessIssues =
        previousIdentity === undefined
          ? []
          : findFreshnessIssues(previousIdentity, runtimeIdentity);
      if (freshnessIssues.length > 0) {
        const failure = freshnessFailure(freshnessIssues);
        const teardown = await teardownFailedScope({
          scope,
          attempt,
          identity: runtimeIdentity,
          failure,
          identities,
          attempts,
        });
        attempts.push(
          failedAttemptEvidence(
            attempt,
            runtimeIdentity,
            failure,
            teardown.proof,
          ),
        );
        if (teardown.error) throw teardown.error;
        throw terminalError({
          ...failure,
          attempt,
          identities,
          attempts,
          retryDecision: 'terminal',
          alreadyCleaned: true,
        });
      }
      attempts.push(
        Object.freeze({
          attempt,
          identity: runtimeIdentity,
          outcome: 'succeeded',
        }),
      );
      return Object.freeze({
        value,
        evidence: Object.freeze({
          rule: STARTUP_RETRY_RULE,
          maxAttempts: MAX_STARTUP_ATTEMPTS,
          attemptCount: attempts.length,
          retried: attempts.length === 2,
          identities: Object.freeze([...identities]),
          attempts: Object.freeze([...attempts]),
        }),
      });
    } catch (cause) {
      if (cause?.[alreadyCleanedRetryError] === true) throw cause;
      const failure = normalizeFailure(cause);
      let runtimeIdentity;
      try {
        runtimeIdentity = await resolveRuntimeIdentity(scope, identity);
      } catch (identityCause) {
        identities.push(identity);
        const identityFailure = Object.freeze({
          stage: 'startup.attempt.identity',
          errorCode: 'STARTUP_RUNTIME_IDENTITY_INVALID',
          message: 'the startup runtime identity is invalid',
          details: Object.freeze({}),
        });
        const teardown = await teardownFailedScope({
          scope,
          attempt,
          identity,
          failure: identityFailure,
          identities,
          attempts,
        });
        attempts.push(
          failedAttemptEvidence(
            attempt,
            identity,
            identityFailure,
            teardown.proof,
          ),
        );
        if (teardown.error) throw teardown.error;
        throw terminalError({
          ...identityFailure,
          attempt,
          identities,
          attempts,
          retryDecision: 'terminal',
          cause: identityCause,
        });
      }
      identities.push(runtimeIdentity);
      const freshnessIssues =
        previousIdentity === undefined
          ? []
          : findFreshnessIssues(previousIdentity, runtimeIdentity);
      if (freshnessIssues.length > 0) {
        const freshness = freshnessFailure(freshnessIssues);
        const teardown = await teardownFailedScope({
          scope,
          attempt,
          identity: runtimeIdentity,
          failure: freshness,
          identities,
          attempts,
        });
        attempts.push(
          failedAttemptEvidence(
            attempt,
            runtimeIdentity,
            freshness,
            teardown.proof,
          ),
        );
        if (teardown.error) throw teardown.error;
        throw terminalError({
          ...freshness,
          attempt,
          identities,
          attempts,
          retryDecision: 'terminal',
        });
      }
      const teardown = await teardownFailedScope({
        scope,
        attempt,
        identity: runtimeIdentity,
        failure,
        identities,
        attempts,
      });
      attempts.push(
        failedAttemptEvidence(
          attempt,
          runtimeIdentity,
          failure,
          teardown.proof,
        ),
      );

      if (teardown.error) {
        throw teardown.error;
      }

      const eligible = isRetryEligibleStartupStage(failure.stage);
      if (eligible && attempt < MAX_STARTUP_ATTEMPTS) {
        previousIdentity = runtimeIdentity;
        continue;
      }

      throw terminalError({
        ...failure,
        attempt,
        identities,
        attempts,
        retryDecision: eligible
          ? 'attempt-limit-reached'
          : 'stage-not-eligible',
        cause,
      });
    }
  }

  throw new Error('unreachable startup retry state');
}

async function teardownFailedScope({
  scope,
  attempt,
  identity,
  failure,
  identities,
  attempts,
}) {
  let rawProof;
  try {
    rawProof = await scope.teardown(
      Object.freeze({
        attempt,
        failure: failureEvidence(failure),
        identity,
        rule: STARTUP_RETRY_RULE,
      }),
    );
  } catch (cause) {
    const teardown = failedTeardownProof(
      attempt,
      identity,
      'teardown-threw',
      cause,
    );
    return Object.freeze({
      error: terminalError({
        stage: 'startup.teardown',
        attempt,
        errorCode: 'STARTUP_TEARDOWN_FAILED',
        message: 'the failed startup scope could not be torn down',
        identities,
        attempts: [
          ...attempts,
          failedAttemptEvidence(
            attempt,
            identity,
            failure,
            teardown,
          ),
        ],
        retryDecision: 'cleanup-failed',
        details: { originalFailure: failureEvidence(failure) },
        cause,
        alreadyCleaned: true,
      }),
    });
  }

  try {
    return Object.freeze({
      proof: validateTeardownProof(rawProof, attempt, identity),
    });
  } catch (cause) {
    const teardown = failedTeardownProof(
      attempt,
      identity,
      'evidence-invalid',
      cause,
    );
    return Object.freeze({
      error: terminalError({
        stage: 'startup.teardown',
        attempt,
        errorCode: 'STARTUP_TEARDOWN_EVIDENCE_INVALID',
        message:
          'teardown did not provide successful zero-residual cleanup evidence',
        identities,
        attempts: [
          ...attempts,
          failedAttemptEvidence(
            attempt,
            identity,
            failure,
            teardown,
          ),
        ],
        retryDecision: 'cleanup-failed',
        details: { originalFailure: failureEvidence(failure) },
        cause,
        alreadyCleaned: true,
      }),
    });
  }
}

function failedTeardownProof(attempt, identity, reason, cause) {
  return Object.freeze({
    status: 'failed',
    attempt,
    identity,
    residualResources: 'unknown',
    reason,
    error: Object.freeze({
      name: typeof cause?.name === 'string' ? cause.name : typeof cause,
      message:
        cause instanceof Error ? cause.message : safeText(String(cause), 'unknown'),
    }),
  });
}

function validateTeardownProof(rawProof, attempt, identity) {
  if (!isPlainRecord(rawProof)) {
    throw new TypeError('teardown evidence must be a plain JSON object');
  }

  const proof = snapshotJson(rawProof, 'teardown evidence');
  if (proof.status !== 'succeeded') {
    throw new TypeError('teardown evidence status must be succeeded');
  }
  if (proof.attempt !== attempt) {
    throw new TypeError('teardown evidence must identify the failed attempt');
  }
  if (proof.residualResources !== 0) {
    throw new TypeError('teardown evidence must prove zero residual resources');
  }
  if (
    !isPlainRecord(proof.identity) ||
    JSON.stringify(proof.identity) !== JSON.stringify(identity)
  ) {
    throw new TypeError(
      'teardown evidence identity must exactly match the failed attempt',
    );
  }
  return proof;
}

function snapshotIdentity(identity) {
  if (!isPlainRecord(identity)) {
    throw new TypeError('identity must be a plain JSON object');
  }
  const snapshot = snapshotJson(identity, 'identity');
  checkedText(snapshot.attemptId, 'identity.attemptId');
  return snapshot;
}

async function resolveRuntimeIdentity(scope, baseIdentity) {
  if (scope.getRuntimeIdentity === undefined) return baseIdentity;
  const runtime = await scope.getRuntimeIdentity();
  if (!isPlainRecord(runtime)) {
    throw new TypeError('runtime identity must be a plain JSON object');
  }
  if (
    runtime.attemptId !== undefined &&
    runtime.attemptId !== baseIdentity.attemptId
  ) {
    throw new TypeError('runtime identity cannot replace attemptId');
  }
  return snapshotIdentity({
    ...baseIdentity,
    ...runtime,
    attemptId: baseIdentity.attemptId,
  });
}

function freshnessFailure(freshnessIssues) {
  return Object.freeze({
    stage: 'startup.attempt.identity',
    errorCode: 'STARTUP_ATTEMPT_NOT_FRESH',
    message:
      'the retry must use a new attempt and new supplied process, port, and context identities',
    details: Object.freeze({ freshnessIssues }),
  });
}

function findFreshnessIssues(previousIdentity, nextIdentity) {
  const issues = [];
  if (previousIdentity.attemptId === nextIdentity.attemptId) {
    issues.push(Object.freeze({ path: 'attemptId', reason: 'reused' }));
  }

  const previousResources = collectResourceIdentities(previousIdentity);
  const nextResources = collectResourceIdentities(nextIdentity);
  const categories = new Set(
    [...previousResources.keys()].filter((category) =>
      nextResources.has(category)
    ),
  );

  for (const category of [...categories].sort()) {
    const previous = previousResources.get(category);
    const next = nextResources.get(category);
    const reused = [...previous].some((value) => next.has(value));
    if (reused) {
      issues.push(
        Object.freeze({
          path: `resource:${category}`,
          reason: 'reused',
        }),
      );
    }
  }

  return Object.freeze(issues);
}

function collectResourceIdentities(identity) {
  const resources = new Map();

  const visit = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (!isPlainRecord(value)) {
      return;
    }

    for (const [key, entry] of Object.entries(value)) {
      const entryPath = path ? `${path}.${key}` : key;
      const category = resourceIdentityCategory(key);
      if (entry !== null && category !== null) {
        const identities = Array.isArray(entry)
          ? entry.map((item) => JSON.stringify(item))
          : [JSON.stringify(entry)];
        const current = resources.get(category) ?? new Set();
        for (const identityValue of identities) {
          current.add(identityValue);
        }
        resources.set(category, current);
      } else {
        visit(entry, entryPath);
      }
    }
  };

  visit(identity, '');
  return resources;
}

function resourceIdentityCategory(key) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const last = words.at(-1);

  const isIdentity = (
    resourceWords.has(last) ||
    (identitySuffixes.has(last) &&
      words.some((word) => resourceWords.has(word)))
  );
  if (!isIdentity) return null;
  const resourceWord = words.find((word) => resourceWords.has(word));
  return resourceWord === 'pid' ? 'process' : resourceWord;
}

function normalizeFailure(cause) {
  if (cause instanceof StartupStageError) {
    return Object.freeze({
      stage: cause.stage,
      errorCode: cause.errorCode,
      message: cause.failureMessage,
      details: cause.details,
    });
  }

  return Object.freeze({
    stage: safeText(cause?.stage, 'startup.unclassified'),
    errorCode: safeText(
      cause?.errorCode ?? cause?.code,
      'STARTUP_UNCLASSIFIED_FAILURE',
    ),
    message: safeText(
      cause instanceof Error ? cause.message : String(cause),
      'an unclassified startup failure occurred',
    ),
    details: safeSnapshot(cause?.details),
  });
}

function failedAttemptEvidence(attempt, identity, failure, teardown) {
  return Object.freeze({
    attempt,
    identity,
    outcome: 'failed',
    failure: failureEvidence(failure),
    teardown,
  });
}

function failureEvidence(failure) {
  return Object.freeze({
    stage: failure.stage,
    errorCode: failure.errorCode,
    message: failure.message,
    details: failure.details ?? Object.freeze({}),
    retryEligible: isRetryEligibleStartupStage(failure.stage),
  });
}

function terminalError({
  stage,
  attempt,
  errorCode,
  message,
  identities,
  attempts,
  retryDecision,
  details = {},
  cause,
  alreadyCleaned = false,
}) {
  const error = new StartupRetryError({
    stage,
    attempt,
    errorCode,
    message,
    identities,
    cause,
    details: {
      ...details,
      maxAttempts: MAX_STARTUP_ATTEMPTS,
      retryDecision,
      attempts: Object.freeze([...attempts]),
    },
  });
  if (alreadyCleaned) {
    Object.defineProperty(error, alreadyCleanedRetryError, {
      value: true,
    });
  }
  return error;
}

function checkedAttempt(attempt) {
  if (
    !Number.isSafeInteger(attempt) ||
    attempt < 1 ||
    attempt > MAX_STARTUP_ATTEMPTS
  ) {
    throw new TypeError(
      'attempt must be a 1-based integer no greater than 2',
    );
  }
  return attempt;
}

function checkedText(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 1_024 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError(
      `${label} must be a non-empty, trimmed string without control characters`,
    );
  }
  return value;
}

function safeText(value, fallback) {
  try {
    return checkedText(value, 'failure field');
  } catch {
    return fallback;
  }
}

function safeSnapshot(value) {
  if (value === undefined) {
    return Object.freeze({});
  }
  try {
    return snapshotJson(value, 'failure details');
  } catch {
    return Object.freeze({ omitted: 'unserializable failure details' });
  }
}

function snapshotJson(value, label) {
  const ancestors = new Set();

  const visit = (entry, path) => {
    if (
      entry === null ||
      typeof entry === 'string' ||
      typeof entry === 'boolean'
    ) {
      return entry;
    }
    if (typeof entry === 'number') {
      if (!Number.isFinite(entry)) {
        throw new TypeError(`${path} must contain finite numbers`);
      }
      return entry;
    }
    if (Array.isArray(entry)) {
      if (ancestors.has(entry)) {
        throw new TypeError(`${path} must not contain circular references`);
      }
      ancestors.add(entry);
      const result = Object.freeze(
        entry.map((item, index) => visit(item, `${path}[${index}]`)),
      );
      ancestors.delete(entry);
      return result;
    }
    if (!isPlainRecord(entry)) {
      throw new TypeError(`${path} must contain JSON-compatible values`);
    }
    if (ancestors.has(entry)) {
      throw new TypeError(`${path} must not contain circular references`);
    }

    ancestors.add(entry);
    const result = Object.create(null);
    for (const key of Object.keys(entry).sort()) {
      if (entry[key] === undefined) {
        throw new TypeError(`${path}.${key} must not be undefined`);
      }
      result[key] = visit(entry[key], `${path}.${key}`);
    }
    ancestors.delete(entry);
    return Object.freeze(result);
  };

  return visit(value, label);
}

function isPlainRecord(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
