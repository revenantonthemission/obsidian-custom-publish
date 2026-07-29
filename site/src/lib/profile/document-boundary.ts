import {
  CANONICAL_DIGEST_SCHEMA_VERSION,
  PROFILE_SOURCE_DIGEST_DOMAIN,
  RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
  validateCanonicalDigest,
} from './canonical-digest.js';
import { createValidationIssue, sortAndDedupeIssues } from './issues.js';
import {
  buildApprovedResumeManifest,
  compareResumeFactManifests,
} from './resume-manifest.js';
import { snapshotResumeDocumentData } from './resume-evidence.js';
import type { ResumeFactManifest } from './resume-manifest.js';
import type {
  FactApprovedProfileAssembly,
  ValidationIssue,
  ValidationResult,
} from './types.js';
import type {
  ProfileSourceDigest,
  ResumeFactManifestDigest,
} from './canonical-digest.js';

export const RESUME_DOCUMENT_SOURCE_ROUTE = '/resume' as const;
export const RESUME_DOCUMENT_PUBLIC_HREF = '/resume.pdf' as const;
export const RESUME_DOCUMENT_REPOSITORY_PATH =
  'site/public/resume.pdf' as const;
export const RESUME_DOCUMENT_VISIBLE_LABEL = 'PDF 이력서 다운로드' as const;

export interface ResumeDocumentLink {
  readonly href: typeof RESUME_DOCUMENT_PUBLIC_HREF;
  readonly label: typeof RESUME_DOCUMENT_VISIBLE_LABEL;
}

/**
 * A pure, self-describing generation request. It deliberately has no PDF
 * bytes, file handle, generated path or alternative fact payload: S04 owns
 * those side effects and this request can only reference the current C11
 * manifest.
 */
export interface ResumeDocumentRequest {
  readonly schemaVersion: typeof CANONICAL_DIGEST_SCHEMA_VERSION;
  readonly sourceRoute: typeof RESUME_DOCUMENT_SOURCE_ROUTE;
  readonly publicHref: typeof RESUME_DOCUMENT_PUBLIC_HREF;
  readonly repositoryPath: typeof RESUME_DOCUMENT_REPOSITORY_PATH;
  readonly expectedManifest: ResumeFactManifest;
  readonly sourceIdentity: ProfileSourceDigest;
  readonly manifestFingerprint: ResumeFactManifestDigest;
}

export function getResumeDocumentLink(): ResumeDocumentLink {
  return Object.freeze({
    href: RESUME_DOCUMENT_PUBLIC_HREF,
    label: RESUME_DOCUMENT_VISIBLE_LABEL,
  });
}

export function validateResumeDocumentLink(
  candidate: unknown,
): ValidationResult<ResumeDocumentLink> {
  const snapshot = snapshotResumeDocumentData(candidate);
  if (
    !snapshot.ok ||
    !isRecord(snapshot.value) ||
    !hasExactKeys(snapshot.value, LINK_KEYS) ||
    snapshot.value.href !== RESUME_DOCUMENT_PUBLIC_HREF ||
    snapshot.value.label !== RESUME_DOCUMENT_VISIBLE_LABEL
  ) {
    return failure('document.link.invalid', 'profile.document.href');
  }

  return Object.freeze({ ok: true, value: getResumeDocumentLink() });
}

/** Creates a request from one already-validated expected manifest. */
export function createResumeDocumentRequest(
  expectedManifest: ResumeFactManifest,
): ResumeDocumentRequest {
  return Object.freeze({
    schemaVersion: CANONICAL_DIGEST_SCHEMA_VERSION,
    sourceRoute: RESUME_DOCUMENT_SOURCE_ROUTE,
    publicHref: RESUME_DOCUMENT_PUBLIC_HREF,
    repositoryPath: RESUME_DOCUMENT_REPOSITORY_PATH,
    expectedManifest,
    sourceIdentity: expectedManifest.sourceIdentity,
    manifestFingerprint: expectedManifest.fingerprint,
  });
}

/**
 * Production-only convenience boundary. The manifest builder accepts the
 * branded approval assembly, so callers cannot create a production request
 * from a merely validated or hand-authored profile.
 */
export async function buildApprovedResumeDocumentRequest(
  assembly: FactApprovedProfileAssembly,
): Promise<ValidationResult<ResumeDocumentRequest>> {
  try {
    const source = readOwnedDataProperty(assembly, 'source');
    if (source === null) {
      return failure('document.source.invalid', 'profile.document.request');
    }
    const manifestResult = await buildApprovedResumeManifest(
      source as FactApprovedProfileAssembly['source'],
    );
    if (!manifestResult.ok) return manifestResult;
    return Object.freeze({
      ok: true,
      value: createResumeDocumentRequest(manifestResult.value),
    });
  } catch {
    return failure('document.source.invalid', 'profile.document.request');
  }
}

/**
 * Rebuilds the approved manifest and accepts a request only if its fixed
 * descriptor, embedded manifest and both identities are exact matches.
 */
export async function validateCurrentResumeDocumentRequest(
  candidate: unknown,
  assembly: FactApprovedProfileAssembly,
): Promise<ValidationResult<ResumeDocumentRequest>> {
  try {
    const shape = validateRequestShape(candidate);
    if (!shape.ok) return shape;

    const currentRequest = await buildApprovedResumeDocumentRequest(assembly);
    if (!currentRequest.ok) return currentRequest;
    const current = currentRequest.value.expectedManifest;
    const request = shape.value;
    const issues: ValidationIssue[] = [];

    if (request.sourceIdentity.digest !== current.sourceIdentity.digest) {
      issues.push(
        createValidationIssue(
          'document.source.invalid',
          'profile.document.request.sourceIdentity',
        ),
      );
    }
    if (request.manifestFingerprint.digest !== current.fingerprint.digest) {
      issues.push(
        createValidationIssue(
          'document.source.invalid',
          'profile.document.request.manifestFingerprint',
        ),
      );
    }
    const parity = compareResumeFactManifests(current, request.expectedManifest);
    if (!parity.ok) {
      issues.push(
        createValidationIssue(
          'document.source.invalid',
          'profile.document.expectedManifest',
        ),
      );
    } else if (
      parity.value.sourceIdentity.digest !== request.sourceIdentity.digest ||
      parity.value.fingerprint.digest !== request.manifestFingerprint.digest
    ) {
      issues.push(
        createValidationIssue(
          'document.source.invalid',
          'profile.document.expectedManifest',
        ),
      );
    }

    if (issues.length > 0) return failures(issues);
    return Object.freeze({ ok: true, value: request });
  } catch {
    return failure('document.source.invalid', 'profile.document.request');
  }
}

function validateRequestShape(
  candidate: unknown,
): ValidationResult<ResumeDocumentRequest> {
  const snapshot = snapshotResumeDocumentData(candidate);
  if (
    !snapshot.ok ||
    !isRecord(snapshot.value) ||
    !hasExactKeys(snapshot.value, REQUEST_KEYS)
  ) {
    return failure('document.source.invalid', 'profile.document.request');
  }
  const request = snapshot.value;
  if (request.schemaVersion !== CANONICAL_DIGEST_SCHEMA_VERSION) {
    return failure('document.source.invalid', 'profile.document.schemaVersion');
  }
  if (request.sourceRoute !== RESUME_DOCUMENT_SOURCE_ROUTE) {
    return failure('document.source.invalid', 'profile.document.sourceRoute');
  }
  if (request.repositoryPath !== RESUME_DOCUMENT_REPOSITORY_PATH) {
    return failure('document.source.invalid', 'profile.document.repositoryPath');
  }
  if (request.publicHref !== RESUME_DOCUMENT_PUBLIC_HREF) {
    return failure('document.link.invalid', 'profile.document.publicHref');
  }

  const source = validateCanonicalDigest(
    request.sourceIdentity,
    PROFILE_SOURCE_DIGEST_DOMAIN,
  );
  if (!source.ok) {
    return failure('document.source.invalid', 'profile.document.request.sourceIdentity');
  }
  const fingerprint = validateCanonicalDigest(
    request.manifestFingerprint,
    RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
  );
  if (!fingerprint.ok) {
    return failure(
      'document.source.invalid',
      'profile.document.request.manifestFingerprint',
    );
  }
  if (!isRecord(request.expectedManifest)) {
    return failure('document.source.invalid', 'profile.document.expectedManifest');
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      schemaVersion: CANONICAL_DIGEST_SCHEMA_VERSION,
      sourceRoute: RESUME_DOCUMENT_SOURCE_ROUTE,
      publicHref: RESUME_DOCUMENT_PUBLIC_HREF,
      repositoryPath: RESUME_DOCUMENT_REPOSITORY_PATH,
      expectedManifest: request.expectedManifest as unknown as ResumeFactManifest,
      sourceIdentity: source.value,
      manifestFingerprint: fingerprint.value,
    }),
  });
}

function failure(
  code: 'document.link.invalid' | 'document.source.invalid',
  path: string,
): ValidationResult<never> {
  return failures([createValidationIssue(code, path)]);
}

function failures(issues: readonly ValidationIssue[]): ValidationResult<never> {
  const sorted = sortAndDedupeIssues(issues);
  return Object.freeze({
    ok: false,
    issues: sorted as [ValidationIssue, ...ValidationIssue[]],
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function readOwnedDataProperty(
  candidate: unknown,
  key: string,
): unknown | null {
  try {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      return null;
    }
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    return descriptor !== undefined &&
      Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
      descriptor.enumerable === true
      ? descriptor.value
      : null;
  } catch {
    return null;
  }
}

const LINK_KEYS = ['href', 'label'] as const;
const REQUEST_KEYS = [
  'schemaVersion',
  'sourceRoute',
  'publicHref',
  'repositoryPath',
  'expectedManifest',
  'sourceIdentity',
  'manifestFingerprint',
] as const;
