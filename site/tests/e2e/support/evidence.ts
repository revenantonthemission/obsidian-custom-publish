import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { computeAccessibilityReviewSubject } from '../../../scripts/profile/verification-provider.mjs';
import {
  profileEnvironment,
  readBuildManifest,
  type ProfileE2EEnvironment,
} from './environment.js';
import {
  REQUIRED_MATRIX,
  REQUIRED_OBLIGATIONS,
  REQUIRED_SPEC_FILES,
} from './matrix.js';

/**
 * The 48-key matrix is spread across three Playwright projects, and each
 * project runs in its own worker process, so no single process observes every
 * cell. Each spec therefore seals its own contribution as a fragment on disk
 * and the global teardown merges them in the parent process.
 */
export interface EvidenceFragment {
  readonly specFile: string;
  readonly project: string;
  readonly buildId: string;
  readonly matrixKeys: readonly string[];
  readonly obligations: Readonly<Record<string, 'pass'>>;
  readonly tools: Readonly<Record<string, string>>;
}

export type BrowserToolName =
  | 'axe'
  | 'chromium'
  | 'firefox'
  | 'playwright'
  | 'webkit';

const REQUIRED_TOOL_NAMES: readonly BrowserToolName[] = Object.freeze([
  'axe',
  'chromium',
  'firefox',
  'playwright',
  'webkit',
]);

function fragmentPath(
  environment: ProfileE2EEnvironment,
  specFile: string,
  project: string,
): string {
  return resolve(
    environment.fragmentDirectory,
    `${specFile}--${project}.json`.replaceAll('/', '_'),
  );
}

export async function writeJsonFile(
  path: string,
  value: unknown,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * Clears fragments left by an earlier run. Called once from the global setup,
 * before any worker starts, so a spec that stops contributing a cell can never
 * be covered by its own stale output.
 */
export async function resetEvidenceFragments(): Promise<void> {
  const environment = profileEnvironment();
  await rm(environment.fragmentDirectory, { recursive: true, force: true });
  await mkdir(environment.fragmentDirectory, { recursive: true });
}

export async function recordEvidenceFragment(
  fragment: Omit<EvidenceFragment, 'buildId'>,
): Promise<void> {
  const environment = profileEnvironment();
  if (!REQUIRED_SPEC_FILES.includes(fragment.specFile)) {
    throw new Error(`"${fragment.specFile}" is not a required spec file.`);
  }
  await mkdir(environment.fragmentDirectory, { recursive: true });
  await writeJsonFile(
    fragmentPath(environment, fragment.specFile, fragment.project),
    { ...fragment, buildId: environment.buildId } satisfies EvidenceFragment,
  );
}

async function readFragments(): Promise<readonly EvidenceFragment[]> {
  const environment = profileEnvironment();
  let entries: readonly string[];
  try {
    entries = await readdir(environment.fragmentDirectory);
  } catch {
    return [];
  }
  const fragments: EvidenceFragment[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const fragment = JSON.parse(
      await readFile(resolve(environment.fragmentDirectory, entry), 'utf8'),
    ) as EvidenceFragment;
    // A fragment from a different build describes different bytes; ignoring it
    // keeps a stale cell from closing the matrix for the build under test.
    if (fragment.buildId === environment.buildId) fragments.push(fragment);
  }
  return fragments;
}

export interface SealedBrowserEvidence {
  readonly complete: boolean;
  readonly missingSpecFiles: readonly string[];
  readonly missingMatrixKeys: readonly string[];
  readonly extraMatrixKeys: readonly string[];
  readonly missingObligations: readonly string[];
  readonly missingTools: readonly string[];
}

/**
 * Merges every fragment into the single record the provider validates. The
 * record is written even when it is incomplete — an incomplete record fails
 * `BROWSER_EVIDENCE_INCOMPLETE` exactly like a missing one, and having it on
 * disk is what makes the gap diagnosable.
 */
export async function sealBrowserEvidence(): Promise<SealedBrowserEvidence> {
  const environment = profileEnvironment();
  const fragments = await readFragments();

  const specFiles = REQUIRED_SPEC_FILES.filter((specFile) =>
    fragments.some((fragment) => fragment.specFile === specFile),
  );
  const missingSpecFiles = REQUIRED_SPEC_FILES.filter(
    (specFile) => !specFiles.includes(specFile),
  );

  const completedMatrix = [
    ...new Set(fragments.flatMap((fragment) => fragment.matrixKeys)),
  ].sort();
  const completedSet = new Set(completedMatrix);
  const missingMatrixKeys = REQUIRED_MATRIX.filter(
    (key) => !completedSet.has(key),
  );
  const requiredSet = new Set(REQUIRED_MATRIX);
  const extraMatrixKeys = completedMatrix.filter(
    (key) => !requiredSet.has(key),
  );

  const obligations: Record<string, 'pass'> = {};
  for (const fragment of fragments) {
    for (const [name, result] of Object.entries(fragment.obligations)) {
      if (result === 'pass') obligations[name] = 'pass';
    }
  }
  const missingObligations = REQUIRED_OBLIGATIONS.filter(
    (name) => obligations[name] !== 'pass',
  );

  const tools: Record<string, string> = {};
  for (const fragment of fragments) {
    for (const [name, version] of Object.entries(fragment.tools)) {
      if (typeof version === 'string' && version.trim().length > 0) {
        tools[name] = version;
      }
    }
  }
  const missingTools = REQUIRED_TOOL_NAMES.filter(
    (name) => tools[name] === undefined,
  );

  const complete =
    missingSpecFiles.length === 0 &&
    missingMatrixKeys.length === 0 &&
    extraMatrixKeys.length === 0 &&
    missingObligations.length === 0 &&
    missingTools.length === 0;

  // The digest is recomputed through the same exported boundary the provider
  // uses, so the two can only agree or fail together — it is never restated.
  const reviewSubject = await computeAccessibilityReviewSubject({
    manifest: await readBuildManifest(),
  });

  await writeJsonFile(environment.browserEvidencePath, {
    schemaVersion: 1,
    group: 'browser',
    result: complete ? 'pass' : 'fail',
    buildId: environment.buildId,
    reviewSubjectSchemaVersion: 1,
    reviewSubjectDigest: reviewSubject.digest,
    specFiles,
    completedMatrix,
    obligations,
    skippedReasons: [],
    summary: {
      discovered: specFiles.length,
      passed: specFiles.length,
      failed: 0,
      skipped: 0,
      didNotRun: 0,
    },
    tools,
  });

  return Object.freeze({
    complete,
    missingSpecFiles,
    missingMatrixKeys,
    extraMatrixKeys,
    missingObligations,
    missingTools,
  });
}
