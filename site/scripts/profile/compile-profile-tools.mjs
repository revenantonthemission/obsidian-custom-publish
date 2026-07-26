import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROFILE_PATHS, resolveWithinRoot } from './profile-paths.mjs';

const TOOLS_RULE = 'LC-U1-16/LC-U1-17';
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_OUTPUT_LIMIT_BYTES = 512_000;

/**
 * The exact compiled modules a Node-side release flow is allowed to load.
 *
 * Node cannot import the authored `.ts` directly — only Astro's Vite graph can,
 * which is why `astro-profile-integration.mjs` gets away with it and standalone
 * tooling does not. Compiling to a private root keeps the pure C01/C11 layer the
 * single owner of these rules instead of letting the tool restate them.
 */
const REQUIRED_TOOL_MODULES = Object.freeze([
  'canonical-digest.js',
  'document-boundary.js',
  'resume-evidence.js',
  'resume-manifest.js',
  'resume-receipts.js',
]);

export class ProfileToolsCompileError extends Error {
  constructor(message, { code, stage, details = {} } = {}) {
    super(message);
    this.name = 'ProfileToolsCompileError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = TOOLS_RULE;
    this.details = Object.freeze({ ...details });
  }
}

function compileError(code, message, stage, details) {
  return new ProfileToolsCompileError(message, { code, stage, details });
}

/**
 * Compiles the pure profile modules with the repository-local `tsc`.
 *
 * `noEmitOnError` in `tsconfig.profile-tools.json` means a type error emits
 * nothing at all, so a stale previous build could otherwise masquerade as a
 * fresh one. The mtime check below is taken against the compiler's own start
 * time, which is what makes "it compiled" and "this is what compiled" the same
 * claim.
 */
export async function compileProfileTools({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  outputLimitBytes = DEFAULT_OUTPUT_LIMIT_BYTES,
} = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('timeoutMs must be a positive safe integer');
  }
  if (!Number.isSafeInteger(outputLimitBytes) || outputLimitBytes < 1) {
    throw new TypeError('outputLimitBytes must be a positive safe integer');
  }

  await requireRegularFile(
    PROFILE_PATHS.typescriptCliPath,
    'PROFILE_TOOLS_COMPILER_MISSING',
    'The repository-local TypeScript compiler is not installed.',
  );
  await requireRegularFile(
    PROFILE_PATHS.profileToolsConfigPath,
    'PROFILE_TOOLS_CONFIG_MISSING',
    'The profile tools TypeScript configuration is missing.',
  );

  const startedAtMs = Date.now();
  const compileOutput = await runCompiler({ timeoutMs, outputLimitBytes });
  if (compileOutput.code !== 0) {
    throw compileError(
      'PROFILE_TOOLS_COMPILE_FAILED',
      'The pure profile modules did not compile.',
      'tools.compile.run',
      {
        exitCode: compileOutput.code,
        signal: compileOutput.signal,
        output: compileOutput.text,
      },
    );
  }

  const modules = [];
  for (const moduleName of REQUIRED_TOOL_MODULES) {
    const modulePath = resolveWithinRoot(
      PROFILE_PATHS.profileToolsModuleRoot,
      moduleName,
      'compiled profile tool module',
    );
    const stats = await requireRegularFile(
      modulePath,
      'PROFILE_TOOLS_OUTPUT_MISSING',
      'A required compiled profile module was not emitted.',
      { moduleName },
    );
    if (stats.mtimeMs < startedAtMs - 1_000) {
      throw compileError(
        'PROFILE_TOOLS_OUTPUT_STALE',
        'A required compiled profile module predates this compilation.',
        'tools.compile.verify',
        { moduleName },
      );
    }
    modules.push(
      Object.freeze({
        moduleName,
        modulePath,
        sha256: createHash('sha256')
          .update(await readFile(modulePath))
          .digest('hex'),
      }),
    );
  }

  return Object.freeze({
    rule: TOOLS_RULE,
    kind: 'profile-tools-compile',
    moduleRoot: PROFILE_PATHS.profileToolsModuleRoot,
    modules: Object.freeze(modules),
  });
}

/**
 * Compiles, then loads the exact pure release functions the S04 layer needs.
 *
 * Everything returned here is pure. The release store and coordinator perform
 * the filesystem work but never re-derive a receipt rule the C11 layer owns.
 */
export async function loadProfileReleaseTools(options = {}) {
  const compilation = await compileProfileTools(options);
  const receiptsUrl = pathToFileURL(
    resolve(compilation.moduleRoot, 'resume-receipts.js'),
  ).href;
  const boundaryUrl = pathToFileURL(
    resolve(compilation.moduleRoot, 'document-boundary.js'),
  ).href;

  const receipts = await import(receiptsUrl);
  const boundary = await import(boundaryUrl);

  const missing = [
    'assembleResumeReleaseReceipt',
    'validateResumeHumanReview',
    'validateResumeInspectionReceipt',
    'validateResumeReleaseReceipt',
  ].filter((name) => typeof receipts[name] !== 'function');
  if (missing.length > 0) {
    throw compileError(
      'PROFILE_TOOLS_EXPORT_MISSING',
      'The compiled receipt module does not expose the required pure release functions.',
      'tools.compile.load',
      { missing },
    );
  }

  return Object.freeze({
    compilation,
    assembleResumeReleaseReceipt: receipts.assembleResumeReleaseReceipt,
    validateResumeHumanReview: receipts.validateResumeHumanReview,
    validateResumeInspectionReceipt: receipts.validateResumeInspectionReceipt,
    validateResumeReleaseReceipt: receipts.validateResumeReleaseReceipt,
    RESUME_DOCUMENT_PUBLIC_HREF: boundary.RESUME_DOCUMENT_PUBLIC_HREF,
    RESUME_DOCUMENT_REPOSITORY_PATH: boundary.RESUME_DOCUMENT_REPOSITORY_PATH,
  });
}

async function requireRegularFile(path, code, message, details = {}) {
  let stats;
  try {
    stats = await lstat(path);
  } catch {
    throw compileError(code, message, 'tools.compile.verify', {
      ...details,
      path,
    });
  }
  if (!stats.isFile()) {
    throw compileError(code, message, 'tools.compile.verify', {
      ...details,
      path,
    });
  }
  return stats;
}

function runCompiler({ timeoutMs, outputLimitBytes }) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [
        PROFILE_PATHS.typescriptCliPath,
        '--project',
        PROFILE_PATHS.profileToolsConfigPath,
        '--pretty',
        'false',
      ],
      {
        cwd: PROFILE_PATHS.siteRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let text = '';
    let truncated = false;
    const append = (chunk) => {
      if (truncated) return;
      const next = text + chunk.toString('utf8');
      if (next.length > outputLimitBytes) {
        text = next.slice(0, outputLimitBytes);
        truncated = true;
        return;
      }
      text = next;
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(
        compileError(
          'PROFILE_TOOLS_COMPILE_TIMEOUT',
          'The profile tools compilation exceeded its timeout.',
          'tools.compile.run',
          { timeoutMs },
        ),
      );
    }, timeoutMs);
    timer.unref?.();

    child.on('error', (cause) => {
      clearTimeout(timer);
      rejectRun(
        compileError(
          'PROFILE_TOOLS_COMPILE_SPAWN_FAILED',
          'The profile tools compiler could not be started.',
          'tools.compile.run',
          { message: cause?.message ?? null },
        ),
      );
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveRun({ code, signal, text, truncated });
    });
  });
}

export const compileProfileToolsTesting = Object.freeze({
  REQUIRED_TOOL_MODULES,
});
