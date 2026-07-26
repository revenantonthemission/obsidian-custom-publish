import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import {
  legalReleaseCommands,
  nextReleaseState,
  releaseStateInvariants,
  RELEASE_COMMANDS,
  RELEASE_JOURNAL_STATES,
  RELEASE_STATE_ABSENT,
} from '../../../scripts/profile/release-store.mjs';
import {
  releaseCommandArbitrary,
  releaseCommandSequenceArbitrary,
  releaseProtocolSequenceArbitrary,
  releaseStateArbitrary,
  type ReleaseCommand,
  type ReleaseState,
} from './arbitraries/release.js';

/**
 * An independent reference for the release journal, written out longhand.
 *
 * It deliberately does not read the store's transition table. Comparing the
 * model against a table derived from itself would prove only that a lookup is
 * deterministic; enumerating the legal edges by hand from the NFR Design state
 * table is what makes the equivalence a real check on the implementation.
 */
const REFERENCE_EDGES: readonly (readonly [
  ReleaseState,
  ReleaseCommand,
  ReleaseState,
])[] = Object.freeze([
  [RELEASE_STATE_ABSENT, 'open', 'PREPARED'],
  ['PREPARED', 'validatePromotion', 'PROMOTION_VALIDATED'],
  ['PROMOTION_VALIDATED', 'snapshotRecovery', 'RECOVERY_SNAPSHOTTED'],
  ['RECOVERY_SNAPSHOTTED', 'promoteReceipt', 'RECEIPT_PROMOTED'],
  ['RECEIPT_PROMOTED', 'commitPdf', 'PDF_COMMITTED'],
  ['PDF_COMMITTED', 'verifyFinal', 'FINAL_VERIFIED'],
  ['FINAL_VERIFIED', 'finalize', RELEASE_STATE_ABSENT],
  ['PREPARED', 'requireRollback', 'ROLLBACK_REQUIRED'],
  ['PROMOTION_VALIDATED', 'requireRollback', 'ROLLBACK_REQUIRED'],
  ['RECOVERY_SNAPSHOTTED', 'requireRollback', 'ROLLBACK_REQUIRED'],
  ['RECEIPT_PROMOTED', 'requireRollback', 'ROLLBACK_REQUIRED'],
  ['PDF_COMMITTED', 'requireRollback', 'ROLLBACK_REQUIRED'],
  ['ROLLBACK_REQUIRED', 'restorePdf', 'ROLLBACK_PDF_RESTORED'],
  ['ROLLBACK_PDF_RESTORED', 'restoreReceipt', 'ROLLBACK_RECEIPT_RESTORED'],
  ['ROLLBACK_RECEIPT_RESTORED', 'completeRollback', 'ROLLED_BACK'],
  ['ROLLED_BACK', 'cleanup', RELEASE_STATE_ABSENT],
] as const);

interface ReferenceDecision {
  readonly ok: boolean;
  readonly state: ReleaseState;
}

function referenceNext(
  state: ReleaseState,
  command: ReleaseCommand,
): ReferenceDecision {
  // Neither ending the process nor re-reading the journal changes durable
  // state, so both are accepted everywhere and move nothing.
  if (command === 'crash' || command === 'resume') {
    return { ok: true, state };
  }
  const edge = REFERENCE_EDGES.find(
    ([from, via]) => from === state && via === command,
  );
  return edge === undefined
    ? { ok: false, state }
    : { ok: true, state: edge[2] };
}

const ROLLBACK_ARM: readonly ReleaseState[] = Object.freeze([
  'ROLLBACK_REQUIRED',
  'ROLLBACK_PDF_RESTORED',
  'ROLLBACK_RECEIPT_RESTORED',
  'ROLLED_BACK',
]);

const FORWARD_ARM: readonly ReleaseState[] = Object.freeze([
  'PREPARED',
  'PROMOTION_VALIDATED',
  'RECOVERY_SNAPSHOTTED',
  'RECEIPT_PROMOTED',
  'PDF_COMMITTED',
  'FINAL_VERIFIED',
]);

function assertInvariants(state: ReleaseState): void {
  const invariants = releaseStateInvariants(state);

  // The lock exists exactly as long as the journal does. Every read-only
  // command keys its fail-closed decision off this equivalence.
  expect(invariants.lockHeld).toBe(invariants.journalPresent);
  expect(invariants.readOnlyVerifyBlocked).toBe(invariants.journalPresent);

  // A pair may only be called the current release once nothing is in flight.
  if (invariants.publicPairClaimable) {
    expect(invariants.terminal).toBe(true);
    expect(invariants.journalPresent).toBe(false);
  }

  // Recovery bytes are required from the moment they are taken until the
  // transaction settles, so no state past the snapshot may drop them.
  if (invariants.recoveryRequired) {
    expect(invariants.journalPresent).toBe(true);
  }

  // The commit point is where failure stops being free.
  if (invariants.publicFileCommitted) {
    expect(invariants.recoveryRequired).toBe(true);
  }

  expect(invariants.rollingBack).toBe(ROLLBACK_ARM.includes(state));
}

test.prop([releaseCommandSequenceArbitrary])(
  'U1-P28 every generated command sequence steps identically in the model and an independent reference',
  (commands) => {
    let modelState: ReleaseState = RELEASE_STATE_ABSENT;
    let referenceState: ReleaseState = RELEASE_STATE_ABSENT;

    // The empty sequence is a real case: it must leave a transaction that was
    // never opened absent, claimable and unlocked.
    expect(modelState).toBe(referenceState);
    assertInvariants(modelState);

    for (const command of commands) {
      const model = nextReleaseState(modelState, command);
      const reference = referenceNext(referenceState, command);

      expect(model.ok).toBe(reference.ok);
      if (model.ok) {
        modelState = model.state as ReleaseState;
        referenceState = reference.state;
      }
      // A refused command must leave both exactly where they were.
      expect(modelState).toBe(referenceState);
      assertInvariants(modelState);
    }
  },
);

test.prop([releaseProtocolSequenceArbitrary])(
  'U1-P29 protocol-shaped sequences preserve every release invariant at each step',
  (commands) => {
    let state: ReleaseState = RELEASE_STATE_ABSENT;
    let everRolledBack = false;

    for (const command of commands) {
      const decision = nextReleaseState(state, command);
      if (!decision.ok) {
        // Rejection is not an error state; it is a refusal that changes
        // nothing, which is the property worth asserting.
        assertInvariants(state);
        continue;
      }
      const previous = state;
      state = decision.state as ReleaseState;
      assertInvariants(state);

      // Settling ends the transaction. The one-way rollback property below
      // belongs to a single transaction, not to the process: once the journal
      // is gone, a fresh promote may legitimately open and go forward again.
      if (state === RELEASE_STATE_ABSENT) everRolledBack = false;
      if (ROLLBACK_ARM.includes(state)) everRolledBack = true;

      // Within one transaction, entering the rollback arm is irreversible: it
      // can only continue undoing itself or finish, never rejoin the forward
      // path and claim a release it already began to withdraw.
      if (everRolledBack) {
        expect(FORWARD_ARM.includes(state)).toBe(false);
      }

      // `crash` and `resume` are legal everywhere and move nothing, so the
      // rung check below applies only to transitions that actually advance.
      if (state === previous) continue;

      // No transition may skip a rung: the index must advance by exactly one
      // along whichever arm it is on.
      const forwardFrom = FORWARD_ARM.indexOf(previous);
      const forwardTo = FORWARD_ARM.indexOf(state);
      if (forwardFrom >= 0 && forwardTo >= 0) {
        expect(forwardTo).toBe(forwardFrom + 1);
      }
      const rollbackFrom = ROLLBACK_ARM.indexOf(previous);
      const rollbackTo = ROLLBACK_ARM.indexOf(state);
      if (rollbackFrom >= 0 && rollbackTo >= 0) {
        expect(rollbackTo).toBe(rollbackFrom + 1);
      }
    }
  },
);

test.prop([releaseStateArbitrary, releaseCommandArbitrary])(
  'U1-P30 a refused command never moves the journal and a legal one always does what the reference says',
  (state, command) => {
    const model = nextReleaseState(state, command);
    const reference = referenceNext(state, command);

    expect(model.ok).toBe(reference.ok);
    if (!model.ok) {
      expect(model.state).toBe(state);
      expect(model.reason).toBe('transition.illegal');
      return;
    }
    expect(model.state).toBe(reference.state);

    // The advertised legal set and the transition function must agree; a
    // command the store offers but refuses would be a trap for the caller.
    expect(legalReleaseCommands(state).includes(command)).toBe(true);
  },
);

test.prop([releaseStateArbitrary])(
  'U1-P31 settling commands are reachable only from the one state that earns them',
  (state) => {
    const finalize = nextReleaseState(state, 'finalize');
    expect(finalize.ok).toBe(state === 'FINAL_VERIFIED');

    const cleanup = nextReleaseState(state, 'cleanup');
    expect(cleanup.ok).toBe(state === 'ROLLED_BACK');

    // Both settle to the same absent state, which is what makes "no journal"
    // the single meaning of "nothing is in flight".
    if (finalize.ok) expect(finalize.state).toBe(RELEASE_STATE_ABSENT);
    if (cleanup.ok) expect(cleanup.state).toBe(RELEASE_STATE_ABSENT);

    // A commit may never be undone by simply forgetting it.
    if (state === 'RECEIPT_PROMOTED' || state === 'PDF_COMMITTED') {
      expect(nextReleaseState(state, 'cleanup').ok).toBe(false);
      expect(nextReleaseState(state, 'finalize').ok).toBe(false);
    }
  },
);

test.prop([releaseStateArbitrary, fc.integer({ min: 1, max: 6 })])(
  'U1-P32 crashing and resuming any number of times is indistinguishable from doing neither',
  (state, repetitions) => {
    let crashed: ReleaseState = state;
    for (let index = 0; index < repetitions; index += 1) {
      const crash = nextReleaseState(crashed, 'crash');
      expect(crash.ok).toBe(true);
      crashed = crash.state as ReleaseState;
      const resumed = nextReleaseState(crashed, 'resume');
      expect(resumed.ok).toBe(true);
      crashed = resumed.state as ReleaseState;
    }
    expect(crashed).toBe(state);
    expect(releaseStateInvariants(crashed)).toStrictEqual(
      releaseStateInvariants(state),
    );
  },
);

test.prop([releaseStateArbitrary])(
  'U1-P33 the model recognises exactly the declared state vocabulary and rejects anything else',
  (state) => {
    expect([RELEASE_STATE_ABSENT, ...RELEASE_JOURNAL_STATES]).toContain(state);
    expect(RELEASE_COMMANDS.length).toBeGreaterThan(0);

    // An unknown state is rejected rather than treated as a fresh start.
    expect(nextReleaseState('NOT_A_STATE', 'open')).toMatchObject({
      ok: false,
      reason: 'state.unknown',
    });
    // An unknown command is rejected without consulting the table.
    expect(nextReleaseState(state, 'not-a-command')).toMatchObject({
      ok: false,
      reason: 'command.unknown',
    });
  },
);
