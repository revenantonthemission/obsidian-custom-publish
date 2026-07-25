import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

describe.skipIf(process.platform === 'win32')(
  'owned node bootstrap custody',
  () => {
    test('reaps its semantic process group after its controller is killed', async () => {
      const bootstrapPath = resolve(
        process.cwd(),
        'scripts/profile/owned-node-bootstrap.mjs',
      );
      const semanticSource = [
        "process.stdout.write(`semantic:${process.pid}\\n`);",
        'setInterval(() => {}, 1000);',
      ].join('\n');
      const controllerSource = [
        "import { spawn } from 'node:child_process';",
        "import { randomUUID } from 'node:crypto';",
        `const bootstrapPath = ${JSON.stringify(bootstrapPath)};`,
        `const semanticSource = ${JSON.stringify(semanticSource)};`,
        'const token = randomUUID();',
        'const bootstrap = spawn(',
        '  process.execPath,',
        '  [',
        '    bootstrapPath,',
        "    '--input-type=module',",
        "    '-e',",
        '    semanticSource,',
        '  ],',
        '  {',
        '    detached: true,',
        '    env: {',
        '      ...process.env,',
        '      PROFILE_OWNED_BOOTSTRAP_TOKEN: token,',
        '    },',
        "    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],",
        '  },',
        ');',
        'bootstrap.stdout.pipe(process.stdout);',
        "bootstrap.on('message', (message) => {",
        '  if (',
        "    message?.type === 'profile-owned-bootstrap:ready' &&",
        '    message?.token === token &&',
        '    message?.pid === bootstrap.pid',
        '  ) {',
        "    process.stdout.write(`bootstrap:${bootstrap.pid}\\n`);",
        '    bootstrap.send({',
        "      type: 'profile-owned-bootstrap:start',",
        '      token,',
        '    });',
        '  }',
        '});',
        'setInterval(() => {}, 1000);',
      ].join('\n');
      const controller = spawn(
        process.execPath,
        ['--input-type=module', '-e', controllerSource],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let bootstrapPid: number | undefined;
      let semanticPid: number | undefined;

      try {
        ({ bootstrapPid, semanticPid } =
          await readPublishedProcessIds(controller));
        expect(isProcessGroupAlive(bootstrapPid)).toBe(true);
        expect(isProcessAlive(semanticPid)).toBe(true);

        controller.kill('SIGKILL');
        await waitForExit(controller, 2_000);
        await waitForGroupRelease(bootstrapPid, 4_000);

        expect(isProcessGroupAlive(bootstrapPid)).toBe(false);
        expect(isProcessAlive(bootstrapPid)).toBe(false);
        expect(isProcessAlive(semanticPid)).toBe(false);
      } finally {
        if (controller.exitCode === null && controller.signalCode === null) {
          controller.kill('SIGKILL');
        }
        if (
          bootstrapPid !== undefined &&
          isProcessGroupAlive(bootstrapPid)
        ) {
          process.kill(-bootstrapPid, 'SIGKILL');
        }
        if (
          semanticPid !== undefined &&
          isProcessAlive(semanticPid)
        ) {
          process.kill(semanticPid, 'SIGKILL');
        }
      }
    });
  },
);

function readPublishedProcessIds(
  child: ChildProcess,
): Promise<{ bootstrapPid: number; semanticPid: number }> {
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let bootstrapPid: number | undefined;
    let semanticPid: number | undefined;
    const timeout = setTimeout(() => {
      cleanup();
      rejectPromise(
        new Error('controller did not publish bootstrap process ids'),
      );
    }, 3_000);

    function cleanup() {
      clearTimeout(timeout);
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
    }
    function onData(chunk: Buffer) {
      buffer += chunk.toString('utf8');
      for (const line of buffer.split('\n')) {
        const match = /^(bootstrap|semantic):(\d+)$/u.exec(line);
        if (match?.[1] === 'bootstrap') {
          bootstrapPid = Number(match[2]);
        } else if (match?.[1] === 'semantic') {
          semanticPid = Number(match[2]);
        }
      }
      if (
        bootstrapPid !== undefined &&
        semanticPid !== undefined &&
        Number.isSafeInteger(bootstrapPid) &&
        Number.isSafeInteger(semanticPid)
      ) {
        cleanup();
        resolvePromise({
          bootstrapPid,
          semanticPid,
        });
      }
    }
    function onExit() {
      cleanup();
      rejectPromise(
        new Error('controller exited before publishing process ids'),
      );
    }

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
      rejectPromise(new Error('controller did not exit after SIGKILL'));
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

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    return error?.code !== 'ESRCH';
  }
}
