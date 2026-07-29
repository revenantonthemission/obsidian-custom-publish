import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  assertOwnedProcessObservationSupport,
  assertOwnedProcessTreeSupport,
  freezeOwnedProcessTree,
  registerOwnedProcessGroup,
  snapshotDescendantProcessTree,
} from './owned-process-registry.mjs';

const READY = 'profile-owned-bootstrap:ready';
const START = 'profile-owned-bootstrap:start';
const REAPER_READY = 'profile-owned-bootstrap:reaper-ready';
const TOKEN_PATTERN = /^[a-f0-9-]{36}$/u;
const REAPER_ROOT_ENV = 'PROFILE_OWNED_BOOTSTRAP_REAPER_ROOT';
const REAPER_TOKEN_ENV = 'PROFILE_OWNED_BOOTSTRAP_REAPER_TOKEN';
const SELF_PATH = fileURLToPath(import.meta.url);

if (process.env[REAPER_ROOT_ENV] !== undefined) {
  await runReaper().catch((error) => {
    process.stderr.write(
      `${JSON.stringify({
        errorCode: 'OWNED_BOOTSTRAP_REAPER_FAILED',
        message: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exit(1);
  });
} else {
  runBootstrap();
}

function runBootstrap() {
  const token = process.env.PROFILE_OWNED_BOOTSTRAP_TOKEN;
  const childArguments = process.argv.slice(2);
  if (
    typeof token !== 'string' ||
    !TOKEN_PATTERN.test(token) ||
    childArguments.length === 0 ||
    typeof process.send !== 'function'
  ) {
    throw new TypeError('owned node bootstrap configuration is invalid');
  }

  const parentPid = process.ppid;
  let child = null;
  let started = false;
  let finishing = false;
  let parentLossPromise = null;
  const parentMonitor = setInterval(() => {
    if (!finishing && process.ppid !== parentPid) {
      parentLossPromise ??= handOffAfterParentLoss();
    }
  }, 25);
  parentMonitor.unref();

  const onDisconnect = () => {
    if (!finishing) {
      parentLossPromise ??= handOffAfterParentLoss();
    }
  };
  process.once('disconnect', onDisconnect);
  process.once('message', (message) => {
    if (
      message?.type !== START ||
      message?.token !== token ||
      started ||
      finishing
    ) {
      finish(1);
      return;
    }
    started = true;
    const environment = { ...process.env };
    delete environment.PROFILE_OWNED_BOOTSTRAP_TOKEN;
    child = spawn(process.execPath, childArguments, {
      cwd: process.cwd(),
      detached: false,
      env: environment,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.once('error', (error) => {
      process.stderr.write(
        `${JSON.stringify({
          errorCode: 'OWNED_BOOTSTRAP_CHILD_LAUNCH_FAILED',
          message: error.message,
        })}\n`,
      );
      finish(1);
    });
    child.once('exit', (code, signal) => {
      if (signal !== null) {
        process.stderr.write(
          `${JSON.stringify({
            errorCode: 'OWNED_BOOTSTRAP_CHILD_SIGNALED',
            signal,
          })}\n`,
        );
        finish(1);
        return;
      }
      finish(code ?? 1);
    });
  });

  process.send({
    type: READY,
    token,
    pid: process.pid,
  });

  function finish(code) {
    if (finishing) return;
    finishing = true;
    clearInterval(parentMonitor);
    process.off('disconnect', onDisconnect);
    process.exitCode = code;
    if (process.connected) process.disconnect();
  }

  async function handOffAfterParentLoss() {
    if (finishing) return;
    finishing = true;
    clearInterval(parentMonitor);
    process.off('disconnect', onDisconnect);
    if (!started || child === null) {
      process.exit(1);
    }

    try {
      await startDetachedReaper(process.pid);
      process.exit(1);
    } catch (error) {
      process.stderr.write(
        `${JSON.stringify({
          errorCode: 'OWNED_BOOTSTRAP_REAPER_HANDOFF_FAILED',
          message: error instanceof Error ? error.message : String(error),
        })}\n`,
      );
      killProcessGroup(process.pid);
      process.exit(1);
    }
  }
}

async function startDetachedReaper(rootProcessGroupId) {
  const token = randomUUID();
  const reaper = spawn(process.execPath, [SELF_PATH], {
    cwd: process.cwd(),
    detached: true,
    env: {
      ...process.env,
      [REAPER_ROOT_ENV]: String(rootProcessGroupId),
      [REAPER_TOKEN_ENV]: token,
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const ready = await waitForReaperReady(reaper, token, 2_000);
  if (ready.pid !== reaper.pid) {
    throw new Error('owned bootstrap reaper reported the wrong process id');
  }
  reaper.disconnect();
  reaper.unref();
}

function waitForReaperReady(reaper, token, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const timeout = setTimeout(() => {
      settleReject(new Error('owned bootstrap reaper readiness timed out'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      reaper.off('message', onMessage);
      reaper.off('error', onError);
      reaper.off('exit', onExit);
    }
    function settleResolve(message) {
      if (settled) return;
      settled = true;
      cleanup();
      resolvePromise(message);
    }
    function settleReject(error) {
      if (settled) return;
      settled = true;
      cleanup();
      rejectPromise(error);
    }
    function onMessage(message) {
      if (
        message?.type === REAPER_READY &&
        message?.token === token &&
        Number.isSafeInteger(message?.pid)
      ) {
        settleResolve(message);
      }
    }
    function onError(error) {
      settleReject(error);
    }
    function onExit(code, signal) {
      settleReject(
        new Error(
          `owned bootstrap reaper exited before readiness (${code ?? signal ?? 'unknown'})`,
        ),
      );
    }

    reaper.on('message', onMessage);
    reaper.once('error', onError);
    reaper.once('exit', onExit);
  });
}

async function runReaper() {
  assertOwnedProcessTreeSupport();
  await assertOwnedProcessObservationSupport();
  const rootProcessGroupId = Number(process.env[REAPER_ROOT_ENV]);
  const token = process.env[REAPER_TOKEN_ENV];
  if (
    !Number.isSafeInteger(rootProcessGroupId) ||
    rootProcessGroupId < 1 ||
    typeof token !== 'string' ||
    !TOKEN_PATTERN.test(token) ||
    typeof process.send !== 'function'
  ) {
    throw new TypeError('owned bootstrap reaper configuration is invalid');
  }
  delete process.env[REAPER_ROOT_ENV];
  delete process.env[REAPER_TOKEN_ENV];

  const initial = await snapshotDescendantProcessTree([
    rootProcessGroupId,
  ]);
  const rootIdentity = initial.processTable.find(
    ({ pid }) => pid === rootProcessGroupId,
  );
  if (
    rootIdentity === undefined ||
    rootIdentity.pgid !== rootProcessGroupId ||
    process.ppid !== rootProcessGroupId
  ) {
    throw new Error(
      'owned bootstrap reaper could not bind the live root identity',
    );
  }
  const rootLease = registerOwnedProcessGroup(
    rootProcessGroupId,
    'owned-bootstrap-parent-loss-root',
  );
  const inheritedProcessGroupIds = initial.processGroupIds.filter(
    (processGroupId) => processGroupId !== process.pid,
  );
  const inheritedLeases = inheritedProcessGroupIds.map(
    (processGroupId) =>
      registerOwnedProcessGroup(
        processGroupId,
        `owned-bootstrap-parent-loss-descendant-${processGroupId}`,
      ),
  );
  process.send({
    type: REAPER_READY,
    token,
    pid: process.pid,
  });

  await new Promise((resolvePromise) => {
    if (!process.connected) {
      resolvePromise();
      return;
    }
    process.once('disconnect', resolvePromise);
  });
  await waitForParentReparenting(rootProcessGroupId, 2_000);

  const frozen = await freezeOwnedProcessTree({
    rootProcessGroupIds: [
      rootProcessGroupId,
      ...inheritedProcessGroupIds,
    ],
    label: 'owned-bootstrap-parent-loss-tree',
  });
  for (const processGroupId of frozen.evidence.processGroupIds) {
    killProcessGroup(processGroupId);
  }
  await waitForGroupsReleased(
    frozen.evidence.processGroupIds,
    2_000,
  );
  frozen.releaseVerified();
  for (const lease of inheritedLeases) lease.release();
  rootLease.release();
}

async function waitForParentReparenting(parentPid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (process.ppid === parentPid && Date.now() <= deadline) {
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 5);
    });
  }
  if (process.ppid === parentPid) {
    throw new Error(
      'owned bootstrap did not exit after transferring reaper custody',
    );
  }
}

async function waitForGroupsReleased(processGroupIds, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const active = processGroupIds.filter(isProcessGroupAlive);
    if (active.length === 0) return;
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 10);
    });
  }
  throw new Error('owned bootstrap reaper left a process group alive');
}

function killProcessGroup(processGroupId) {
  try {
    process.kill(-processGroupId, 'SIGKILL');
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
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
