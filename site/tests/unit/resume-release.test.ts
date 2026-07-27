import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { PROFILE_PATHS } from '../../scripts/profile/profile-paths.mjs';
import {
  acquireReleaseLock,
  describePendingRelease,
  inspectReleaseState,
  nextReleaseState,
  promoteResumeRelease,
  readPreparedEvidence,
  readReleaseJournal,
  releaseStoreTesting,
  resolvePendingRelease,
  RELEASE_STATE_ABSENT,
} from '../../scripts/profile/release-store.mjs';
import {
  READ_ONLY_COMMANDS,
  STABLE_COMMANDS,
  main as cliMain,
  shouldReportResult,
} from '../../scripts/profile/cli.mjs';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

/**
 * Every mutation here stays inside the gitignored private release tree.
 *
 * The store's paths are fixed on purpose — that is the safety property — so
 * these tests drive the same checks through the private roots rather than
 * weakening the allowlist to make the public target injectable. The full
 * commit-and-rollback cycle against the tracked pair belongs to the Step 23
 * live run, behind its own exact-SHA human gate.
 */
async function resetReleaseTree(): Promise<void> {
  await rm(PROFILE_PATHS.releaseRoot, { recursive: true, force: true });
  await mkdir(PROFILE_PATHS.releaseStagingRoot, { recursive: true });
  await mkdir(PROFILE_PATHS.releaseRecoveryRoot, { recursive: true });
}

function journalFixture(state: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    journalId: 'j1',
    state,
    candidateId: SHA_A,
    newPdfSha256: SHA_A,
    newReceiptSha256: SHA_B,
    oldPdfSha256: null,
    oldReceiptSha256: null,
    recovery: { kind: 'absent' },
    originalFailure: null,
    updatedAt: '2026-07-26T09:00:00.000Z',
  });
}

beforeEach(resetReleaseTree);
afterEach(resetReleaseTree);

describe('release path safety', () => {
  test('a path outside the fixed allowlist is refused', () => {
    expect(() =>
      releaseStoreTesting.assertAllowlistedPath(
        resolve(PROFILE_PATHS.siteRoot, 'src', 'pages', 'resume.astro'),
        'test',
      ),
    ).toThrow(/allowlist/i);
  });

  test('a traversal out of an allowed root is refused', () => {
    expect(() =>
      releaseStoreTesting.assertAllowlistedPath(
        resolve(
          PROFILE_PATHS.releaseRecoveryRoot,
          '..',
          '..',
          '..',
          '..',
          'escaped.pdf',
        ),
        'test',
      ),
    ).toThrow(/allowlist/i);
  });

  test('a symlinked target is refused even inside an allowed root', async () => {
    const real = resolve(PROFILE_PATHS.releaseStagingRoot, 'real.pdf');
    const link = resolve(PROFILE_PATHS.releaseStagingRoot, 'link.pdf');
    await writeFile(real, 'pdf');
    await symlink(real, link);

    await expect(
      releaseStoreTesting.assertSafeTarget(link, 'test', { mustExist: true }),
    ).rejects.toMatchObject({ code: 'RELEASE_TARGET_SYMLINK' });
  });

  test('a non-regular target is refused', async () => {
    const directory = resolve(PROFILE_PATHS.releaseStagingRoot, 'a-directory');
    await mkdir(directory, { recursive: true });

    await expect(
      releaseStoreTesting.assertSafeTarget(directory, 'test', {
        mustExist: true,
      }),
    ).rejects.toMatchObject({ code: 'RELEASE_TARGET_NOT_REGULAR' });
  });

  test('a required target that is absent is refused rather than created', async () => {
    await expect(
      releaseStoreTesting.assertSafeTarget(
        resolve(PROFILE_PATHS.releaseStagingRoot, 'missing.pdf'),
        'test',
        { mustExist: true },
      ),
    ).rejects.toMatchObject({ code: 'RELEASE_TARGET_MISSING' });
  });
});

describe('single-writer lock', () => {
  test('a second writer fails with a stable conflict instead of proceeding', async () => {
    const first = await acquireReleaseLock();
    try {
      await expect(acquireReleaseLock()).rejects.toMatchObject({
        code: 'RELEASE_LOCK_HELD',
      });
    } finally {
      await first.release();
    }
  });

  test('releasing is idempotent so a failed flow cannot double-free the lock', async () => {
    const lock = await acquireReleaseLock();
    const first = await lock.release();
    // The second call must not unlink again — it replays the first outcome.
    await expect(lock.release()).resolves.toBe(first);
    expect(lock.released).toBe(true);
  });

  test('releasing reports that the lock file actually went away', async () => {
    const lock = await acquireReleaseLock();
    const outcome = await lock.release();

    // Swallowing this was what made a wedged release indistinguishable from a
    // crash: the lock survives, every later release fails RELEASE_LOCK_HELD,
    // and a stale lock is deliberately never broken.
    expect(outcome).toMatchObject({ lockFileRemoved: true, fault: null });
    expect(lock.releaseOutcome).toBe(outcome);
    await expect(inspectReleaseState()).resolves.toMatchObject({
      lockPresent: false,
    });
  });

  test('a lock with no journal is reported as orphaned, not as interrupted', async () => {
    const { verifyCurrentRelease } = await import(
      '../../scripts/profile/verification-provider.mjs'
    );
    const lock = await acquireReleaseLock();
    try {
      await expect(readReleaseJournal({})).resolves.toBeNull();
      // The journal is removed only at finalize, so a lock without one means
      // the release completed and could not unlink. That needs the lock
      // removed, not a rollback — the opposite of an interrupted transaction.
      await expect(verifyCurrentRelease()).rejects.toMatchObject({
        code: 'RELEASE_LOCK_ORPHANED',
        details: { lockPresent: true, journalPresent: false },
      });
    } finally {
      await lock.release();
    }
  });
});

describe('interrupted transactions fail closed', () => {
  test('an unreadable journal is reported, not ignored', async () => {
    await mkdir(PROFILE_PATHS.releaseRoot, { recursive: true });
    await writeFile(PROFILE_PATHS.releaseJournalPath, 'not json');

    await expect(readReleaseJournal()).rejects.toMatchObject({
      code: 'RELEASE_JOURNAL_INVALID',
    });
  });

  test('a journal in an unknown state is refused rather than assumed fresh', async () => {
    await mkdir(PROFILE_PATHS.releaseRoot, { recursive: true });
    await writeFile(
      PROFILE_PATHS.releaseJournalPath,
      journalFixture('SOMETHING_ELSE'),
    );

    await expect(readReleaseJournal()).rejects.toMatchObject({
      code: 'RELEASE_JOURNAL_INVALID',
    });
  });

  test('an existing journal blocks a new promotion', async () => {
    await mkdir(PROFILE_PATHS.releaseRoot, { recursive: true });
    await writeFile(
      PROFILE_PATHS.releaseJournalPath,
      journalFixture('PDF_COMMITTED'),
    );

    await expect(
      promoteResumeRelease({
        candidateId: SHA_A,
        candidatePdfSha256: SHA_A,
        candidatePath: resolve(PROFILE_PATHS.pdfCandidateRoot, `${SHA_A}.pdf`),
        candidateBytes: Buffer.from('pdf'),
        releaseReceipt: { kind: 'resume-release' },
      }),
    ).rejects.toMatchObject({ code: 'RELEASE_JOURNAL_ACTIVE' });
  });

  test('a present journal marks the state active so read-only commands stop', async () => {
    await mkdir(PROFILE_PATHS.releaseRoot, { recursive: true });
    await writeFile(
      PROFILE_PATHS.releaseJournalPath,
      journalFixture('RECEIPT_PROMOTED'),
    );

    const state = await inspectReleaseState();

    expect(state.active).toBe(true);
    expect(state.state).toBe('RECEIPT_PROMOTED');
    expect(state.invariants.readOnlyVerifyBlocked).toBe(true);
    // A receipt-only intermediate state is explicitly not claimable, which is
    // what stops the old PDF being reported as the current release.
    expect(state.invariants.publicPairClaimable).toBe(false);
  });

  test('no journal and no lock is the only state that claims nothing is in flight', async () => {
    const state = await inspectReleaseState();

    expect(state.active).toBe(false);
    expect(state.state).toBe(RELEASE_STATE_ABSENT);
    expect(state.invariants.publicPairClaimable).toBe(true);
  });
});

describe('promotion refuses mismatched identity before mutating anything', () => {
  test('candidate bytes that do not hash to the named digest are refused', async () => {
    await expect(
      promoteResumeRelease({
        candidateId: SHA_A,
        candidatePdfSha256: SHA_B,
        candidatePath: resolve(PROFILE_PATHS.pdfCandidateRoot, `${SHA_A}.pdf`),
        candidateBytes: Buffer.from('these bytes hash to neither'),
        releaseReceipt: {
          kind: 'resume-release',
          candidateId: SHA_A,
          pdfSha256: SHA_B,
        },
      }),
    ).rejects.toMatchObject({ code: 'RELEASE_CANDIDATE_STALE' });

    // The refusal must leave no journal behind for a later run to resume from.
    expect(await readReleaseJournal()).toBeNull();
  });

  test('a candidate ID that is not a digest is refused', async () => {
    await expect(
      promoteResumeRelease({
        candidateId: 'not-a-digest',
        candidatePdfSha256: SHA_A,
        candidatePath: resolve(PROFILE_PATHS.pdfCandidateRoot, 'x.pdf'),
        candidateBytes: Buffer.from('pdf'),
        releaseReceipt: { kind: 'resume-release' },
      }),
    ).rejects.toMatchObject({ code: 'RELEASE_CANDIDATE_ID_INVALID' });
  });

  test('a draft receipt can never stand in for a release receipt', async () => {
    await expect(
      promoteResumeRelease({
        candidateId: SHA_A,
        candidatePdfSha256: SHA_A,
        candidatePath: resolve(PROFILE_PATHS.pdfCandidateRoot, `${SHA_A}.pdf`),
        candidateBytes: Buffer.from('pdf'),
        releaseReceipt: { kind: 'resume-inspection-draft' },
      }),
    ).rejects.toMatchObject({ code: 'RELEASE_RECEIPT_INVALID' });
  });

  test('a prepared candidate whose draft names other bytes is refused', async () => {
    await mkdir(PROFILE_PATHS.pdfCandidateRoot, { recursive: true });
    const candidatePath = resolve(
      PROFILE_PATHS.pdfCandidateRoot,
      `${SHA_A}.pdf`,
    );
    const draftPath = resolve(
      PROFILE_PATHS.pdfCandidateRoot,
      `${SHA_A}.draft.json`,
    );
    await writeFile(candidatePath, 'candidate bytes');
    await writeFile(
      draftPath,
      JSON.stringify({
        kind: 'resume-inspection-draft',
        candidate: { candidateId: SHA_A, pdfSha256: SHA_B },
      }),
    );

    try {
      await expect(readPreparedEvidence(SHA_A)).rejects.toMatchObject({
        code: 'RELEASE_CANDIDATE_STALE',
      });
    } finally {
      await rm(candidatePath, { force: true });
      await rm(draftPath, { force: true });
    }
  });
});

describe('the pending capability cannot be forged or replayed', () => {
  test('an object this store did not issue is not a capability', () => {
    expect(() =>
      resolvePendingRelease({ kind: 'pending-resume-release' }),
    ).toThrow(/not issued/i);
  });

  test('a capability cannot be serialised into something recoverable', () => {
    const capability = releaseStoreTesting.createPendingCapability({
      journal: {
        journalId: 'j1',
        state: 'PDF_COMMITTED',
        candidateId: SHA_A,
        newPdfSha256: SHA_A,
        newReceiptSha256: SHA_B,
      },
      lock: { lockId: 'l1' },
      settled: false,
    });

    expect(() => JSON.stringify(capability)).toThrow(/serialis/i);
    // The description is a read-only view; it names the pair and grants nothing.
    expect(describePendingRelease(capability)).toMatchObject({
      journalId: 'j1',
      state: 'PDF_COMMITTED',
    });
  });

  test('a settled capability cannot be used a second time', () => {
    const capability = releaseStoreTesting.createPendingCapability({
      journal: {
        journalId: 'j1',
        state: 'PDF_COMMITTED',
        candidateId: SHA_A,
        newPdfSha256: SHA_A,
        newReceiptSha256: SHA_B,
      },
      lock: { lockId: 'l1' },
      settled: true,
    });

    expect(() => resolvePendingRelease(capability)).toThrow(
      /finalized or rolled back/i,
    );
  });
});

describe('named journal transitions', () => {
  test('a commit cannot be abandoned by skipping to a settling command', () => {
    expect(nextReleaseState('PDF_COMMITTED', 'cleanup').ok).toBe(false);
    expect(nextReleaseState('RECEIPT_PROMOTED', 'finalize').ok).toBe(false);
  });

  test('rollback must restore in order and cannot jump to done', () => {
    expect(nextReleaseState('ROLLBACK_REQUIRED', 'completeRollback').ok).toBe(
      false,
    );
    expect(nextReleaseState('ROLLBACK_REQUIRED', 'restorePdf')).toMatchObject({
      ok: true,
      state: 'ROLLBACK_PDF_RESTORED',
    });
  });

  test('a settled transaction cannot be reopened without a new promotion', () => {
    expect(nextReleaseState(RELEASE_STATE_ABSENT, 'verifyFinal').ok).toBe(false);
    expect(nextReleaseState(RELEASE_STATE_ABSENT, 'open')).toMatchObject({
      ok: true,
      state: 'PREPARED',
    });
  });
});

describe('the stable command surface', () => {
  test('is exactly five commands', () => {
    expect([...STABLE_COMMANDS]).toStrictEqual([
      'test:unit',
      'test:pbt',
      'test:e2e',
      'resume:pdf',
      'resume:pdf:verify',
    ]);
  });

  test('CI aggregates the four read-only commands and never the mutating one', () => {
    expect([...READ_ONLY_COMMANDS]).not.toContain('resume:pdf');
    expect(READ_ONLY_COMMANDS).toHaveLength(4);
    for (const command of READ_ONLY_COMMANDS) {
      expect(STABLE_COMMANDS).toContain(command);
    }
  });

  test('an unknown command is refused rather than guessed at', async () => {
    await expect(cliMain(['test:units'])).rejects.toMatchObject({
      code: 'CLI_UNKNOWN_COMMAND',
    });
  });

  test('resume:pdf refuses to infer prepare or promote', async () => {
    await expect(cliMain(['resume:pdf'])).rejects.toMatchObject({
      code: 'CLI_RESUME_PDF_MODE_REQUIRED',
    });
  });

  test('promote requires both the candidate and the review record', async () => {
    await expect(
      cliMain(['resume:pdf', '--promote', SHA_A]),
    ).rejects.toMatchObject({ code: 'CLI_PROMOTE_ARGUMENTS_REQUIRED' });
  });

  test('a passing verdict the CLI computed itself is still reported', () => {
    // `resume:pdf:verify` is the only command that both passes and produces its
    // own verdict. Reported silently, a working verification and a no-op are
    // the same observation, so the read-only gate could never be confirmed.
    expect(
      shouldReportResult({
        rule: 'LC-U1-19/NFR-U1-010',
        result: 'pass',
        candidateId: SHA_A,
        pdfSha256: SHA_B,
      }),
    ).toBe(true);
  });

  test('a routed pass adds nothing, because the child already reported', () => {
    expect(
      shouldReportResult({
        rule: 'LC-U1-19/NFR-U1-010',
        result: 'pass',
        routed: true,
      }),
    ).toBe(false);
  });

  test('a non-pass verdict is reported and an absent one is not', () => {
    expect(shouldReportResult({ result: 'released' })).toBe(true);
    expect(shouldReportResult(undefined)).toBe(false);
  });
});
