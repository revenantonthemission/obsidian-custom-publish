import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

const ownedGroups = new Map();
const pendingSpawns = new Map();
const lifecycleRemovers = [];
const execFileAsync = promisify(execFile);
let lifecycleInstalled = false;
let signalShutdownStarted = false;
let observationSupportPromise;

// Inherited by every process in an owned scope so that a descendant which lost
// its ancestry — a double-detached grandchild reparented to init — can still be
// proven ours. Deliberately distinct from PROFILE_OWNED_BOOTSTRAP_TOKEN, which
// authenticates the bootstrap IPC handshake and is stripped before exec.
const OWNERSHIP_TOKEN_ENV = 'PROFILE_OWNED_PROCESS_OWNERSHIP_TOKEN';
const OWNERSHIP_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const MAX_OWNERSHIP_PROBES_PER_SWEEP = 256;
const OWNERSHIP_REAP_ITERATIONS = 8;
const OWNERSHIP_REAP_SETTLE_MS = 25;
const OWNERSHIP_PROBE_TIMEOUT_MS = 2_000;

export function assertOwnedProcessTreeSupport() {
  if (process.platform === 'win32') {
    throw new Error(
      'Owned process-tree verification requires POSIX process groups; win32 is unsupported.',
    );
  }
}

export async function assertOwnedProcessObservationSupport() {
  assertOwnedProcessTreeSupport();
  observationSupportPromise ??= readProcessTable();
  await observationSupportPromise;
}

export function registerOwnedProcess(child, label) {
  assertOwnedProcessTreeSupport();
  if (
    child === null ||
    typeof child !== 'object' ||
    !Number.isSafeInteger(child.pid) ||
    child.pid < 1
  ) {
    throw new TypeError('owned child must expose a positive process id');
  }
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new TypeError('owned process label must be non-empty');
  }
  return registerOwnedProcessGroup(child.pid, label);
}

export function prepareOwnedSpawn(label) {
  assertOwnedProcessTreeSupport();
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new TypeError('owned process label must be non-empty');
  }
  const token = Symbol(label);
  pendingSpawns.set(token, label);
  installLifecycleHooks();
  let settled = false;
  return Object.freeze({
    adopt(child) {
      if (settled) {
        throw new TypeError('owned spawn guard is already settled');
      }
      settled = true;
      pendingSpawns.delete(token);
      return registerOwnedProcess(child, label);
    },
    cancel() {
      if (settled) return;
      settled = true;
      pendingSpawns.delete(token);
      if (
        pendingSpawns.size === 0 &&
        ownedGroups.size === 0 &&
        !signalShutdownStarted
      ) {
        removeLifecycleHooks();
      }
    },
  });
}

export function registerOwnedProcessGroup(processGroupId, label) {
  assertOwnedProcessTreeSupport();
  if (!Number.isSafeInteger(processGroupId) || processGroupId < 1) {
    throw new TypeError('owned process group id must be a positive integer');
  }
  if (processGroupId === process.pid) {
    throw new TypeError('the verifier cannot own its own process group');
  }
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new TypeError('owned process label must be non-empty');
  }

  const lease = Symbol(label);
  const current = ownedGroups.get(processGroupId);
  if (current === undefined) {
    ownedGroups.set(processGroupId, {
      labels: new Set([label]),
      leases: new Set([lease]),
    });
  } else {
    current.labels.add(label);
    current.leases.add(lease);
  }
  installLifecycleHooks();
  if (signalShutdownStarted) {
    signalOwnedGroup(processGroupId, 'SIGKILL');
    throw new Error(
      `cannot register process group ${processGroupId} while shutdown is in progress`,
    );
  }
  let released = false;
  return Object.freeze({
    pid: processGroupId,
    release() {
      if (released) return;
      released = true;
      const entry = ownedGroups.get(processGroupId);
      entry?.leases.delete(lease);
      if (entry?.leases.size === 0) {
        ownedGroups.delete(processGroupId);
      }
      if (ownedGroups.size === 0 && !signalShutdownStarted) {
        if (pendingSpawns.size === 0) removeLifecycleHooks();
      }
    },
  });
}

export async function snapshotDescendantProcessTree(rootProcessIds) {
  assertOwnedProcessTreeSupport();
  if (
    !Array.isArray(rootProcessIds) ||
    rootProcessIds.length === 0 ||
    rootProcessIds.some(
      (pid) => !Number.isSafeInteger(pid) || pid < 1,
    )
  ) {
    throw new TypeError('rootProcessIds must contain positive integers');
  }
  const rows = await readProcessTable();
  const roots = new Set(rootProcessIds);
  const processes = collectDescendantProcesses(rows, roots);
  const processIds = new Set(processes.map(({ pid }) => pid));
  const processGroupIds = new Set(
    processes.map(({ pgid }) => pgid),
  );
  for (const root of roots) processGroupIds.delete(root);
  return Object.freeze({
    processIds: Object.freeze([...processIds].sort((a, b) => a - b)),
    processGroupIds: Object.freeze(
      [...processGroupIds]
        .filter((pgid) => pgid > 0)
        .sort((a, b) => a - b),
    ),
    processes: Object.freeze(
      processes
        .slice()
        .sort((left, right) => left.pid - right.pid),
    ),
    processTable: Object.freeze(rows),
  });
}

function collectDescendantProcesses(rows, roots) {
  const byParent = new Map();
  for (const row of rows) {
    const children = byParent.get(row.ppid) ?? [];
    children.push(row);
    byParent.set(row.ppid, children);
  }
  const pending = [...roots];
  const processIds = new Set();
  const processes = [];
  while (pending.length > 0) {
    const parent = pending.pop();
    for (const child of byParent.get(parent) ?? []) {
      if (roots.has(child.pid) || processIds.has(child.pid)) continue;
      processIds.add(child.pid);
      processes.push(child);
      pending.push(child.pid);
    }
  }
  return processes;
}

async function readProcessTable() {
  const { stdout } = await execFileAsync(
    'ps',
    ['-axo', 'pid=,ppid=,pgid=,sess=,lstart='],
    {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 2_000,
    },
  );
  return Object.freeze(parseProcessTable(stdout));
}

export function monitorOwnedDescendants({
  rootPid,
  label,
  intervalMs = 25,
  isRootHandleCurrent,
} = {}) {
  assertOwnedProcessTreeSupport();
  if (!Number.isSafeInteger(rootPid) || rootPid < 1) {
    throw new TypeError('rootPid must be a positive integer');
  }
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new TypeError('descendant monitor label must be non-empty');
  }
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 5) {
    throw new TypeError('intervalMs must be an integer of at least 5');
  }
  if (
    isRootHandleCurrent !== undefined &&
    typeof isRootHandleCurrent !== 'function'
  ) {
    throw new TypeError('isRootHandleCurrent must be a function');
  }

  const observedProcessIds = new Set();
  const observedProcessGroupIds = new Set();
  const groupLeases = new Map();
  const rootGroupMemberIdentities = new Set();
  const failures = [];
  let sampleCount = 0;
  let stopped = false;
  let samplePending = false;
  let chain = Promise.resolve();
  let lastProcessTable = [];
  let rootProcessIdentity = null;

  const sample = async () => {
    try {
      const snapshot = await snapshotDescendantProcessTree([rootPid]);
      lastProcessTable = snapshot.processTable;
      const currentRootIdentity = snapshot.processTable.find(
        ({ pid }) => pid === rootPid,
      );
      let rootIdentityIsCurrent = false;
      if (currentRootIdentity !== undefined) {
        const rootHandleIsCurrent =
          isRootHandleCurrent === undefined ||
          isRootHandleCurrent() === true;
        if (!rootHandleIsCurrent) {
          if (
            rootProcessIdentity === null ||
            processIdentityKey(rootProcessIdentity) !==
              processIdentityKey(currentRootIdentity)
          ) {
            failures.push(
              Object.freeze({
                name: 'RootProcessHandleMismatch',
                message:
                  `root process ${rootPid} was reused after its child handle exited`,
              }),
            );
          }
        } else if (currentRootIdentity.pgid !== rootPid) {
          failures.push(
            Object.freeze({
              name: 'RootProcessGroupMismatch',
              message:
                `root process ${rootPid} is not its detached process-group leader`,
            }),
          );
        } else if (
          rootProcessIdentity !== null &&
          processIdentityKey(rootProcessIdentity) !==
            processIdentityKey(currentRootIdentity)
        ) {
          failures.push(
            Object.freeze({
              name: 'RootProcessIdentityMismatch',
              message: `root process ${rootPid} was reused during observation`,
            }),
          );
        } else {
          rootProcessIdentity = currentRootIdentity;
          rootIdentityIsCurrent = true;
        }
      }
      sampleCount += 1;
      const currentGroups = rootIdentityIsCurrent
        ? new Set(snapshot.processGroupIds)
        : new Set();
      if (rootIdentityIsCurrent) {
        for (const pid of snapshot.processIds) observedProcessIds.add(pid);
        const currentProcessesByGroup = new Map();
        for (const processIdentity of snapshot.processes) {
          if (processIdentity.pgid === rootPid) {
            rootGroupMemberIdentities.add(
              processIdentityKey(processIdentity),
            );
            continue;
          }
          const identities =
            currentProcessesByGroup.get(processIdentity.pgid) ?? [];
          identities.push(processIdentity);
          currentProcessesByGroup.set(processIdentity.pgid, identities);
        }
        for (const pgid of snapshot.processGroupIds) {
          observedProcessGroupIds.add(pgid);
          if (!groupLeases.has(pgid)) {
            groupLeases.set(
              pgid,
              {
              lease: registerOwnedProcessGroup(
                pgid,
                `${label}:descendant-${pgid}`,
              ),
              memberIdentities: new Set(),
              quarantined: false,
            },
          );
          }
          const ownership = groupLeases.get(pgid);
          for (
            const processIdentity of
              currentProcessesByGroup.get(pgid) ?? []
          ) {
            ownership.memberIdentities.add(
              processIdentityKey(processIdentity),
            );
          }
        }
      }
      for (const [pgid, ownership] of groupLeases) {
        if (currentGroups.has(pgid)) continue;
        const currentMembers = snapshot.processTable.filter(
          (processIdentity) => processIdentity.pgid === pgid,
        );
        const stillOwned = currentMembers.some((processIdentity) =>
          ownership.memberIdentities.has(processIdentityKey(processIdentity))
        );
        if (currentMembers.length === 0) {
          ownership.lease.release();
          groupLeases.delete(pgid);
          continue;
        }
        if (!stillOwned && !ownership.quarantined) {
          ownership.quarantined = true;
          failures.push(
            Object.freeze({
              name: 'ProcessGroupIdentityMismatch',
              message:
                `process group ${pgid} lost every observed descendant identity and remains quarantined for cleanup`,
            }),
          );
        }
      }
    } catch (error) {
      failures.push(
        Object.freeze({
          name: typeof error?.name === 'string' ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };
  const scheduleSample = () => {
    if (samplePending) return;
    samplePending = true;
    chain = sample().finally(() => {
      samplePending = false;
    });
  };
  scheduleSample();
  const timer = setInterval(scheduleSample, intervalMs);
  timer.unref();

  return Object.freeze({
    async ready() {
      await chain;
      if (
        rootProcessIdentity === null ||
        rootProcessIdentity.pgid !== rootPid ||
        failures.length > 0
      ) {
        throw new Error(
          'the owned root process identity could not be observed',
        );
      }
      return evidence();
    },
    async stop() {
      if (!stopped) {
        stopped = true;
        clearInterval(timer);
        await chain;
        let reachedFixedPoint = false;
        for (let iteration = 0; iteration < 32; iteration += 1) {
          if (rootGroupIsOwned()) {
            signalOwnedGroup(rootPid, 'SIGSTOP');
          }
          const before = new Set(groupLeases.keys());
          for (const pgid of before) {
            signalOwnedGroup(pgid, 'SIGSTOP');
          }
          await sample();
          const after = new Set(groupLeases.keys());
          for (const pgid of after) {
            signalOwnedGroup(pgid, 'SIGSTOP');
          }
          if (
            after.size === before.size &&
            [...after].every((pgid) => before.has(pgid))
          ) {
            reachedFixedPoint = true;
            break;
          }
        }
        if (!reachedFixedPoint) {
          failures.push(
            Object.freeze({
              name: 'ProcessTreeFixedPointFailure',
              message:
                'descendant process-group observation did not reach a frozen fixed point',
            }),
          );
        }
      }
      return evidence();
    },
    releaseVerified() {
      const snapshot = evidence();
      if (snapshot.activeProcessGroupIds.some(isOwnedGroupAlive)) {
        throw new Error(
          'descendant process ownership cannot be released without zero-residual proof',
        );
      }
      for (const ownership of groupLeases.values()) {
        ownership.lease.release();
      }
      groupLeases.clear();
    },
  });

  function evidence() {
    return Object.freeze({
      rootPid,
      sampleCount,
      observedProcessIds: Object.freeze(
        [...observedProcessIds].sort((a, b) => a - b),
      ),
      observedProcessGroupIds: Object.freeze(
        [...observedProcessGroupIds].sort((a, b) => a - b),
      ),
      activeProcessGroupIds: Object.freeze(
        [...groupLeases.keys()]
          .filter(isOwnedGroupAlive)
          .sort((a, b) => a - b),
      ),
      activeRootProcessGroup: rootGroupIsOwned(),
      rootProcessIdentity,
      failures: Object.freeze([...failures]),
    });
  }

  function rootGroupIsOwned() {
    if (rootProcessIdentity === null) return false;
    const members = lastProcessTable.filter(
      ({ pgid }) => pgid === rootPid,
    );
    const leader = members.find(({ pid }) => pid === rootPid);
    if (leader !== undefined) {
      return (
        processIdentityKey(leader) ===
        processIdentityKey(rootProcessIdentity)
      );
    }
    return members.some(
      (processIdentity) =>
        processIdentity.sessionId === rootProcessIdentity.sessionId ||
        rootGroupMemberIdentities.has(
          processIdentityKey(processIdentity),
        ),
    );
  }
}

export async function freezeOwnedProcessTree({
  rootProcessGroupIds,
  label,
} = {}) {
  assertOwnedProcessTreeSupport();
  if (
    !Array.isArray(rootProcessGroupIds) ||
    rootProcessGroupIds.length === 0 ||
    rootProcessGroupIds.some(
      (pgid) => !Number.isSafeInteger(pgid) || pgid < 1,
    )
  ) {
    throw new TypeError(
      'rootProcessGroupIds must contain positive integers',
    );
  }
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new TypeError('frozen process-tree label must be non-empty');
  }

  const processGroupIds = new Set(rootProcessGroupIds);
  const processIds = new Set(rootProcessGroupIds);
  const leases = [];
  for (let iteration = 0; iteration < 32; iteration += 1) {
    for (const pgid of processGroupIds) signalOwnedGroup(pgid, 'SIGSTOP');
    const rows = await readProcessTable();
    const memberProcessIds = new Set(
      rows
        .filter(({ pgid }) => processGroupIds.has(pgid))
        .map(({ pid }) => pid),
    );
    for (const pid of memberProcessIds) processIds.add(pid);
    const descendants = collectDescendantProcesses(
      rows,
      memberProcessIds,
    );
    for (const { pid } of descendants) processIds.add(pid);
    let discovered = 0;
    for (const { pgid } of descendants) {
      if (processGroupIds.has(pgid)) continue;
      processGroupIds.add(pgid);
      leases.push(
        registerOwnedProcessGroup(
          pgid,
          `${label}:frozen-descendant-${pgid}`,
        ),
      );
      signalOwnedGroup(pgid, 'SIGSTOP');
      discovered += 1;
    }
    if (discovered === 0) {
      const evidence = Object.freeze({
        processIds: Object.freeze(
          [...processIds].sort((a, b) => a - b),
        ),
        processGroupIds: Object.freeze(
          [...processGroupIds].sort((a, b) => a - b),
        ),
      });
      return Object.freeze({
        evidence,
        releaseVerified() {
          if (evidence.processGroupIds.some(isOwnedGroupAlive)) {
            throw new Error(
              'frozen process-tree ownership cannot be released while a group is alive',
            );
          }
          for (const lease of leases) lease.release();
        },
      });
    }
  }
  throw new Error(
    'owned process-tree discovery did not reach a frozen fixed point',
  );
}

/**
 * Opens an ownership scope before the first owned process is spawned.
 *
 * Ancestry alone cannot prove zero residual processes: when an intermediate
 * parent exits first, its children are reparented to init and disappear from
 * every ppid walk. The scope therefore mints a token that is inherited by the
 * whole owned subtree, and rediscovers survivors by that token instead.
 */
export async function beginOwnedProcessScope(label) {
  assertOwnedProcessTreeSupport();
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new TypeError('owned process scope label must be non-empty');
  }
  const token = randomUUID();
  if (!OWNERSHIP_TOKEN_PATTERN.test(token)) {
    throw new Error('owned process scope token is malformed');
  }
  // Every process alive before the scope opened is out of scope forever. The
  // identity key carries lstart, so a recycled pid no longer matches its
  // baseline entry and is correctly reconsidered as newly born.
  const baselineIdentities = new Map(
    (await readProcessTable()).map((row) => [row.pid, processIdentityKey(row)]),
  );
  let closed = false;

  return Object.freeze({
    label,
    environment: Object.freeze({ [OWNERSHIP_TOKEN_ENV]: token }),
    async reapResiduals() {
      if (closed) {
        throw new Error('owned process scope is already closed');
      }
      return reapOwnershipResiduals(token, baselineIdentities);
    },
    close() {
      closed = true;
    },
  });
}

async function reapOwnershipResiduals(token, baselineIdentities) {
  const probeFailures = [];
  let candidateCount = 0;
  let sweepCount = 0;
  let residualProcessIds = [];

  for (
    let iteration = 0;
    iteration < OWNERSHIP_REAP_ITERATIONS;
    iteration += 1
  ) {
    let sweep;
    try {
      sweep = await sweepOwnershipResiduals(token, baselineIdentities);
    } catch (error) {
      probeFailures.push(
        Object.freeze({
          name: typeof error?.name === 'string' ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      break;
    }
    sweepCount += 1;
    candidateCount = sweep.candidateCount;
    if (sweep.exceededProbeBudget) {
      probeFailures.push(
        Object.freeze({
          name: 'OwnershipProbeBudgetExceeded',
          message:
            `${sweep.candidateCount} processes appeared during the owned scope, ` +
            `above the ${MAX_OWNERSHIP_PROBES_PER_SWEEP} probe budget`,
        }),
      );
      residualProcessIds = [];
      break;
    }
    residualProcessIds = sweep.survivors;
    if (residualProcessIds.length === 0) {
      return ownershipEvidence({
        verified: true,
        residualProcessIds,
        candidateCount,
        sweepCount,
        probeFailures,
      });
    }
    // Each survivor proved ownership by carrying this run's token, so it is
    // signalled by pid alone. Signalling -pid would target whichever group
    // happens to share the number when the survivor does not lead one.
    for (const pid of residualProcessIds) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        if (error?.code !== 'ESRCH') {
          probeFailures.push(
            Object.freeze({
              name: 'OwnershipResidualKillFailed',
              message: `residual process ${pid} could not be signalled`,
            }),
          );
        }
      }
    }
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, OWNERSHIP_REAP_SETTLE_MS);
    });
  }

  return ownershipEvidence({
    verified: false,
    residualProcessIds,
    candidateCount,
    sweepCount,
    probeFailures,
  });
}

function ownershipEvidence({
  verified,
  residualProcessIds,
  candidateCount,
  sweepCount,
  probeFailures,
}) {
  return Object.freeze({
    verified,
    residualProcessIds: Object.freeze(
      [...residualProcessIds].sort((a, b) => a - b),
    ),
    candidateCount,
    sweepCount,
    probeBudget: MAX_OWNERSHIP_PROBES_PER_SWEEP,
    probeFailures: Object.freeze([...probeFailures]),
  });
}

async function sweepOwnershipResiduals(token, baselineIdentities) {
  const rows = await readProcessTable();
  const selfAncestry = collectSelfAncestry(rows);
  const candidates = rows.filter(
    (row) =>
      !selfAncestry.has(row.pid) &&
      (!baselineIdentities.has(row.pid) ||
        baselineIdentities.get(row.pid) !== processIdentityKey(row)),
  );
  if (candidates.length > MAX_OWNERSHIP_PROBES_PER_SWEEP) {
    return {
      exceededProbeBudget: true,
      candidateCount: candidates.length,
      survivors: [],
    };
  }
  const survivors = [];
  for (const { pid } of candidates) {
    if (await processCarriesOwnershipToken(pid, token)) survivors.push(pid);
  }
  return {
    exceededProbeBudget: false,
    candidateCount: candidates.length,
    survivors,
  };
}

function collectSelfAncestry(rows) {
  const byPid = new Map(rows.map((row) => [row.pid, row]));
  const ancestry = new Set([process.pid]);
  let cursor = byPid.get(process.pid);
  while (
    cursor !== undefined &&
    cursor.ppid > 0 &&
    !ancestry.has(cursor.ppid)
  ) {
    ancestry.add(cursor.ppid);
    cursor = byPid.get(cursor.ppid);
  }
  return ancestry;
}

/**
 * Answers one question about one pid: does it carry this scope's token?
 *
 * `ps eww` prints the target environment, so the read is deliberately narrow.
 * BSD and macOS only expose the environment of same-uid processes, the output
 * is matched in place, and nothing derived from it other than this boolean
 * leaves the function — it is never returned, stored, logged or put in
 * evidence. execFile attaches captured output to its rejection, so a failure is
 * re-raised as a fresh error carrying only the outcome code.
 */
async function processCarriesOwnershipToken(pid, token) {
  try {
    const { stdout } = await execFileAsync(
      'ps',
      ['eww', '-p', String(pid)],
      {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        timeout: OWNERSHIP_PROBE_TIMEOUT_MS,
      },
    );
    return stdout.includes(`${OWNERSHIP_TOKEN_ENV}=${token}`);
  } catch (error) {
    // `ps` exits 1 when the pid vanished between listing and probing, which is
    // the ordinary outcome for a process that has already been reaped.
    if (error?.code === 1 && error?.killed !== true) return false;
    throw new Error(
      `owned ownership probe failed for pid ${pid} (${describeProbeFailure(error)})`,
    );
  }
}

function describeProbeFailure(error) {
  if (error?.killed === true) return 'timeout';
  if (typeof error?.code === 'string') return error.code;
  if (Number.isInteger(error?.code)) return `exit ${error.code}`;
  return 'unknown';
}

function installLifecycleHooks() {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;

  for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
    const handler = () => {
      if (signalShutdownStarted) return;
      signalShutdownStarted = true;
      void terminateAllOwnedGroups()
        .finally(() => {
          killAllOwnedGroupsSynchronously();
          removeLifecycleHooks({ resetShutdown: false });
          process.kill(process.pid, signal);
        });
    };
    process.on(signal, handler);
    lifecycleRemovers.push(() => process.off(signal, handler));
  }

  const exitHandler = () => killAllOwnedGroupsSynchronously();
  process.once('exit', exitHandler);
  lifecycleRemovers.push(() => process.off('exit', exitHandler));

  const exceptionMonitor = () => killAllOwnedGroupsSynchronously();
  process.on('uncaughtExceptionMonitor', exceptionMonitor);
  lifecycleRemovers.push(() =>
    process.off('uncaughtExceptionMonitor', exceptionMonitor)
  );
}

function removeLifecycleHooks({ resetShutdown = true } = {}) {
  while (lifecycleRemovers.length > 0) {
    lifecycleRemovers.pop()();
  }
  lifecycleInstalled = false;
  if (resetShutdown) signalShutdownStarted = false;
}

async function terminateAllOwnedGroups() {
  while (pendingSpawns.size > 0) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
  }
  if (ownedGroups.size === 0) return;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    for (const pgid of ownedGroups.keys()) {
      signalOwnedGroup(pgid, 'SIGSTOP');
    }
    let rows;
    try {
      rows = await readProcessTable();
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
      iteration -= 1;
      continue;
    }
    const currentGroups = new Set(ownedGroups.keys());
    const memberProcessIds = new Set(
      rows
        .filter(({ pgid }) => currentGroups.has(pgid))
        .map(({ pid }) => pid),
    );
    const descendants = collectDescendantProcesses(
      rows,
      memberProcessIds,
    );
    let discovered = 0;
    for (const { pgid } of descendants) {
      if (ownedGroups.has(pgid)) continue;
      addShutdownOwnedGroup(pgid);
      signalOwnedGroup(pgid, 'SIGSTOP');
      discovered += 1;
    }
    if (discovered === 0) break;
  }

  for (const pid of ownedGroups.keys()) signalOwnedGroup(pid, 'SIGKILL');
  while (!(await waitForAllGroupsReleased(250))) {
    // SIGKILL cannot be handled or ignored. Do not re-signal a numeric PGID
    // after its original group may have exited and the identifier been reused.
  }
}

function addShutdownOwnedGroup(processGroupId) {
  if (ownedGroups.has(processGroupId)) return;
  ownedGroups.set(processGroupId, {
    labels: new Set(['shutdown-discovered-descendant']),
    leases: new Set([Symbol('shutdown-discovered-descendant')]),
  });
}

function killAllOwnedGroupsSynchronously() {
  for (const pid of ownedGroups.keys()) {
    signalOwnedGroup(pid, 'SIGKILL');
  }
}

async function waitForAllGroupsReleased(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    pruneReleasedGroups();
    if (ownedGroups.size === 0) return true;
    await new Promise((resolvePromise) => {
      setTimeout(
        resolvePromise,
        Math.min(25, Math.max(1, deadline - Date.now())),
      );
    });
  }
  pruneReleasedGroups();
  return ownedGroups.size === 0;
}

function pruneReleasedGroups() {
  for (const pid of ownedGroups.keys()) {
    if (!isOwnedGroupAlive(pid)) ownedGroups.delete(pid);
  }
}

function signalOwnedGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      try {
        process.kill(pid, signal);
      } catch {
        // A subsequent liveness check is authoritative.
      }
    }
  }
}

function isOwnedGroupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
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

function parseProcessTable(stdout) {
  if (typeof stdout !== 'string') {
    throw new TypeError('ps output must be text');
  }
  const rows = [];
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue;
    const match =
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$/u.exec(line);
    if (match === null) {
      throw new TypeError('ps returned an unparseable process row');
    }
    const [, pid, ppid, pgid, sessionId, startedAt] = match;
    rows.push(
      Object.freeze({
        pid: Number(pid),
        ppid: Number(ppid),
        pgid: Number(pgid),
        sessionId: Number(sessionId),
        startedAt,
      }),
    );
  }
  return rows;
}

function processIdentityKey(value) {
  return [
    value.pid,
    value.pgid,
    value.sessionId,
    value.startedAt,
  ].join('\0');
}

export const ownedProcessRegistryTesting = Object.freeze({
  isOwnedGroupAlive,
  parseProcessTable,
  ownershipTokenEnv: OWNERSHIP_TOKEN_ENV,
  ownedCount() {
    return ownedGroups.size;
  },
});
