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
    // The candidate SHA and the viewer are all the operator needs to begin the
    // exact-SHA review. Nothing returned here authorises anything.
    return Object.freeze({
      rule: CLI_RULE,
      command: 'resume:pdf --prepare',
      result: 'prepared',
      candidateId: session.candidate.candidateId,
      pdfSha256: session.candidate.pdfSha256,
      candidatePath: session.candidatePath,
      viewerPath: session.viewer.viewerPath,
      pageCount: session.snapshot.pageCount,
      nextStep:
        'Review the exact candidate in the viewer, author the review record, then run resume:pdf --promote <candidate-id> --review <path>.',
    });
  } finally {
    await session.cleanup();
  }
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
        resolveRun(Object.freeze({ rule: CLI_RULE, result: 'pass' }));
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

export const cliTesting = Object.freeze({
  READ_ONLY_COMMANDS,
  STABLE_COMMANDS,
});

const invokedPath = process.argv[1];
const isDirectInvocation =
  invokedPath !== undefined &&
  import.meta.url === new URL(`file://${invokedPath}`).href;

if (isDirectInvocation) {
  main()
    .then((result) => {
      if (result !== undefined && result.result !== 'pass') {
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
