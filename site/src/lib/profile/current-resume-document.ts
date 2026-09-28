import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PROFILE_SOURCE_DIGEST_DOMAIN,
  RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
  validateCanonicalDigest,
} from './canonical-digest.js';
import {
  getResumeDocumentLink,
  RESUME_DOCUMENT_PUBLIC_HREF,
  RESUME_DOCUMENT_REPOSITORY_PATH,
} from './document-boundary.js';
import type { ResumeDocumentLink } from './document-boundary.js';
import { snapshotResumeDocumentData } from './resume-evidence.js';
import { buildApprovedResumeManifest } from './resume-manifest.js';
import type { ResumeFactManifest } from './resume-manifest.js';
import type { FactApprovedProfile } from './types.js';

/**
 * Build-only availability check. A release remains downloadable from the
 * résumé page only while its approved identities match the current profile
 * and the actual public PDF bytes. Receipt data never enters the page model.
 * The existing release pipeline remains responsible for review and promotion.
 */
export async function getCurrentResumeDocumentLink(
  source: FactApprovedProfile,
): Promise<ResumeDocumentLink | undefined> {
  try {
    const manifest = await buildApprovedResumeManifest(source);
    if (!manifest.ok) return undefined;

    // Astro and the profile CLI run with site/ as their working directory.
    const [receiptText, pdfBytes] = await Promise.all([
      readFile(resolve('verification/resume/current-release.json'), 'utf8'),
      readFile(resolve('public/resume.pdf')),
    ]);
    return resolveCurrentResumeDocumentLinkForTest(
      manifest.value,
      JSON.parse(receiptText),
      pdfBytes,
    );
  } catch {
    return undefined;
  }
}

/** @internal Pure currentness seam; production uses the approved boundary above. */
export function resolveCurrentResumeDocumentLinkForTest(
  manifest: ResumeFactManifest,
  receiptCandidate: unknown,
  pdfBytes: Uint8Array,
): ResumeDocumentLink | undefined {
  try {
    const snapshot = snapshotResumeDocumentData(receiptCandidate);
    if (!snapshot.ok || !isRecord(snapshot.value) || pdfBytes.byteLength === 0) {
      return undefined;
    }
    const receipt = snapshot.value;
    const pdfSha256 = createHash('sha256').update(pdfBytes).digest('hex');
    if (
      receipt.schemaVersion !== 1 ||
      receipt.kind !== 'resume-release' ||
      receipt.result !== 'approved' ||
      typeof receipt.candidateId !== 'string' ||
      !/^[a-f0-9]{64}$/.test(receipt.candidateId) ||
      !isRecord(receipt.publicTarget) ||
      receipt.publicTarget.href !== RESUME_DOCUMENT_PUBLIC_HREF ||
      receipt.publicTarget.repositoryPath !== RESUME_DOCUMENT_REPOSITORY_PATH ||
      !matchesIdentity(receipt, manifest, pdfSha256, receipt.candidateId) ||
      !matchesIdentity(receipt.machineReceiptIdentity, manifest, pdfSha256, receipt.candidateId) ||
      !matchesIdentity(receipt.manualReview, manifest, pdfSha256, receipt.candidateId)
    ) {
      return undefined;
    }
    const machine = receipt.machineReceiptIdentity as Record<string, unknown>;
    const review = receipt.manualReview as Record<string, unknown>;
    if (
      machine.schemaVersion !== 1 ||
      review.schemaVersion !== 1 ||
      review.kind !== 'resume-human-review' ||
      review.result !== 'pass'
    ) {
      return undefined;
    }
    return getResumeDocumentLink();
  } catch {
    return undefined;
  }
}

function matchesIdentity(
  candidate: unknown,
  manifest: ResumeFactManifest,
  pdfSha256: string,
  candidateId: string,
): boolean {
  if (!isRecord(candidate)) return false;
  const source = validateCanonicalDigest(candidate.sourceIdentity, PROFILE_SOURCE_DIGEST_DOMAIN);
  const fingerprint = validateCanonicalDigest(candidate.manifestFingerprint, RESUME_FACT_MANIFEST_DIGEST_DOMAIN);
  const manifestDigest = validateCanonicalDigest(candidate.manifestDigest, RESUME_FACT_MANIFEST_DIGEST_DOMAIN);
  return candidate.candidateId === candidateId &&
    candidate.pdfSha256 === pdfSha256 &&
    source.ok && source.value.digest === manifest.sourceIdentity.digest &&
    fingerprint.ok && fingerprint.value.digest === manifest.fingerprint.digest &&
    manifestDigest.ok && manifestDigest.value.digest === manifest.fingerprint.digest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
