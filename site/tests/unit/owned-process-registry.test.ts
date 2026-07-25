import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  beginOwnedProcessScope,
  monitorOwnedDescendants,
  ownedProcessRegistryTesting,
} from '../../scripts/profile/owned-process-registry.mjs';

describe.skipIf(process.platform === 'win32')(
  'owned detached process registry',
  () => {
    test('kills a detached child group before propagating SIGTERM', async () => {
      const registryUrl = pathToFileURL(
        resolve(process.cwd(), 'scripts/profile/owned-process-registry.mjs'),
      ).href;
      const escapeMarker = join(
        tmpdir(),
        `owned-process-term-escape-${randomUUID()}`,
      );
      const ownedSource = [
        "import { spawn } from 'node:child_process';",
        "import { writeFileSync } from 'node:fs';",
        `const escapeMarker = ${JSON.stringify(escapeMarker)};`,
        "process.once('SIGTERM', () => {",
        '  const escaped = spawn(',
        '    process.execPath,',
        "    ['-e', 'setInterval(() => {}, 1000)'],",
        "    { detached: true, stdio: 'ignore' },",
        '  );',
        "  writeFileSync(escapeMarker, String(escaped.pid), 'utf8');",
        '});',
        'setInterval(() => {}, 1000);',
      ].join('\n');
      const wrapper = spawn(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
            import { spawn } from 'node:child_process';
            const { registerOwnedProcess } = await import(${JSON.stringify(registryUrl)});
            const child = spawn(
              process.execPath,
              ['--input-type=module', '-e', ${JSON.stringify(ownedSource)}],
              { detached: true, stdio: 'ignore' },
            );
            registerOwnedProcess(child, 'registry-signal-test');
            process.stdout.write(String(child.pid) + '\\n');
            setInterval(() => {}, 1000);
          `,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let ownedPid: number | undefined;

      try {
        ownedPid = Number(await readFirstLine(wrapper));
        expect(Number.isSafeInteger(ownedPid)).toBe(true);

        wrapper.kill('SIGTERM');
        await waitForExit(wrapper, 3_000);
        await waitForGroupRelease(ownedPid, 2_000);

        expect(isProcessGroupAlive(ownedPid)).toBe(false);
        expect(existsSync(escapeMarker)).toBe(false);
      } finally {
        if (wrapper.exitCode === null && wrapper.signalCode === null) {
          wrapper.kill('SIGKILL');
        }
        if (ownedPid !== undefined && isProcessGroupAlive(ownedPid)) {
          try {
            process.kill(-ownedPid, 'SIGKILL');
          } catch {
            // The final assertion is authoritative.
          }
        }
        if (existsSync(escapeMarker)) {
          const escapedPid = Number(
            readFileSync(escapeMarker, 'utf8'),
          );
          if (
            Number.isSafeInteger(escapedPid) &&
            isProcessGroupAlive(escapedPid)
          ) {
            try {
              process.kill(-escapedPid, 'SIGKILL');
            } catch {
              // The absence of the marker is asserted above.
            }
          }
          unlinkSync(escapeMarker);
        }
      }
    });

    test('rejects a root that is not a detached process-group leader', async () => {
      const child = spawn(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { stdio: 'ignore' },
      );
      if (!child.pid) {
        child.kill('SIGKILL');
        throw new Error('test child did not expose a process id');
      }
      const monitor = monitorOwnedDescendants({
        rootPid: child.pid,
        label: 'non-detached-root-test',
      });

      try {
        await expect(monitor.ready()).rejects.toThrow(
          /root process identity could not be observed/u,
        );
        const evidence = await monitor.stop();
        expect(evidence.observedProcessIds).toEqual([]);
        expect(evidence.observedProcessGroupIds).toEqual([]);
        expect(evidence.failures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'RootProcessGroupMismatch',
            }),
          ]),
        );
      } finally {
        child.kill('SIGKILL');
        await waitForExit(child, 2_000);
      }
    });

    test('adopts and kills a process spawned while shutdown is starting', async () => {
      const registryUrl = pathToFileURL(
        resolve(process.cwd(), 'scripts/profile/owned-process-registry.mjs'),
      ).href;
      const wrapper = spawn(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
            import { spawn } from 'node:child_process';
            const { prepareOwnedSpawn } = await import(${JSON.stringify(registryUrl)});
            const guard = prepareOwnedSpawn('late-shutdown-spawn');
            process.stdout.write('ready\\n');
            process.once('SIGTERM', () => {
              const child = spawn(
                process.execPath,
                ['-e', 'setInterval(() => {}, 1000)'],
                { detached: true, stdio: 'ignore' },
              );
              process.stdout.write(String(child.pid) + '\\n');
              try { guard.adopt(child); } catch {}
            });
            setInterval(() => {}, 1000);
          `,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let latePid: number | undefined;

      try {
        expect(await readFirstLine(wrapper)).toBe('ready');
        const lateLine = readFirstLine(wrapper);
        wrapper.kill('SIGTERM');
        latePid = Number(await lateLine);
        await waitForExit(wrapper, 3_000);
        await waitForGroupRelease(latePid, 2_000);
        expect(isProcessGroupAlive(latePid)).toBe(false);
      } finally {
        if (wrapper.exitCode === null && wrapper.signalCode === null) {
          wrapper.kill('SIGKILL');
        }
        if (latePid !== undefined && isProcessGroupAlive(latePid)) {
          try {
            process.kill(-latePid, 'SIGKILL');
          } catch {
            // The final assertion is authoritative.
          }
        }
      }
    });
    test('reaps a token-owned process that lost its ancestry', async () => {
      const scope = await beginOwnedProcessScope('double-detach-test');
      // The middle process detaches a grandchild and exits at once, so the
      // grandchild is reparented to init. No ppid walk from this test can
      // reach it any more; only the inherited ownership token can.
      const orphanSource = [
        "import { spawn } from 'node:child_process';",
        'const orphan = spawn(',
        '  process.execPath,',
        "  ['-e', 'setInterval(() => {}, 1000)'],",
        "  { detached: true, stdio: 'ignore' },",
        ');',
        'orphan.unref();',
        "process.stdout.write(String(orphan.pid) + '\\n', () => process.exit(0));",
      ].join('\n');
      const middle = spawn(
        process.execPath,
        ['--input-type=module', '-e', orphanSource],
        {
          env: { ...process.env, ...scope.environment },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let orphanPid: number | undefined;

      try {
        orphanPid = Number(await readFirstLine(middle));
        expect(Number.isSafeInteger(orphanPid)).toBe(true);
        await waitForExit(middle, 3_000);
        await waitForReparenting(orphanPid, 2_000);

        // Proof the ancestry walk is blind here: the survivor's parent is init.
        expect(readParentPid(orphanPid)).toBe(1);
        expect(isProcessAlive(orphanPid)).toBe(true);

        const evidence = await scope.reapResiduals();

        expect(evidence.probeFailures).toEqual([]);
        expect(evidence.verified).toBe(true);
        expect(evidence.residualProcessIds).toEqual([]);
        expect(evidence.sweepCount).toBeGreaterThanOrEqual(2);
        expect(isProcessAlive(orphanPid)).toBe(false);
      } finally {
        scope.close();
        if (middle.exitCode === null && middle.signalCode === null) {
          middle.kill('SIGKILL');
        }
        if (orphanPid !== undefined && isProcessAlive(orphanPid)) {
          try {
            process.kill(orphanPid, 'SIGKILL');
          } catch {
            // The assertion above is authoritative.
          }
        }
      }
    });

    test('leaves processes without the scope token untouched', async () => {
      // A neighbour born inside the scope window but carrying no token stands
      // in for any unrelated process the sweep must never signal.
      const neighbour = spawn(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { stdio: 'ignore' },
      );
      const scope = await beginOwnedProcessScope('token-isolation-test');
      const untokened = spawn(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { stdio: 'ignore' },
      );

      try {
        expect(scope.environment).toHaveProperty(
          ownedProcessRegistryTesting.ownershipTokenEnv,
        );
        const evidence = await scope.reapResiduals();

        expect(evidence.probeFailures).toEqual([]);
        expect(evidence.verified).toBe(true);
        expect(untokened.pid).toBeDefined();
        expect(isProcessAlive(untokened.pid as number)).toBe(true);
        expect(isProcessAlive(neighbour.pid as number)).toBe(true);
        // The pre-scope neighbour must not even be probed.
        expect(evidence.candidateCount).toBeLessThanOrEqual(
          evidence.probeBudget,
        );
      } finally {
        scope.close();
        untokened.kill('SIGKILL');
        neighbour.kill('SIGKILL');
        await waitForExit(untokened, 2_000).catch(() => undefined);
        await waitForExit(neighbour, 2_000).catch(() => undefined);
      }
    });
  },
);

function readParentPid(pid: number): number {
  const { status, stdout } = spawnSync('ps', ['-o', 'ppid=', '-p', String(pid)], {
    encoding: 'utf8',
  });
  if (status !== 0) return -1;
  return Number(stdout.trim());
}

async function waitForReparenting(pid: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (readParentPid(pid) === 1) return;
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 25);
    });
  }
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    return error?.code !== 'ESRCH';
  }
}

function readFirstLine(child: ChildProcess): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    const timeout = setTimeout(() => {
      cleanup();
      rejectPromise(new Error('wrapper did not publish its child pid'));
    }, 2_000);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const newline = buffer.indexOf('\n');
      if (newline === -1) return;
      cleanup();
      resolvePromise(buffer.slice(0, newline));
    };
    const onExit = () => {
      cleanup();
      rejectPromise(new Error('wrapper exited before publishing pid'));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
    };
    child.stdout?.on('data', onData);
    child.once('exit', onExit);
  });
}

function waitForExit(child: ChildProcess, timeoutMs: number) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      child.off('exit', onExit);
      rejectPromise(new Error('wrapper did not exit after SIGTERM'));
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolvePromise();
    };
    child.once('exit', onExit);
  });
}

async function waitForGroupRelease(pid: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessGroupAlive(pid)) return;
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 25);
    });
  }
}

function isProcessGroupAlive(pid: number) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error: any) {
    return error?.code !== 'ESRCH';
  }
}
