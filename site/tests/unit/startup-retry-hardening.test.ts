import { describe, expect, test } from 'vitest';
import {
  assertFreshStartupIdentity,
  runWithStartupRetry,
  StartupRetryError,
  StartupStageError,
} from '../../scripts/profile/startup-retry.mjs';

describe('startup retry hardening', () => {
  test('rejects any reused context identity before semantic work', () => {
    expect(() =>
      assertFreshStartupIdentity(
        {
          attemptId: 'attempt-1',
          previewPid: 1001,
          browserContextIds: ['context-a', 'context-b'],
        },
        {
          attemptId: 'attempt-2',
          previewPid: 1002,
          browserContextIds: ['context-c', 'context-b'],
        },
      )
    ).toThrow(
      expect.objectContaining({
        code: 'STARTUP_ATTEMPT_NOT_FRESH',
        stage: 'startup.attempt.identity',
      }),
    );
  });

  test('rejects a reused resource identity even when its field path changes', () => {
    expect(() =>
      assertFreshStartupIdentity(
        {
          attemptId: 'attempt-1',
          browserProcessId: 2001,
        },
        {
          attemptId: 'attempt-2',
          nested: {
            playwrightProcessId: 2001,
          },
        },
      )
    ).toThrow(
      expect.objectContaining({
        code: 'STARTUP_ATTEMPT_NOT_FRESH',
      }),
    );
  });

  test('tears down a nested external StartupRetryError', async () => {
    let teardownCount = 0;
    const NestedStartupRetryError = StartupRetryError as any;

    await expect(
      runWithStartupRetry({
        createAttempt: ({ attempt }: { attempt: number }) => ({
          identity: { attemptId: `nested-${attempt}` },
          async run() {
            throw new NestedStartupRetryError({
              stage: 'semantic.assertion',
              attempt,
              errorCode: 'NESTED_STARTUP_ERROR',
              message: 'nested startup error from the owned scope',
              identities: [],
            });
          },
          async teardown({ identity }: {
            identity: Record<string, unknown>;
          }) {
            teardownCount += 1;
            return {
              status: 'succeeded',
              attempt,
              identity,
              residualResources: 0,
            };
          },
        }),
      }),
    ).rejects.toMatchObject({
      errorCode: 'NESTED_STARTUP_ERROR',
      stage: 'semantic.assertion',
    });
    expect(teardownCount).toBe(1);
  });

  test('includes the current failed attempt when teardown proof is invalid', async () => {
    let failure: unknown;
    try {
      await runWithStartupRetry({
        createAttempt: ({ attempt }: { attempt: number }) => ({
          identity: { attemptId: `cleanup-proof-${attempt}` },
          async run() {
            throw new StartupStageError({
              stage: 'startup.preview.launch',
              errorCode: 'PREVIEW_LAUNCH_FAILED',
              message: 'preview launch failed',
            });
          },
          async teardown({ identity }: {
            identity: Record<string, unknown>;
          }) {
            return {
              status: 'failed',
              attempt,
              identity,
              residualResources: 'unknown',
            };
          },
        }),
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      errorCode: 'STARTUP_TEARDOWN_EVIDENCE_INVALID',
      details: {
        attempts: [
          {
            attempt: 1,
            outcome: 'failed',
            teardown: {
              status: 'failed',
              attempt: 1,
              residualResources: 'unknown',
            },
          },
        ],
      },
    });
  });
});
