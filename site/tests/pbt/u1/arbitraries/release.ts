import * as fc from 'fast-check';

import {
  RELEASE_COMMANDS,
  RELEASE_JOURNAL_STATES,
  RELEASE_STATE_ABSENT,
} from '../../../../scripts/profile/release-store.mjs';

export type ReleaseCommand = (typeof RELEASE_COMMANDS)[number];
export type ReleaseState =
  | typeof RELEASE_STATE_ABSENT
  | (typeof RELEASE_JOURNAL_STATES)[number];

/** The one command order that carries a transaction from absent to settled. */
export const FORWARD_PATH: readonly ReleaseCommand[] = Object.freeze([
  'open',
  'validatePromotion',
  'snapshotRecovery',
  'promoteReceipt',
  'commitPdf',
  'verifyFinal',
  'finalize',
] as ReleaseCommand[]);

/** The order a committed transaction must follow to undo itself. */
export const ROLLBACK_PATH: readonly ReleaseCommand[] = Object.freeze([
  'requireRollback',
  'restorePdf',
  'restoreReceipt',
  'completeRollback',
  'cleanup',
] as ReleaseCommand[]);

/**
 * A command sequence, including the empty one.
 *
 * Sequences are drawn from the whole command vocabulary rather than from the
 * commands that happen to be legal at each point. Restricting the draw would
 * only ever generate well-behaved transactions, and the interesting claim is
 * that an illegal command is refused *without moving the journal* — which a
 * legal-only generator can never observe.
 */
export const releaseCommandSequenceArbitrary: fc.Arbitrary<
  readonly ReleaseCommand[]
> = fc.array(
  fc.constantFrom(...(RELEASE_COMMANDS as readonly ReleaseCommand[])),
  { minLength: 0, maxLength: 24 },
);

/**
 * A sequence biased toward real protocol prefixes so the deep states are
 * actually reached. A uniform draw almost never produces six correct commands
 * in a row, so `PDF_COMMITTED` and everything past it would go unexercised.
 */
export const releaseProtocolSequenceArbitrary: fc.Arbitrary<
  readonly ReleaseCommand[]
> = fc
  .tuple(
    fc.nat({ max: FORWARD_PATH.length }),
    fc.boolean(),
    fc.array(
      fc.constantFrom(...(RELEASE_COMMANDS as readonly ReleaseCommand[])),
      { minLength: 0, maxLength: 8 },
    ),
  )
  .map(([prefixLength, takeRollbackArm, suffix]) => [
    ...FORWARD_PATH.slice(0, prefixLength),
    ...(takeRollbackArm ? ROLLBACK_PATH : []),
    ...suffix,
  ]);

/** Any state the model recognises, including the absent one. */
export const releaseStateArbitrary: fc.Arbitrary<ReleaseState> =
  fc.constantFrom(
    RELEASE_STATE_ABSENT as ReleaseState,
    ...(RELEASE_JOURNAL_STATES as readonly ReleaseState[]),
  );

export const releaseCommandArbitrary: fc.Arbitrary<ReleaseCommand> =
  fc.constantFrom(...(RELEASE_COMMANDS as readonly ReleaseCommand[]));
