import { createHash, randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  unlink,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { PROFILE_PATHS } from './profile-paths.mjs';

const RELEASE_RULE = 'LC-U1-16/NFR-U1-007';
const JOURNAL_SCHEMA_VERSION = 1;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

/**
 * The durable journal states, in the order the protocol may traverse them.
 *
 * `PDF_COMMITTED` is the public-file commit point: before it, failure is
 * recovered by restoring nothing; after it, only by restoring the verified
 * snapshot the journal names.
 */
export const RELEASE_JOURNAL_STATES = Object.freeze([
  'PREPARED',
  'PROMOTION_VALIDATED',
  'RECOVERY_SNAPSHOTTED',
  'RECEIPT_PROMOTED',
  'PDF_COMMITTED',
  'FINAL_VERIFIED',
  'ROLLBACK_REQUIRED',
  'ROLLBACK_PDF_RESTORED',
  'ROLLBACK_RECEIPT_RESTORED',
  'ROLLED_BACK',
]);

/**
 * The commands a promote process may issue. `crash` and `resume` are modelled
 * explicitly because an interrupted transaction is a normal state of this
 * protocol, not an exceptional one.
 */
export const RELEASE_COMMANDS = Object.freeze([
  'open',
  'validatePromotion',
  'snapshotRecovery',
  'promoteReceipt',
  'commitPdf',
  'verifyFinal',
  'finalize',
  'requireRollback',
  'restorePdf',
  'restoreReceipt',
  'completeRollback',
  'cleanup',
  'crash',
  'resume',
]);

/** No journal on disk. Distinct from every journal state. */
export const RELEASE_STATE_ABSENT = 'ABSENT';

const FORWARD_TRANSITIONS = Object.freeze({
  [RELEASE_STATE_ABSENT]: Object.freeze({ open: 'PREPARED' }),
  PREPARED: Object.freeze({
    validatePromotion: 'PROMOTION_VALIDATED',
    requireRollback: 'ROLLBACK_REQUIRED',
  }),
  PROMOTION_VALIDATED: Object.freeze({
    snapshotRecovery: 'RECOVERY_SNAPSHOTTED',
    requireRollback: 'ROLLBACK_REQUIRED',
  }),
  RECOVERY_SNAPSHOTTED: Object.freeze({
    promoteReceipt: 'RECEIPT_PROMOTED',
    requireRollback: 'ROLLBACK_REQUIRED',
  }),
  RECEIPT_PROMOTED: Object.freeze({
    commitPdf: 'PDF_COMMITTED',
    requireRollback: 'ROLLBACK_REQUIRED',
  }),
  PDF_COMMITTED: Object.freeze({
    verifyFinal: 'FINAL_VERIFIED',
    requireRollback: 'ROLLBACK_REQUIRED',
  }),
  FINAL_VERIFIED: Object.freeze({ finalize: RELEASE_STATE_ABSENT }),
  ROLLBACK_REQUIRED: Object.freeze({ restorePdf: 'ROLLBACK_PDF_RESTORED' }),
  ROLLBACK_PDF_RESTORED: Object.freeze({
    restoreReceipt: 'ROLLBACK_RECEIPT_RESTORED',
  }),
  ROLLBACK_RECEIPT_RESTORED: Object.freeze({
    completeRollback: 'ROLLED_BACK',
  }),
  ROLLED_BACK: Object.freeze({ cleanup: RELEASE_STATE_ABSENT }),
});

const ROLLBACK_STATES = Object.freeze(
  new Set([
    'ROLLBACK_REQUIRED',
    'ROLLBACK_PDF_RESTORED',
    'ROLLBACK_RECEIPT_RESTORED',
    'ROLLED_BACK',
  ]),
);

const RECOVERY_HELD_STATES = Object.freeze(
  new Set([
    'RECOVERY_SNAPSHOTTED',
    'RECEIPT_PROMOTED',
    'PDF_COMMITTED',
    'FINAL_VERIFIED',
    'ROLLBACK_REQUIRED',
    'ROLLBACK_PDF_RESTORED',
    'ROLLBACK_RECEIPT_RESTORED',
    'ROLLED_BACK',
  ]),
);

export class ResumeReleaseError extends Error {
  constructor(message, { code, stage, details = {} } = {}) {
    super(message);
    this.name = 'ResumeReleaseError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = RELEASE_RULE;
    this.details = Object.freeze({ ...details });
  }
}

function releaseError(code, message, stage, details) {
  return new ResumeReleaseError(message, { code, stage, details });
}

/* ------------------------------------------------------------------ */
/* Pure journal transition model (LC-U1-16). No filesystem access.      */
/* ------------------------------------------------------------------ */

/**
 * Decides the single legal successor of `(state, command)`.
 *
 * This is the sole authority on what the journal may do next; the filesystem
 * layer below asks it before every mutation rather than encoding the order a
 * second time. Anything not named here is rejected — the model never guesses a
 * transition from an unexplained combination.
 */
export function nextReleaseState(state, command) {
  if (!isKnownState(state)) {
    return rejection('state.unknown', state, command);
  }
  if (!RELEASE_COMMANDS.includes(command)) {
    return rejection('command.unknown', state, command);
  }
  // A crash never changes durable state; it only ends the process. Resume
  // re-reads whatever the journal already holds.
  if (command === 'crash' || command === 'resume') {
    return Object.freeze({ ok: true, state });
  }
  const next = FORWARD_TRANSITIONS[state]?.[command];
  if (next === undefined) {
    return rejection('transition.illegal', state, command);
  }
  return Object.freeze({ ok: true, state: next });
}

/**
 * The observable facts that must hold in a state, independent of how it was
 * reached. The PBT suite asserts these after every generated step.
 */
export function releaseStateInvariants(state) {
  if (!isKnownState(state)) {
    throw new TypeError(`unknown release state: ${String(state)}`);
  }
  const journalPresent = state !== RELEASE_STATE_ABSENT;
  return Object.freeze({
    state,
    journalPresent,
    // The lock is held for exactly as long as the journal exists. That is what
    // makes "a journal is on disk" a sufficient reason for read-only commands
    // to fail closed.
    lockHeld: journalPresent,
    recoveryRequired: RECOVERY_HELD_STATES.has(state),
    rollingBack: ROLLBACK_STATES.has(state),
    // Only a settled transaction leaves a pair that may be called the current
    // release. A committed-but-unverified pair is explicitly not claimable.
    publicPairClaimable: state === RELEASE_STATE_ABSENT,
    // After the commit point, failure requires restoring bytes rather than
    // simply abandoning the attempt.
    publicFileCommitted:
      state === 'PDF_COMMITTED' ||
      state === 'FINAL_VERIFIED' ||
      state === 'ROLLBACK_REQUIRED',
    readOnlyVerifyBlocked: journalPresent,
    terminal: state === RELEASE_STATE_ABSENT,
  });
}

/** Every command legal in `state`, in declaration order. */
export function legalReleaseCommands(state) {
  if (!isKnownState(state)) {
    throw new TypeError(`unknown release state: ${String(state)}`);
  }
  return Object.freeze([
    ...Object.keys(FORWARD_TRANSITIONS[state] ?? {}),
    'crash',
    'resume',
  ]);
}

function isKnownState(state) {
  return (
    state === RELEASE_STATE_ABSENT || RELEASE_JOURNAL_STATES.includes(state)
  );
}

function rejection(reason, state, command) {
  return Object.freeze({ ok: false, reason, state, command });
}

/* ------------------------------------------------------------------ */
/* Path safety                                                          */
/* ------------------------------------------------------------------ */

/** The fixed allowlist. Nothing outside it is ever opened for writing. */
function releaseAllowlist() {
  return Object.freeze({
    fixed: Object.freeze([
      PROFILE_PATHS.publicResumePdfPath,
      PROFILE_PATHS.trackedReleaseReceiptPath,
      PROFILE_PATHS.releaseJournalPath,
      PROFILE_PATHS.releaseLockPath,
    ]),
    roots: Object.freeze([
      PROFILE_PATHS.releaseRecoveryRoot,
      PROFILE_PATHS.releaseQuarantineRoot,
      PROFILE_PATHS.releaseStagingRoot,
      PROFILE_PATHS.pdfCandidateRoot,
    ]),
  });
}

function isContained(root, target) {
  const fromRoot = relative(root, target);
  return (
    fromRoot !== '' &&
    fromRoot !== '..' &&
    !fromRoot.startsWith(`..${sep}`) &&
    !fromRoot.startsWith(sep)
  );
}

function assertAllowlistedPath(target, stage) {
  const allowlist = releaseAllowlist();
  if (allowlist.fixed.includes(target)) return target;
  if (allowlist.roots.some((root) => isContained(root, target))) return target;
  throw releaseError(
    'RELEASE_PATH_NOT_ALLOWED',
    'The release transaction refused a path outside its fixed allowlist.',
    stage,
    { target },
  );
}

/**
 * Rechecks the exact target immediately before every create, read and rename.
 *
 * Checking once at startup would be checking a path that may since have become
 * a symlink; doing it here keeps the window between check and operation as
 * small as the filesystem allows.
 */
async function assertSafeTarget(target, stage, { mustExist = false } = {}) {
  assertAllowlistedPath(target, stage);
  let stats;
  try {
    stats = await lstat(target);
  } catch {
    if (mustExist) {
      throw releaseError(
        'RELEASE_TARGET_MISSING',
        'A required release target is absent.',
        stage,
        { target },
      );
    }
    return Object.freeze({ present: false, stats: null });
  }
  if (stats.isSymbolicLink()) {
    throw releaseError(
      'RELEASE_TARGET_SYMLINK',
      'The release transaction refused a symlinked target.',
      stage,
      { target },
    );
  }
  if (!stats.isFile()) {
    throw releaseError(
      'RELEASE_TARGET_NOT_REGULAR',
      'The release transaction refused a non-regular target.',
      stage,
      { target },
    );
  }
  assertAllowlistedPath(await realpath(target), stage);
  return Object.freeze({ present: true, stats });
}

/**
 * An atomic rename cannot cross a filesystem, so a promotion that would need
 * one is refused before any mutation rather than discovered halfway through.
 */
async function assertSameDevice(leftDir, rightDir, stage) {
  await mkdir(leftDir, { recursive: true });
  await mkdir(rightDir, { recursive: true });
  const [left, right] = await Promise.all([lstat(leftDir), lstat(rightDir)]);
  if (left.dev !== right.dev) {
    throw releaseError(
      'RELEASE_CROSS_DEVICE',
      'Candidate staging and the public target are on different filesystems.',
      stage,
      { leftDir, rightDir },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Durability helpers                                                   */
/* ------------------------------------------------------------------ */

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fsyncDirectory(directory) {
  const handle = await open(directory, fsConstants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Writes bytes durably, then renames them into place and fsyncs the parent. */
async function atomicWrite(target, bytes, stage) {
  assertAllowlistedPath(target, stage);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true });
  const temporary = resolve(directory, `.${randomUUID()}.tmp`);
  const handle = await open(temporary, 'wx', 0o644);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
  await fsyncDirectory(directory);
  return sha256(bytes);
}

/** Moves a file within the same filesystem and fsyncs both parents. */
async function atomicMove(from, to, stage) {
  assertAllowlistedPath(from, stage);
  assertAllowlistedPath(to, stage);
  await mkdir(dirname(to), { recursive: true });
  await rename(from, to);
  await fsyncDirectory(dirname(to));
  if (dirname(from) !== dirname(to)) {
    await fsyncDirectory(dirname(from));
  }
}

async function readIfPresent(target, stage) {
  const probe = await assertSafeTarget(target, stage);
  if (!probe.present) return null;
  return readFile(target);
}

/* ------------------------------------------------------------------ */
/* Lock                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Acquires the repository-local exclusive release lock.
 *
 * `O_CREAT | O_EXCL` gives OS-level exclusivity, which is the only claim made
 * here. A lock whose owning process has died is deliberately *not* broken:
 * a stale lock and a live one look identical from outside, and guessing wrong
 * means two writers on the public file.
 */
export async function acquireReleaseLock({ stage = 'release.lock' } = {}) {
  await mkdir(PROFILE_PATHS.releaseRoot, { recursive: true });
  assertAllowlistedPath(PROFILE_PATHS.releaseLockPath, stage);
  const lockId = randomUUID();
  let handle;
  try {
    handle = await open(PROFILE_PATHS.releaseLockPath, 'wx', 0o644);
  } catch (cause) {
    if (cause?.code === 'EEXIST') {
      throw releaseError(
        'RELEASE_LOCK_HELD',
        'Another release transaction holds the exclusive lock.',
        stage,
        { lockPath: PROFILE_PATHS.releaseLockPath },
      );
    }
    throw cause;
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({
        lockId,
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
      })}\n`,
      'utf8',
    );
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsyncDirectory(PROFILE_PATHS.releaseRoot);

  let released = false;
  return Object.freeze({
    lockId,
    lockPath: PROFILE_PATHS.releaseLockPath,
    get released() {
      return released;
    },
    async release() {
      if (released) return;
      released = true;
      await unlink(PROFILE_PATHS.releaseLockPath).catch(() => {});
      await fsyncDirectory(PROFILE_PATHS.releaseRoot).catch(() => {});
    },
  });
}

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

function requireJournalShape(value, stage) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.schemaVersion !== JOURNAL_SCHEMA_VERSION ||
    typeof value.journalId !== 'string' ||
    !RELEASE_JOURNAL_STATES.includes(value.state) ||
    typeof value.candidateId !== 'string' ||
    !SHA256_PATTERN.test(value.newPdfSha256 ?? '') ||
    !SHA256_PATTERN.test(value.newReceiptSha256 ?? '') ||
    (value.oldPdfSha256 !== null && !SHA256_PATTERN.test(value.oldPdfSha256)) ||
    (value.oldReceiptSha256 !== null &&
      !SHA256_PATTERN.test(value.oldReceiptSha256))
  ) {
    throw releaseError(
      'RELEASE_JOURNAL_INVALID',
      'The release journal is unreadable or does not match its schema.',
      stage,
      {},
    );
  }
  return value;
}

/** Reads the journal without touching it. Absent is a valid answer. */
export async function readReleaseJournal({
  stage = 'release.journal.read',
} = {}) {
  const bytes = await readIfPresent(PROFILE_PATHS.releaseJournalPath, stage);
  if (bytes === null) return null;
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw releaseError(
      'RELEASE_JOURNAL_INVALID',
      'The release journal is not valid JSON.',
      stage,
      {},
    );
  }
  return Object.freeze(requireJournalShape(parsed, stage));
}

/**
 * Advances the journal through the pure model and fsyncs the new state before
 * the mutation it authorises is attempted.
 */
async function advanceJournal(journal, command, patch, stage) {
  const currentState = journal === null ? RELEASE_STATE_ABSENT : journal.state;
  const decision = nextReleaseState(currentState, command);
  if (!decision.ok) {
    throw releaseError(
      'RELEASE_TRANSITION_ILLEGAL',
      'The release transaction refused a transition its journal does not allow.',
      stage,
      { from: currentState, command, reason: decision.reason },
    );
  }
  if (decision.state === RELEASE_STATE_ABSENT) {
    await unlink(PROFILE_PATHS.releaseJournalPath).catch(() => {});
    await fsyncDirectory(PROFILE_PATHS.releaseRoot);
    return null;
  }
  const next = {
    ...(journal ?? {}),
    ...patch,
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    state: decision.state,
    updatedAt: new Date().toISOString(),
  };
  requireJournalShape(next, stage);
  await atomicWrite(
    PROFILE_PATHS.releaseJournalPath,
    Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8'),
    stage,
  );
  return Object.freeze(next);
}

/* ------------------------------------------------------------------ */
/* Read-only inspection                                                 */
/* ------------------------------------------------------------------ */

/**
 * What a read-only command needs to know before it may claim anything.
 *
 * `resume:pdf:verify`, the test commands and any later aggregation call this
 * and stop when `active` is true. None of them may repair what they find.
 */
export async function inspectReleaseState({ stage = 'release.inspect' } = {}) {
  const lockProbe = await assertSafeTarget(PROFILE_PATHS.releaseLockPath, stage);
  const journal = await readReleaseJournal({ stage });
  const state = journal === null ? RELEASE_STATE_ABSENT : journal.state;
  return Object.freeze({
    rule: RELEASE_RULE,
    lockPresent: lockProbe.present,
    journalPresent: journal !== null,
    state,
    journalId: journal?.journalId ?? null,
    active: lockProbe.present || journal !== null,
    invariants: releaseStateInvariants(state),
  });
}

/**
 * Reads the current tracked pair without mutating it. Either both are present
 * or neither is; a half-present pair is a failure, not a first release.
 */
export async function readCurrentReleasePair({
  stage = 'release.pair.read',
} = {}) {
  const pdfBytes = await readIfPresent(PROFILE_PATHS.publicResumePdfPath, stage);
  const receiptBytes = await readIfPresent(
    PROFILE_PATHS.trackedReleaseReceiptPath,
    stage,
  );
  if (pdfBytes === null && receiptBytes === null) {
    return Object.freeze({ present: false, pdf: null, receipt: null });
  }
  if (pdfBytes === null || receiptBytes === null) {
    throw releaseError(
      'RELEASE_PAIR_INCOMPLETE',
      'Exactly one of the public PDF and the tracked receipt exists.',
      stage,
      { pdfPresent: pdfBytes !== null, receiptPresent: receiptBytes !== null },
    );
  }
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString('utf8'));
  } catch {
    throw releaseError(
      'RELEASE_RECEIPT_UNREADABLE',
      'The tracked release receipt is not valid JSON.',
      stage,
      {},
    );
  }
  return Object.freeze({
    present: true,
    pdf: Object.freeze({
      bytes: pdfBytes,
      sha256: sha256(pdfBytes),
      path: PROFILE_PATHS.publicResumePdfPath,
    }),
    receipt: Object.freeze({
      value: receipt,
      bytes: receiptBytes,
      sha256: sha256(receiptBytes),
      path: PROFILE_PATHS.trackedReleaseReceiptPath,
    }),
  });
}

/* ------------------------------------------------------------------ */
/* Opaque pending capability                                            */
/* ------------------------------------------------------------------ */

/**
 * The pending capability's real contents live here, keyed by an object that is
 * never serialised. A capability recovered from a file, an environment variable
 * or a CLI argument therefore cannot exist: only the store that created it in
 * this process can resolve it back to a transaction.
 */
const PENDING_RELEASES = new WeakMap();

function createPendingCapability(record) {
  const capability = Object.freeze({
    kind: 'pending-resume-release',
    toJSON() {
      throw releaseError(
        'RELEASE_CAPABILITY_NOT_SERIALIZABLE',
        'A pending release capability may not be serialised.',
        'release.capability',
        {},
      );
    },
  });
  PENDING_RELEASES.set(capability, record);
  return capability;
}

/** Resolves a capability this process issued, or fails terminally. */
export function resolvePendingRelease(
  capability,
  stage = 'release.capability',
) {
  const record = PENDING_RELEASES.get(capability);
  if (record === undefined) {
    throw releaseError(
      'RELEASE_CAPABILITY_UNKNOWN',
      'The pending release capability was not issued by this release store.',
      stage,
      {},
    );
  }
  if (record.settled) {
    throw releaseError(
      'RELEASE_CAPABILITY_SETTLED',
      'The pending release capability has already been finalized or rolled back.',
      stage,
      {},
    );
  }
  return record;
}

/**
 * The read-only view a transaction-scoped verifier may observe. It names the
 * committed pair and the journal it belongs to, and grants nothing.
 */
export function describePendingRelease(
  capability,
  stage = 'release.capability',
) {
  const record = resolvePendingRelease(capability, stage);
  return Object.freeze({
    journalId: record.journal.journalId,
    lockId: record.lock.lockId,
    state: record.journal.state,
    candidateId: record.journal.candidateId,
    pdfSha256: record.journal.newPdfSha256,
    receiptSha256: record.journal.newReceiptSha256,
    publicPdfPath: PROFILE_PATHS.publicResumePdfPath,
    trackedReceiptPath: PROFILE_PATHS.trackedReleaseReceiptPath,
  });
}

/* ------------------------------------------------------------------ */
/* Prepared evidence persistence (LC-U1-17 delegation target)           */
/* ------------------------------------------------------------------ */

/**
 * Persists the draft receipt beside its candidate. The CLI hands the assembled
 * draft here rather than writing it, so the candidate directory has one writer.
 */
export async function persistPreparedEvidence({
  candidate,
  candidatePath,
  draftReceipt,
} = {}) {
  const stage = 'release.prepare.persist';
  if (
    typeof candidate?.candidateId !== 'string' ||
    !SHA256_PATTERN.test(candidate?.pdfSha256 ?? '')
  ) {
    throw new TypeError('candidate must carry candidateId and pdfSha256');
  }
  if (draftReceipt?.kind !== 'resume-inspection-draft') {
    throw releaseError(
      'RELEASE_DRAFT_INVALID',
      'Prepared evidence must be an inspection draft receipt.',
      stage,
      { kind: draftReceipt?.kind ?? null },
    );
  }
  if (
    draftReceipt.candidate?.candidateId !== candidate.candidateId ||
    draftReceipt.candidate?.pdfSha256 !== candidate.pdfSha256
  ) {
    throw releaseError(
      'RELEASE_DRAFT_IDENTITY_MISMATCH',
      'The draft receipt does not name the candidate it was prepared for.',
      stage,
      { candidateId: candidate.candidateId },
    );
  }
  await assertSafeTarget(candidatePath, stage, { mustExist: true });
  const bytes = await readFile(candidatePath);
  if (sha256(bytes) !== candidate.pdfSha256) {
    throw releaseError(
      'RELEASE_CANDIDATE_STALE',
      'The candidate on disk is not the bytes its identity names.',
      stage,
      { candidateId: candidate.candidateId },
    );
  }

  const draftPath = resolve(
    PROFILE_PATHS.pdfCandidateRoot,
    `${candidate.candidateId}.draft.json`,
  );
  const draftSha256 = await atomicWrite(
    draftPath,
    Buffer.from(`${JSON.stringify(draftReceipt, null, 2)}\n`, 'utf8'),
    stage,
  );
  return Object.freeze({ draftPath, draftSha256 });
}

/** Reloads a persisted draft by candidate ID with a full identity recheck. */
export async function readPreparedEvidence(
  candidateId,
  { stage = 'release.promote.reload' } = {},
) {
  if (typeof candidateId !== 'string' || !SHA256_PATTERN.test(candidateId)) {
    throw releaseError(
      'RELEASE_CANDIDATE_ID_INVALID',
      'A candidate ID must be a SHA-256 hex digest.',
      stage,
      {},
    );
  }
  const draftPath = resolve(
    PROFILE_PATHS.pdfCandidateRoot,
    `${candidateId}.draft.json`,
  );
  const candidatePath = resolve(
    PROFILE_PATHS.pdfCandidateRoot,
    `${candidateId}.pdf`,
  );
  await assertSafeTarget(draftPath, stage, { mustExist: true });
  await assertSafeTarget(candidatePath, stage, { mustExist: true });

  const [draftBytes, candidateBytes] = await Promise.all([
    readFile(draftPath),
    readFile(candidatePath),
  ]);
  let draftReceipt;
  try {
    draftReceipt = JSON.parse(draftBytes.toString('utf8'));
  } catch {
    throw releaseError(
      'RELEASE_DRAFT_UNREADABLE',
      'The persisted draft receipt is not valid JSON.',
      stage,
      { candidateId },
    );
  }
  const candidateSha256 = sha256(candidateBytes);
  if (
    draftReceipt?.candidate?.candidateId !== candidateId ||
    draftReceipt?.candidate?.pdfSha256 !== candidateSha256
  ) {
    throw releaseError(
      'RELEASE_CANDIDATE_STALE',
      'The persisted draft does not match the candidate bytes on disk.',
      stage,
      { candidateId },
    );
  }
  return Object.freeze({
    candidateId,
    candidatePath,
    candidateBytes,
    candidateSha256,
    draftPath,
    draftReceipt,
  });
}

/* ------------------------------------------------------------------ */
/* Promotion                                                            */
/* ------------------------------------------------------------------ */

/**
 * Performs the single-writer promotion up to and including the public-file
 * commit point, then stops and hands back an opaque capability.
 *
 * Stopping here is deliberate: the store has no opinion about whether the
 * release is good, only about whether the bytes are where the journal says.
 * The second build and the final gate happen outside, and only their verdict —
 * routed back through `finalize` or `rollback` — settles the transaction.
 */
export async function promoteResumeRelease({
  candidateId,
  candidatePdfSha256,
  candidatePath,
  candidateBytes,
  releaseReceipt,
} = {}) {
  const stage = 'release.promote';
  if (typeof candidateId !== 'string' || !SHA256_PATTERN.test(candidateId)) {
    throw releaseError(
      'RELEASE_CANDIDATE_ID_INVALID',
      'A candidate ID must be a SHA-256 hex digest.',
      stage,
      {},
    );
  }
  // The candidate ID is derived from the build identity and the PDF digest, so
  // it is deliberately not the digest itself. Comparing bytes against the ID
  // would be comparing against the wrong hash.
  if (
    typeof candidatePdfSha256 !== 'string' ||
    !SHA256_PATTERN.test(candidatePdfSha256)
  ) {
    throw releaseError(
      'RELEASE_CANDIDATE_DIGEST_INVALID',
      'A candidate PDF digest must be a SHA-256 hex digest.',
      stage,
      {},
    );
  }
  if (releaseReceipt?.kind !== 'resume-release') {
    throw releaseError(
      'RELEASE_RECEIPT_INVALID',
      'Promotion requires an assembled release receipt.',
      stage,
      { kind: releaseReceipt?.kind ?? null },
    );
  }

  await mkdir(PROFILE_PATHS.releaseRoot, { recursive: true });
  await mkdir(PROFILE_PATHS.releaseRecoveryRoot, { recursive: true });
  await mkdir(PROFILE_PATHS.releaseQuarantineRoot, { recursive: true });
  await mkdir(PROFILE_PATHS.trackedReleaseReceiptRoot, { recursive: true });

  const existingJournal = await readReleaseJournal({ stage });
  if (existingJournal !== null) {
    throw releaseError(
      'RELEASE_JOURNAL_ACTIVE',
      'A previous release transaction is unresolved; resolve it before promoting.',
      stage,
      { state: existingJournal.state },
    );
  }

  const lock = await acquireReleaseLock({ stage });
  let journal = null;
  try {
    await assertSameDevice(
      PROFILE_PATHS.pdfCandidateRoot,
      PROFILE_PATHS.publicRoot,
      stage,
    );
    await assertSameDevice(
      PROFILE_PATHS.releaseRecoveryRoot,
      PROFILE_PATHS.publicRoot,
      stage,
    );

    const newPdfSha256 = sha256(candidateBytes);
    if (newPdfSha256 !== candidatePdfSha256) {
      throw releaseError(
        'RELEASE_CANDIDATE_STALE',
        'The candidate bytes do not hash to the digest its identity names.',
        stage,
        { candidateId },
      );
    }
    if (releaseReceipt.pdfSha256 !== newPdfSha256) {
      throw releaseError(
        'RELEASE_RECEIPT_IDENTITY_MISMATCH',
        'The release receipt does not name the candidate being promoted.',
        stage,
        { candidateId },
      );
    }
    if (releaseReceipt.candidateId !== candidateId) {
      throw releaseError(
        'RELEASE_RECEIPT_IDENTITY_MISMATCH',
        'The release receipt names a different candidate.',
        stage,
        { candidateId },
      );
    }
    const receiptBytes = Buffer.from(
      `${JSON.stringify(releaseReceipt, null, 2)}\n`,
      'utf8',
    );
    const newReceiptSha256 = sha256(receiptBytes);

    journal = await advanceJournal(
      null,
      'open',
      {
        journalId: randomUUID(),
        candidateId,
        candidatePath,
        newPdfSha256,
        newReceiptSha256,
        oldPdfSha256: null,
        oldReceiptSha256: null,
        recovery: null,
        originalFailure: null,
      },
      stage,
    );

    const previous = await readCurrentReleasePair({ stage });
    journal = await advanceJournal(
      journal,
      'validatePromotion',
      {
        oldPdfSha256: previous.present ? previous.pdf.sha256 : null,
        oldReceiptSha256: previous.present ? previous.receipt.sha256 : null,
      },
      stage,
    );

    // Snapshot the exact previous bytes, or record an explicit absence
    // sentinel. A first release has nothing to restore, and saying so in the
    // journal is what keeps rollback from inventing something to put back.
    let recovery = Object.freeze({ kind: 'absent' });
    if (previous.present) {
      const recoveryPdfPath = resolve(
        PROFILE_PATHS.releaseRecoveryRoot,
        `${previous.pdf.sha256}.pdf`,
      );
      const recoveryReceiptPath = resolve(
        PROFILE_PATHS.releaseRecoveryRoot,
        `${previous.receipt.sha256}.json`,
      );
      const writtenPdf = await atomicWrite(
        recoveryPdfPath,
        previous.pdf.bytes,
        stage,
      );
      const writtenReceipt = await atomicWrite(
        recoveryReceiptPath,
        previous.receipt.bytes,
        stage,
      );
      if (
        writtenPdf !== previous.pdf.sha256 ||
        writtenReceipt !== previous.receipt.sha256
      ) {
        throw releaseError(
          'RELEASE_RECOVERY_MISMATCH',
          'The recovery snapshot does not reproduce the previous pair.',
          stage,
          {},
        );
      }
      recovery = Object.freeze({
        kind: 'present',
        pdfPath: recoveryPdfPath,
        receiptPath: recoveryReceiptPath,
      });
    }
    journal = await advanceJournal(
      journal,
      'snapshotRecovery',
      { recovery },
      stage,
    );

    // The receipt goes first. If the process dies between here and the rename,
    // the pair is deliberately inconsistent — and a verify that sees a receipt
    // naming a PDF it cannot find is exactly the signal that stops the old PDF
    // from being reported as current.
    await assertSafeTarget(PROFILE_PATHS.trackedReleaseReceiptPath, stage);
    const committedReceipt = await atomicWrite(
      PROFILE_PATHS.trackedReleaseReceiptPath,
      receiptBytes,
      stage,
    );
    if (committedReceipt !== newReceiptSha256) {
      throw releaseError(
        'RELEASE_RECEIPT_MISMATCH',
        'The committed receipt does not match its expected digest.',
        stage,
        {},
      );
    }
    journal = await advanceJournal(journal, 'promoteReceipt', {}, stage);

    // The public commit point.
    await assertSafeTarget(candidatePath, stage, { mustExist: true });
    await atomicMove(candidatePath, PROFILE_PATHS.publicResumePdfPath, stage);
    const committedPdfBytes = await readFile(PROFILE_PATHS.publicResumePdfPath);
    if (sha256(committedPdfBytes) !== newPdfSha256) {
      throw releaseError(
        'RELEASE_PDF_MISMATCH',
        'The committed public PDF does not match the reviewed candidate.',
        stage,
        {},
      );
    }
    journal = await advanceJournal(journal, 'commitPdf', {}, stage);

    return createPendingCapability({
      journal,
      lock,
      settled: false,
      candidatePath,
    });
  } catch (error) {
    // Nothing is committed unless the journal says so; if it does, the caller
    // must roll back explicitly rather than have the lock dropped here.
    if (journal === null || !hasCommittedAnything(journal)) {
      await unlink(PROFILE_PATHS.releaseJournalPath).catch(() => {});
      await lock.release();
    }
    throw error;
  }
}

function hasCommittedAnything(journal) {
  return (
    journal.state === 'RECEIPT_PROMOTED' ||
    journal.state === 'PDF_COMMITTED' ||
    journal.state === 'FINAL_VERIFIED' ||
    ROLLBACK_STATES.has(journal.state)
  );
}

/* ------------------------------------------------------------------ */
/* Finalize and rollback                                                */
/* ------------------------------------------------------------------ */

/**
 * Settles a verified transaction: clears the recovery bytes and journal, then
 * releases the lock. Only after this is the pair the current release.
 */
export async function finalizeResumeRelease(capability) {
  const stage = 'release.finalize';
  const record = resolvePendingRelease(capability, stage);
  let journal = record.journal;

  const pair = await readCurrentReleasePair({ stage });
  if (
    !pair.present ||
    pair.pdf.sha256 !== journal.newPdfSha256 ||
    pair.receipt.sha256 !== journal.newReceiptSha256
  ) {
    throw releaseError(
      'RELEASE_FINALIZE_PAIR_MISMATCH',
      'The tracked pair is not the pair this transaction committed.',
      stage,
      {},
    );
  }

  journal = await advanceJournal(journal, 'verifyFinal', {}, stage);
  const settled = journal;
  await advanceJournal(journal, 'finalize', {}, stage);
  await rm(PROFILE_PATHS.releaseRecoveryRoot, { recursive: true, force: true });
  await fsyncDirectory(PROFILE_PATHS.releaseRoot).catch(() => {});
  record.settled = true;
  await record.lock.release();

  return Object.freeze({
    rule: RELEASE_RULE,
    result: 'finalized',
    candidateId: settled.candidateId,
    pdfSha256: settled.newPdfSha256,
    receiptSha256: settled.newReceiptSha256,
  });
}

/**
 * Restores the exact previous pair, or quarantines the new one when the
 * previous state was explicit absence.
 *
 * Each restore is verified before the state advances, so an interrupted
 * rollback resumes from a state that is still true rather than one that was
 * merely intended.
 */
export async function rollbackResumeRelease(capability, originalFailure) {
  const stage = 'release.rollback';
  const record = resolvePendingRelease(capability, stage);
  let journal = record.journal;

  const failure = Object.freeze({
    code: originalFailure?.code ?? 'RELEASE_FINAL_GATE_FAILED',
    message: originalFailure?.message ?? 'The final release gate failed.',
  });
  journal = await advanceJournal(
    journal,
    'requireRollback',
    { originalFailure: failure },
    stage,
  );

  const recovery = journal.recovery;
  const restoringPrevious = recovery?.kind === 'present';

  const quarantinePdfPath = resolve(
    PROFILE_PATHS.releaseQuarantineRoot,
    `${journal.newPdfSha256}.pdf`,
  );
  await assertSafeTarget(PROFILE_PATHS.publicResumePdfPath, stage, {
    mustExist: true,
  });
  await atomicMove(PROFILE_PATHS.publicResumePdfPath, quarantinePdfPath, stage);
  if (restoringPrevious) {
    const previousPdf = await readFile(recovery.pdfPath);
    if (sha256(previousPdf) !== journal.oldPdfSha256) {
      throw releaseError(
        'RELEASE_ROLLBACK_SNAPSHOT_MISMATCH',
        'The retained previous PDF does not match the hash the journal recorded.',
        stage,
        {},
      );
    }
    const restored = await atomicWrite(
      PROFILE_PATHS.publicResumePdfPath,
      previousPdf,
      stage,
    );
    if (restored !== journal.oldPdfSha256) {
      throw releaseError(
        'RELEASE_ROLLBACK_RESTORE_MISMATCH',
        'The restored public PDF does not match the previous hash.',
        stage,
        {},
      );
    }
  }
  journal = await advanceJournal(
    journal,
    'restorePdf',
    { quarantinedPdfPath: quarantinePdfPath },
    stage,
  );

  const quarantineReceiptPath = resolve(
    PROFILE_PATHS.releaseQuarantineRoot,
    `${journal.newReceiptSha256}.json`,
  );
  await assertSafeTarget(PROFILE_PATHS.trackedReleaseReceiptPath, stage, {
    mustExist: true,
  });
  await atomicMove(
    PROFILE_PATHS.trackedReleaseReceiptPath,
    quarantineReceiptPath,
    stage,
  );
  if (restoringPrevious) {
    const previousReceipt = await readFile(recovery.receiptPath);
    if (sha256(previousReceipt) !== journal.oldReceiptSha256) {
      throw releaseError(
        'RELEASE_ROLLBACK_SNAPSHOT_MISMATCH',
        'The retained previous receipt does not match the hash the journal recorded.',
        stage,
        {},
      );
    }
    const restored = await atomicWrite(
      PROFILE_PATHS.trackedReleaseReceiptPath,
      previousReceipt,
      stage,
    );
    if (restored !== journal.oldReceiptSha256) {
      throw releaseError(
        'RELEASE_ROLLBACK_RESTORE_MISMATCH',
        'The restored receipt does not match the previous hash.',
        stage,
        {},
      );
    }
  }
  journal = await advanceJournal(
    journal,
    'restoreReceipt',
    { quarantinedReceiptPath: quarantineReceiptPath },
    stage,
  );

  // Full read-back of the old pair or the absence, before anything is cleaned.
  const finalPair = await readCurrentReleasePair({ stage });
  if (restoringPrevious) {
    if (
      !finalPair.present ||
      finalPair.pdf.sha256 !== journal.oldPdfSha256 ||
      finalPair.receipt.sha256 !== journal.oldReceiptSha256
    ) {
      throw releaseError(
        'RELEASE_ROLLBACK_INCOMPLETE',
        'The restored pair does not read back as the previous release.',
        stage,
        {},
      );
    }
  } else if (finalPair.present) {
    throw releaseError(
      'RELEASE_ROLLBACK_INCOMPLETE',
      'A first-release rollback left a tracked pair in place.',
      stage,
      {},
    );
  }
  journal = await advanceJournal(journal, 'completeRollback', {}, stage);

  await advanceJournal(journal, 'cleanup', {}, stage);
  await rm(PROFILE_PATHS.releaseRecoveryRoot, { recursive: true, force: true });
  await fsyncDirectory(PROFILE_PATHS.releaseRoot).catch(() => {});
  record.settled = true;
  await record.lock.release();

  return Object.freeze({
    rule: RELEASE_RULE,
    result: 'rolled-back',
    restoredPrevious: restoringPrevious,
    originalFailure: failure,
    quarantinedPdfPath: quarantinePdfPath,
    quarantinedReceiptPath: quarantineReceiptPath,
  });
}

export const releaseStoreTesting = Object.freeze({
  FORWARD_TRANSITIONS,
  JOURNAL_SCHEMA_VERSION,
  ROLLBACK_STATES,
  assertAllowlistedPath,
  assertSafeTarget,
  atomicWrite,
  createPendingCapability,
  sha256,
});
