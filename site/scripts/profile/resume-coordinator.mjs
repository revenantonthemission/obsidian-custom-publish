import { readFile } from 'node:fs/promises';
import { cleanProfileBuild } from './clean-profile-build.mjs';
import { loadProfileReleaseTools } from './compile-profile-tools.mjs';
import { inspectResumePdfCandidate } from './pdf-inspector.mjs';
import { renderResumePdfCandidate } from './pdf-renderer.mjs';
import { buildResumePdfViewer } from './pdf-viewer.mjs';
import { startStaticPreview } from './preview-supervisor.mjs';
import {
  finalizeResumeRelease,
  persistPreparedEvidence,
  promoteResumeRelease,
  readPreparedEvidence,
  readReleaseJournal,
  rollbackResumeRelease,
} from './release-store.mjs';

const COORDINATOR_RULE = 'LC-U1-17/ST-U03';
const REQUIRED_PREVIEW_ROUTES = Object.freeze(['/resume', '/portfolio']);

export class ResumeCoordinatorError extends Error {
  constructor(message, { code, stage, details = {} } = {}) {
    super(message);
    this.name = 'ResumeCoordinatorError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = COORDINATOR_RULE;
    this.details = Object.freeze({ ...details });
  }
}

function coordinatorError(code, message, stage, details) {
  return new ResumeCoordinatorError(message, { code, stage, details });
}

/**
 * Phase one of the two-pass release: build cleanly, render a private candidate
 * and inspect it, then hand the live session back.
 *
 * Nothing tracked or public is touched here. The session is returned rather
 * than consumed because the neutral CLI — not this side-effect layer — owns
 * asking the verification provider for the web and print observations, and
 * this layer must not import that provider.
 */
export async function prepareResumeRelease({
  buildTimeoutMs,
  renderTimeoutMs,
} = {}) {
  const stage = 'resume.prepare';
  const journal = await readReleaseJournal({ stage });
  if (journal !== null) {
    throw coordinatorError(
      'RESUME_PREPARE_RELEASE_ACTIVE',
      'An unresolved release transaction exists; resolve it before preparing a new candidate.',
      stage,
      { state: journal.state },
    );
  }

  const buildIdentity = await cleanProfileBuild(
    buildTimeoutMs === undefined ? {} : { timeoutMs: buildTimeoutMs },
  );

  let lease;
  let released = false;
  const cleanup = async () => {
    if (released) return;
    released = true;
    // `lease` may be absent if the preview never started, but the method name
    // is not optional. `lease?.close?.()` silently did nothing, because the
    // real method is `cleanup()` — so a failed prepare left the preview child
    // alive and the process hung instead of exiting with its error.
    if (lease !== undefined) {
      await lease.cleanup();
    }
  };

  try {
    lease = await startStaticPreview({
      distRoot: buildIdentity.root,
      buildIdentity,
      requiredRoutes: REQUIRED_PREVIEW_ROUTES,
    });

    // The request ledger maps every successful response back to a file the
    // build actually emitted, so the asset identities have to come from the
    // build manifest. Passing an empty list does not disable that check — it
    // makes every response unmappable, which is how this first surfaced.
    const buildManifest = JSON.parse(
      await readFile(buildIdentity.manifestPath, 'utf8'),
    );

    // The manifest is the definition of "current source" for this run, and it
    // supplies both identities the inspector needs. Taking them from anywhere
    // else would let the candidate be inspected against one source while the
    // receipt is approved against another. It is resolved before the render
    // rather than after, because the renderer now observes both rendered
    // surfaces against it and cannot do so retroactively.
    const releaseTools = await loadProfileReleaseTools();
    const manifest = await releaseTools.buildCurrentResumeManifest();

    const rendered = await renderResumePdfCandidate({
      baseURL: lease.baseURL,
      buildIdentity,
      manifest,
      schemaVersion: releaseTools.RESUME_EVIDENCE_SCHEMA_VERSION,
      emittedAssets: buildManifest.outputFiles,
      ...(renderTimeoutMs === undefined ? {} : { timeoutMs: renderTimeoutMs }),
    });

    // The inspector returns `{rule, snapshot, snapshotPath}`, not the snapshot
    // itself. Treating the wrapper as the snapshot left `structure` undefined
    // and the viewer threw on `structure.nodes`.
    const inspection = await inspectResumePdfCandidate({
      candidatePath: rendered.candidatePath,
      candidate: rendered.candidate,
      sourceIdentity: manifest.sourceIdentity,
      manifestFingerprint: manifest.fingerprint,
      skeleton: rendered.skeleton,
      tools: rendered.tools,
    });
    const snapshot = inspection.snapshot;

    const viewer = await buildResumePdfViewer({
      candidate: rendered.candidate,
      candidatePath: rendered.candidatePath,
      snapshot,
    });

    return Object.freeze({
      rule: COORDINATOR_RULE,
      kind: 'resume-prepare-session',
      buildIdentity,
      lease,
      baseURL: lease.baseURL,
      candidate: rendered.candidate,
      candidatePath: rendered.candidatePath,
      manifest,
      subject: releaseTools.buildReceiptSubject(rendered.candidate, manifest),
      skeleton: rendered.skeleton,
      webSurface: rendered.webSurface,
      printSurface: rendered.printSurface,
      machineChecks: rendered.machineChecks,
      tools: rendered.tools,
      snapshot,
      viewer,
      /** Persistence is the store's job; the CLI never writes the draft. */
      persistDraft: (draftReceipt) =>
        persistPreparedEvidence({
          candidate: rendered.candidate,
          candidatePath: rendered.candidatePath,
          draftReceipt,
        }),
      cleanup,
    });
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/**
 * Phase two: reopen the reviewed candidate, revalidate it against current
 * source, assemble the final receipt purely, promote under the single-writer
 * lock, then run the clean second build.
 *
 * The capability comes back unsettled on purpose. This layer does not decide
 * whether the release is good — it only guarantees the bytes are where the
 * journal says they are.
 */
export async function promotePreparedRelease({
  candidateId,
  reviewRecord,
  assembledAt = new Date().toISOString(),
  buildTimeoutMs,
} = {}) {
  const stage = 'resume.promote';
  const prepared = await readPreparedEvidence(candidateId, { stage });
  const tools = await loadProfileReleaseTools();

  // Current source is recomputed here rather than accepted from the caller.
  // A supplied subject could name a manifest the candidate was never measured
  // against, which is the one thing the exact-SHA gate is meant to prevent.
  const currentManifest = await tools.buildCurrentResumeManifest();
  const currentSubject = tools.buildReceiptSubject(
    {
      candidateId: prepared.candidateId,
      pdfSha256: prepared.candidateSha256,
    },
    currentManifest,
  );

  // The pure C11 gate owns exact-SHA review currentness. Re-deciding it here
  // would create a second, quietly divergent definition of "reviewed".
  const reviewed = tools.validateResumeHumanReview(
    prepared.draftReceipt,
    currentSubject,
    reviewRecord,
    currentManifest,
  );
  if (!reviewed.ok) {
    throw coordinatorError(
      'RESUME_PROMOTE_REVIEW_INVALID',
      'The manual review does not validate against the current candidate and source.',
      stage,
      { candidateId, issues: reviewed.issues ?? null },
    );
  }

  const assembled = tools.assembleResumeReleaseReceipt(
    prepared.draftReceipt,
    reviewed.value,
    currentSubject,
    currentManifest,
    assembledAt,
  );
  if (!assembled.ok) {
    throw coordinatorError(
      'RESUME_PROMOTE_RECEIPT_INVALID',
      'The final release receipt could not be assembled from the reviewed candidate.',
      stage,
      { candidateId, issues: assembled.issues ?? null },
    );
  }

  const capability = await promoteResumeRelease({
    candidateId: prepared.candidateId,
    candidatePdfSha256: prepared.candidateSha256,
    candidatePath: prepared.candidatePath,
    candidateBytes: prepared.candidateBytes,
    releaseReceipt: assembled.value,
  });

  // The second pass consumes the now-tracked public PDF as ordinary static
  // input. Patching the first build's dist would prove nothing about what a
  // real build produces.
  let secondBuildIdentity;
  try {
    secondBuildIdentity = await cleanProfileBuild(
      buildTimeoutMs === undefined ? {} : { timeoutMs: buildTimeoutMs },
    );
  } catch (buildFailure) {
    // A failed second build never reaches the final gate; the transaction is
    // withdrawn under the lock it already holds, and the build error is what
    // the operator sees.
    await rollbackResumeRelease(capability, {
      code: buildFailure?.code ?? 'RESUME_SECOND_BUILD_FAILED',
      message: buildFailure?.message ?? 'The second clean build failed.',
    });
    throw buildFailure;
  }

  return Object.freeze({
    rule: COORDINATOR_RULE,
    kind: 'resume-pending-release',
    capability,
    secondBuildIdentity,
    candidateId: prepared.candidateId,
    pdfSha256: prepared.candidateSha256,
    releaseReceipt: assembled.value,
  });
}

/** Settles a transaction the final gate passed. */
export async function finalizePreparedRelease(capability) {
  return finalizeResumeRelease(capability);
}

/** Withdraws a transaction the final gate failed, preserving the original error. */
export async function rollbackPreparedRelease(capability, originalFailure) {
  return rollbackResumeRelease(capability, originalFailure);
}

/** Reads a manual review record the operator authored. */
export async function readManualReviewRecord(path) {
  const stage = 'resume.promote.review';
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    throw coordinatorError(
      'RESUME_REVIEW_RECORD_MISSING',
      'The manual review record could not be read.',
      stage,
      { path },
    );
  }
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw coordinatorError(
      'RESUME_REVIEW_RECORD_UNREADABLE',
      'The manual review record is not valid JSON.',
      stage,
      { path },
    );
  }
}
