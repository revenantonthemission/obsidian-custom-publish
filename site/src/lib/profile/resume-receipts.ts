import {
  PROFILE_SOURCE_DIGEST_DOMAIN,
  RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
  validateCanonicalDigest,
} from './canonical-digest.js';
import type {
  ProfileSourceDigest,
  ResumeFactManifestDigest,
} from './canonical-digest.js';
import {
  RESUME_DOCUMENT_PUBLIC_HREF,
  RESUME_DOCUMENT_REPOSITORY_PATH,
} from './document-boundary.js';
import {
  deepFreezeResumeDocumentData,
  RESUME_EVIDENCE_SCHEMA_VERSION,
  RESUME_TOOL_VERSIONS,
  resumeDocumentDataEqual,
  snapshotResumeDocumentData,
  validateMappedResumeEvidence,
} from './resume-evidence.js';
import type {
  MappedResumeEvidence,
  ResumeEvidenceMapping,
  ResumeEvidenceResult,
  ResumeToolVersions,
  SurfaceManifestComparison,
} from './resume-evidence.js';
import {
  compareResumeFactManifests,
} from './resume-manifest.js';
import type {
  ResumeFactManifest,
  ResumeManifestEntry,
} from './resume-manifest.js';
import {
  createValidationIssue,
  sortAndDedupeIssues,
} from './issues.js';
import type {
  NonEmptyReadonlyArray,
  ProfilePath,
  ValidationIssue,
  ValidationResult,
} from './types.js';

declare const validatedResumeHumanReviewBrand: unique symbol;

export const RESUME_RECEIPT_SCHEMA_VERSION = 1 as const;

export const RESUME_MANUAL_REVIEW_ITEMS = Object.freeze([
  'reading-order',
  'tagged-structure',
  'no-clipping',
  'grayscale-hierarchy',
  'page-breaks',
  'korean-font-readability',
  'link-appearance',
  'body-text-minimum-10pt',
  'line-height-minimum-1.35',
  'entry-and-long-detail-splitting',
  'heading-first-block-keep',
] as const);

export type ResumeManualReviewItem =
  (typeof RESUME_MANUAL_REVIEW_ITEMS)[number];

export interface ResumeCandidateIdentity {
  readonly candidateId: string;
  readonly pdfSha256: string;
}

export interface ResumeReceiptSubject {
  readonly candidate: ResumeCandidateIdentity;
  readonly sourceIdentity: ProfileSourceDigest;
  readonly manifestFingerprint: ResumeFactManifestDigest;
  readonly manifestDigest: ResumeFactManifestDigest;
}

export interface ResumePdfMachineCheck {
  readonly readable: true;
  readonly nonEmpty: true;
  readonly pageCount: number;
  readonly renderedPageCount: number;
}

export interface ResumeAnnotationMachineCheck {
  readonly expectedCount: number;
  readonly observedCount: number;
  readonly mappedCount: number;
}

export interface ResumeStructureMachineCheck {
  readonly tagged: true;
  readonly occurrenceCount: number;
  readonly readingOrderCount: number;
}

export interface ResumeOutlineMachineCheck {
  readonly sectionCount: number;
  readonly destinationCount: number;
}

export interface ResumeFontMachineCheck {
  readonly family: string;
  readonly responseOk: true;
  readonly mime: 'font/woff2';
  readonly fontsReady: true;
  readonly fontsCheck: true;
}

export interface ResumeNetworkMachineCheck {
  readonly loopbackOnly: true;
  readonly successfulNonLoopbackRequests: 0;
}

export interface ResumePrintMachineCheck {
  readonly paper: 'A4';
  readonly marginMm: 12;
  readonly preferCSSPageSize: true;
  readonly tagged: true;
  readonly outline: true;
  readonly printBackground: false;
  readonly detailsExpanded: true;
  readonly screenOnlyOmitted: true;
  readonly noClipping: true;
  readonly bodyTextMinimumPt: number;
  readonly lineHeightMinimum: number;
  readonly entriesUnsplittable: true;
  readonly longDetailsSplittable: true;
  readonly headingFirstBlockKept: true;
}

export interface ResumeMachineChecks {
  readonly pdf: ResumePdfMachineCheck;
  readonly annotations: ResumeAnnotationMachineCheck;
  readonly structure: ResumeStructureMachineCheck;
  readonly outline: ResumeOutlineMachineCheck;
  readonly font: ResumeFontMachineCheck;
  readonly network: ResumeNetworkMachineCheck;
  readonly print: ResumePrintMachineCheck;
}

export interface ResumeDraftReceiptInput {
  readonly assembledAt: string;
  readonly candidate: ResumeCandidateIdentity;
  readonly manifestDigest: ResumeFactManifestDigest;
  readonly comparison: SurfaceManifestComparison;
  readonly pdfEvidence: MappedResumeEvidence;
  readonly machineChecks: ResumeMachineChecks;
  readonly tools: ResumeToolVersions;
}

export interface ResumeInspectionReceipt {
  readonly schemaVersion: typeof RESUME_RECEIPT_SCHEMA_VERSION;
  readonly kind: 'resume-inspection-draft';
  readonly scope: 'private-candidate';
  readonly machineResult: 'pass';
  readonly manualReview: 'not-reviewed';
  readonly publicRelease: 'not-authorized';
  readonly assembledAt: string;
  readonly candidate: ResumeCandidateIdentity;
  readonly sourceIdentity: ProfileSourceDigest;
  readonly manifestFingerprint: ResumeFactManifestDigest;
  readonly manifestDigest: ResumeFactManifestDigest;
  readonly comparison: SurfaceManifestComparison;
  readonly pdfEvidence: MappedResumeEvidence;
  readonly machineChecks: ResumeMachineChecks;
  readonly tools: ResumeToolVersions;
}

export interface ResumeHumanReviewChecklistItem {
  readonly key: ResumeManualReviewItem;
  readonly result: 'pass' | 'fail';
  readonly note: string;
}

export interface ResumeHumanReviewRecord {
  readonly schemaVersion: typeof RESUME_RECEIPT_SCHEMA_VERSION;
  readonly kind: 'resume-human-review';
  readonly candidateId: string;
  readonly pdfSha256: string;
  readonly sourceIdentity: ProfileSourceDigest;
  readonly manifestFingerprint: ResumeFactManifestDigest;
  readonly manifestDigest: ResumeFactManifestDigest;
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly checklist: readonly ResumeHumanReviewChecklistItem[];
  readonly result: 'pass' | 'fail';
  readonly note: string;
}

export type ValidatedResumeHumanReview =
  ResumeHumanReviewRecord & {
    readonly [validatedResumeHumanReviewBrand]: 'ValidatedResumeHumanReview';
  };

export interface ResumeMachineReceiptIdentity {
  readonly schemaVersion: typeof RESUME_RECEIPT_SCHEMA_VERSION;
  readonly candidateId: string;
  readonly pdfSha256: string;
  readonly sourceIdentity: ProfileSourceDigest;
  readonly manifestFingerprint: ResumeFactManifestDigest;
  readonly manifestDigest: ResumeFactManifestDigest;
}

export interface ResumeReleaseReceipt {
  readonly schemaVersion: typeof RESUME_RECEIPT_SCHEMA_VERSION;
  readonly kind: 'resume-release';
  readonly result: 'approved';
  readonly assembledAt: string;
  readonly publicTarget: Readonly<{
    href: typeof RESUME_DOCUMENT_PUBLIC_HREF;
    repositoryPath: typeof RESUME_DOCUMENT_REPOSITORY_PATH;
  }>;
  readonly candidateId: string;
  readonly pdfSha256: string;
  readonly sourceIdentity: ProfileSourceDigest;
  readonly manifestFingerprint: ResumeFactManifestDigest;
  readonly manifestDigest: ResumeFactManifestDigest;
  readonly machineReceiptIdentity: ResumeMachineReceiptIdentity;
  readonly fullMapping: readonly ResumeEvidenceMapping[];
  readonly comparison: SurfaceManifestComparison;
  readonly manualReview: ValidatedResumeHumanReview;
  readonly tools: ResumeToolVersions;
}

type OwnRecord = Record<string, unknown>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const DRAFT_INPUT_KEYS = [
  'assembledAt',
  'candidate',
  'manifestDigest',
  'comparison',
  'pdfEvidence',
  'machineChecks',
  'tools',
] as const;
const DRAFT_RECEIPT_KEYS = [
  'schemaVersion',
  'kind',
  'scope',
  'machineResult',
  'manualReview',
  'publicRelease',
  'assembledAt',
  'candidate',
  'sourceIdentity',
  'manifestFingerprint',
  'manifestDigest',
  'comparison',
  'pdfEvidence',
  'machineChecks',
  'tools',
] as const;
const SUBJECT_KEYS = [
  'candidate',
  'sourceIdentity',
  'manifestFingerprint',
  'manifestDigest',
] as const;
const HUMAN_REVIEW_KEYS = [
  'schemaVersion',
  'kind',
  'candidateId',
  'pdfSha256',
  'sourceIdentity',
  'manifestFingerprint',
  'manifestDigest',
  'reviewer',
  'reviewedAt',
  'checklist',
  'result',
  'note',
] as const;
const RELEASE_RECEIPT_KEYS = [
  'schemaVersion',
  'kind',
  'result',
  'assembledAt',
  'publicTarget',
  'candidateId',
  'pdfSha256',
  'sourceIdentity',
  'manifestFingerprint',
  'manifestDigest',
  'machineReceiptIdentity',
  'fullMapping',
  'comparison',
  'manualReview',
  'tools',
] as const;

/**
 * Assembles private machine evidence only. The literal fields explicitly
 * prevent a draft from representing manual approval or public authorization.
 */
export function assembleDraftResumeInspectionReceipt(
  inputCandidate: ResumeDraftReceiptInput,
  currentManifest: ResumeFactManifest,
): ResumeEvidenceResult<ResumeInspectionReceipt> {
  try {
    const snapshot = snapshotResumeDocumentData(inputCandidate);
    const manifest = inspectCurrentManifest(currentManifest);
    if (
      manifest === null ||
      !snapshot.ok ||
      !isOwnRecord(snapshot.value) ||
      !hasExactKeys(snapshot.value, DRAFT_INPUT_KEYS)
    ) {
      return receiptFailure('field.type', 'profile.document.receipt');
    }

    const input = snapshot.value;
    const issues: ValidationIssue[] = [];
    if (!isTimestamp(input.assembledAt)) {
      issues.push(issue('field.type', 'profile.document.receipt.assembledAt'));
    }
    if (!isCandidate(input.candidate)) {
      issues.push(issue('field.type', 'profile.document.receipt.candidate'));
    }
    const manifestDigest = validateCanonicalDigest(
      input.manifestDigest,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    );
    if (!manifestDigest.ok) {
      issues.push(issue('document.source.invalid', 'profile.document.receipt.manifestDigest'));
    }
    if (!isComparisonAgainstManifest(input.comparison, manifest)) {
      issues.push(issue('document.parity', 'profile.document.receipt.comparison'));
    }
    if (!isMappedEvidence(input.pdfEvidence, manifest)) {
      issues.push(issue('document.parity', 'profile.document.receipt.pdfEvidence'));
    }
    if (!isMachineChecks(input.machineChecks, input.pdfEvidence)) {
      issues.push(issue('document.generation.failed', 'profile.document.receipt.machineChecks'));
    }
    if (!isToolVersions(input.tools)) {
      issues.push(issue('field.type', 'profile.document.receipt.tools'));
    }

    if (
      isOwnRecord(input.comparison) &&
      isOwnRecord(input.pdfEvidence) &&
      isCandidate(input.candidate)
    ) {
      validateDraftCorrespondence(input, manifest, issues);
    }

    if (issues.length > 0 || !manifestDigest.ok) {
      return failure(issues);
    }

    const comparison = input.comparison as unknown as SurfaceManifestComparison;
    const pdfEvidence = input.pdfEvidence as unknown as MappedResumeEvidence;
    return success(
      deepFreezeResumeDocumentData({
        schemaVersion: RESUME_RECEIPT_SCHEMA_VERSION,
        kind: 'resume-inspection-draft',
        scope: 'private-candidate',
        machineResult: 'pass',
        manualReview: 'not-reviewed',
        publicRelease: 'not-authorized',
        assembledAt: input.assembledAt,
        candidate: input.candidate,
        sourceIdentity: comparison.sourceIdentity,
        manifestFingerprint: comparison.fingerprint,
        manifestDigest: manifestDigest.value,
        comparison,
        pdfEvidence,
        machineChecks: input.machineChecks,
        tools: input.tools,
      }) as unknown as ResumeInspectionReceipt,
    );
  } catch {
    return receiptFailure('document.generation.failed', 'profile.document.receipt');
  }
}

/** Revalidates a persisted private draft and binds it to the current subject. */
export function validateResumeInspectionReceipt(
  candidate: unknown,
  expectedCandidate: ResumeReceiptSubject,
  currentManifest: ResumeFactManifest,
): ResumeEvidenceResult<ResumeInspectionReceipt> {
  try {
    const receiptSnapshot = snapshotResumeDocumentData(candidate);
    const subjectSnapshot = snapshotResumeDocumentData(expectedCandidate);
    const manifest = inspectCurrentManifest(currentManifest);
    if (
      manifest === null ||
      !receiptSnapshot.ok ||
      !subjectSnapshot.ok ||
      !isOwnRecord(receiptSnapshot.value) ||
      !isOwnRecord(subjectSnapshot.value) ||
      !hasExactKeys(receiptSnapshot.value, DRAFT_RECEIPT_KEYS) ||
      !isReceiptSubject(subjectSnapshot.value) ||
      !receiptSubjectMatchesManifest(subjectSnapshot.value, manifest)
    ) {
      return receiptFailure('field.type', 'profile.document.receipt');
    }

    const receipt = receiptSnapshot.value;
    const subject = subjectSnapshot.value;
    const issues = validateDraftReceiptShape(receipt, manifest);
    validateReceiptCurrentness(receipt, subject, issues);
    if (issues.length > 0) {
      return failure(issues);
    }

    return success(
      deepFreezeResumeDocumentData(receipt) as unknown as ResumeInspectionReceipt,
    );
  } catch {
    return receiptFailure('document.stale', 'profile.document.receipt');
  }
}

/**
 * Validates the exact human-reviewed candidate. All eleven checklist rows are
 * mandatory, ordered, and explicit; screenshots or free-form notes cannot
 * substitute for them.
 */
export function validateResumeHumanReview(
  draftCandidate: ResumeInspectionReceipt,
  currentCandidate: ResumeReceiptSubject,
  reviewCandidate: unknown,
  currentManifest: ResumeFactManifest,
): ResumeEvidenceResult<ValidatedResumeHumanReview> {
  try {
    const draftSnapshot = snapshotResumeDocumentData(draftCandidate);
    const currentSnapshot = snapshotResumeDocumentData(currentCandidate);
    const reviewSnapshot = snapshotResumeDocumentData(reviewCandidate);
    const manifest = inspectCurrentManifest(currentManifest);
    if (
      manifest === null ||
      !draftSnapshot.ok ||
      !currentSnapshot.ok ||
      !reviewSnapshot.ok ||
      !isOwnRecord(draftSnapshot.value) ||
      !isOwnRecord(currentSnapshot.value) ||
      !isOwnRecord(reviewSnapshot.value) ||
      !hasExactKeys(draftSnapshot.value, DRAFT_RECEIPT_KEYS) ||
      !isReceiptSubject(currentSnapshot.value) ||
      !receiptSubjectMatchesManifest(currentSnapshot.value, manifest) ||
      !hasExactKeys(reviewSnapshot.value, HUMAN_REVIEW_KEYS)
    ) {
      return receiptFailure('field.type', 'profile.document.review');
    }

    const issues = validateDraftReceiptShape(draftSnapshot.value, manifest);
    validateReceiptCurrentness(
      draftSnapshot.value,
      currentSnapshot.value,
      issues,
    );
    validateHumanReviewShape(reviewSnapshot.value, issues);
    validateHumanReviewCurrentness(
      draftSnapshot.value,
      currentSnapshot.value,
      reviewSnapshot.value,
      issues,
    );
    if (issues.length > 0) {
      return failure(issues);
    }

    return success(
      deepFreezeResumeDocumentData(reviewSnapshot.value) as unknown as ValidatedResumeHumanReview,
    );
  } catch {
    return receiptFailure('document.generation.failed', 'profile.document.review');
  }
}

/**
 * Builds the final tracked schema without performing or claiming filesystem
 * promotion. Consequently the timestamp is `assembledAt`, never `promotedAt`.
 */
export function assembleResumeReleaseReceipt(
  draftCandidate: ResumeInspectionReceipt,
  reviewCandidate: ValidatedResumeHumanReview,
  currentCandidate: ResumeReceiptSubject,
  currentManifest: ResumeFactManifest,
  assembledAt: string,
): ResumeEvidenceResult<ResumeReleaseReceipt> {
  try {
    const draftValidation = validateResumeInspectionReceipt(
      draftCandidate,
      currentCandidate,
      currentManifest,
    );
    if (!draftValidation.ok) {
      return draftValidation;
    }
    const reviewValidation = validateResumeHumanReview(
      draftValidation.value,
      currentCandidate,
      reviewCandidate,
      currentManifest,
    );
    if (!reviewValidation.ok) {
      return reviewValidation;
    }
    if (!isTimestamp(assembledAt)) {
      return receiptFailure('field.type', 'profile.document.release.assembledAt');
    }

    const draft = draftValidation.value;
    const review = reviewValidation.value;
    return success(
      deepFreezeResumeDocumentData({
        schemaVersion: RESUME_RECEIPT_SCHEMA_VERSION,
        kind: 'resume-release',
        result: 'approved',
        assembledAt,
        publicTarget: {
          href: RESUME_DOCUMENT_PUBLIC_HREF,
          repositoryPath: RESUME_DOCUMENT_REPOSITORY_PATH,
        },
        candidateId: draft.candidate.candidateId,
        pdfSha256: draft.candidate.pdfSha256,
        sourceIdentity: draft.sourceIdentity,
        manifestFingerprint: draft.manifestFingerprint,
        manifestDigest: draft.manifestDigest,
        machineReceiptIdentity: {
          schemaVersion: RESUME_RECEIPT_SCHEMA_VERSION,
          candidateId: draft.candidate.candidateId,
          pdfSha256: draft.candidate.pdfSha256,
          sourceIdentity: draft.sourceIdentity,
          manifestFingerprint: draft.manifestFingerprint,
          manifestDigest: draft.manifestDigest,
        },
        fullMapping: draft.pdfEvidence.mappings,
        comparison: draft.comparison,
        manualReview: review,
        tools: draft.tools,
      }) as unknown as ResumeReleaseReceipt,
    );
  } catch {
    return receiptFailure('document.generation.failed', 'profile.document.release');
  }
}

/** Revalidates a persisted tracked release receipt against current identities. */
export function validateResumeReleaseReceipt(
  candidate: unknown,
  currentCandidate: ResumeReceiptSubject,
  currentManifest: ResumeFactManifest,
  currentEvidence: MappedResumeEvidence,
): ResumeEvidenceResult<ResumeReleaseReceipt> {
  try {
    const receiptSnapshot = snapshotResumeDocumentData(candidate);
    const currentSnapshot = snapshotResumeDocumentData(currentCandidate);
    const evidenceSnapshot = snapshotResumeDocumentData(currentEvidence);
    const manifest = inspectCurrentManifest(currentManifest);
    if (
      manifest === null ||
      !receiptSnapshot.ok ||
      !currentSnapshot.ok ||
      !evidenceSnapshot.ok ||
      !isOwnRecord(receiptSnapshot.value) ||
      !isOwnRecord(currentSnapshot.value) ||
      !isOwnRecord(evidenceSnapshot.value) ||
      !hasExactKeys(receiptSnapshot.value, RELEASE_RECEIPT_KEYS) ||
      !isReceiptSubject(currentSnapshot.value) ||
      !receiptSubjectMatchesManifest(currentSnapshot.value, manifest)
    ) {
      return receiptFailure('field.type', 'profile.document.release');
    }

    const receipt = receiptSnapshot.value;
    const current = currentSnapshot.value;
    const evidence = evidenceSnapshot.value;
    const issues: ValidationIssue[] = [];
    if (
      receipt.schemaVersion !== RESUME_RECEIPT_SCHEMA_VERSION ||
      receipt.kind !== 'resume-release' ||
      receipt.result !== 'approved' ||
      !isTimestamp(receipt.assembledAt)
    ) {
      issues.push(issue('field.type', 'profile.document.release'));
    }
    if (
      !isOwnRecord(receipt.publicTarget) ||
      !hasExactKeys(receipt.publicTarget, ['href', 'repositoryPath']) ||
      receipt.publicTarget.href !== RESUME_DOCUMENT_PUBLIC_HREF ||
      receipt.publicTarget.repositoryPath !== RESUME_DOCUMENT_REPOSITORY_PATH
    ) {
      issues.push(issue('document.link.invalid', 'profile.document.release.publicTarget'));
    }
    validateReleaseIdentity(receipt, current, issues);
    if (!isMachineReceiptIdentity(receipt.machineReceiptIdentity, current)) {
      issues.push(issue('document.stale', 'profile.document.release.machineReceiptIdentity'));
    }
    const evidenceIsCurrent = isMappedEvidence(evidence, manifest);
    if (!evidenceIsCurrent) {
      issues.push(issue('document.parity', 'profile.document.release.currentEvidence'));
    } else {
      validateReleaseEvidenceBinding(receipt, current, evidence, issues);
    }
    if (
      !Array.isArray(receipt.fullMapping) ||
      !isComparisonAgainstManifest(
        receipt.comparison,
        manifest,
        current.candidate,
      )
    ) {
      issues.push(issue('document.parity', 'profile.document.release.fullMapping'));
    } else {
      const comparison = receipt.comparison;
      if (
        !isOwnRecord(comparison) ||
        typeof comparison.expectedEntryCount !== 'number' ||
        receipt.fullMapping.length !== comparison.expectedEntryCount ||
        !validateFullMapping(receipt.fullMapping, manifest) ||
        !evidenceIsCurrent ||
        !resumeDocumentDataEqual(receipt.fullMapping, evidence.mappings)
      ) {
        issues.push(issue('document.parity', 'profile.document.release.fullMapping'));
      }
    }
    if (!isToolVersions(receipt.tools)) {
      issues.push(issue('field.type', 'profile.document.release.tools'));
    }

    const syntheticDraft = releaseReviewSubject(receipt);
    if (syntheticDraft === null || !isOwnRecord(receipt.manualReview)) {
      issues.push(issue('field.type', 'profile.document.release.manualReview'));
    } else {
      validateHumanReviewShape(receipt.manualReview, issues);
      validateHumanReviewCurrentness(
        syntheticDraft,
        current,
        receipt.manualReview,
        issues,
      );
    }
    if (issues.length > 0) {
      return failure(issues);
    }

    return success(
      deepFreezeResumeDocumentData(receipt) as unknown as ResumeReleaseReceipt,
    );
  } catch {
    return receiptFailure('document.stale', 'profile.document.release');
  }
}

function validateReleaseEvidenceBinding(
  receipt: OwnRecord,
  current: OwnRecord,
  evidence: OwnRecord,
  issues: ValidationIssue[],
): void {
  if (
    !resumeDocumentDataEqual(evidence.candidate, current.candidate) ||
    !resumeDocumentDataEqual(evidence.sourceIdentity, current.sourceIdentity) ||
    !resumeDocumentDataEqual(
      evidence.fingerprint,
      current.manifestFingerprint,
    ) ||
    !resumeDocumentDataEqual(evidence.sourceIdentity, receipt.sourceIdentity) ||
    !resumeDocumentDataEqual(
      evidence.fingerprint,
      receipt.manifestFingerprint,
    ) ||
    !resumeDocumentDataEqual(evidence.tools, receipt.tools)
  ) {
    issues.push(issue('document.stale', 'profile.document.release.currentEvidence'));
  }
}

function validateDraftCorrespondence(
  input: OwnRecord,
  currentManifest: ResumeFactManifest,
  issues: ValidationIssue[],
): void {
  const comparison = input.comparison as OwnRecord;
  const pdf = input.pdfEvidence as OwnRecord;
  if (
    !resumeDocumentDataEqual(input.candidate, pdf.candidate) ||
    !resumeDocumentDataEqual(comparison.sourceIdentity, pdf.sourceIdentity) ||
    !resumeDocumentDataEqual(comparison.fingerprint, pdf.fingerprint) ||
    !resumeDocumentDataEqual(input.manifestDigest, comparison.fingerprint) ||
    !resumeDocumentDataEqual(
      comparison.sourceIdentity,
      currentManifest.sourceIdentity,
    ) ||
    !resumeDocumentDataEqual(
      comparison.fingerprint,
      currentManifest.fingerprint,
    ) ||
    !resumeDocumentDataEqual(input.tools, pdf.tools)
  ) {
    issues.push(issue('document.stale', 'profile.document.receipt'));
  }
  if (
    !isOwnRecord(comparison.pdf) ||
    !resumeDocumentDataEqual(comparison.pdf.candidate, input.candidate) ||
    !resumeDocumentDataEqual(comparison.pdf.sourceIdentity, pdf.sourceIdentity) ||
    !resumeDocumentDataEqual(comparison.pdf.fingerprint, pdf.fingerprint) ||
    !Array.isArray(pdf.mappings) ||
    comparison.pdf.mappedEntryCount !== pdf.mappings.length ||
    !resumeDocumentDataEqual(
      comparison.pdf.entries,
      currentManifest.entries,
    ) ||
    !validateFullMapping(pdf.mappings, currentManifest)
  ) {
    issues.push(issue('document.parity', 'profile.document.receipt.comparison'));
  }
}

function validateDraftReceiptShape(
  receipt: OwnRecord,
  currentManifest: ResumeFactManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (
    receipt.schemaVersion !== RESUME_RECEIPT_SCHEMA_VERSION ||
    receipt.kind !== 'resume-inspection-draft' ||
    receipt.scope !== 'private-candidate' ||
    receipt.machineResult !== 'pass' ||
    receipt.manualReview !== 'not-reviewed' ||
    receipt.publicRelease !== 'not-authorized' ||
    !isTimestamp(receipt.assembledAt)
  ) {
    issues.push(issue('field.type', 'profile.document.receipt'));
  }
  if (!isCandidate(receipt.candidate)) {
    issues.push(issue('field.type', 'profile.document.receipt.candidate'));
  }
  if (
    !validateCanonicalDigest(
      receipt.manifestDigest,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    ).ok ||
    !resumeDocumentDataEqual(
      receipt.manifestFingerprint,
      receipt.manifestDigest,
    )
  ) {
    issues.push(issue('document.source.invalid', 'profile.document.receipt.manifestDigest'));
  }
  if (
    !isComparisonAgainstManifest(
      receipt.comparison,
      currentManifest,
      receipt.candidate,
    ) ||
    !isMappedEvidence(receipt.pdfEvidence, currentManifest)
  ) {
    issues.push(issue('document.parity', 'profile.document.receipt.comparison'));
  }
  if (!isMachineChecks(receipt.machineChecks, receipt.pdfEvidence)) {
    issues.push(issue('document.generation.failed', 'profile.document.receipt.machineChecks'));
  }
  if (!isToolVersions(receipt.tools)) {
    issues.push(issue('field.type', 'profile.document.receipt.tools'));
  }
  if (
    isOwnRecord(receipt.comparison) &&
    isOwnRecord(receipt.pdfEvidence)
  ) {
    validateDraftCorrespondence(receipt, currentManifest, issues);
  }
  return issues;
}

function validateReceiptCurrentness(
  receipt: OwnRecord,
  subject: OwnRecord,
  issues: ValidationIssue[],
): void {
  if (
    !resumeDocumentDataEqual(receipt.candidate, subject.candidate) ||
    !resumeDocumentDataEqual(receipt.sourceIdentity, subject.sourceIdentity) ||
    !resumeDocumentDataEqual(
      receipt.manifestFingerprint,
      subject.manifestFingerprint,
    ) ||
    !resumeDocumentDataEqual(receipt.manifestDigest, subject.manifestDigest)
  ) {
    issues.push(issue('document.stale', 'profile.document.receipt'));
  }
}

function validateHumanReviewShape(
  review: OwnRecord,
  issues: ValidationIssue[],
): void {
  if (
    !hasExactKeys(review, HUMAN_REVIEW_KEYS) ||
    review.schemaVersion !== RESUME_RECEIPT_SCHEMA_VERSION ||
    review.kind !== 'resume-human-review' ||
    !isSafeIdentifier(review.candidateId) ||
    !isSha256(review.pdfSha256) ||
    !isCanonicalNonEmptyString(review.reviewer) ||
    !isTimestamp(review.reviewedAt) ||
    review.result !== 'pass' ||
    typeof review.note !== 'string' ||
    review.note.normalize('NFC') !== review.note
  ) {
    issues.push(issue('document.generation.failed', 'profile.document.review'));
  }
  if (
    !validateCanonicalDigest(
      review.manifestFingerprint,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    ).ok ||
    !validateCanonicalDigest(
      review.manifestDigest,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    ).ok
  ) {
    issues.push(issue('document.source.invalid', 'profile.document.review.manifestDigest'));
  }
  if (
    !Array.isArray(review.checklist) ||
    review.checklist.length !== RESUME_MANUAL_REVIEW_ITEMS.length
  ) {
    issues.push(issue('document.generation.failed', 'profile.document.review.checklist'));
    return;
  }
  for (let index = 0; index < RESUME_MANUAL_REVIEW_ITEMS.length; index += 1) {
    const item = review.checklist[index];
    if (
      !isOwnRecord(item) ||
      !hasExactKeys(item, ['key', 'result', 'note']) ||
      item.key !== RESUME_MANUAL_REVIEW_ITEMS[index] ||
      item.result !== 'pass' ||
      typeof item.note !== 'string' ||
      item.note.normalize('NFC') !== item.note
    ) {
      issues.push(
        issue('document.generation.failed', `profile.document.review.checklist[${index}]`),
      );
    }
  }
}

function validateHumanReviewCurrentness(
  draft: OwnRecord,
  current: OwnRecord,
  review: OwnRecord,
  issues: ValidationIssue[],
): void {
  const candidate = draft.candidate;
  if (
    !isOwnRecord(candidate) ||
    review.candidateId !== candidate.candidateId ||
    review.pdfSha256 !== candidate.pdfSha256 ||
    !resumeDocumentDataEqual(review.sourceIdentity, draft.sourceIdentity) ||
    !resumeDocumentDataEqual(
      review.manifestFingerprint,
      draft.manifestFingerprint,
    ) ||
    !resumeDocumentDataEqual(review.manifestDigest, draft.manifestDigest) ||
    !resumeDocumentDataEqual(review.candidateId, (current.candidate as OwnRecord).candidateId) ||
    !resumeDocumentDataEqual(review.pdfSha256, (current.candidate as OwnRecord).pdfSha256) ||
    !resumeDocumentDataEqual(review.sourceIdentity, current.sourceIdentity) ||
    !resumeDocumentDataEqual(
      review.manifestFingerprint,
      current.manifestFingerprint,
    ) ||
    !resumeDocumentDataEqual(review.manifestDigest, current.manifestDigest)
  ) {
    issues.push(issue('document.stale', 'profile.document.review'));
  }
}

function validateReleaseIdentity(
  receipt: OwnRecord,
  current: OwnRecord,
  issues: ValidationIssue[],
): void {
  const candidate = current.candidate as OwnRecord;
  if (
    receipt.candidateId !== candidate.candidateId ||
    receipt.pdfSha256 !== candidate.pdfSha256 ||
    !resumeDocumentDataEqual(receipt.sourceIdentity, current.sourceIdentity) ||
    !resumeDocumentDataEqual(
      receipt.manifestFingerprint,
      current.manifestFingerprint,
    ) ||
    !resumeDocumentDataEqual(receipt.manifestDigest, current.manifestDigest)
  ) {
    issues.push(issue('document.stale', 'profile.document.release'));
  }
}

function isReceiptSubject(value: OwnRecord): boolean {
  return (
    hasExactKeys(value, SUBJECT_KEYS) &&
    isCandidate(value.candidate) &&
    validateCanonicalDigest(
      value.sourceIdentity,
      PROFILE_SOURCE_DIGEST_DOMAIN,
    ).ok &&
    validateCanonicalDigest(
      value.manifestFingerprint,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    ).ok &&
    validateCanonicalDigest(
      value.manifestDigest,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    ).ok &&
    resumeDocumentDataEqual(
      value.manifestFingerprint,
      value.manifestDigest,
    )
  );
}

function inspectCurrentManifest(
  candidate: ResumeFactManifest,
): ResumeFactManifest | null {
  const comparison = compareResumeFactManifests(candidate, candidate);
  return comparison.ok ? comparison.value : null;
}

function receiptSubjectMatchesManifest(
  subject: OwnRecord,
  manifest: ResumeFactManifest,
): boolean {
  return (
    resumeDocumentDataEqual(subject.sourceIdentity, manifest.sourceIdentity) &&
    resumeDocumentDataEqual(
      subject.manifestFingerprint,
      manifest.fingerprint,
    ) &&
    // U1 currently defines manifestFingerprint and manifestDigest as aliases.
    resumeDocumentDataEqual(subject.manifestDigest, manifest.fingerprint)
  );
}

function isComparison(value: unknown): boolean {
  if (
    !isOwnRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'result',
      'sourceIdentity',
      'fingerprint',
      'expectedEntryCount',
      'web',
      'print',
      'pdf',
    ]) ||
    value.schemaVersion !== RESUME_EVIDENCE_SCHEMA_VERSION ||
    value.result !== 'pass' ||
    !isNonNegativeInteger(value.expectedEntryCount) ||
    !isOwnRecord(value.web) ||
    !isOwnRecord(value.print) ||
    !isOwnRecord(value.pdf)
  ) {
    return false;
  }
  if (
    !hasExactKeys(value.web, [
      'surface',
      'sourceIdentity',
      'fingerprint',
      'sectionCount',
      'entityCount',
      'entryCount',
      'sectionOrder',
      'entityOrder',
      'entries',
    ]) ||
    !hasExactKeys(value.print, [
      'surface',
      'sourceIdentity',
      'fingerprint',
      'sectionCount',
      'entityCount',
      'entryCount',
      'sectionOrder',
      'entityOrder',
      'entries',
    ]) ||
    !hasExactKeys(value.pdf, [
      'surface',
      'candidate',
      'sourceIdentity',
      'fingerprint',
      'sectionCount',
      'entityCount',
      'mappedEntryCount',
      'sectionOrder',
      'entityOrder',
      'entries',
    ]) ||
    !Array.isArray(value.web.sectionOrder) ||
    !Array.isArray(value.web.entityOrder) ||
    !Array.isArray(value.web.entries) ||
    !Array.isArray(value.print.sectionOrder) ||
    !Array.isArray(value.print.entityOrder) ||
    !Array.isArray(value.print.entries) ||
    !Array.isArray(value.pdf.sectionOrder) ||
    !Array.isArray(value.pdf.entityOrder) ||
    !Array.isArray(value.pdf.entries)
  ) {
    return false;
  }

  return (
    value.web.surface === 'web' &&
    value.print.surface === 'print' &&
    value.pdf.surface === 'pdf' &&
    value.web.entryCount === value.expectedEntryCount &&
    value.print.entryCount === value.expectedEntryCount &&
    value.pdf.mappedEntryCount === value.expectedEntryCount &&
    resumeDocumentDataEqual(value.sourceIdentity, value.web.sourceIdentity) &&
    resumeDocumentDataEqual(value.sourceIdentity, value.print.sourceIdentity) &&
    resumeDocumentDataEqual(value.sourceIdentity, value.pdf.sourceIdentity) &&
    resumeDocumentDataEqual(value.fingerprint, value.web.fingerprint) &&
    resumeDocumentDataEqual(value.fingerprint, value.print.fingerprint) &&
    resumeDocumentDataEqual(value.fingerprint, value.pdf.fingerprint) &&
    resumeDocumentDataEqual(value.web.sectionOrder, value.print.sectionOrder) &&
    resumeDocumentDataEqual(value.web.sectionOrder, value.pdf.sectionOrder) &&
    resumeDocumentDataEqual(value.web.entityOrder, value.print.entityOrder) &&
    resumeDocumentDataEqual(value.web.entityOrder, value.pdf.entityOrder) &&
    resumeDocumentDataEqual(value.web.entries, value.print.entries) &&
    resumeDocumentDataEqual(value.web.entries, value.pdf.entries)
  );
}

function isComparisonAgainstManifest(
  value: unknown,
  manifest: ResumeFactManifest,
  expectedCandidate?: unknown,
): boolean {
  if (!isComparison(value) || !isOwnRecord(value)) {
    return false;
  }

  const web = value.web as OwnRecord;
  const print = value.print as OwnRecord;
  const pdf = value.pdf as OwnRecord;
  const sectionCount = manifest.sectionOrder.length;
  const entityCount = manifest.entityOrder.length;
  const entryCount = manifest.entries.length;

  return (
    resumeDocumentDataEqual(value.sourceIdentity, manifest.sourceIdentity) &&
    resumeDocumentDataEqual(value.fingerprint, manifest.fingerprint) &&
    value.expectedEntryCount === entryCount &&
    web.sectionCount === sectionCount &&
    web.entityCount === entityCount &&
    web.entryCount === entryCount &&
    print.sectionCount === sectionCount &&
    print.entityCount === entityCount &&
    print.entryCount === entryCount &&
    pdf.sectionCount === sectionCount &&
    pdf.entityCount === entityCount &&
    pdf.mappedEntryCount === entryCount &&
    resumeDocumentDataEqual(web.sectionOrder, manifest.sectionOrder) &&
    resumeDocumentDataEqual(print.sectionOrder, manifest.sectionOrder) &&
    resumeDocumentDataEqual(pdf.sectionOrder, manifest.sectionOrder) &&
    resumeDocumentDataEqual(web.entityOrder, manifest.entityOrder) &&
    resumeDocumentDataEqual(print.entityOrder, manifest.entityOrder) &&
    resumeDocumentDataEqual(pdf.entityOrder, manifest.entityOrder) &&
    resumeDocumentDataEqual(web.entries, manifest.entries) &&
    resumeDocumentDataEqual(print.entries, manifest.entries) &&
    resumeDocumentDataEqual(pdf.entries, manifest.entries) &&
    (expectedCandidate === undefined ||
      resumeDocumentDataEqual(pdf.candidate, expectedCandidate))
  );
}

function isMappedEvidence(
  value: unknown,
  currentManifest: ResumeFactManifest,
): boolean {
  if (
    !isOwnRecord(value) ||
    !(
    hasExactKeys(value, [
      'schemaVersion',
      'candidate',
      'sourceIdentity',
      'fingerprint',
      'sectionOrder',
      'entityOrder',
      'mappings',
      'structure',
      'outline',
      'renderedPages',
      'tools',
    ]) &&
    value.schemaVersion === RESUME_EVIDENCE_SCHEMA_VERSION &&
    isCandidate(value.candidate) &&
    Array.isArray(value.sectionOrder) &&
    Array.isArray(value.entityOrder) &&
    Array.isArray(value.mappings) &&
    validateFullMapping(value.mappings, currentManifest) &&
    Array.isArray(value.renderedPages) &&
    isToolVersions(value.tools)
    )
  ) {
    return false;
  }

  return validateMappedResumeEvidence(currentManifest, value).ok;
}

function validateFullMapping(
  value: readonly unknown[],
  manifest: ResumeFactManifest,
): boolean {
  if (value.length !== manifest.entries.length) {
    return false;
  }

  const occurrenceOrders = new Set<number>();
  const structurePaths = new Set<string>();
  const fragmentReferences = new Set<string>();
  const annotationReferences = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const mapping = value[index];
    const expectedEntry = manifest.entries[index];
    const expectedSectionOrdinal =
      expectedEntry === undefined
        ? -1
        : manifest.sectionOrder.findIndex(
            (section) =>
              section.key === expectedEntry.sectionKey &&
              section.order === expectedEntry.sectionOrder,
          );
    const expectedEntityOrdinal =
      expectedEntry === undefined
        ? undefined
        : manifestEntityOrdinal(manifest, expectedEntry);
    if (
      expectedEntry === undefined ||
      !isOwnRecord(mapping) ||
      !hasExactKeys(mapping, [
        'expectedEntry',
        'observedOccurrenceOrder',
        'sectionOrdinal',
        'entityOrdinal',
        'normalizedObservedValue',
        'fragmentReferences',
        'urlAnnotationReferences',
        'structurePath',
      ]) ||
      !resumeDocumentDataEqual(mapping.expectedEntry, expectedEntry) ||
      mapping.observedOccurrenceOrder !== index + 1 ||
      occurrenceOrders.has(mapping.observedOccurrenceOrder as number) ||
      mapping.sectionOrdinal !== expectedSectionOrdinal ||
      mapping.entityOrdinal !== expectedEntityOrdinal ||
      mapping.normalizedObservedValue !== expectedEntry.normalizedValue ||
      !isMappingReferenceArray(mapping.fragmentReferences, false) ||
      !isMappingReferenceArray(mapping.urlAnnotationReferences, true) ||
      !isNonEmptyNonNegativeIntegerArray(mapping.structurePath) ||
      !mappingReferencesMatchExpected(mapping, expectedEntry)
    ) {
      return false;
    }

    occurrenceOrders.add(mapping.observedOccurrenceOrder as number);
    const structurePath = (mapping.structurePath as readonly number[]).join('.');
    if (structurePaths.has(structurePath)) {
      return false;
    }
    structurePaths.add(structurePath);

    if (
      !addUniqueMappingReferences(
        mapping.fragmentReferences as readonly OwnRecord[],
        false,
        fragmentReferences,
      ) ||
      !addUniqueMappingReferences(
        mapping.urlAnnotationReferences as readonly OwnRecord[],
        true,
        annotationReferences,
      )
    ) {
      return false;
    }
  }
  return true;
}

function manifestEntityOrdinal(
  manifest: ResumeFactManifest,
  entry: ResumeManifestEntry,
): number | null | undefined {
  if (entry.entity === null) {
    return null;
  }

  const matches: number[] = [];
  for (let index = 0; index < manifest.entityOrder.length; index += 1) {
    const entity = manifest.entityOrder[index];
    if (
      entity !== undefined &&
      entity.sectionKey === entry.sectionKey &&
      entity.sectionOrder === entry.sectionOrder &&
      entity.kind === entry.entity.kind &&
      entity.id === entry.entity.id &&
      entity.order === entry.entity.order
    ) {
      matches.push(index);
    }
  }
  return matches.length === 1 ? matches[0] : undefined;
}

function isMappingReferenceArray(
  value: unknown,
  includesDestination: boolean,
): value is readonly OwnRecord[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const seen = new Set<string>();
  for (const reference of value) {
    const expectedKeys = includesDestination
      ? ['pageNumber', 'annotationIndex', 'destination']
      : ['pageNumber', 'itemIndex'];
    if (
      !isOwnRecord(reference) ||
      !hasExactKeys(reference, expectedKeys) ||
      !isPositiveInteger(reference.pageNumber) ||
      !(includesDestination
        ? isNonNegativeInteger(reference.annotationIndex) &&
          typeof reference.destination === 'string'
        : isNonNegativeInteger(reference.itemIndex))
    ) {
      return false;
    }

    const referenceIndex = includesDestination
      ? reference.annotationIndex
      : reference.itemIndex;
    const key = `${reference.pageNumber}:${referenceIndex}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

function isNonEmptyNonNegativeIntegerArray(
  value: unknown,
): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isNonNegativeInteger)
  );
}

function mappingReferencesMatchExpected(
  mapping: OwnRecord,
  entry: ResumeManifestEntry,
): boolean {
  const fragments = mapping.fragmentReferences as readonly OwnRecord[];
  const annotations = mapping.urlAnnotationReferences as readonly OwnRecord[];
  if (!isLinkValueKind(entry.valueKind)) {
    return fragments.length > 0 && annotations.length === 0;
  }
  if (annotations.length !== 1) {
    return false;
  }

  const expectedDestination =
    entry.valueKind === 'email'
      ? `mailto:${entry.normalizedValue}`
      : entry.normalizedValue;
  return annotations[0]?.destination === expectedDestination;
}

function isLinkValueKind(value: ResumeManifestEntry['valueKind']): boolean {
  return (
    value === 'email' ||
    value === 'github-url' ||
    value === 'external-url' ||
    value === 'internal-path'
  );
}

function addUniqueMappingReferences(
  references: readonly OwnRecord[],
  annotation: boolean,
  seen: Set<string>,
): boolean {
  for (const reference of references) {
    const referenceIndex = annotation
      ? reference.annotationIndex
      : reference.itemIndex;
    const key = `${reference.pageNumber}:${referenceIndex}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

function isMachineChecks(value: unknown, pdfEvidence: unknown): boolean {
  if (
    !isOwnRecord(value) ||
    !hasExactKeys(value, [
      'pdf',
      'annotations',
      'structure',
      'outline',
      'font',
      'network',
      'print',
    ]) ||
    !isOwnRecord(pdfEvidence)
  ) {
    return false;
  }
  const mappings = Array.isArray(pdfEvidence.mappings)
    ? pdfEvidence.mappings
    : [];
  const renderedPages = Array.isArray(pdfEvidence.renderedPages)
    ? pdfEvidence.renderedPages
    : [];
  const sectionOrder = Array.isArray(pdfEvidence.sectionOrder)
    ? pdfEvidence.sectionOrder
    : [];
  const annotationCount = mappings.reduce(
    (count, mapping) =>
      count +
      (isOwnRecord(mapping) && Array.isArray(mapping.urlAnnotationReferences)
        ? mapping.urlAnnotationReferences.length
        : 0),
    0,
  );

  return (
    isOwnRecord(value.pdf) &&
    hasExactKeys(value.pdf, [
      'readable',
      'nonEmpty',
      'pageCount',
      'renderedPageCount',
    ]) &&
    value.pdf.readable === true &&
    value.pdf.nonEmpty === true &&
    isPositiveInteger(value.pdf.pageCount) &&
    value.pdf.renderedPageCount === renderedPages.length &&
    value.pdf.pageCount === renderedPages.length &&
    isOwnRecord(value.annotations) &&
    hasExactKeys(value.annotations, [
      'expectedCount',
      'observedCount',
      'mappedCount',
    ]) &&
    value.annotations.expectedCount === annotationCount &&
    value.annotations.observedCount === annotationCount &&
    value.annotations.mappedCount === annotationCount &&
    isOwnRecord(value.structure) &&
    hasExactKeys(value.structure, [
      'tagged',
      'occurrenceCount',
      'readingOrderCount',
    ]) &&
    value.structure.tagged === true &&
    value.structure.occurrenceCount === mappings.length &&
    value.structure.readingOrderCount === mappings.length &&
    isOwnRecord(value.outline) &&
    hasExactKeys(value.outline, ['sectionCount', 'destinationCount']) &&
    value.outline.sectionCount === sectionOrder.length &&
    value.outline.destinationCount === sectionOrder.length &&
    isValidFontCheck(value.font) &&
    isValidNetworkCheck(value.network) &&
    isValidPrintCheck(value.print)
  );
}

function isValidFontCheck(value: unknown): boolean {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, [
      'family',
      'responseOk',
      'mime',
      'fontsReady',
      'fontsCheck',
    ]) &&
    isCanonicalNonEmptyString(value.family) &&
    value.responseOk === true &&
    value.mime === 'font/woff2' &&
    value.fontsReady === true &&
    value.fontsCheck === true
  );
}

function isValidNetworkCheck(value: unknown): boolean {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, [
      'loopbackOnly',
      'successfulNonLoopbackRequests',
    ]) &&
    value.loopbackOnly === true &&
    value.successfulNonLoopbackRequests === 0
  );
}

function isValidPrintCheck(value: unknown): boolean {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, [
      'paper',
      'marginMm',
      'preferCSSPageSize',
      'tagged',
      'outline',
      'printBackground',
      'detailsExpanded',
      'screenOnlyOmitted',
      'noClipping',
      'bodyTextMinimumPt',
      'lineHeightMinimum',
      'entriesUnsplittable',
      'longDetailsSplittable',
      'headingFirstBlockKept',
    ]) &&
    value.paper === 'A4' &&
    value.marginMm === 12 &&
    value.preferCSSPageSize === true &&
    value.tagged === true &&
    value.outline === true &&
    value.printBackground === false &&
    value.detailsExpanded === true &&
    value.screenOnlyOmitted === true &&
    value.noClipping === true &&
    typeof value.bodyTextMinimumPt === 'number' &&
    Number.isFinite(value.bodyTextMinimumPt) &&
    value.bodyTextMinimumPt >= 10 &&
    typeof value.lineHeightMinimum === 'number' &&
    Number.isFinite(value.lineHeightMinimum) &&
    value.lineHeightMinimum >= 1.35 &&
    value.entriesUnsplittable === true &&
    value.longDetailsSplittable === true &&
    value.headingFirstBlockKept === true
  );
}

function isMachineReceiptIdentity(
  value: unknown,
  current: OwnRecord,
): boolean {
  if (
    !isOwnRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'candidateId',
      'pdfSha256',
      'sourceIdentity',
      'manifestFingerprint',
      'manifestDigest',
    ]) ||
    value.schemaVersion !== RESUME_RECEIPT_SCHEMA_VERSION
  ) {
    return false;
  }
  const candidate = current.candidate as OwnRecord;
  return (
    value.candidateId === candidate.candidateId &&
    value.pdfSha256 === candidate.pdfSha256 &&
    resumeDocumentDataEqual(value.sourceIdentity, current.sourceIdentity) &&
    resumeDocumentDataEqual(
      value.manifestFingerprint,
      current.manifestFingerprint,
    ) &&
    resumeDocumentDataEqual(value.manifestDigest, current.manifestDigest)
  );
}

function releaseReviewSubject(release: OwnRecord): OwnRecord | null {
  if (!isSafeIdentifier(release.candidateId) || !isSha256(release.pdfSha256)) {
    return null;
  }
  return {
    candidate: {
      candidateId: release.candidateId,
      pdfSha256: release.pdfSha256,
    },
    sourceIdentity: release.sourceIdentity,
    manifestFingerprint: release.manifestFingerprint,
    manifestDigest: release.manifestDigest,
  };
}

function isCandidate(value: unknown): value is ResumeCandidateIdentity {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, ['candidateId', 'pdfSha256']) &&
    isSafeIdentifier(value.candidateId) &&
    isSha256(value.pdfSha256)
  );
}

function isToolVersions(value: unknown): value is ResumeToolVersions {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, [
      'node',
      'playwright',
      'chromium',
      'pdfjs',
      'pretendard',
    ]) &&
    isCanonicalNonEmptyString(value.node) &&
    value.playwright === RESUME_TOOL_VERSIONS.playwright &&
    isCanonicalNonEmptyString(value.chromium) &&
    value.pdfjs === RESUME_TOOL_VERSIONS.pdfjs &&
    value.pretendard === RESUME_TOOL_VERSIONS.pretendard
  );
}

function isSafeIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.normalize('NFC') === value &&
    SAFE_IDENTIFIER_PATTERN.test(value)
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function isCanonicalNonEmptyString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(value) &&
    value.normalize('NFC') === value
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isOwnRecord(value: unknown): value is OwnRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  value: OwnRecord,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function success<Value>(value: Value): ValidationResult<Value> {
  return Object.freeze({ ok: true, value });
}

function receiptFailure(
  code: ValidationIssue['code'],
  path: string,
): ValidationResult<never> {
  return failure([issue(code, path)]);
}

function failure(
  issues: readonly ValidationIssue[],
): ValidationResult<never> {
  const sorted = sortAndDedupeIssues(issues);
  const nonEmpty =
    sorted.length > 0
      ? sorted
      : [issue('document.generation.failed', 'profile.document')];
  return Object.freeze({
    ok: false,
    issues: Object.freeze(nonEmpty) as NonEmptyReadonlyArray<ValidationIssue>,
  });
}

function issue(
  code: ValidationIssue['code'],
  path: string,
): ValidationIssue {
  return createValidationIssue(code, path as ProfilePath);
}
