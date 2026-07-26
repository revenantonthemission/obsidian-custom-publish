import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * The verification provider injects every path and identity this suite is
 * allowed to use. Nothing here is derived or guessed: a missing variable means
 * the suite was started outside the owned command router, and that must fail
 * closed rather than fall back to a default.
 */
export interface ProfileE2EEnvironment {
  readonly baseURL: string;
  readonly buildId: string;
  readonly buildManifestPath: string;
  readonly assetBudgetPath: string;
  readonly browserEvidencePath: string;
  readonly linkMetadataEvidencePath: string;
  readonly requestLedgerEvidencePath: string;
  readonly fragmentDirectory: string;
}

export interface EmittedAssetIdentity {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface CleanBuildManifest {
  readonly buildIdentity: {
    readonly id: string;
    readonly manifestSha256: string;
    readonly [key: string]: unknown;
  };
  readonly outputFiles: readonly EmittedAssetIdentity[];
  readonly routeOutputs: readonly {
    readonly route: string;
    readonly outputs: readonly string[];
  }[];
  readonly [key: string]: unknown;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

function requireEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `${name} is required; run this suite through "npm run test:e2e".`,
    );
  }
  return value;
}

function requireAbsolutePath(name: string): string {
  const value = requireEnvironmentValue(name);
  if (resolve(value) !== value) {
    throw new Error(`${name} must be one fixed absolute path.`);
  }
  return value;
}

let cachedEnvironment: ProfileE2EEnvironment | undefined;

export function profileEnvironment(): ProfileE2EEnvironment {
  if (cachedEnvironment !== undefined) return cachedEnvironment;

  const baseURLValue = requireEnvironmentValue('PROFILE_BASE_URL');
  const baseURL = new URL(baseURLValue);
  if (!LOOPBACK_HOSTS.has(baseURL.hostname)) {
    throw new Error('PROFILE_BASE_URL must use the supervised loopback host.');
  }

  const browserEvidencePath = requireAbsolutePath(
    'PROFILE_BROWSER_EVIDENCE_PATH',
  );

  cachedEnvironment = Object.freeze({
    baseURL: baseURL.href,
    buildId: requireEnvironmentValue('PROFILE_BUILD_ID'),
    buildManifestPath: requireAbsolutePath('PROFILE_BUILD_MANIFEST_PATH'),
    assetBudgetPath: requireAbsolutePath('PROFILE_ASSET_BUDGET_PATH'),
    browserEvidencePath,
    linkMetadataEvidencePath: requireAbsolutePath(
      'PROFILE_LINK_METADATA_EVIDENCE_PATH',
    ),
    requestLedgerEvidencePath: requireAbsolutePath(
      'PROFILE_REQUEST_LEDGER_EVIDENCE_PATH',
    ),
    // Fragments are private run state, so they live beside the evidence the
    // provider already treats as private and clears between runs.
    fragmentDirectory: resolve(
      dirname(browserEvidencePath),
      'browser-fragments',
    ),
  });
  return cachedEnvironment;
}

/**
 * The supervised origin without a trailing slash, matching the form the
 * request ledger and Playwright both report.
 */
export function supervisedOrigin(): string {
  return new URL(profileEnvironment().baseURL).origin;
}

export function routeURL(route: string): string {
  return new URL(route, profileEnvironment().baseURL).href;
}

let cachedManifest: CleanBuildManifest | undefined;

/**
 * Reads the clean-build manifest the provider produced for this exact run.
 * The build id is re-checked here so a stale manifest can never silently
 * describe a different build than the one under test.
 */
export async function readBuildManifest(): Promise<CleanBuildManifest> {
  if (cachedManifest !== undefined) return cachedManifest;
  const environment = profileEnvironment();
  const manifest = JSON.parse(
    await readFile(environment.buildManifestPath, 'utf8'),
  ) as CleanBuildManifest;
  if (manifest.buildIdentity?.id !== environment.buildId) {
    throw new Error(
      'The build manifest does not describe the build under verification.',
    );
  }
  cachedManifest = manifest;
  return manifest;
}

export async function readEmittedAssets(): Promise<
  readonly EmittedAssetIdentity[]
> {
  return (await readBuildManifest()).outputFiles;
}

/**
 * The clean build identifies its manifest by hashing the written file, so the
 * digest cannot live inside the manifest it describes. Verification compares
 * the ledger against that value, which means the suite has to hash the same
 * bytes rather than read a field that was never there.
 */
export async function readBuildIdentity(): Promise<
  Readonly<Record<string, unknown>> & { readonly id: string }
> {
  const environment = profileEnvironment();
  const manifest = await readBuildManifest();
  const bytes = await readFile(environment.buildManifestPath);
  return Object.freeze({
    ...manifest.buildIdentity,
    manifestSha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
