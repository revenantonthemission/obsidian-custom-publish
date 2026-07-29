import * as fc from 'fast-check';

import { assembleFactApprovedProfile } from '../../../../src/lib/profile/assembly.js';
import {
  FACT_APPROVAL_SCHEMA_VERSION,
  collectMaterializedFacts,
  validateFactApproval,
} from '../../../../src/lib/profile/fact-approval.js';
import type {
  FactApprovalReview,
  FactReviewEvidence,
} from '../../../../src/lib/profile/fact-approval.js';
import type {
  ResumeEntityIdentity,
  ResumeEntityOrder,
  ResumeEntityParent,
  ResumeManifestEntry,
  ResumeManifestValueKind,
  ResumeSectionKey,
  ResumeSectionOrder,
  ResumeSectionRank,
} from '../../../../src/lib/profile/resume-manifest.js';
import type {
  ContentBlock,
  DisplayOrder,
  EntityId,
  EntityKind,
  EvidenceLink,
  FactApprovedProfileAssembly,
  FactId,
  Period,
  PublicFact,
  ResumeProfile,
  ValidatedProfile,
} from '../../../../src/lib/profile/types.js';
import {
  DOCUMENT_REQUEST_MUTATION_KINDS,
  MANIFEST_MUTATION_KINDS,
} from '../mutations.js';
import type {
  DocumentRequestMutationKind,
  ManifestMutationKind,
} from '../mutations.js';
import {
  validProfileProjectionsArbitrary,
} from './profile.js';

export interface ResumeManifestSourceCase {
  readonly validated: ValidatedProfile;
  readonly resume: ResumeProfile;
}

export const resumeManifestSourceArbitrary: fc.Arbitrary<
  ResumeManifestSourceCase
> = validProfileProjectionsArbitrary.map((projections) =>
  Object.freeze({
    validated: projections.validated,
    resume: projections.resume,
  }),
);

export const manifestMutationKindArbitrary: fc.Arbitrary<
  ManifestMutationKind
> = fc.constantFrom(...MANIFEST_MUTATION_KINDS);

export const documentRequestMutationKindArbitrary: fc.Arbitrary<
  DocumentRequestMutationKind
> = fc.constantFrom(...DOCUMENT_REQUEST_MUTATION_KINDS);

export interface ResumeManifestOracle {
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly ResumeManifestEntry[];
}

/**
 * Test-side reference traversal for DE-P14/P-C11.
 *
 * It deliberately starts from the generated ResumeProfile and does not call
 * the production manifest builder, fact collector, path helper or digest
 * encoder. This keeps the property capable of detecting omissions and wrong
 * section/entity/value metadata in the production traversal.
 */
export function buildResumeManifestOracle(
  profile: ResumeProfile,
): ResumeManifestOracle {
  const state: MutableResumeManifestOracle = {
    sectionOrder: [],
    entityOrder: [],
    entries: [],
  };

  const intro = oracleSection(
    state,
    'intro-contact',
    1,
  );
  oracleStringFact(
    state,
    intro,
    null,
    profile.identity.name,
    'profile.identity.name',
    'text',
  );
  oracleStringFact(
    state,
    intro,
    null,
    profile.identity.headline,
    'profile.identity.headline',
    'text',
  );
  oracleStringFact(
    state,
    intro,
    null,
    profile.resumeSummary,
    'profile.narrative.resumeSummary',
    'text',
  );
  oracleContentBlocks(
    state,
    intro,
    null,
    profile.detailedIntro,
    'profile.narrative.detailedIntro',
  );
  oracleStringFact(
    state,
    intro,
    null,
    profile.contactActions.email,
    'profile.contact.email',
    'email',
  );
  oracleStringFact(
    state,
    intro,
    null,
    profile.contactActions.github,
    'profile.contact.github',
    'github-url',
  );
  oracleEvidenceLinks(
    state,
    intro,
    profile.contactActions.additionalLinks,
    'profile.contact.additionalLinks',
    null,
  );

  const skills = oracleSection(state, 'skills', 2);
  for (const group of profile.skillGroups) {
    const groupEntity = oracleEntity(
      state,
      skills,
      'skill-group',
      group.id,
      group.order,
      null,
    );
    oracleStringFact(
      state,
      skills,
      groupEntity,
      group.title,
      `profile.skillGroups[id=${group.id}].title`,
      'text',
    );

    for (const skill of group.skills) {
      const skillEntity = oracleEntity(
        state,
        skills,
        'skill',
        skill.id,
        skill.order,
        oracleParent(groupEntity),
      );
      oracleStringFact(
        state,
        skills,
        skillEntity,
        skill.name,
        `profile.skillGroups[id=${group.id}].skills[id=${skill.id}].name`,
        'text',
      );
    }
  }

  const highlights = oracleSection(state, 'highlights', 3);
  for (const experience of profile.experiences) {
    const entity = oracleEntity(
      state,
      highlights,
      'experience',
      experience.id,
      experience.order,
      null,
    );
    const base = `profile.experiences[id=${experience.id}]`;
    oracleStringFact(
      state,
      highlights,
      entity,
      experience.role,
      `${base}.role`,
      'text',
    );
    oracleStringFact(
      state,
      highlights,
      entity,
      experience.organization,
      `${base}.organization`,
      'text',
    );
    oraclePeriodFact(
      state,
      highlights,
      entity,
      experience.period,
      `${base}.period`,
    );
    oracleStringFact(
      state,
      highlights,
      entity,
      experience.summary,
      `${base}.summary`,
      'text',
    );
    oracleContentBlocks(
      state,
      highlights,
      entity,
      experience.details,
      `${base}.details`,
    );
    oracleEvidenceLinks(
      state,
      highlights,
      experience.evidence,
      `${base}.evidence`,
      oracleParent(entity),
    );
  }

  for (const achievement of profile.achievements) {
    const entity = oracleEntity(
      state,
      highlights,
      'achievement',
      achievement.id,
      achievement.order,
      null,
    );
    const base = `profile.achievements[id=${achievement.id}]`;
    oracleStringFact(
      state,
      highlights,
      entity,
      achievement.title,
      `${base}.title`,
      'text',
    );
    if (achievement.period !== undefined) {
      oraclePeriodFact(
        state,
        highlights,
        entity,
        achievement.period,
        `${base}.period`,
      );
    }
    oracleStringFact(
      state,
      highlights,
      entity,
      achievement.summary,
      `${base}.summary`,
      'text',
    );
    oracleContentBlocks(
      state,
      highlights,
      entity,
      achievement.details,
      `${base}.details`,
    );
    oracleEvidenceLinks(
      state,
      highlights,
      achievement.evidence,
      `${base}.evidence`,
      oracleParent(entity),
    );
  }

  const projects = oracleSection(
    state,
    'project-summaries',
    4,
  );
  for (const project of profile.projectSummaries) {
    const entity = oracleEntity(
      state,
      projects,
      'project',
      project.id,
      project.order,
      null,
    );
    const base = `profile.projects[id=${project.id}]`;
    oracleStringFact(
      state,
      projects,
      entity,
      project.title,
      `${base}.title`,
      'text',
    );
    if (project.period !== undefined) {
      oraclePeriodFact(
        state,
        projects,
        entity,
        project.period,
        `${base}.period`,
      );
    }
    oracleStringFact(
      state,
      projects,
      entity,
      project.outcomeSummary,
      `${base}.outcomeSummary`,
      'text',
    );
  }

  if (profile.education !== undefined) {
    const educationSection = oracleSection(
      state,
      'education',
      5,
    );
    for (const education of profile.education) {
      const entity = oracleEntity(
        state,
        educationSection,
        'education',
        education.id,
        education.order,
        null,
      );
      const base = `profile.education[id=${education.id}]`;
      oracleStringFact(
        state,
        educationSection,
        entity,
        education.title,
        `${base}.title`,
        'text',
      );
      if (education.subtitle !== undefined) {
        oracleStringFact(
          state,
          educationSection,
          entity,
          education.subtitle,
          `${base}.subtitle`,
          'text',
        );
      }
      if (education.period !== undefined) {
        oraclePeriodFact(
          state,
          educationSection,
          entity,
          education.period,
          `${base}.period`,
        );
      }
      oracleContentBlocks(
        state,
        educationSection,
        entity,
        education.details,
        `${base}.details`,
      );
      oracleEvidenceLinks(
        state,
        educationSection,
        education.evidence,
        `${base}.evidence`,
        oracleParent(entity),
      );
    }
  }

  if (profile.certifications !== undefined) {
    const certificationSection = oracleSection(
      state,
      'certifications',
      6,
    );
    for (const certification of profile.certifications) {
      const entity = oracleEntity(
        state,
        certificationSection,
        'certification',
        certification.id,
        certification.order,
        null,
      );
      const base =
        `profile.certifications[id=${certification.id}]`;
      oracleStringFact(
        state,
        certificationSection,
        entity,
        certification.title,
        `${base}.title`,
        'text',
      );
      if (certification.issuer !== undefined) {
        oracleStringFact(
          state,
          certificationSection,
          entity,
          certification.issuer,
          `${base}.issuer`,
          'text',
        );
      }
      if (certification.period !== undefined) {
        oraclePeriodFact(
          state,
          certificationSection,
          entity,
          certification.period,
          `${base}.period`,
        );
      }
      oracleContentBlocks(
        state,
        certificationSection,
        entity,
        certification.details,
        `${base}.details`,
      );
      oracleEvidenceLinks(
        state,
        certificationSection,
        certification.evidence,
        `${base}.evidence`,
        oracleParent(entity),
      );
    }
  }

  return Object.freeze({
    sectionOrder: Object.freeze(state.sectionOrder),
    entityOrder: Object.freeze(state.entityOrder),
    entries: Object.freeze(state.entries),
  });
}

/**
 * Creates a runtime approval capability exclusively from generated synthetic
 * facts. It mirrors the exact correspondence gate without bypassing the
 * production WeakSet capability boundary.
 */
export function approveSyntheticProfile(
  profile: ValidatedProfile,
): FactApprovedProfileAssembly {
  const facts = collectMaterializedFacts(profile);
  const records = facts.map((fact) => {
    const evidence: FactReviewEvidence =
      fact.normalizedValue.kind === 'github-url' ||
      fact.normalizedValue.kind === 'external-url'
        ? Object.freeze({
            kind: 'public-source' as const,
            reference: 'synthetic-pbt-public-source',
            expectedDestination: fact.normalizedValue.value,
            verifier: 'synthetic-pbt-verifier',
            checkedAt: SYNTHETIC_TIMESTAMP,
          })
        : Object.freeze({
            kind: 'user-provided' as const,
            reference: 'synthetic-pbt-input',
          });

    return Object.freeze({
      factId: String(fact.factId),
      canonicalPath: fact.canonicalPath,
      normalizedValue: fact.normalizedValue,
      evidence,
      targetSurfaces: fact.targetSurfaces,
      requirement: fact.requirement,
      status: 'Approved' as const,
      decisionRecord: Object.freeze({
        decision: 'Approved' as const,
        auditInteractionId: 'synthetic-pbt-approval',
        recordedAt: SYNTHETIC_TIMESTAMP,
      }),
    });
  });

  const review: FactApprovalReview = Object.freeze({
    inventory: Object.freeze({
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      revision: 'synthetic-pbt-inventory-v1',
      digest: INVENTORY_DIGEST,
      approvedRecordsDigest: RECORDS_DIGEST,
      records: Object.freeze(records),
    }),
    productionDiff: Object.freeze({
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      revision: 'synthetic-pbt-production-diff-v1',
      digest: PRODUCTION_DIFF_DIGEST,
      inventoryRevision: 'synthetic-pbt-inventory-v1',
      inventoryDigest: INVENTORY_DIGEST,
      approvedRecordsDigest: RECORDS_DIGEST,
      materializedProfileDigest: PROFILE_DIGEST,
    }),
    materializedProfileDigest: PROFILE_DIGEST,
    receipt: Object.freeze({
      schemaVersion: FACT_APPROVAL_SCHEMA_VERSION,
      receiptId: 'synthetic-pbt-receipt-v1',
      inventoryRevision: 'synthetic-pbt-inventory-v1',
      inventoryDigest: INVENTORY_DIGEST,
      productionDiffRevision: 'synthetic-pbt-production-diff-v1',
      productionDiffDigest: PRODUCTION_DIFF_DIGEST,
      approvedRecordsDigest: RECORDS_DIGEST,
      materializedProfileDigest: PROFILE_DIGEST,
      decision: 'Approved' as const,
      decisionAuditId: 'synthetic-pbt-decision',
      decisionRecordedAt: SYNTHETIC_TIMESTAMP,
    }),
  });

  const approved = validateFactApproval(profile, review);
  if (!approved.ok) {
    throw new Error(
      `Synthetic approval fixture was rejected: ${approved.issues
        .map((issue) => `${issue.code}@${issue.path}`)
        .join(', ')}`,
    );
  }

  return assembleFactApprovedProfile(approved.value);
}

interface MutableResumeManifestOracle {
  readonly sectionOrder: ResumeSectionOrder[];
  readonly entityOrder: ResumeEntityOrder[];
  readonly entries: ResumeManifestEntry[];
}

interface OracleSection {
  readonly key: ResumeSectionKey;
  readonly order: ResumeSectionRank;
}

function oracleSection(
  state: MutableResumeManifestOracle,
  key: ResumeSectionKey,
  order: ResumeSectionRank,
): OracleSection {
  const section = Object.freeze({ key, order });
  state.sectionOrder.push(section);
  return section;
}

function oracleEntity<Kind extends EntityKind>(
  state: MutableResumeManifestOracle,
  section: OracleSection,
  kind: Kind,
  id: EntityId<Kind>,
  order: DisplayOrder,
  parent: ResumeEntityParent | null,
): ResumeEntityIdentity {
  const entity = Object.freeze({
    kind,
    id: id as EntityId<EntityKind>,
    order,
  });
  state.entityOrder.push(
    Object.freeze({
      sectionKey: section.key,
      sectionOrder: section.order,
      ...entity,
      parent:
        parent === null
          ? null
          : Object.freeze({
              kind: parent.kind,
              id: parent.id,
            }),
    }),
  );
  return entity;
}

function oracleParent(
  entity: ResumeEntityIdentity,
): ResumeEntityParent {
  return Object.freeze({
    kind: entity.kind,
    id: entity.id,
  });
}

function oracleStringFact(
  state: MutableResumeManifestOracle,
  section: OracleSection,
  entity: ResumeEntityIdentity | null,
  fact: PublicFact<string>,
  path: string,
  valueKind: Exclude<ResumeManifestValueKind, 'period'>,
): void {
  oracleEntry(
    state,
    section,
    entity,
    fact.factId,
    path,
    valueKind,
    fact.value,
  );
}

function oraclePeriodFact(
  state: MutableResumeManifestOracle,
  section: OracleSection,
  entity: ResumeEntityIdentity,
  fact: PublicFact<Period>,
  path: string,
): void {
  oracleEntry(
    state,
    section,
    entity,
    fact.factId,
    path,
    'period',
    oraclePeriodValue(fact.value),
  );
}

function oracleContentBlocks(
  state: MutableResumeManifestOracle,
  section: OracleSection,
  entity: ResumeEntityIdentity | null,
  blocks: readonly ContentBlock[],
  base: string,
): void {
  blocks.forEach((block, blockIndex) => {
    if (block.tag === 'paragraph') {
      oracleStringFact(
        state,
        section,
        entity,
        block.text,
        `${base}[${blockIndex}].text`,
        'text',
      );
      return;
    }

    block.items.forEach((item, itemIndex) => {
      oracleStringFact(
        state,
        section,
        entity,
        item,
        `${base}[${blockIndex}].items[${itemIndex}]`,
        'text',
      );
    });
  });
}

function oracleEvidenceLinks(
  state: MutableResumeManifestOracle,
  section: OracleSection,
  links: readonly EvidenceLink[],
  base: string,
  parent: ResumeEntityParent | null,
): void {
  for (const link of links) {
    const entity = oracleEntity(
      state,
      section,
      'evidence-link',
      link.id,
      link.order,
      parent,
    );
    const linkBase = `${base}[id=${link.id}]`;
    oracleStringFact(
      state,
      section,
      entity,
      link.label,
      `${linkBase}.label`,
      'text',
    );
    oracleEntry(
      state,
      section,
      entity,
      link.destination.factId,
      `${linkBase}.destination`,
      link.destination.value.tag === 'external'
        ? 'external-url'
        : 'internal-path',
      link.destination.value.value,
    );
  }
}

function oracleEntry(
  state: MutableResumeManifestOracle,
  section: OracleSection,
  entity: ResumeEntityIdentity | null,
  factId: FactId,
  path: string,
  valueKind: ResumeManifestValueKind,
  normalizedValue: string,
): void {
  state.entries.push(
    Object.freeze({
      entryOrder: state.entries.length + 1,
      sectionKey: section.key,
      sectionOrder: section.order,
      entity:
        entity === null
          ? null
          : Object.freeze({
              kind: entity.kind,
              id: entity.id,
              order: entity.order,
            }),
      factId,
      path: path as ResumeManifestEntry['path'],
      valueKind,
      normalizedValue,
    }),
  );
}

function oraclePeriodValue(period: Period): string {
  const start = `${period.start.tag}:${period.start.value}`;
  const end =
    period.end.tag === 'present'
      ? 'present'
      : `${period.end.tag}:${period.end.value}`;
  return `start:${start}|end:${end}`;
}

const SYNTHETIC_TIMESTAMP = '2026-01-01T00:00:00Z';
const INVENTORY_DIGEST = '1'.repeat(64);
const RECORDS_DIGEST = '2'.repeat(64);
const PROFILE_DIGEST = '3'.repeat(64);
const PRODUCTION_DIFF_DIGEST = '4'.repeat(64);
