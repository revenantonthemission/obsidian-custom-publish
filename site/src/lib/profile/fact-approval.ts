import {
  createValidationIssue,
  profilePath,
  sortAndDedupeIssues,
} from './issues.js';
import { normalizeText } from './normalization.js';
import { hasValidatedProfileCapability } from './validation.js';
import type {
  ContentBlock,
  DeepReadonly,
  EvidenceLink,
  FactApprovalIdentity,
  FactApprovedProfile,
  FactId,
  LinkDestination,
  NonEmptyReadonlyArray,
  Period,
  ProfileData,
  ProfilePath,
  PublicFact,
  ValidatedProfile,
  ValidationIssue,
  ValidationResult,
  VerifiedFactApproval,
} from './types.js';

declare const factCanonicalPathBrand: unique symbol;

export const FACT_APPROVAL_SCHEMA_VERSION = 1;

export const FACT_TARGET_SURFACES = [
  'resume',
  'portfolio',
  'homepage',
  'metadata',
  'pdf',
] as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CANONICAL_PATH_PATTERN =
  /^profile(?:\.[A-Za-z][A-Za-z0-9]*|\[id=[a-z0-9]+(?:-[a-z0-9]+)*\]|\[\d+\])+$/;
const REVIEW_KEYS = [
  'inventory',
  'productionDiff',
  'materializedProfileDigest',
  'receipt',
] as const;
const INVENTORY_KEYS = [
  'schemaVersion',
  'revision',
  'digest',
  'approvedRecordsDigest',
  'records',
] as const;
const REVIEW_RECORD_KEYS = [
  'factId',
  'canonicalPath',
  'normalizedValue',
  'evidence',
  'targetSurfaces',
  'requirement',
  'status',
  'decisionRecord',
] as const;
const PRODUCTION_DIFF_KEYS = [
  'schemaVersion',
  'revision',
  'digest',
  'inventoryRevision',
  'inventoryDigest',
  'approvedRecordsDigest',
  'materializedProfileDigest',
] as const;
const RECEIPT_KEYS = [
  'schemaVersion',
  'receiptId',
  'inventoryRevision',
  'inventoryDigest',
  'productionDiffRevision',
  'productionDiffDigest',
  'approvedRecordsDigest',
  'materializedProfileDigest',
  'decision',
  'decisionAuditId',
  'decisionRecordedAt',
] as const;

const VERIFIED_FACT_APPROVAL_CAPABILITIES = new WeakSet<object>();

export type FactCanonicalPath = string & {
  readonly [factCanonicalPathBrand]: 'FactCanonicalPath';
};

export type FactTargetSurface = (typeof FACT_TARGET_SURFACES)[number];

export type FactReviewStatus = 'Approved' | 'Excluded' | 'Pending';

export type FactRequirement = 'required' | 'optional';

export interface TextReviewValue {
  readonly kind: 'text';
  readonly value: string;
}

export interface EmailReviewValue {
  readonly kind: 'email';
  readonly value: string;
}

export interface GitHubUrlReviewValue {
  readonly kind: 'github-url';
  readonly value: string;
}

export interface ExternalUrlReviewValue {
  readonly kind: 'external-url';
  readonly value: string;
}

export interface InternalPathReviewValue {
  readonly kind: 'internal-path';
  readonly value: string;
}

export interface PeriodReviewValue {
  readonly kind: 'period';
  readonly value: Period;
}

export type FactReviewValue =
  | TextReviewValue
  | EmailReviewValue
  | GitHubUrlReviewValue
  | ExternalUrlReviewValue
  | InternalPathReviewValue
  | PeriodReviewValue;

export type FactReviewEvidence =
  | Readonly<{
      kind: 'user-provided';
      reference: string;
    }>
  | Readonly<{
      kind: 'public-source';
      reference: string;
      expectedDestination: string;
      verifier: string;
      checkedAt: string;
    }>;

export interface FactDecisionRecord {
  readonly decision: 'Approved' | 'Excluded';
  readonly auditInteractionId: string;
  readonly recordedAt: string;
}

export interface FactReviewRecord {
  readonly factId: string;
  readonly canonicalPath: FactCanonicalPath;
  readonly normalizedValue: FactReviewValue;
  readonly evidence: FactReviewEvidence;
  readonly targetSurfaces: readonly FactTargetSurface[];
  readonly requirement: FactRequirement;
  readonly status: FactReviewStatus;
  readonly decisionRecord: FactDecisionRecord | null;
}

export interface FactReviewInventory {
  readonly schemaVersion: number;
  readonly revision: string;
  readonly digest: string;
  readonly approvedRecordsDigest: string;
  readonly records: readonly FactReviewRecord[];
}

export interface FactProductionDiffIdentity {
  readonly schemaVersion: number;
  readonly revision: string;
  readonly digest: string;
  readonly inventoryRevision: string;
  readonly inventoryDigest: string;
  readonly approvedRecordsDigest: string;
  readonly materializedProfileDigest: string;
}

export type FactApprovalReceipt = FactApprovalIdentity;

export interface FactApprovalReview {
  readonly inventory: FactReviewInventory;
  readonly productionDiff: FactProductionDiffIdentity;
  /**
   * Digest calculated from the current materialized profile by the dedicated
   * digest boundary. This module verifies identity only and does not implement
   * or silently substitute a hash algorithm.
   */
  readonly materializedProfileDigest: string;
  readonly receipt: FactApprovalReceipt;
}

export interface MaterializedFact {
  readonly factId: FactId;
  readonly canonicalPath: FactCanonicalPath;
  readonly sourcePath: ProfilePath;
  readonly normalizedValue: DeepReadonly<FactReviewValue>;
  readonly targetSurfaces: readonly FactTargetSurface[];
  readonly requirement: FactRequirement;
}

const RESUME_PDF = surfaceSet('resume', 'pdf');
const RESUME_METADATA_PDF = surfaceSet('resume', 'metadata', 'pdf');
const RESUME_HOMEPAGE_PDF = surfaceSet('resume', 'homepage', 'pdf');
const RESUME_HOMEPAGE_METADATA_PDF = surfaceSet(
  'resume',
  'homepage',
  'metadata',
  'pdf',
);
const PORTFOLIO = surfaceSet('portfolio');
const PORTFOLIO_METADATA = surfaceSet('portfolio', 'metadata');
const RESUME_PORTFOLIO_PDF = surfaceSet('resume', 'portfolio', 'pdf');
const RESUME_PORTFOLIO_METADATA_PDF = surfaceSet(
  'resume',
  'portfolio',
  'metadata',
  'pdf',
);
const HOMEPAGE = surfaceSet('homepage');

export function collectMaterializedFacts(
  profile: ValidatedProfile,
): readonly MaterializedFact[] {
  // DeepReadonly intentionally makes the aggregate opaque at the boundary.
  // Runtime representation remains the validated ProfileData shape.
  const source = profile as unknown as ProfileData;
  const facts: MaterializedFact[] = [];

  addTextFact(
    facts,
    source.identity.name,
    'profile.identity.name',
    'profile.identity.name',
    RESUME_HOMEPAGE_METADATA_PDF,
    'required',
  );
  addTextFact(
    facts,
    source.identity.headline,
    'profile.identity.headline',
    'profile.identity.headline',
    RESUME_HOMEPAGE_PDF,
    'required',
  );
  addTextFact(
    facts,
    source.narrative.shortIntro,
    'profile.narrative.shortIntro',
    'profile.narrative.shortIntro',
    HOMEPAGE,
    'required',
  );
  collectContentBlocks(
    facts,
    source.narrative.detailedIntro,
    'profile.narrative.detailedIntro',
    'profile.narrative.detailedIntro',
    RESUME_PDF,
    'required',
  );
  addTextFact(
    facts,
    source.narrative.resumeSummary,
    'profile.narrative.resumeSummary',
    'profile.narrative.resumeSummary',
    RESUME_METADATA_PDF,
    'required',
  );
  addTextFact(
    facts,
    source.narrative.portfolioSummary,
    'profile.narrative.portfolioSummary',
    'profile.narrative.portfolioSummary',
    PORTFOLIO_METADATA,
    'required',
  );

  addEmailFact(
    facts,
    source.contact.email,
    'profile.contact.email',
    'profile.contact.email',
    RESUME_PORTFOLIO_METADATA_PDF,
    'required',
  );
  addGitHubFact(
    facts,
    source.contact.github,
    'profile.contact.github',
    'profile.contact.github',
    RESUME_PORTFOLIO_METADATA_PDF,
    'required',
  );
  collectEvidenceLinks(
    facts,
    source.contact.additionalLinks,
    'profile.contact.additionalLinks',
    'profile.contact.additionalLinks',
    RESUME_PORTFOLIO_PDF,
    RESUME_PORTFOLIO_PDF,
    'optional',
  );

  for (const {
    item: group,
    sourceIndex: groupIndex,
  } of orderedWithSourceIndex(source.skillGroups)) {
    const canonicalGroupPath =
      `profile.skillGroups[id=${group.id}]` as FactCanonicalPath;
    const sourceGroupPath = `profile.skillGroups[${groupIndex}]`;

    addTextFact(
      facts,
      group.title,
      `${canonicalGroupPath}.title`,
      `${sourceGroupPath}.title`,
      RESUME_PDF,
      'required',
    );

    for (const {
      item: skill,
      sourceIndex: skillIndex,
    } of orderedWithSourceIndex(group.skills)) {
      addTextFact(
        facts,
        skill.name,
        `${canonicalGroupPath}.skills[id=${skill.id}].name`,
        `${sourceGroupPath}.skills[${skillIndex}].name`,
        RESUME_PDF,
        'required',
      );
    }
  }

  for (const {
    item: experience,
    sourceIndex,
  } of orderedWithSourceIndex(source.experiences)) {
    const canonicalBase =
      `profile.experiences[id=${experience.id}]` as FactCanonicalPath;
    const sourceBase = `profile.experiences[${sourceIndex}]`;

    addTextFact(
      facts,
      experience.organization,
      `${canonicalBase}.organization`,
      `${sourceBase}.organization`,
      RESUME_PDF,
      'required',
    );
    addTextFact(
      facts,
      experience.role,
      `${canonicalBase}.role`,
      `${sourceBase}.role`,
      RESUME_PDF,
      'required',
    );
    addPeriodFact(
      facts,
      experience.period,
      `${canonicalBase}.period`,
      `${sourceBase}.period`,
      RESUME_PDF,
      'required',
    );
    addTextFact(
      facts,
      experience.summary,
      `${canonicalBase}.summary`,
      `${sourceBase}.summary`,
      RESUME_PDF,
      'required',
    );
    collectContentBlocks(
      facts,
      experience.details,
      `${canonicalBase}.details`,
      `${sourceBase}.details`,
      RESUME_PDF,
      'required',
    );
    collectEvidenceLinks(
      facts,
      experience.evidence,
      `${canonicalBase}.evidence`,
      `${sourceBase}.evidence`,
      RESUME_PDF,
      RESUME_PDF,
      'optional',
    );
  }

  for (const {
    item: achievement,
    sourceIndex,
  } of orderedWithSourceIndex(source.achievements)) {
    const canonicalBase =
      `profile.achievements[id=${achievement.id}]` as FactCanonicalPath;
    const sourceBase = `profile.achievements[${sourceIndex}]`;

    addTextFact(
      facts,
      achievement.title,
      `${canonicalBase}.title`,
      `${sourceBase}.title`,
      RESUME_PDF,
      'required',
    );
    if (achievement.period !== undefined) {
      addPeriodFact(
        facts,
        achievement.period,
        `${canonicalBase}.period`,
        `${sourceBase}.period`,
        RESUME_PDF,
        'optional',
      );
    }
    addTextFact(
      facts,
      achievement.summary,
      `${canonicalBase}.summary`,
      `${sourceBase}.summary`,
      RESUME_PDF,
      'required',
    );
    collectContentBlocks(
      facts,
      achievement.details,
      `${canonicalBase}.details`,
      `${sourceBase}.details`,
      RESUME_PDF,
      'required',
    );
    collectEvidenceLinks(
      facts,
      achievement.evidence,
      `${canonicalBase}.evidence`,
      `${sourceBase}.evidence`,
      RESUME_PDF,
      RESUME_PDF,
      'optional',
    );
  }

  for (const {
    item: project,
    sourceIndex,
  } of orderedWithSourceIndex(source.projects)) {
    const canonicalBase =
      `profile.projects[id=${project.id}]` as FactCanonicalPath;
    const sourceBase = `profile.projects[${sourceIndex}]`;

    addTextFact(
      facts,
      project.title,
      `${canonicalBase}.title`,
      `${sourceBase}.title`,
      RESUME_PORTFOLIO_METADATA_PDF,
      'required',
    );
    if (project.period !== undefined) {
      addPeriodFact(
        facts,
        project.period,
        `${canonicalBase}.period`,
        `${sourceBase}.period`,
        RESUME_PORTFOLIO_PDF,
        'optional',
      );
    }
    addTextFact(
      facts,
      project.outcomeSummary,
      `${canonicalBase}.outcomeSummary`,
      `${sourceBase}.outcomeSummary`,
      RESUME_PORTFOLIO_METADATA_PDF,
      'required',
    );
    collectContentBlocks(
      facts,
      project.problem,
      `${canonicalBase}.problem`,
      `${sourceBase}.problem`,
      PORTFOLIO,
      'required',
    );
    collectContentBlocks(
      facts,
      project.role,
      `${canonicalBase}.role`,
      `${sourceBase}.role`,
      PORTFOLIO,
      'required',
    );
    collectContentBlocks(
      facts,
      project.keyDecisions,
      `${canonicalBase}.keyDecisions`,
      `${sourceBase}.keyDecisions`,
      PORTFOLIO,
      'required',
    );
    collectContentBlocks(
      facts,
      project.architecture,
      `${canonicalBase}.architecture`,
      `${sourceBase}.architecture`,
      PORTFOLIO,
      'required',
    );
    collectContentBlocks(
      facts,
      project.outcomes,
      `${canonicalBase}.outcomes`,
      `${sourceBase}.outcomes`,
      PORTFOLIO,
      'required',
    );
    collectContentBlocks(
      facts,
      project.lessons,
      `${canonicalBase}.lessons`,
      `${sourceBase}.lessons`,
      PORTFOLIO,
      'required',
    );
    collectEvidenceLinks(
      facts,
      project.evidence,
      `${canonicalBase}.evidence`,
      `${sourceBase}.evidence`,
      PORTFOLIO,
      PORTFOLIO_METADATA,
      'optional',
    );
  }

  for (const {
    item: education,
    sourceIndex,
  } of orderedWithSourceIndex(source.education)) {
    const canonicalBase =
      `profile.education[id=${education.id}]` as FactCanonicalPath;
    const sourceBase = `profile.education[${sourceIndex}]`;

    addTextFact(
      facts,
      education.title,
      `${canonicalBase}.title`,
      `${sourceBase}.title`,
      RESUME_PDF,
      'optional',
    );
    if (education.subtitle !== undefined) {
      addTextFact(
        facts,
        education.subtitle,
        `${canonicalBase}.subtitle`,
        `${sourceBase}.subtitle`,
        RESUME_PDF,
        'optional',
      );
    }
    if (education.period !== undefined) {
      addPeriodFact(
        facts,
        education.period,
        `${canonicalBase}.period`,
        `${sourceBase}.period`,
        RESUME_PDF,
        'optional',
      );
    }
    collectContentBlocks(
      facts,
      education.details,
      `${canonicalBase}.details`,
      `${sourceBase}.details`,
      RESUME_PDF,
      'optional',
    );
    collectEvidenceLinks(
      facts,
      education.evidence,
      `${canonicalBase}.evidence`,
      `${sourceBase}.evidence`,
      RESUME_PDF,
      RESUME_PDF,
      'optional',
    );
  }

  for (const {
    item: certification,
    sourceIndex,
  } of orderedWithSourceIndex(source.certifications)) {
    const canonicalBase =
      `profile.certifications[id=${certification.id}]` as FactCanonicalPath;
    const sourceBase = `profile.certifications[${sourceIndex}]`;

    addTextFact(
      facts,
      certification.title,
      `${canonicalBase}.title`,
      `${sourceBase}.title`,
      RESUME_PDF,
      'optional',
    );
    if (certification.issuer !== undefined) {
      addTextFact(
        facts,
        certification.issuer,
        `${canonicalBase}.issuer`,
        `${sourceBase}.issuer`,
        RESUME_PDF,
        'optional',
      );
    }
    if (certification.period !== undefined) {
      addPeriodFact(
        facts,
        certification.period,
        `${canonicalBase}.period`,
        `${sourceBase}.period`,
        RESUME_PDF,
        'optional',
      );
    }
    collectContentBlocks(
      facts,
      certification.details,
      `${canonicalBase}.details`,
      `${sourceBase}.details`,
      RESUME_PDF,
      'optional',
    );
    collectEvidenceLinks(
      facts,
      certification.evidence,
      `${canonicalBase}.evidence`,
      `${sourceBase}.evidence`,
      RESUME_PDF,
      RESUME_PDF,
      'optional',
    );
  }

  return Object.freeze(facts);
}

export function validateFactApproval(
  profile: ValidatedProfile,
  review: FactApprovalReview,
): ValidationResult<FactApprovedProfile> {
  if (!hasValidatedProfileCapability(profile)) {
    return failure([
      createValidationIssue('approval.status', 'profile.facts'),
    ]);
  }

  const materializedFacts = collectMaterializedFacts(profile);
  const shapeResult = validateReviewShape(review);

  if (!shapeResult.ok) {
    return failure(shapeResult.issues);
  }

  const { inventory, productionDiff, receipt } = review;
  const issues: ValidationIssue[] = [];

  validateReviewIdentity(
    inventory,
    productionDiff,
    review.materializedProfileDigest,
    receipt,
    issues,
  );
  validateInventoryUniqueness(inventory.records, issues);
  validateFactCorrespondence(materializedFacts, inventory.records, issues);

  const finalIssues = sortAndDedupeIssues(issues);
  if (finalIssues.length > 0) {
    return failure(finalIssues);
  }

  const approval = deepFreeze({
    schemaVersion: receipt.schemaVersion,
    receiptId: receipt.receiptId,
    inventoryRevision: receipt.inventoryRevision,
    inventoryDigest: receipt.inventoryDigest,
    productionDiffRevision: receipt.productionDiffRevision,
    productionDiffDigest: receipt.productionDiffDigest,
    approvedRecordsDigest: receipt.approvedRecordsDigest,
    materializedProfileDigest: receipt.materializedProfileDigest,
    decision: receipt.decision,
    decisionAuditId: receipt.decisionAuditId,
    decisionRecordedAt: receipt.decisionRecordedAt,
  }) as VerifiedFactApproval;
  const approvedProfile = Object.freeze({
    profile,
    approval,
  }) as FactApprovedProfile;
  VERIFIED_FACT_APPROVAL_CAPABILITIES.add(approvedProfile);

  return Object.freeze({
    ok: true,
    value: approvedProfile,
  });
}

/**
 * Runtime capability check for production C01/C03/C11 consumers.
 *
 * A structurally identical object, clone, proxy or deserialized value is not a
 * capability. Only the exact object returned by a successful
 * `validateFactApproval` call is registered.
 *
 * @internal
 */
export function hasVerifiedFactApprovalCapability(
  candidate: unknown,
): candidate is FactApprovedProfile {
  try {
    return (
      candidate !== null &&
      typeof candidate === 'object' &&
      VERIFIED_FACT_APPROVAL_CAPABILITIES.has(candidate)
    );
  } catch {
    return false;
  }
}

function validateReviewShape(
  review: FactApprovalReview,
): ValidationResult<FactApprovalReview> {
  const issues: ValidationIssue[] = [];

  if (!isObject(review)) {
    issues.push(createValidationIssue('approval.record.missing', 'profile.facts'));
    return failure(sortAndDedupeIssues(issues));
  }

  if (!hasExactKeys(review, REVIEW_KEYS)) {
    issues.push(createValidationIssue('approval.status', 'profile.facts'));
  }

  const inventory = review.inventory;
  const productionDiff = review.productionDiff;
  const receipt = review.receipt;

  if (!isObject(inventory)) {
    issues.push(createValidationIssue('approval.record.missing', 'profile.facts'));
  } else {
    validateInventoryShape(inventory, issues);
  }

  if (!isObject(productionDiff)) {
    issues.push(createValidationIssue('approval.record.missing', 'profile.facts'));
  } else {
    validateProductionDiffShape(productionDiff, issues);
  }

  if (!isSha256Digest(review.materializedProfileDigest)) {
    issues.push(createValidationIssue('approval.status', 'profile.facts'));
  }

  if (!isObject(receipt)) {
    issues.push(createValidationIssue('approval.record.missing', 'profile.facts'));
  } else {
    validateReceiptShape(receipt, issues);
  }

  const finalIssues = sortAndDedupeIssues(issues);
  if (finalIssues.length > 0) {
    return failure(finalIssues);
  }

  return Object.freeze({ ok: true, value: review });
}

function validateInventoryShape(
  inventory: Record<PropertyKey, unknown>,
  issues: ValidationIssue[],
): void {
  if (
    !hasExactKeys(inventory, INVENTORY_KEYS) ||
    inventory.schemaVersion !== FACT_APPROVAL_SCHEMA_VERSION ||
    !isCanonicalIdentifier(inventory.revision) ||
    !isSha256Digest(inventory.digest) ||
    !isSha256Digest(inventory.approvedRecordsDigest)
  ) {
    issues.push(createValidationIssue('approval.status', 'profile.facts'));
  }

  if (!Array.isArray(inventory.records)) {
    issues.push(createValidationIssue('approval.status', 'profile.facts'));
    return;
  }

  inventory.records.forEach((record, index) => {
    validateReviewRecordShape(record, index, issues);
  });
}

function validateReviewRecordShape(
  candidate: unknown,
  index: number,
  issues: ValidationIssue[],
): void {
  const basePath = `profile.facts[${index}]`;
  if (!isObject(candidate)) {
    issues.push(createValidationIssue('approval.status', basePath));
    return;
  }

  if (!hasExactKeys(candidate, REVIEW_RECORD_KEYS)) {
    issues.push(createValidationIssue('approval.status', basePath));
  }

  if (
    typeof candidate.factId !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.factId)
  ) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.factId`),
    );
  }

  if (
    typeof candidate.canonicalPath !== 'string' ||
    !CANONICAL_PATH_PATTERN.test(candidate.canonicalPath)
  ) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.canonicalPath`),
    );
  }

  if (!isFactReviewValue(candidate.normalizedValue)) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.normalizedValue`),
    );
  }

  if (!isFactReviewEvidence(candidate.evidence)) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.evidence`),
    );
  }

  if (!isCanonicalSurfaceSet(candidate.targetSurfaces)) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.targetSurfaces`),
    );
  }

  if (
    candidate.requirement !== 'required' &&
    candidate.requirement !== 'optional'
  ) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.requirement`),
    );
  }

  if (
    candidate.status !== 'Approved' &&
    candidate.status !== 'Excluded' &&
    candidate.status !== 'Pending'
  ) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.status`),
    );
  }

  if (
    !isDecisionRecordForStatus(candidate.decisionRecord, candidate.status)
  ) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.decisionRecord`),
    );
  }

  if (
    isFactReviewValue(candidate.normalizedValue) &&
    (candidate.normalizedValue.kind === 'github-url' ||
      candidate.normalizedValue.kind === 'external-url') &&
    (!isObject(candidate.evidence) ||
      candidate.evidence.kind !== 'public-source' ||
      candidate.evidence.expectedDestination !==
        candidate.normalizedValue.value)
  ) {
    issues.push(
      createValidationIssue('approval.status', `${basePath}.evidence`),
    );
  }
}

function validateProductionDiffShape(
  productionDiff: Record<PropertyKey, unknown>,
  issues: ValidationIssue[],
): void {
  if (
    !hasExactKeys(productionDiff, PRODUCTION_DIFF_KEYS) ||
    productionDiff.schemaVersion !== FACT_APPROVAL_SCHEMA_VERSION ||
    !isCanonicalIdentifier(productionDiff.revision) ||
    !isSha256Digest(productionDiff.digest) ||
    !isCanonicalIdentifier(productionDiff.inventoryRevision) ||
    !isSha256Digest(productionDiff.inventoryDigest) ||
    !isSha256Digest(productionDiff.approvedRecordsDigest) ||
    !isSha256Digest(productionDiff.materializedProfileDigest)
  ) {
    issues.push(createValidationIssue('approval.status', 'profile.facts'));
  }
}

function validateReceiptShape(
  receipt: Record<PropertyKey, unknown>,
  issues: ValidationIssue[],
): void {
  if (
    !hasExactKeys(receipt, RECEIPT_KEYS) ||
    receipt.schemaVersion !== FACT_APPROVAL_SCHEMA_VERSION ||
    !isCanonicalIdentifier(receipt.receiptId) ||
    !isCanonicalIdentifier(receipt.inventoryRevision) ||
    !isSha256Digest(receipt.inventoryDigest) ||
    !isCanonicalIdentifier(receipt.productionDiffRevision) ||
    !isSha256Digest(receipt.productionDiffDigest) ||
    !isSha256Digest(receipt.approvedRecordsDigest) ||
    !isSha256Digest(receipt.materializedProfileDigest) ||
    receipt.decision !== 'Approved' ||
    !isCanonicalIdentifier(receipt.decisionAuditId) ||
    !isTimestamp(receipt.decisionRecordedAt)
  ) {
    issues.push(createValidationIssue('approval.status', 'profile.facts'));
  }
}

function validateReviewIdentity(
  inventory: FactReviewInventory,
  productionDiff: FactProductionDiffIdentity,
  materializedProfileDigest: string,
  receipt: FactApprovalReceipt,
  issues: ValidationIssue[],
): void {
  if (
    productionDiff.inventoryRevision !== inventory.revision ||
    receipt.inventoryRevision !== inventory.revision ||
    productionDiff.inventoryDigest !== inventory.digest ||
    receipt.inventoryDigest !== inventory.digest ||
    receipt.productionDiffRevision !== productionDiff.revision ||
    receipt.productionDiffDigest !== productionDiff.digest ||
    productionDiff.approvedRecordsDigest !== inventory.approvedRecordsDigest ||
    receipt.approvedRecordsDigest !== inventory.approvedRecordsDigest ||
    productionDiff.materializedProfileDigest !== materializedProfileDigest ||
    receipt.materializedProfileDigest !== materializedProfileDigest
  ) {
    issues.push(
      createValidationIssue('approval.value-mismatch', 'profile.facts'),
    );
  }
}

function validateInventoryUniqueness(
  records: readonly FactReviewRecord[],
  issues: ValidationIssue[],
): void {
  const factIdLocations = new Map<string, number[]>();
  const pathLocations = new Map<string, number[]>();

  records.forEach((record, index) => {
    appendLocation(factIdLocations, record.factId, index);
    appendLocation(pathLocations, record.canonicalPath, index);
  });

  addDuplicateRecordIssues(factIdLocations, 'factId', issues);
  addDuplicateRecordIssues(pathLocations, 'canonicalPath', issues);
}

function validateFactCorrespondence(
  materializedFacts: readonly MaterializedFact[],
  records: readonly FactReviewRecord[],
  issues: ValidationIssue[],
): void {
  const recordsByFactId = groupRecords(records, 'factId');
  const recordsByPath = groupRecords(records, 'canonicalPath');
  const materializedByFactId = new Map<string, MaterializedFact>(
    materializedFacts.map((fact) => [fact.factId, fact] as const),
  );
  const materializedByPath = new Map(
    materializedFacts.map((fact) => [fact.canonicalPath, fact] as const),
  );

  for (const fact of materializedFacts) {
    const factIdRecords = recordsByFactId.get(fact.factId) ?? [];
    if (factIdRecords.length === 0) {
      issues.push(
        createValidationIssue('approval.record.missing', fact.sourcePath),
      );
      continue;
    }
    if (factIdRecords.length > 1) {
      continue;
    }

    const record = factIdRecords[0];
    const pathRecords = recordsByPath.get(fact.canonicalPath) ?? [];
    if (pathRecords.length > 1) {
      continue;
    }
    if (
      record.canonicalPath !== fact.canonicalPath ||
      pathRecords[0]?.factId !== fact.factId
    ) {
      issues.push(
        createValidationIssue('approval.production-extra', fact.sourcePath),
      );
      continue;
    }

    if (record.status !== 'Approved') {
      issues.push(createValidationIssue('approval.status', fact.sourcePath));
    }

    if (
      !factReviewValuesEqual(record.normalizedValue, fact.normalizedValue) ||
      !surfaceSetsEqual(record.targetSurfaces, fact.targetSurfaces) ||
      record.requirement !== fact.requirement
    ) {
      issues.push(
        createValidationIssue('approval.value-mismatch', fact.sourcePath),
      );
    }
  }

  records.forEach((record, index) => {
    const recordPath = `profile.facts[${index}]`;
    const matchingFact = materializedByFactId.get(record.factId);
    const matchingPathFact = materializedByPath.get(record.canonicalPath);

    if (
      record.requirement === 'required' &&
      record.status !== 'Approved' &&
      (matchingFact === undefined ||
        matchingPathFact === undefined ||
        matchingFact.canonicalPath !== record.canonicalPath ||
        matchingPathFact.factId !== record.factId)
    ) {
      issues.push(
        createValidationIssue('approval.status', `${recordPath}.status`),
      );
    }

    if (
      (recordsByFactId.get(record.factId)?.length ?? 0) > 1 ||
      (recordsByPath.get(record.canonicalPath)?.length ?? 0) > 1
    ) {
      return;
    }

    if (
      record.status === 'Approved' &&
      (matchingFact === undefined ||
        matchingPathFact === undefined ||
        matchingFact.canonicalPath !== record.canonicalPath ||
        matchingPathFact.factId !== record.factId)
    ) {
      issues.push(
        createValidationIssue('approval.record.missing', recordPath),
      );
    }
  });

  const hasAmbiguousRecord = [...recordsByFactId.values()].some(
    (group) => group.length > 1,
  ) || [...recordsByPath.values()].some((group) => group.length > 1);
  if (hasAmbiguousRecord) {
    return;
  }

  const inventoryPositions = new Map(
    records.map((record, index) => [record, index] as const),
  );
  const materializedRecordPositions: number[] = [];

  for (const fact of materializedFacts) {
    const record = recordsByFactId.get(fact.factId)?.[0];
    const position = record === undefined
      ? undefined
      : inventoryPositions.get(record);
    if (
      record === undefined ||
      position === undefined ||
      record.canonicalPath !== fact.canonicalPath ||
      recordsByPath.get(fact.canonicalPath)?.[0]?.factId !== fact.factId
    ) {
      return;
    }
    materializedRecordPositions.push(position);
  }

  for (let index = 1; index < materializedRecordPositions.length; index += 1) {
    if (
      materializedRecordPositions[index - 1] >
      materializedRecordPositions[index]
    ) {
      issues.push(
        createValidationIssue(
          'approval.value-mismatch',
          `profile.facts[${materializedRecordPositions[index]}]`,
        ),
      );
    }
  }
}

function addTextFact<Value extends string>(
  facts: MaterializedFact[],
  fact: PublicFact<Value>,
  canonicalPathValue: string,
  sourcePathValue: string,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  addFact(
    facts,
    fact.factId,
    canonicalPathValue,
    sourcePathValue,
    Object.freeze({ kind: 'text', value: fact.value }),
    targetSurfaces,
    requirement,
  );
}

function addEmailFact<Value extends string>(
  facts: MaterializedFact[],
  fact: PublicFact<Value>,
  canonicalPathValue: string,
  sourcePathValue: string,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  addFact(
    facts,
    fact.factId,
    canonicalPathValue,
    sourcePathValue,
    Object.freeze({ kind: 'email', value: fact.value }),
    targetSurfaces,
    requirement,
  );
}

function addGitHubFact<Value extends string>(
  facts: MaterializedFact[],
  fact: PublicFact<Value>,
  canonicalPathValue: string,
  sourcePathValue: string,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  addFact(
    facts,
    fact.factId,
    canonicalPathValue,
    sourcePathValue,
    Object.freeze({ kind: 'github-url', value: fact.value }),
    targetSurfaces,
    requirement,
  );
}

function addPeriodFact(
  facts: MaterializedFact[],
  fact: PublicFact<Period>,
  canonicalPathValue: string,
  sourcePathValue: string,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  addFact(
    facts,
    fact.factId,
    canonicalPathValue,
    sourcePathValue,
    deepFreeze({
      kind: 'period',
      value: clonePeriod(fact.value),
    }),
    targetSurfaces,
    requirement,
  );
}

function addLinkDestinationFact(
  facts: MaterializedFact[],
  fact: PublicFact<LinkDestination>,
  canonicalPathValue: string,
  sourcePathValue: string,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  const normalizedValue: ExternalUrlReviewValue | InternalPathReviewValue =
    fact.value.tag === 'external'
      ? Object.freeze({
          kind: 'external-url',
          value: fact.value.value,
        })
      : Object.freeze({
          kind: 'internal-path',
          value: fact.value.value,
        });

  addFact(
    facts,
    fact.factId,
    canonicalPathValue,
    sourcePathValue,
    normalizedValue,
    targetSurfaces,
    requirement,
  );
}

function addFact(
  facts: MaterializedFact[],
  factId: FactId,
  canonicalPathValue: string,
  sourcePathValue: string,
  normalizedValue: DeepReadonly<FactReviewValue>,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  facts.push(
    Object.freeze({
      factId,
      canonicalPath: factCanonicalPath(canonicalPathValue),
      sourcePath: profilePath(sourcePathValue),
      normalizedValue,
      targetSurfaces,
      requirement,
    }),
  );
}

function collectContentBlocks(
  facts: MaterializedFact[],
  blocks: readonly ContentBlock[],
  canonicalBase: string,
  sourceBase: string,
  targetSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  blocks.forEach((block, blockIndex) => {
    if (block.tag === 'paragraph') {
      addTextFact(
        facts,
        block.text,
        `${canonicalBase}[${blockIndex}].text`,
        `${sourceBase}[${blockIndex}].text`,
        targetSurfaces,
        requirement,
      );
      return;
    }

    block.items.forEach((item, itemIndex) => {
      addTextFact(
        facts,
        item,
        `${canonicalBase}[${blockIndex}].items[${itemIndex}]`,
        `${sourceBase}[${blockIndex}].items[${itemIndex}]`,
        targetSurfaces,
        requirement,
      );
    });
  });
}

function collectEvidenceLinks(
  facts: MaterializedFact[],
  links: readonly EvidenceLink[],
  canonicalBase: string,
  sourceBase: string,
  labelSurfaces: readonly FactTargetSurface[],
  destinationSurfaces: readonly FactTargetSurface[],
  requirement: FactRequirement,
): void {
  for (const {
    item: link,
    sourceIndex,
  } of orderedWithSourceIndex(links)) {
    const canonicalLinkBase = `${canonicalBase}[id=${link.id}]`;
    const sourceLinkBase = `${sourceBase}[${sourceIndex}]`;

    addTextFact(
      facts,
      link.label,
      `${canonicalLinkBase}.label`,
      `${sourceLinkBase}.label`,
      labelSurfaces,
      requirement,
    );
    addLinkDestinationFact(
      facts,
      link.destination,
      `${canonicalLinkBase}.destination`,
      `${sourceLinkBase}.destination`,
      destinationSurfaces,
      requirement,
    );
  }
}

function orderedWithSourceIndex<
  Value extends Readonly<{ id: string; order: number }>,
>(
  values: readonly Value[],
): readonly Readonly<{ item: Value; sourceIndex: number }>[] {
  return values
    .map((item, sourceIndex) => ({ item, sourceIndex }))
    .sort((left, right) => {
      const orderDifference = left.item.order - right.item.order;
      if (orderDifference !== 0) {
        return orderDifference;
      }
      if (left.item.id < right.item.id) {
        return -1;
      }
      if (left.item.id > right.item.id) {
        return 1;
      }
      return left.sourceIndex - right.sourceIndex;
    });
}

export function factCanonicalPath(value: string): FactCanonicalPath {
  if (!CANONICAL_PATH_PATTERN.test(value)) {
    throw new TypeError('Invalid production-logical fact path.');
  }
  return value as FactCanonicalPath;
}

function surfaceSet(
  ...surfaces: readonly FactTargetSurface[]
): readonly FactTargetSurface[] {
  const selected = new Set(surfaces);
  return Object.freeze(
    FACT_TARGET_SURFACES.filter((surface) => selected.has(surface)),
  );
}

function isCanonicalSurfaceSet(
  value: unknown,
): value is readonly FactTargetSurface[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  if (
    !value.every((surface) =>
      FACT_TARGET_SURFACES.includes(surface as FactTargetSurface),
    )
  ) {
    return false;
  }

  const canonical = surfaceSet(...(value as FactTargetSurface[]));
  return surfaceSetsEqual(value as FactTargetSurface[], canonical);
}

function surfaceSetsEqual(
  left: readonly FactTargetSurface[],
  right: readonly FactTargetSurface[],
): boolean {
  return (
    left.length === right.length &&
    left.every((surface, index) => surface === right[index])
  );
}

function isFactReviewValue(value: unknown): value is FactReviewValue {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ['kind', 'value']) ||
    typeof value.kind !== 'string'
  ) {
    return false;
  }

  if (
    value.kind === 'text' ||
    value.kind === 'email' ||
    value.kind === 'github-url' ||
    value.kind === 'external-url' ||
    value.kind === 'internal-path'
  ) {
    return isCanonicalPublicString(value.value);
  }

  return value.kind === 'period' && isCanonicalPeriod(value.value);
}

function isCanonicalPeriod(value: unknown): value is Period {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ['start', 'end']) ||
    !isDatePoint(value.start)
  ) {
    return false;
  }

  if (!isObject(value.end) || typeof value.end.tag !== 'string') {
    return false;
  }

  return value.end.tag === 'present'
    ? hasExactKeys(value.end, ['tag'])
    : isDatePoint(value.end);
}

function isDatePoint(
  value: unknown,
): value is Period['start'] {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ['tag', 'value']) ||
    typeof value.tag !== 'string' ||
    typeof value.value !== 'string'
  ) {
    return false;
  }

  if (value.tag === 'year') {
    return /^\d{4}$/.test(value.value);
  }

  return (
    value.tag === 'year-month' &&
    /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value.value)
  );
}

function isFactReviewEvidence(value: unknown): value is FactReviewEvidence {
  if (
    !isObject(value) ||
    !isCanonicalPublicString(value.reference) ||
    typeof value.kind !== 'string'
  ) {
    return false;
  }

  if (value.kind === 'user-provided') {
    return hasExactKeys(value, ['kind', 'reference']);
  }

  return (
    value.kind === 'public-source' &&
    hasExactKeys(value, [
      'kind',
      'reference',
      'expectedDestination',
      'verifier',
      'checkedAt',
    ]) &&
    isCanonicalPublicString(value.expectedDestination) &&
    isCanonicalPublicString(value.verifier) &&
    isTimestamp(value.checkedAt)
  );
}

function isDecisionRecordForStatus(
  value: unknown,
  status: unknown,
): value is FactDecisionRecord | null {
  if (status === 'Pending') {
    return value === null;
  }

  if (status !== 'Approved' && status !== 'Excluded') {
    return false;
  }

  return (
    isObject(value) &&
    hasExactKeys(value, [
      'decision',
      'auditInteractionId',
      'recordedAt',
    ]) &&
    value.decision === status &&
    isCanonicalIdentifier(value.auditInteractionId) &&
    isTimestamp(value.recordedAt)
  );
}

function factReviewValuesEqual(
  left: FactReviewValue,
  right: DeepReadonly<FactReviewValue>,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === 'period' && right.kind === 'period') {
    return (
      left.value.start.tag === right.value.start.tag &&
      left.value.start.value === right.value.start.value &&
      left.value.end.tag === right.value.end.tag &&
      (left.value.end.tag === 'present' ||
        (right.value.end.tag !== 'present' &&
          left.value.end.value === right.value.end.value))
    );
  }

  return (
    left.kind !== 'period' &&
    right.kind !== 'period' &&
    left.value === right.value
  );
}

function clonePeriod(period: Period): Period {
  return {
    start: {
      tag: period.start.tag,
      value: period.start.value,
    },
    end:
      period.end.tag === 'present'
        ? { tag: 'present' }
        : {
            tag: period.end.tag,
            value: period.end.value,
          },
  } as Period;
}

function groupRecords<Key extends 'factId' | 'canonicalPath'>(
  records: readonly FactReviewRecord[],
  key: Key,
): Map<FactReviewRecord[Key], FactReviewRecord[]> {
  const groups = new Map<FactReviewRecord[Key], FactReviewRecord[]>();
  for (const record of records) {
    const current = groups.get(record[key]);
    if (current === undefined) {
      groups.set(record[key], [record]);
    } else {
      current.push(record);
    }
  }

  return groups;
}

function appendLocation(
  locations: Map<string, number[]>,
  key: string,
  index: number,
): void {
  const current = locations.get(key);
  if (current === undefined) {
    locations.set(key, [index]);
  } else {
    current.push(index);
  }
}

function addDuplicateRecordIssues(
  locations: ReadonlyMap<string, readonly number[]>,
  field: 'factId' | 'canonicalPath',
  issues: ValidationIssue[],
): void {
  for (const indices of locations.values()) {
    if (indices.length < 2) {
      continue;
    }

    for (const index of indices) {
      issues.push(
        createValidationIssue(
          'approval.status',
          `profile.facts[${index}].${field}`,
        ),
      );
    }
  }
}

function isCanonicalPublicString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    normalizeText(value) === value
  );
}

function isCanonicalIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\n') &&
    normalizeText(value) === value
  );
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function isObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<PropertyKey, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort(compareAscii);
  const canonicalExpected = [...expected].sort(compareAscii);
  return (
    actual.length === canonicalExpected.length &&
    actual.every((key, index) => key === canonicalExpected[index])
  );
}

function compareAscii(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function failure<Value>(
  issues: readonly ValidationIssue[],
): ValidationResult<Value> {
  return Object.freeze({
    ok: false,
    issues: issues as NonEmptyReadonlyArray<ValidationIssue>,
  });
}

function deepFreeze<Value>(value: Value): DeepReadonly<Value> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value as DeepReadonly<Value>;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value) as DeepReadonly<Value>;
}
