import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { PROFILE_PATHS } from './profile-paths.mjs';
import {
  finalizePreparedRelease,
  prepareResumeRelease,
  promotePreparedRelease,
  readManualReviewRecord,
  rollbackPreparedRelease,
} from './resume-coordinator.mjs';

const CLI_RULE = 'LC-U1-19/NFR-U1-010';

/**
 * The stable command surface. Exactly five, and the list is closed: U3 and CI
 * aggregate the four read-only ones and never invoke `resume:pdf`.
 */
export const STABLE_COMMANDS = Object.freeze([
  'test:unit',
  'test:pbt',
  'test:e2e',
  'resume:pdf',
  'resume:pdf:verify',
]);

/** The four a CI job may run. `resume:pdf` is deliberately absent. */
export const READ_ONLY_COMMANDS = Object.freeze([
  'test:unit',
  'test:pbt',
  'test:e2e',
  'resume:pdf:verify',
]);

export class CliError extends Error {
  constructor(message, { code, stage, details = {} } = {}) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = CLI_RULE;
    this.details = Object.freeze({ ...details });
  }
}

function cliError(code, message, stage, details) {
  return new CliError(message, { code, stage, details });
}

/**
 * Routes one stable command. The router is neutral: read-only commands go to
 * the U1 verification provider, and only `resume:pdf` reaches the S04
 * side-effect layer.
 */
export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (!STABLE_COMMANDS.includes(command)) {
    throw cliError(
      'CLI_UNKNOWN_COMMAND',
      `Unknown command. The stable surface is exactly: ${STABLE_COMMANDS.join(', ')}.`,
      'cli.route',
      { command: command ?? null },
    );
  }

  if (command === 'test:unit') {
    return runProcess(
      resolve(PROFILE_PATHS.siteRoot, 'node_modules', '.bin', 'vitest'),
      ['run', '--config', 'vitest.config.ts', 'tests/unit'],
      'cli.test.unit',
    );
  }
  if (command === 'test:pbt') {
    return runProcess(
      process.execPath,
      [resolve(PROFILE_PATHS.siteRoot, 'scripts', 'profile', 'pbt-runner.mjs'), ...rest],
      'cli.test.pbt',
    );
  }
  if (command === 'test:e2e') {
    return runProcess(
      process.execPath,
      [
        resolve(
          PROFILE_PATHS.siteRoot,
          'scripts',
          'profile',
          'verification-provider.mjs',
        ),
        'e2e',
      ],
      'cli.test.e2e',
    );
  }
  if (command === 'resume:pdf:verify') {
    const { verifyCurrentRelease } = await import('./verification-provider.mjs');
    return verifyCurrentRelease();
  }
  return runResumePdf(rest);
}

/**
 * The only mutating command, and it refuses to guess which half it is doing.
 *
 * An implicit mode would let a promotion happen because somebody re-ran their
 * last command; requiring the flag makes touching the public file a
 * deliberate act every time.
 */
async function runResumePdf(args) {
  const mode = args[0];
  if (mode === '--prepare') return runPrepare();
  if (mode === '--promote') return runPromote(args.slice(1));
  throw cliError(
    'CLI_RESUME_PDF_MODE_REQUIRED',
    'resume:pdf requires an explicit --prepare or --promote <candidate-id>.',
    'cli.resume.route',
    { mode: mode ?? null },
  );
}

async function runPrepare() {
  const session = await prepareResumeRelease();
  try {
    const { loadProfileReleaseTools } = await import(
      './compile-profile-tools.mjs'
    );
    const tools = await loadProfileReleaseTools();
    const manifest = session.manifest;

    // The two rendered surfaces are observed in the medium each belongs to:
    // `webSurface` on screen, `printSurface` under print emulation. Comparing
    // both against the same expected manifest is what makes "the page and the
    // printout say the same thing" a checked claim rather than an assumption.
    //
    // `session.skeleton` is not either of them. It is the ordinal skeleton the
    // inspector uses to bound PDF extraction, and passing it here compared an
    // ordinal skeleton against a rendered-surface schema — which is why every
    // prepare failed at this gate before the renderer observed the surfaces.
    const web = requirePure(
      tools.compareRenderedManifest(manifest, session.webSurface),
      'web surface',
    );
    const print = requirePure(
      tools.compareRenderedManifest(manifest, session.printSurface),
      'print surface',
    );
    const pdfEvidence = requirePure(
      tools.mapPdfEvidence(manifest, session.snapshot),
      'PDF evidence',
    );
    const comparison = requirePure(
      tools.compareResumeSurfaces({
        expected: manifest,
        web,
        print,
        pdf: pdfEvidence,
      }),
      'cross-surface comparison',
    );

    const draftReceipt = requirePure(
      tools.assembleDraftResumeInspectionReceipt(
        {
          assembledAt: new Date().toISOString(),
          candidate: session.candidate,
          manifestDigest: manifest.fingerprint,
          comparison,
          pdfEvidence,
          machineChecks: tools.buildMachineChecks(
            pdfEvidence,
            session.machineChecks,
          ),
          tools: session.snapshot.tools,
        },
        manifest,
      ),
      'draft receipt',
    );

    // The CLI never writes the draft; S04 owns the candidate directory so it
    // has exactly one writer.
    const persisted = await session.persistDraft(draftReceipt);

    // The candidate SHA and the viewer are all the operator needs to begin the
    // exact-SHA review. Nothing returned here authorises anything: the draft is
    // `not-reviewed` and `not-authorized` at the type level.
    return Object.freeze({
      rule: CLI_RULE,
      command: 'resume:pdf --prepare',
      result: 'prepared',
      candidateId: session.candidate.candidateId,
      pdfSha256: session.candidate.pdfSha256,
      sourceIdentity: manifest.sourceIdentity.digest,
      manifestFingerprint: manifest.fingerprint.digest,
      candidatePath: session.candidatePath,
      draftPath: persisted.draftPath,
      draftSha256: persisted.draftSha256,
      viewerPath: session.viewer.viewerPath,
      pageCount: session.snapshot.pageCount,
      mappedFacts: pdfEvidence.mappings.length,
      surfaceParity: comparison.result,
      nextStep:
        'Review the exact candidate in the viewer, author the review record, then run resume:pdf --promote <candidate-id> --review <path>.',
    });
  } finally {
    await session.cleanup();
  }
}

/**
 * Unwraps a pure C11 result, or fails with the stage that rejected.
 *
 * These functions return issues rather than throwing, so an unchecked `.value`
 * would silently become `undefined` and produce a structurally valid receipt
 * describing nothing.
 */
function requirePure(result, label) {
  if (!result?.ok) {
    throw cliError(
      'CLI_PREPARE_EVIDENCE_INVALID',
      `The ${label} did not validate against the approved manifest.`,
      'cli.resume.prepare',
      { label, issues: result?.issues ?? null },
    );
  }
  return result.value;
}

async function runPromote(args) {
  const candidateId = args[0];
  const reviewIndex = args.indexOf('--review');
  const reviewPath = reviewIndex < 0 ? undefined : args[reviewIndex + 1];
  if (typeof candidateId !== 'string' || typeof reviewPath !== 'string') {
    throw cliError(
      'CLI_PROMOTE_ARGUMENTS_REQUIRED',
      'resume:pdf --promote requires <candidate-id> --review <path>.',
      'cli.resume.promote',
      {},
    );
  }

  const reviewRecord = await readManualReviewRecord(reviewPath);
  const pending = await promotePreparedRelease({ candidateId, reviewRecord });

  // The capability stays in this process and goes straight to the
  // transaction-scoped verifier. It is never logged, serialised or passed as
  // an argument: a capability that could be reconstructed would stop being
  // evidence that this promotion is the one being verified.
  const { verifyPendingRelease } = await import('./verification-provider.mjs');
  let verdict;
  try {
    verdict = await verifyPendingRelease(
      pending.capability,
      pending.secondBuildIdentity,
    );
  } catch (verifyFailure) {
    await rollbackPreparedRelease(pending.capability, {
      code: verifyFailure?.code ?? 'CLI_FINAL_GATE_FAILED',
      message: verifyFailure?.message ?? 'The final release gate failed.',
    });
    throw verifyFailure;
  }

  if (verdict?.result !== 'pass') {
    const failure = Object.freeze({
      code: 'CLI_FINAL_GATE_FAILED',
      message: 'The transaction-scoped final verification did not pass.',
    });
    await rollbackPreparedRelease(pending.capability, failure);
    throw cliError(failure.code, failure.message, 'cli.resume.promote', {
      candidateId: pending.candidateId,
    });
  }

  const finalized = await finalizePreparedRelease(pending.capability);
  return Object.freeze({
    rule: CLI_RULE,
    command: 'resume:pdf --promote',
    result: 'released',
    candidateId: finalized.candidateId,
    pdfSha256: finalized.pdfSha256,
    receiptSha256: finalized.receiptSha256,
  });
}

function runProcess(command, args, stage) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: PROFILE_PATHS.siteRoot,
      stdio: 'inherit',
    });
    child.on('error', (cause) => {
      rejectRun(
        cliError(
          'CLI_SPAWN_FAILED',
          'The routed command could not be started.',
          stage,
          { message: cause?.message ?? null },
        ),
      );
    });
    child.on('close', (code, signal) => {
      if (code === 0) {
        // `routed` marks a pass-through: the child owned stdio and has already
        // written its own report, so the CLI has nothing to add. Anything the
        // CLI computes itself carries no such marker and is always reported.
        resolveRun(
          Object.freeze({ rule: CLI_RULE, result: 'pass', routed: true }),
        );
        return;
      }
      rejectRun(
        cliError(
          'CLI_COMMAND_FAILED',
          'The routed command exited non-zero.',
          stage,
          { exitCode: code, signal },
        ),
      );
    });
  });
}

/**
 * Whether the CLI itself must serialize a verdict to stdout.
 *
 * The distinction is authorship, not outcome. A routed command's child already
 * wrote its own report through inherited stdio, so repeating a bare
 * acknowledgement adds nothing. Every verdict the CLI computes itself is
 * reported, including a passing one: `resume:pdf:verify` returns
 * `result: 'pass'` carrying the release identity it just checked, and a silent
 * success is indistinguishable from a command that did nothing at all.
 */
export function shouldReportResult(result) {
  if (result === undefined || result === null) return false;
  return result.routed !== true;
}

export const cliTesting = Object.freeze({
  READ_ONLY_COMMANDS,
  STABLE_COMMANDS,
  shouldReportResult,
});

const invokedPath = process.argv[1];
const isDirectInvocation =
  invokedPath !== undefined &&
  import.meta.url === new URL(`file://${invokedPath}`).href;

if (isDirectInvocation) {
  main()
    .then((result) => {
      if (shouldReportResult(result)) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      }
      process.exitCode = 0;
    })
    .catch((error) => {
      process.stderr.write(
        `${error?.code ?? 'CLI_FAILED'}: ${error?.message ?? String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
