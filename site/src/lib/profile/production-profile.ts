import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';
import receiptDocument from '../../../verification/profile/fact-approval.json' with {
  type: 'json',
};
import { assembleFactApprovedProfile } from './assembly.js';
import {
  collectMaterializedFacts,
  validateFactApproval,
} from './fact-approval.js';
import type {
  FactApprovalReceipt,
  FactApprovalReview,
  FactReviewEvidence,
  FactReviewRecord,
  MaterializedFact,
} from './fact-approval.js';
import { profileData } from './profile-data.js';
import { validateProfile } from './validation.js';
import type {
  ContentBlock,
  EvidenceLink,
  FactApprovedProfileAssembly,
  ProfileData,
  ValidatedProfile,
  ValidationIssue,
} from './types.js';

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

const EXPECTED_RECEIPT = Object.freeze({
  schemaVersion: 1,
  receiptId: 'profile-fact-approval-2026-07-25-r1',
  inventoryRevision: 'profile-facts-r2',
  inventoryDigest:
    '25357f9902858abeafe17a3b3016c43328852ea8dce29453e48cd83da31fa345',
  productionDiffRevision: 'profile-production-diff-r2',
  productionDiffDigest:
    'a4ebc55bd3e3d78ae8d3239abdc81e0a52921d19e1c0c0cb28ea49cbad53c6e1',
  approvedRecordsDigest:
    '356356f9dc5f8b2b93e4d7bf88a3f11a8181f55f1485ed82c8994ae994aa6474',
  materializedProfileDigest:
    '775177b9cd3dd6b662e25a3094d96ba56260084de06d9d527c531481b4c9e15e',
  decision: 'Approved',
  decisionAuditId: 'U1-CG-S14-FACT-APPROVAL-20260725T034431Z',
  decisionRecordedAt: '2026-07-25T03:44:31Z',
} as const satisfies FactApprovalReceipt);

const PUBLIC_SOURCE_CHECKED_AT = '2026-07-25T03:15:19Z';
const PROJECT_FACT_SUFFIXES = [
  'title',
  'outcome-summary',
  'problem-0-text',
  'role-0-text',
  'key-decisions-0-text',
  'architecture-0-text',
  'outcomes-0-text',
  'lessons-0-text',
  'evidence-label',
  'evidence-destination',
] as const;

type EvidenceId = 'E01' | 'E02' | 'E03' | 'E04' | 'E05';

const EVIDENCE_SOURCES = deepFreeze({
  E01: {
    kind: 'user-provided',
    reference:
      'Vault attachment 2025년하반기포트폴리오_조준희.zip의 exported PDF pp. 1–3',
  },
  E02: {
    kind: 'public-source',
    reference: 'https://github.com/revenantonthemission',
    expectedDestination: 'https://github.com/revenantonthemission',
    verifier: 'Codex public-source collector',
    checkedAt: PUBLIC_SOURCE_CHECKED_AT,
  },
  E03: {
    kind: 'public-source',
    reference:
      'https://github.com/revenantonthemission/obsidian-custom-publish',
    expectedDestination:
      'https://github.com/revenantonthemission/obsidian-custom-publish',
    verifier: 'Codex public-source collector',
    checkedAt: PUBLIC_SOURCE_CHECKED_AT,
  },
  E04: {
    kind: 'public-source',
    reference: 'https://github.com/revenantonthemission/mcp-local-reference',
    expectedDestination:
      'https://github.com/revenantonthemission/mcp-local-reference',
    verifier: 'Codex public-source collector',
    checkedAt: PUBLIC_SOURCE_CHECKED_AT,
  },
  E05: {
    kind: 'public-source',
    reference: 'https://github.com/revenantonthemission/AdiuBear',
    expectedDestination: 'https://github.com/revenantonthemission/AdiuBear',
    verifier: 'Codex public-source collector',
    checkedAt: PUBLIC_SOURCE_CHECKED_AT,
  },
} satisfies Record<EvidenceId, FactReviewEvidence>);

const EVIDENCE_MEMBERSHIP = createEvidenceMembership();

export type ProfileProductionErrorCode =
  | 'PROFILE_APPROVAL_RECEIPT_INVALID'
  | 'PROFILE_APPROVAL_SOURCE_INVALID'
  | 'PROFILE_APPROVAL_EVIDENCE_INVALID'
  | 'PROFILE_APPROVAL_DIGEST_MISMATCH'
  | 'PROFILE_APPROVAL_REVIEW_INVALID'
  | 'PROFILE_APPROVAL_OUTPUT_LEAK';

export class ProfileProductionError extends Error {
  readonly code: ProfileProductionErrorCode;
  readonly path: string;
  readonly diagnostics: readonly string[];

  constructor(
    code: ProfileProductionErrorCode,
    path: string,
    diagnostics: readonly string[] = [],
  ) {
    super(`${code}@${path}`);
    this.name = 'ProfileProductionError';
    this.code = code;
    this.path = path;
    this.diagnostics = Object.freeze([...diagnostics]);
  }
}

interface MaterializedSnapshot {
  readonly validated: ValidatedProfile;
  readonly facts: readonly MaterializedFact[];
  readonly structuralDecisions: unknown;
  readonly materializedProfileDigest: string;
}

interface ProductionEvaluation extends MaterializedSnapshot {
  readonly receipt: FactApprovalReceipt;
  readonly records: readonly FactReviewRecord[];
  readonly approvedRecordsDigest: string;
  readonly productionDiffDigest: string;
  readonly assembly: FactApprovedProfileAssembly;
}

let cachedAssembly: FactApprovedProfileAssembly | undefined;

/**
 * The only production entry point for the approved profile aggregate.
 *
 * This module is build/server-only by construction: Node hashing, the private
 * receipt and the raw profile source never enter the public profile barrel.
 */
export interface ApprovedExternalDestination {
  readonly url: string;
  readonly verifier: string;
  readonly checkedAt: string;
}

/**
 * The human-verified public-source destinations behind the profile's external
 * links. Browser verification reproduces these records rather than reaching the
 * network, so the only thing exposed here is what the pages already show: the
 * destination, who checked it and when. No approval identity is reachable.
 */
export function getApprovedExternalDestinations(): readonly ApprovedExternalDestination[] {
  return Object.freeze(
    Object.values(EVIDENCE_SOURCES)
      .filter((evidence) => evidence.kind === 'public-source')
      .map((evidence) =>
        Object.freeze({
          url: evidence.expectedDestination,
          verifier: evidence.verifier,
          // The same instant, emitted in the canonical ISO-8601 form. The
          // stored literal omits milliseconds, and verification compares
          // timestamps against `new Date(value).toISOString()` exactly.
          checkedAt: new Date(evidence.checkedAt).toISOString(),
        }),
      ),
  );
}

export function getProductionProfileAssembly(): FactApprovedProfileAssembly {
  cachedAssembly ??= evaluateProductionProfile(
    profileData,
    receiptDocument,
  ).assembly;
  return cachedAssembly;
}

/**
 * Fails a completed build if any private approval identity or receipt filename
 * was emitted. Marker values are intentionally absent from thrown diagnostics.
 */
export async function assertNoProfileApprovalLeak(
  directory: URL | string,
): Promise<void> {
  const root =
    directory instanceof URL ? fileURLToPath(directory) : resolve(directory);
  const markers = Object.values(EXPECTED_RECEIPT)
    .filter(
      (value) =>
        typeof value === 'string' && value.length > 'Approved'.length,
    )
    .map((value) => Buffer.from(value as string, 'utf8'));

  for (const path of await listOutputFiles(root, markers)) {
    const bytes = await readFile(path);
    if (markers.some((marker) => bytes.includes(marker))) {
      throw new ProfileProductionError(
        'PROFILE_APPROVAL_OUTPUT_LEAK',
        'build.output',
      );
    }
  }
}

function evaluateProductionProfile(
  candidate: ProfileData,
  receiptCandidate: unknown,
): ProductionEvaluation {
  const receipt = requireExactReceipt(receiptCandidate);
  const snapshot = materializeSnapshot(candidate);
  const records = buildReviewRecords(snapshot.facts, receipt);

  if (
    records.some(
      (record) =>
        record.status !== 'Approved' ||
        record.decisionRecord?.auditInteractionId !==
          receipt.decisionAuditId ||
        record.decisionRecord?.recordedAt !== receipt.decisionRecordedAt,
    )
  ) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_REVIEW_INVALID',
      'profile.facts',
    );
  }

  const approvedRecordsDigest = canonicalDigest({
    domain: 'obsidian-press:profile-approved-records',
    schemaVersion: receipt.schemaVersion,
    records,
  });
  const operations = snapshot.facts.map(toFactOperation);
  const productionDiffDigest = canonicalDigest({
    domain: 'obsidian-press:profile-production-diff',
    schemaVersion: receipt.schemaVersion,
    revision: receipt.productionDiffRevision,
    inventoryRevision: receipt.inventoryRevision,
    inventoryDigest: receipt.inventoryDigest,
    approvedRecordsDigest,
    materializedProfileDigest: snapshot.materializedProfileDigest,
    operations,
    structuralOperations: snapshot.structuralDecisions,
  });

  requireDigest(
    approvedRecordsDigest,
    receipt.approvedRecordsDigest,
    'profile.facts',
  );
  requireDigest(
    snapshot.materializedProfileDigest,
    receipt.materializedProfileDigest,
    'profile',
  );
  requireDigest(
    productionDiffDigest,
    receipt.productionDiffDigest,
    'profile.diff',
  );

  const review: FactApprovalReview = deepFreeze({
    inventory: {
      schemaVersion: receipt.schemaVersion,
      revision: receipt.inventoryRevision,
      digest: receipt.inventoryDigest,
      approvedRecordsDigest,
      records,
    },
    productionDiff: {
      schemaVersion: receipt.schemaVersion,
      revision: receipt.productionDiffRevision,
      digest: productionDiffDigest,
      inventoryRevision: receipt.inventoryRevision,
      inventoryDigest: receipt.inventoryDigest,
      approvedRecordsDigest,
      materializedProfileDigest: snapshot.materializedProfileDigest,
    },
    materializedProfileDigest: snapshot.materializedProfileDigest,
    receipt,
  });
  const approval = validateFactApproval(snapshot.validated, review);
  if (!approval.ok) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_REVIEW_INVALID',
      'profile.facts',
      issueDiagnostics(approval.issues),
    );
  }

  return Object.freeze({
    ...snapshot,
    receipt,
    records,
    approvedRecordsDigest,
    productionDiffDigest,
    assembly: assembleFactApprovedProfile(approval.value),
  });
}

function materializeSnapshot(candidate: ProfileData): MaterializedSnapshot {
  assertExactProfileSourceShape(candidate);
  const validation = validateProfile(candidate);
  if (!validation.ok) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_SOURCE_INVALID',
      'profile',
      issueDiagnostics(validation.issues),
    );
  }

  const facts = collectMaterializedFacts(validation.value);
  const structuralDecisions = deepFreeze(
    deriveStructuralDecisions(validation.value),
  );
  const materializedProfileDigest = canonicalDigest({
    domain: 'obsidian-press:profile-materialization-proposal',
    schemaVersion: EXPECTED_RECEIPT.schemaVersion,
    facts: facts.map(toFactOperation),
    structuralDecisions,
  });

  return Object.freeze({
    validated: validation.value,
    facts,
    structuralDecisions,
    materializedProfileDigest,
  });
}

function assertExactProfileSourceShape(candidate: unknown): void {
  const visited = new WeakSet<object>();

  function inspectRecord(
    value: unknown,
    allowedKeys: readonly string[],
    inspect: (record: Record<string, unknown>) => void,
  ): void {
    if (!isRecord(value)) {
      return;
    }
    if (
      (Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null) ||
      Object.getOwnPropertySymbols(value).length > 0 ||
      Object.getOwnPropertyNames(value).some(
        (key) => !allowedKeys.includes(key),
      )
    ) {
      sourceShapeFailure();
    }
    if (visited.has(value)) {
      return;
    }
    visited.add(value);
    inspect(value as Record<string, unknown>);
  }

  function inspectArray(
    value: unknown,
    inspect: (item: unknown) => void,
  ): void {
    if (!Array.isArray(value)) {
      return;
    }
    if (
      Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertySymbols(value).length > 0 ||
      Object.getOwnPropertyNames(value).some(
        (key) =>
          key !== 'length' &&
          (!/^(?:0|[1-9]\d*)$/.test(key) ||
            Number(key) >= value.length),
      )
    ) {
      sourceShapeFailure();
    }
    if (visited.has(value)) {
      return;
    }
    visited.add(value);
    value.forEach(inspect);
  }

  function inspectFact(
    value: unknown,
    inspectValue: (factValue: unknown) => void = () => {},
  ): void {
    inspectRecord(value, ['factId', 'value'], (fact) => {
      inspectValue(fact.value);
    });
  }

  function inspectPeriod(value: unknown): void {
    inspectRecord(value, ['start', 'end'], (period) => {
      inspectDatePoint(period.start);
      inspectDatePoint(period.end);
    });
  }

  function inspectDatePoint(value: unknown): void {
    if (!isRecord(value)) {
      return;
    }
    const allowedKeys =
      value.tag === 'present' ? ['tag'] : ['tag', 'value'];
    inspectRecord(value, allowedKeys, () => {});
  }

  function inspectContentBlock(value: unknown): void {
    if (!isRecord(value)) {
      return;
    }
    if (value.tag === 'paragraph') {
      inspectRecord(value, ['tag', 'text'], (block) => {
        inspectFact(block.text);
      });
      return;
    }
    if (value.tag === 'list') {
      inspectRecord(value, ['tag', 'style', 'items'], (block) => {
        inspectArray(block.items, (item) => inspectFact(item));
      });
      return;
    }
    inspectRecord(value, ['tag'], () => {});
  }

  function inspectContentBlocks(value: unknown): void {
    inspectArray(value, inspectContentBlock);
  }

  function inspectEvidence(value: unknown): void {
    inspectRecord(
      value,
      ['id', 'order', 'label', 'destination'],
      (link) => {
        inspectFact(link.label);
        inspectFact(link.destination, (destination) => {
          inspectRecord(destination, ['tag', 'value'], () => {});
        });
      },
    );
  }

  function inspectEvidenceCollection(value: unknown): void {
    inspectArray(value, inspectEvidence);
  }

  function inspectSkillGroup(value: unknown): void {
    inspectRecord(value, ['id', 'order', 'title', 'skills'], (group) => {
      inspectFact(group.title);
      inspectArray(group.skills, (skill) => {
        inspectRecord(skill, ['id', 'order', 'name'], (record) => {
          inspectFact(record.name);
        });
      });
    });
  }

  function inspectExperience(value: unknown): void {
    inspectRecord(
      value,
      [
        'id',
        'order',
        'organization',
        'role',
        'period',
        'summary',
        'details',
        'evidence',
      ],
      (experience) => {
        inspectFact(experience.organization);
        inspectFact(experience.role);
        inspectFact(experience.period, inspectPeriod);
        inspectFact(experience.summary);
        inspectContentBlocks(experience.details);
        inspectEvidenceCollection(experience.evidence);
      },
    );
  }

  function inspectAchievement(value: unknown): void {
    inspectRecord(
      value,
      [
        'id',
        'order',
        'title',
        'period',
        'summary',
        'details',
        'evidence',
      ],
      (achievement) => {
        inspectFact(achievement.title);
        inspectFact(achievement.period, inspectPeriod);
        inspectFact(achievement.summary);
        inspectContentBlocks(achievement.details);
        inspectEvidenceCollection(achievement.evidence);
      },
    );
  }

  function inspectProject(value: unknown): void {
    inspectRecord(
      value,
      [
        'id',
        'order',
        'title',
        'period',
        'outcomeSummary',
        'problem',
        'role',
        'keyDecisions',
        'architecture',
        'outcomes',
        'lessons',
        'evidence',
        'relatedProfileEntity',
      ],
      (project) => {
        inspectFact(project.title);
        inspectFact(project.period, inspectPeriod);
        inspectFact(project.outcomeSummary);
        inspectContentBlocks(project.problem);
        inspectContentBlocks(project.role);
        inspectContentBlocks(project.keyDecisions);
        inspectContentBlocks(project.architecture);
        inspectContentBlocks(project.outcomes);
        inspectContentBlocks(project.lessons);
        inspectEvidenceCollection(project.evidence);
        inspectRecord(
          project.relatedProfileEntity,
          ['tag', 'id'],
          () => {},
        );
      },
    );
  }

  function inspectEducation(value: unknown): void {
    inspectRecord(
      value,
      [
        'id',
        'order',
        'title',
        'subtitle',
        'period',
        'details',
        'evidence',
      ],
      (education) => {
        inspectFact(education.title);
        inspectFact(education.subtitle);
        inspectFact(education.period, inspectPeriod);
        inspectContentBlocks(education.details);
        inspectEvidenceCollection(education.evidence);
      },
    );
  }

  function inspectCertification(value: unknown): void {
    inspectRecord(
      value,
      [
        'id',
        'order',
        'title',
        'issuer',
        'period',
        'details',
        'evidence',
      ],
      (certification) => {
        inspectFact(certification.title);
        inspectFact(certification.issuer);
        inspectFact(certification.period, inspectPeriod);
        inspectContentBlocks(certification.details);
        inspectEvidenceCollection(certification.evidence);
      },
    );
  }

  try {
    inspectRecord(
      candidate,
      [
        'identity',
        'narrative',
        'contact',
        'skillGroups',
        'experiences',
        'achievements',
        'projects',
        'education',
        'certifications',
      ],
      (profile) => {
        inspectRecord(profile.identity, ['name', 'headline'], (identity) => {
          inspectFact(identity.name);
          inspectFact(identity.headline);
        });
        inspectRecord(
          profile.narrative,
          [
            'shortIntro',
            'detailedIntro',
            'resumeSummary',
            'portfolioSummary',
          ],
          (narrative) => {
            inspectFact(narrative.shortIntro);
            inspectContentBlocks(narrative.detailedIntro);
            inspectFact(narrative.resumeSummary);
            inspectFact(narrative.portfolioSummary);
          },
        );
        inspectRecord(
          profile.contact,
          ['email', 'github', 'additionalLinks'],
          (contact) => {
            inspectFact(contact.email);
            inspectFact(contact.github);
            inspectEvidenceCollection(contact.additionalLinks);
          },
        );
        inspectArray(profile.skillGroups, inspectSkillGroup);
        inspectArray(profile.experiences, inspectExperience);
        inspectArray(profile.achievements, inspectAchievement);
        inspectArray(profile.projects, inspectProject);
        inspectArray(profile.education, inspectEducation);
        inspectArray(profile.certifications, inspectCertification);
      },
    );
  } catch (error) {
    if (error instanceof ProfileProductionError) {
      throw error;
    }
    sourceShapeFailure();
  }

  function sourceShapeFailure(): never {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_SOURCE_INVALID',
      'profile',
    );
  }
}

function buildReviewRecords(
  facts: readonly MaterializedFact[],
  receipt: FactApprovalReceipt,
): readonly FactReviewRecord[] {
  if (
    facts.length !== EVIDENCE_MEMBERSHIP.size ||
    facts.some((fact) => !EVIDENCE_MEMBERSHIP.has(fact.factId))
  ) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_EVIDENCE_INVALID',
      'profile.facts',
    );
  }

  return Object.freeze(
    facts.map((fact) => {
      const evidenceId = EVIDENCE_MEMBERSHIP.get(fact.factId);
      if (evidenceId === undefined) {
        throw new ProfileProductionError(
          'PROFILE_APPROVAL_EVIDENCE_INVALID',
          fact.sourcePath,
        );
      }

      const evidence = EVIDENCE_SOURCES[evidenceId];
      if (
        (fact.normalizedValue.kind === 'github-url' ||
          fact.normalizedValue.kind === 'external-url') &&
        (evidence.kind !== 'public-source' ||
          evidence.expectedDestination !== fact.normalizedValue.value)
      ) {
        throw new ProfileProductionError(
          'PROFILE_APPROVAL_EVIDENCE_INVALID',
          fact.sourcePath,
        );
      }

      return deepFreeze({
        factId: fact.factId,
        canonicalPath: fact.canonicalPath,
        normalizedValue: fact.normalizedValue,
        evidence,
        targetSurfaces: fact.targetSurfaces,
        requirement: fact.requirement,
        status: 'Approved',
        decisionRecord: {
          decision: 'Approved',
          auditInteractionId: receipt.decisionAuditId,
          recordedAt: receipt.decisionRecordedAt,
        },
      } satisfies FactReviewRecord);
    }),
  );
}

function deriveStructuralDecisions(
  validated: ValidatedProfile,
): unknown {
  const source = validated as unknown as ProfileData;

  return {
    identityAndNarrative: {
      detailedIntroBlocks: source.narrative.detailedIntro.map(
        describeIdentifiedBlock,
      ),
      additionalLinks: ordered(source.contact.additionalLinks).map(
        describeEvidence,
      ),
    },
    skillGroups: ordered(source.skillGroups).map((group) => ({
      id: group.id,
      order: group.order,
      skills: ordered(group.skills).map((skill) => ({
        id: skill.id,
        order: skill.order,
      })),
    })),
    experiences: ordered(source.experiences).map((experience) => ({
      id: experience.id,
      order: experience.order,
      detailBlocks: experience.details.map(describeIdentifiedBlock),
      evidence: ordered(experience.evidence).map(describeEvidence),
    })),
    achievements: ordered(source.achievements).map((achievement) => ({
      id: achievement.id,
      order: achievement.order,
      period: achievement.period === undefined ? 'absent' : 'present',
      detailBlocks: achievement.details.map(describeIdentifiedBlock),
      evidence: ordered(achievement.evidence).map(describeEvidence),
    })),
    projects: ordered(source.projects).map((project) => ({
      id: project.id,
      order: project.order,
      period: project.period === undefined ? 'absent' : 'present',
      dimensions: [
        ['problem', project.problem],
        ['role', project.role],
        ['keyDecisions', project.keyDecisions],
        ['architecture', project.architecture],
        ['outcomes', project.outcomes],
        ['lessons', project.lessons],
      ].map(([dimension, blocks]) => ({
        dimension,
        blocks: (blocks as readonly ContentBlock[]).map(describeBlockShape),
      })),
      evidence: ordered(project.evidence).map(describeEvidence),
      relatedProfileEntity:
        project.relatedProfileEntity === undefined
          ? 'absent'
          : {
              tag: project.relatedProfileEntity.tag,
              id: project.relatedProfileEntity.id,
            },
    })),
    education: ordered(source.education).map((education) => ({
      id: education.id,
      order: education.order,
      details: education.details.map(describeIdentifiedBlock),
      evidence: ordered(education.evidence).map(describeEvidence),
    })),
    certifications: ordered(source.certifications).map((certification) => ({
      id: certification.id,
      order: certification.order,
      issuer: certification.issuer === undefined ? 'absent' : 'present',
      details: certification.details.map(describeIdentifiedBlock),
      evidence: ordered(certification.evidence).map(describeEvidence),
    })),
  };
}

function describeIdentifiedBlock(block: ContentBlock): unknown {
  if (block.tag === 'paragraph') {
    return { tag: block.tag, factId: block.text.factId };
  }
  return {
    tag: block.tag,
    style: block.style,
    factIds: block.items.map((item) => item.factId),
  };
}

function describeBlockShape(block: ContentBlock): unknown {
  if (block.tag === 'paragraph') {
    return { tag: block.tag };
  }
  return {
    tag: block.tag,
    style: block.style,
    itemCount: block.items.length,
  };
}

function describeEvidence(link: EvidenceLink): unknown {
  return { id: link.id, order: link.order };
}

function ordered<Item extends Readonly<{ order: number }>>(
  items: readonly Item[],
): readonly Item[] {
  return [...items].sort((left, right) => left.order - right.order);
}

function toFactOperation(fact: MaterializedFact): unknown {
  return {
    factId: fact.factId,
    canonicalPath: fact.canonicalPath,
    normalizedValue: fact.normalizedValue,
    targetSurfaces: fact.targetSurfaces,
    requirement: fact.requirement,
  };
}

function requireExactReceipt(candidate: unknown): FactApprovalReceipt {
  if (!isRecord(candidate) || !hasExactKeys(candidate, RECEIPT_KEYS)) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_RECEIPT_INVALID',
      'verification/profile/fact-approval.json',
    );
  }

  for (const key of RECEIPT_KEYS) {
    if (candidate[key] !== EXPECTED_RECEIPT[key]) {
      throw new ProfileProductionError(
        'PROFILE_APPROVAL_RECEIPT_INVALID',
        'verification/profile/fact-approval.json',
      );
    }
  }

  return Object.freeze({ ...candidate }) as unknown as FactApprovalReceipt;
}

function requireDigest(
  actual: string,
  expected: string,
  path: string,
): void {
  if (actual !== expected) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_DIGEST_MISMATCH',
      path,
    );
  }
}

function canonicalDigest(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  if (serialized === undefined) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_DIGEST_MISMATCH',
      'profile',
    );
  }
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonicalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  throw new ProfileProductionError(
    'PROFILE_APPROVAL_DIGEST_MISMATCH',
    'profile',
  );
}

function createEvidenceMembership(): ReadonlyMap<string, EvidenceId> {
  const membership = new Map<string, EvidenceId>();
  const groups: Readonly<Record<EvidenceId, readonly string[]>> = {
    E01: [
      'identity-name',
      'identity-headline',
      'narrative-short-intro',
      'narrative-detailed-intro-0-text',
      'narrative-resume-summary',
      'skill-group-languages-title',
      'skill-dart-name',
      'skill-group-backend-data-title',
      'skill-uvicorn-name',
      'skill-sqlalchemy-name',
      'skill-redis-name',
      'skill-apache-kafka-name',
      'skill-mysql-mariadb-name',
      'skill-group-infrastructure-title',
      'skill-kubernetes-name',
      'skill-group-tooling-client-title',
      'skill-flutter-name',
      'skill-git-name',
      'skill-sveltekit-name',
      'experience-hansono-organization',
      'experience-hansono-role',
      'experience-hansono-period',
      'experience-hansono-summary',
      'experience-hansono-details-0-text',
      'experience-hansono-details-1-text',
      'certification-opic-ih-title',
      'certification-opic-ih-period',
      'certification-hsk-6-title',
      'certification-hsk-6-period',
    ],
    E02: [
      'contact-email',
      'contact-github',
      'skill-c-name',
      'skill-cpp-name',
      'skill-python-name',
      'skill-javascript-name',
      'skill-fastapi-name',
      'skill-docker-name',
      'skill-nginx-name',
      'skill-aws-name',
      'skill-github-actions-name',
      'education-sogang-university-title',
      'education-sogang-university-subtitle',
      'education-sogang-university-period',
    ],
    E03: [
      'narrative-portfolio-summary',
      'skill-typescript-name',
      'skill-rust-name',
      'skill-astro-name',
      ...projectFactIds('obsidian-custom-publish'),
    ],
    E04: projectFactIds('mcp-local-reference'),
    E05: projectFactIds('adiubear'),
  };

  for (const [evidenceId, factIds] of Object.entries(groups) as [
    EvidenceId,
    readonly string[],
  ][]) {
    for (const factId of factIds) {
      if (membership.has(factId)) {
        throw new ProfileProductionError(
          'PROFILE_APPROVAL_EVIDENCE_INVALID',
          'profile.facts',
        );
      }
      membership.set(factId, evidenceId);
    }
  }
  if (membership.size !== 77) {
    throw new ProfileProductionError(
      'PROFILE_APPROVAL_EVIDENCE_INVALID',
      'profile.facts',
    );
  }
  return membership;
}

function projectFactIds(projectId: string): readonly string[] {
  return PROJECT_FACT_SUFFIXES.map(
    (suffix) => `project-${projectId}-${suffix}`,
  );
}

function issueDiagnostics(
  issues: readonly ValidationIssue[],
): readonly string[] {
  return issues.map((issue) => `${issue.code}@${issue.path}`);
}

function hasExactKeys(
  value: Record<PropertyKey, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.getOwnPropertySymbols(value).length === 0 &&
    Object.keys(value).sort().join('\u0000') ===
      [...keys].sort().join('\u0000')
  );
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

async function listOutputFiles(
  root: string,
  forbiddenMarkers: readonly Buffer[],
): Promise<readonly string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = relative(root, path);
      const relativeBytes = Buffer.from(relativePath, 'utf8');
      if (
        relativePath.includes('fact-approval.json') ||
        forbiddenMarkers.some((marker) => relativeBytes.includes(marker))
      ) {
        throw new ProfileProductionError(
          'PROFILE_APPROVAL_OUTPUT_LEAK',
          'build.output',
        );
      }
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) {
        throw new ProfileProductionError(
          'PROFILE_APPROVAL_OUTPUT_LEAK',
          'build.output',
        );
      }
      if (metadata.isDirectory()) {
        await visit(path);
      } else if (metadata.isFile()) {
        files.push(path);
      }
    }
  }

  await visit(root);
  return files;
}

/**
 * Leaf-only test seam. It is deliberately excluded from the public profile
 * barrel so routes and islands cannot bypass the production gate.
 *
 * @internal
 */
export const productionProfileTesting = Object.freeze({
  evaluate: evaluateProductionProfile,
  materialize: materializeSnapshot,
  canonicalDigest,
  assertNoProfileApprovalLeak,
});
