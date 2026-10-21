import { describe, expect, test } from 'vitest';
import {
  FACT_APPROVAL_SCHEMA_VERSION,
  collectMaterializedFacts,
  validateFactApproval,
} from '../../src/lib/profile/fact-approval.js';
import type { FactApprovalReview, FactReviewRecord } from '../../src/lib/profile/fact-approval.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import type { ProfileData, ValidatedProfile } from '../../src/lib/profile/types.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

/**
 * BR2.1 for the approval chain: an inventory record may carry a full-date
 * period, and a malformed one fails the record shape with the existing code.
 * The review is structural only; its digests and decision are synthetic.
 */
const SYNTHETIC_TIMESTAMP = '2026-10-21T00:00:00Z';
const PERIOD_FACT_ID = 'experience-period';

function datedProfile(): ValidatedProfile {
  const candidate = cloneProfileFixture() as unknown as {
    experiences: Array<{ period: { value: unknown } }>;
  };
  candidate.experiences[0]!.period.value = {
    start: { tag: 'date', value: '2025-09-06' },
    end: { tag: 'date', value: '2027-09-06' },
  };
  const result = validateProfile(candidate as unknown as ProfileData);
  if (!result.ok) {
    throw new Error(result.issues.map(({ code, path }) => `${code}@${path}`).join(', '));
  }
  return result.value;
}

/** URL facts need a checked public source; every other fact is user-provided. */
function syntheticEvidence(
  value: Readonly<{ kind: string; value: unknown }>
): FactReviewRecord['evidence'] {
  if (value.kind === 'github-url' || value.kind === 'external-url') {
    return {
      kind: 'public-source',
      reference: 'synthetic-unit-source',
      expectedDestination: String(value.value),
      verifier: 'synthetic-unit-verifier',
      checkedAt: SYNTHETIC_TIMESTAMP,
    } as FactReviewRecord['evidence'];
  }
  return {
    kind: 'user-provided',
    reference: 'synthetic-unit-input',
  } as FactReviewRecord['evidence'];
}

function approvedReview(profile: ValidatedProfile): FactApprovalReview {
  const records: FactReviewRecord[] = collectMaterializedFacts(profile).map((fact) => ({
    factId: String(fact.factId),
    canonicalPath: fact.canonicalPath,
    normalizedValue: structuredClone(fact.normalizedValue) as FactReviewRecord['normalizedValue'],
    evidence: syntheticEvidence(fact.normalizedValue),
    targetSurfaces: fact.targetSurfaces,
    requirement: fact.requirement,
    status: 'Approved',
    decisionRecord: {
      decision: 'Approved',
      auditInteractionId: 'synthetic-unit-decision',
      recordedAt: SYNTHETIC_TIMESTAMP,
    },
  }));
  const digest = (digit: string) => digit.repeat(64);
  return {
    inventory: {
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      revision: 'synthetic-unit-inventory',
      digest: digest('1'),
      approvedRecordsDigest: digest('2'),
      records,
    },
    productionDiff: {
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      revision: 'synthetic-unit-diff',
      digest: digest('4'),
      inventoryRevision: 'synthetic-unit-inventory',
      inventoryDigest: digest('1'),
      approvedRecordsDigest: digest('2'),
      materializedProfileDigest: digest('3'),
    },
    materializedProfileDigest: digest('3'),
    receipt: {
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      receiptId: 'synthetic-unit-receipt',
      inventoryRevision: 'synthetic-unit-inventory',
      inventoryDigest: digest('1'),
      productionDiffRevision: 'synthetic-unit-diff',
      productionDiffDigest: digest('4'),
      approvedRecordsDigest: digest('2'),
      materializedProfileDigest: digest('3'),
      decision: 'Approved',
      decisionAuditId: 'synthetic-unit-decision',
      decisionRecordedAt: SYNTHETIC_TIMESTAMP,
    },
  } as unknown as FactApprovalReview;
}

function withPeriodStart(review: FactApprovalReview, value: string): FactApprovalReview {
  const copy = structuredClone(review) as unknown as {
    inventory: {
      records: Array<{ factId: string; normalizedValue: { value: { start: { value: string } } } }>;
    };
  };
  const record = copy.inventory.records.find(({ factId }) => factId === PERIOD_FACT_ID);
  if (record === undefined) throw new Error('expected the experience period record');
  record.normalizedValue.value.start.value = value;
  return copy as unknown as FactApprovalReview;
}

function periodRecordIndex(review: FactApprovalReview): number {
  return review.inventory.records.findIndex(({ factId }) => factId === PERIOD_FACT_ID);
}

describe('fact approval with full-date periods (BR2.1)', () => {
  test('materializes a full-date period as its stored ISO value', () => {
    const fact = collectMaterializedFacts(datedProfile()).find(
      ({ factId }) => factId === PERIOD_FACT_ID
    );
    expect(fact?.normalizedValue).toEqual({
      kind: 'period',
      value: {
        start: { tag: 'date', value: '2025-09-06' },
        end: { tag: 'date', value: '2027-09-06' },
      },
    });
  });

  test('approves an inventory whose period record holds full dates', () => {
    const profile = datedProfile();
    const result = validateFactApproval(profile, approvedReview(profile));
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  test.each(['2025-9-6', '2025-09-31', '2026-02-29', '2025.09.06'])(
    'refuses a period record whose full date is %s',
    (value) => {
      const profile = datedProfile();
      const review = withPeriodStart(approvedReview(profile), value);
      const result = validateFactApproval(profile, review);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a refused review');
      expect(result.issues.map(({ code, path }) => `${code}@${path}`)).toContain(
        `approval.status@profile.facts[${periodRecordIndex(review)}].normalizedValue`
      );
    }
  );
});
