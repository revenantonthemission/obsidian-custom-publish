import { fc } from '@fast-check/vitest';

import {
  FACT_APPROVAL_SCHEMA_VERSION,
  collectMaterializedFacts,
} from '../../../../src/lib/profile/fact-approval.js';
import type {
  FactApprovalReview,
  FactReviewEvidence,
  FactReviewRecord,
  MaterializedFact,
} from '../../../../src/lib/profile/fact-approval.js';
import type {
  ProfileIssueCode,
  ProfilePath,
  ValidatedProfile,
} from '../../../../src/lib/profile/types.js';
import { validatedProfileArbitrary } from './profile.js';

export interface SyntheticFactApprovalCase {
  readonly profile: ValidatedProfile;
  readonly facts: readonly MaterializedFact[];
  readonly review: FactApprovalReview;
}

export interface InvalidSyntheticFactApprovalCase
  extends SyntheticFactApprovalCase {
  readonly label: 'pending' | 'excluded' | 'missing' | 'value-mismatch';
  readonly expected: Readonly<{
    code: ProfileIssueCode;
    path: ProfilePath;
  }>;
}

export const syntheticFactApprovalArbitrary =
  validatedProfileArbitrary.map(buildSyntheticFactApproval);

export const invalidSyntheticFactApprovalArbitrary = fc
  .tuple(
    syntheticFactApprovalArbitrary,
    fc.constantFrom<InvalidSyntheticFactApprovalCase['label']>(
      'pending',
      'excluded',
      'missing',
      'value-mismatch',
    ),
  )
  .map(([approvalCase, label]) =>
    mutateSyntheticFactApproval(approvalCase, label),
  );

/**
 * This fixture proves structural record-to-materialized-fact correspondence
 * only. Its generated values and decision metadata are synthetic and do not
 * assert human truth, evidence sufficiency or publication approval.
 */
function buildSyntheticFactApproval(
  profile: ValidatedProfile,
): SyntheticFactApprovalCase {
  const facts = collectMaterializedFacts(profile);
  const records = facts.map((fact) =>
    Object.freeze({
      factId: String(fact.factId),
      canonicalPath: fact.canonicalPath,
      normalizedValue: fact.normalizedValue,
      evidence: syntheticEvidence(fact),
      targetSurfaces: fact.targetSurfaces,
      requirement: fact.requirement,
      status: 'Approved' as const,
      decisionRecord: Object.freeze({
        decision: 'Approved' as const,
        auditInteractionId: 'synthetic-structural-pbt',
        recordedAt: SYNTHETIC_TIMESTAMP,
      }),
    }),
  );

  return Object.freeze({
    profile,
    facts,
    review: createReview(records),
  });
}

function mutateSyntheticFactApproval(
  source: SyntheticFactApprovalCase,
  label: InvalidSyntheticFactApprovalCase['label'],
): InvalidSyntheticFactApprovalCase {
  const review = structuredClone(source.review) as unknown as {
    inventory: {
      records: Array<{
        status: 'Approved' | 'Excluded' | 'Pending';
        decisionRecord:
          | {
              decision: 'Approved' | 'Excluded';
              auditInteractionId: string;
              recordedAt: string;
            }
          | null;
        normalizedValue: {
          kind: string;
          value: unknown;
        };
      }>;
    };
  };
  const selectedFact = source.facts[0]!;

  if (label === 'pending') {
    review.inventory.records[0]!.status = 'Pending';
    review.inventory.records[0]!.decisionRecord = null;
  } else if (label === 'excluded') {
    review.inventory.records[0]!.status = 'Excluded';
    review.inventory.records[0]!.decisionRecord = {
      decision: 'Excluded',
      auditInteractionId: 'synthetic-structural-exclusion',
      recordedAt: SYNTHETIC_TIMESTAMP,
    };
  } else if (label === 'missing') {
    review.inventory.records.splice(0, 1);
  } else {
    const value = review.inventory.records[0]!.normalizedValue;
    value.value = `${String(value.value)}-controlled-mismatch`;
  }

  return Object.freeze({
    label,
    profile: source.profile,
    facts: source.facts,
    review: review as unknown as FactApprovalReview,
    expected: Object.freeze({
      code:
        label === 'missing'
          ? 'approval.record.missing'
          : label === 'value-mismatch'
            ? 'approval.value-mismatch'
            : 'approval.status',
      path: selectedFact.sourcePath,
    }),
  });
}

function syntheticEvidence(
  fact: MaterializedFact,
): FactReviewEvidence {
  if (
    fact.normalizedValue.kind === 'github-url' ||
    fact.normalizedValue.kind === 'external-url'
  ) {
    return Object.freeze({
      kind: 'public-source',
      reference: 'synthetic-structural-source',
      expectedDestination: fact.normalizedValue.value,
      verifier: 'synthetic-structural-verifier',
      checkedAt: SYNTHETIC_TIMESTAMP,
    });
  }

  return Object.freeze({
    kind: 'user-provided',
    reference: 'synthetic-structural-input',
  });
}

function createReview(
  records: readonly FactReviewRecord[],
): FactApprovalReview {
  return Object.freeze({
    inventory: Object.freeze({
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      revision: 'synthetic-structural-inventory-v1',
      digest: INVENTORY_DIGEST,
      approvedRecordsDigest: RECORDS_DIGEST,
      records: Object.freeze(records),
    }),
    productionDiff: Object.freeze({
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      revision: 'synthetic-structural-diff-v1',
      digest: PRODUCTION_DIFF_DIGEST,
      inventoryRevision: 'synthetic-structural-inventory-v1',
      inventoryDigest: INVENTORY_DIGEST,
      approvedRecordsDigest: RECORDS_DIGEST,
      materializedProfileDigest: PROFILE_DIGEST,
    }),
    materializedProfileDigest: PROFILE_DIGEST,
    receipt: Object.freeze({
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      receiptId: 'synthetic-structural-receipt-v1',
      inventoryRevision: 'synthetic-structural-inventory-v1',
      inventoryDigest: INVENTORY_DIGEST,
      productionDiffRevision: 'synthetic-structural-diff-v1',
      productionDiffDigest: PRODUCTION_DIFF_DIGEST,
      approvedRecordsDigest: RECORDS_DIGEST,
      materializedProfileDigest: PROFILE_DIGEST,
      decision: 'Approved',
      decisionAuditId: 'synthetic-structural-decision',
      decisionRecordedAt: SYNTHETIC_TIMESTAMP,
    }),
  });
}

const SYNTHETIC_TIMESTAMP = '2026-01-01T00:00:00Z';
const INVENTORY_DIGEST = '5'.repeat(64);
const RECORDS_DIGEST = '6'.repeat(64);
const PROFILE_DIGEST = '7'.repeat(64);
const PRODUCTION_DIFF_DIGEST = '8'.repeat(64);
