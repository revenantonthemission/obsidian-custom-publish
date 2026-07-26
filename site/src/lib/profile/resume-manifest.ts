import {
  PROFILE_SOURCE_DIGEST_DOMAIN,
  RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
  digestProfileSource,
  digestResumeFactManifest,
} from './canonical-digest.js';
import type { CanonicalDigest } from './canonical-digest.js';
import {
  FACT_APPROVAL_SCHEMA_VERSION,
  factCanonicalPath,
  hasVerifiedFactApprovalCapability,
  isCanonicalApprovalIdentifier,
} from './fact-approval.js';
import type { FactCanonicalPath } from './fact-approval.js';
import { createValidationIssue } from './issues.js';
import { selectResumeProfile } from './selectors.js';
import { validateProfile } from './validation.js';
import type {
  ContentBlock,
  DisplayOrder,
  EntityId,
  EntityKind,
  EvidenceLink,
  FactApprovedProfile,
  FactId,
  Period,
  ProfileData,
  PublicFact,
  ResumeProfile,
  ValidationIssue,
  ValidationResult,
} from './types.js';

export const RESUME_MANIFEST_SCHEMA_VERSION = 1 as const;

export const RESUME_SECTION_ORDER = Object.freeze([
  Object.freeze({ key: 'intro-contact' as const, order: 1 as const }),
  Object.freeze({ key: 'skills' as const, order: 2 as const }),
  Object.freeze({ key: 'highlights' as const, order: 3 as const }),
  Object.freeze({ key: 'project-summaries' as const, order: 4 as const }),
  Object.freeze({ key: 'education' as const, order: 5 as const }),
  Object.freeze({ key: 'certifications' as const, order: 6 as const }),
]);

export type ResumeSectionKey =
  (typeof RESUME_SECTION_ORDER)[number]['key'];

export type ResumeSectionRank =
  (typeof RESUME_SECTION_ORDER)[number]['order'];

export interface ResumeSectionOrder {
  readonly key: ResumeSectionKey;
  readonly order: ResumeSectionRank;
}

export interface ResumeEntityIdentity {
  readonly kind: EntityKind;
  readonly id: EntityId<EntityKind>;
  readonly order: DisplayOrder;
}

export interface ResumeEntityParent {
  readonly kind: EntityKind;
  readonly id: EntityId<EntityKind>;
}

export interface ResumeEntityOrder extends ResumeEntityIdentity {
  readonly sectionKey: ResumeSectionKey;
  readonly sectionOrder: ResumeSectionRank;
  readonly parent: ResumeEntityParent | null;
}

export type ResumeManifestValueKind =
  | 'text'
  | 'email'
  | 'github-url'
  | 'external-url'
  | 'internal-path'
  | 'period';

export interface ResumeManifestEntry {
  readonly entryOrder: number;
  readonly sectionKey: ResumeSectionKey;
  readonly sectionOrder: ResumeSectionRank;
  readonly entity: ResumeEntityIdentity | null;
  readonly factId: FactId;
  readonly path: FactCanonicalPath;
  readonly valueKind: ResumeManifestValueKind;
  /**
   * Text and URL-like facts retain their approved normalized string. Periods
   * use `start:<tag>:<value>|end:<tag>[:<value>]`.
   */
  readonly normalizedValue: string;
}

export type ProfileSourceIdentity = CanonicalDigest<
  typeof PROFILE_SOURCE_DIGEST_DOMAIN
>;

export type ResumeManifestFingerprint = CanonicalDigest<
  typeof RESUME_FACT_MANIFEST_DIGEST_DOMAIN
>;

export interface ResumeFactManifest {
  readonly schemaVersion: typeof RESUME_MANIFEST_SCHEMA_VERSION;
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly ResumeManifestEntry[];
  readonly fingerprint: ResumeManifestFingerprint;
}

interface ManifestParts {
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly ResumeManifestEntry[];
}

interface MutableManifest {
  readonly sections: ResumeSectionOrder[];
  readonly entities: ResumeEntityOrder[];
  readonly entries: ResumeManifestEntry[];
  readonly entityKeys: Set<string>;
  readonly factIds: Set<string>;
  readonly factPaths: Set<string>;
}

interface SectionContext {
  readonly key: ResumeSectionKey;
  readonly order: ResumeSectionRank;
}

type SnapshotResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false }>;

type OwnRecord = Record<string, unknown>;

const SOURCE_KEYS = ['profile', 'approval'] as const;
const APPROVAL_KEYS = [
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
const RESUME_BASE_KEYS = [
  'identity',
  'resumeSummary',
  'detailedIntro',
  'contactActions',
  'skillGroups',
  'experiences',
  'achievements',
  'projectSummaries',
] as const;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const YEAR_PATTERN = /^\d{4}$/;
const YEAR_MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/**
 * Production manifest boundary. A caller cannot substitute a merely
 * `ValidatedProfile` or a page-local `ResumeProfile` for the approved source.
 */
export async function buildApprovedResumeManifest(
  source: FactApprovedProfile,
): Promise<ValidationResult<ResumeFactManifest>> {
  if (!hasVerifiedFactApprovalCapability(source)) {
    return sourceFailure();
  }

  try {
    const profile = inspectApprovedResumeProfile(source);
    if (profile === null) {
      return sourceFailure();
    }

    return buildResumeManifestForTest(profile);
  } catch {
    return sourceFailure();
  }
}

/**
 * Pure owner-local seam for generated projection tests. Production consumers
 * must call `buildApprovedResumeManifest`.
 *
 * @internal
 */
export async function buildResumeManifestForTest(
  profile: ResumeProfile,
): Promise<ValidationResult<ResumeFactManifest>> {
  try {
    const snapshot = snapshotOwnedData(profile);
    if (!snapshot.ok || !isPlainRecord(snapshot.value)) {
      return sourceFailure();
    }

    const safeProfile = snapshot.value as unknown as ResumeProfile;
    const parts = buildManifestParts(safeProfile);
    const sourceIdentity = await digestProfileSource(safeProfile);
    if (!sourceIdentity.ok) {
      return sourceFailure();
    }

    const fingerprint = await digestResumeFactManifest({
      sourceIdentity: sourceIdentity.value,
      sectionOrder: parts.sectionOrder,
      entityOrder: parts.entityOrder,
      entries: parts.entries,
    });
    if (!fingerprint.ok) {
      return sourceFailure();
    }

    return Object.freeze({
      ok: true,
      value: deepFreezeOwned({
        schemaVersion: RESUME_MANIFEST_SCHEMA_VERSION,
        sourceIdentity: sourceIdentity.value,
        sectionOrder: parts.sectionOrder,
        entityOrder: parts.entityOrder,
        entries: parts.entries,
        fingerprint: fingerprint.value,
      }) as ResumeFactManifest,
    });
  } catch {
    return sourceFailure();
  }
}

/**
 * Exact ordered structural comparison. It intentionally does not accept a set
 * match, a core subset, or a flat-text approximation.
 */
export function compareResumeFactManifests(
  expected: ResumeFactManifest,
  candidate: unknown,
): ValidationResult<ResumeFactManifest> {
  try {
    const expectedSnapshot = snapshotOwnedData(expected);
    const candidateSnapshot = snapshotOwnedData(candidate);
    if (
      !expectedSnapshot.ok ||
      !candidateSnapshot.ok ||
      !isResumeManifestSnapshot(expectedSnapshot.value) ||
      !deepStructuralEqual(expectedSnapshot.value, candidateSnapshot.value)
    ) {
      return parityFailure();
    }

    return Object.freeze({
      ok: true,
      value: expectedSnapshot.value as unknown as ResumeFactManifest,
    });
  } catch {
    return parityFailure();
  }
}

function inspectApprovedResumeProfile(
  source: FactApprovedProfile,
): ResumeProfile | null {
  const snapshot = snapshotOwnedData(source);
  if (!snapshot.ok || !isPlainRecord(snapshot.value)) {
    return null;
  }

  const sourceRecord = snapshot.value;
  if (!hasExactKeys(sourceRecord, SOURCE_KEYS)) {
    return null;
  }

  const approval = sourceRecord.approval;
  if (!isValidApprovalIdentity(approval)) {
    return null;
  }

  if (!isPlainRecord(sourceRecord.profile)) {
    return null;
  }

  const validation = validateProfile(
    sourceRecord.profile as unknown as ProfileData,
  );
  if (!validation.ok) {
    return null;
  }

  return selectResumeProfile(validation.value);
}

function isValidApprovalIdentity(value: unknown): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, APPROVAL_KEYS)) {
    return false;
  }

  // These four identifiers are minted by the fact-approval module, so its rule
  // is the one that decides whether they are well formed. The local
  // `isIdentifier` slug pattern is deliberately not used here: it accepts only
  // lowercase, which rejected the uppercase decision audit ID that the approval
  // process actually issues, and made every approved manifest unbuildable.
  // `isIdentifier` still governs fact and entity IDs below, where slugs are
  // correct.
  return (
    value.schemaVersion === FACT_APPROVAL_SCHEMA_VERSION &&
    isCanonicalApprovalIdentifier(value.receiptId) &&
    isCanonicalApprovalIdentifier(value.inventoryRevision) &&
    isSha256(value.inventoryDigest) &&
    isCanonicalApprovalIdentifier(value.productionDiffRevision) &&
    isSha256(value.productionDiffDigest) &&
    isSha256(value.approvedRecordsDigest) &&
    isSha256(value.materializedProfileDigest) &&
    value.decision === 'Approved' &&
    isCanonicalApprovalIdentifier(value.decisionAuditId) &&
    isTimestamp(value.decisionRecordedAt)
  );
}

function buildManifestParts(profile: ResumeProfile): ManifestParts {
  assertResumeProfileShape(profile);

  const state: MutableManifest = {
    sections: [],
    entities: [],
    entries: [],
    entityKeys: new Set(),
    factIds: new Set(),
    factPaths: new Set(),
  };

  const intro = addSection(state, 'intro-contact', 1);
  addStringFact(
    state,
    intro,
    null,
    profile.identity.name,
    'profile.identity.name',
    'text',
  );
  addStringFact(
    state,
    intro,
    null,
    profile.identity.headline,
    'profile.identity.headline',
    'text',
  );
  addStringFact(
    state,
    intro,
    null,
    profile.resumeSummary,
    'profile.narrative.resumeSummary',
    'text',
  );
  addContentBlocks(
    state,
    intro,
    null,
    profile.detailedIntro,
    'profile.narrative.detailedIntro',
    true,
  );
  addStringFact(
    state,
    intro,
    null,
    profile.contactActions.email,
    'profile.contact.email',
    'email',
  );
  addStringFact(
    state,
    intro,
    null,
    profile.contactActions.github,
    'profile.contact.github',
    'github-url',
  );
  addEvidenceLinks(
    state,
    intro,
    profile.contactActions.additionalLinks,
    'profile.contact.additionalLinks',
    null,
  );

  const skills = addSection(state, 'skills', 2);
  for (const group of profile.skillGroups) {
    const groupEntity = addEntity(
      state,
      skills,
      'skill-group',
      group.id,
      group.order,
      null,
    );
    addStringFact(
      state,
      skills,
      groupEntity,
      group.title,
      `profile.skillGroups[id=${group.id}].title`,
      'text',
    );

    for (const skill of group.skills) {
      const skillEntity = addEntity(
        state,
        skills,
        'skill',
        skill.id,
        skill.order,
        entityParent(groupEntity),
      );
      addStringFact(
        state,
        skills,
        skillEntity,
        skill.name,
        `profile.skillGroups[id=${group.id}].skills[id=${skill.id}].name`,
        'text',
      );
    }
  }

  const highlights = addSection(state, 'highlights', 3);
  for (const experience of profile.experiences) {
    const entity = addEntity(
      state,
      highlights,
      'experience',
      experience.id,
      experience.order,
      null,
    );
    const base = `profile.experiences[id=${experience.id}]`;
    addStringFact(
      state,
      highlights,
      entity,
      experience.role,
      `${base}.role`,
      'text',
    );
    addStringFact(
      state,
      highlights,
      entity,
      experience.organization,
      `${base}.organization`,
      'text',
    );
    addPeriodFact(
      state,
      highlights,
      entity,
      experience.period,
      `${base}.period`,
    );
    addStringFact(
      state,
      highlights,
      entity,
      experience.summary,
      `${base}.summary`,
      'text',
    );
    addContentBlocks(
      state,
      highlights,
      entity,
      experience.details,
      `${base}.details`,
      true,
    );
    addEvidenceLinks(
      state,
      highlights,
      experience.evidence,
      `${base}.evidence`,
      entityParent(entity),
    );
  }

  for (const achievement of profile.achievements) {
    const entity = addEntity(
      state,
      highlights,
      'achievement',
      achievement.id,
      achievement.order,
      null,
    );
    const base = `profile.achievements[id=${achievement.id}]`;
    addStringFact(
      state,
      highlights,
      entity,
      achievement.title,
      `${base}.title`,
      'text',
    );
    if (achievement.period !== undefined) {
      addPeriodFact(
        state,
        highlights,
        entity,
        achievement.period,
        `${base}.period`,
      );
    }
    addStringFact(
      state,
      highlights,
      entity,
      achievement.summary,
      `${base}.summary`,
      'text',
    );
    addContentBlocks(
      state,
      highlights,
      entity,
      achievement.details,
      `${base}.details`,
      true,
    );
    addEvidenceLinks(
      state,
      highlights,
      achievement.evidence,
      `${base}.evidence`,
      entityParent(entity),
    );
  }

  const projects = addSection(state, 'project-summaries', 4);
  for (const project of profile.projectSummaries) {
    const entity = addEntity(
      state,
      projects,
      'project',
      project.id,
      project.order,
      null,
    );
    const base = `profile.projects[id=${project.id}]`;
    addStringFact(
      state,
      projects,
      entity,
      project.title,
      `${base}.title`,
      'text',
    );
    if (project.period !== undefined) {
      addPeriodFact(
        state,
        projects,
        entity,
        project.period,
        `${base}.period`,
      );
    }
    addStringFact(
      state,
      projects,
      entity,
      project.outcomeSummary,
      `${base}.outcomeSummary`,
      'text',
    );
  }

  if (profile.education !== undefined) {
    const educationSection = addSection(state, 'education', 5);
    for (const education of profile.education) {
      const entity = addEntity(
        state,
        educationSection,
        'education',
        education.id,
        education.order,
        null,
      );
      const base = `profile.education[id=${education.id}]`;
      addStringFact(
        state,
        educationSection,
        entity,
        education.title,
        `${base}.title`,
        'text',
      );
      if (education.subtitle !== undefined) {
        addStringFact(
          state,
          educationSection,
          entity,
          education.subtitle,
          `${base}.subtitle`,
          'text',
        );
      }
      if (education.period !== undefined) {
        addPeriodFact(
          state,
          educationSection,
          entity,
          education.period,
          `${base}.period`,
        );
      }
      addContentBlocks(
        state,
        educationSection,
        entity,
        education.details,
        `${base}.details`,
        false,
      );
      addEvidenceLinks(
        state,
        educationSection,
        education.evidence,
        `${base}.evidence`,
        entityParent(entity),
      );
    }
  }

  if (profile.certifications !== undefined) {
    const certificationSection = addSection(state, 'certifications', 6);
    for (const certification of profile.certifications) {
      const entity = addEntity(
        state,
        certificationSection,
        'certification',
        certification.id,
        certification.order,
        null,
      );
      const base =
        `profile.certifications[id=${certification.id}]`;
      addStringFact(
        state,
        certificationSection,
        entity,
        certification.title,
        `${base}.title`,
        'text',
      );
      if (certification.issuer !== undefined) {
        addStringFact(
          state,
          certificationSection,
          entity,
          certification.issuer,
          `${base}.issuer`,
          'text',
        );
      }
      if (certification.period !== undefined) {
        addPeriodFact(
          state,
          certificationSection,
          entity,
          certification.period,
          `${base}.period`,
        );
      }
      addContentBlocks(
        state,
        certificationSection,
        entity,
        certification.details,
        `${base}.details`,
        false,
      );
      addEvidenceLinks(
        state,
        certificationSection,
        certification.evidence,
        `${base}.evidence`,
        entityParent(entity),
      );
    }
  }

  return Object.freeze({
    sectionOrder: freezeArray(state.sections),
    entityOrder: freezeArray(state.entities),
    entries: freezeArray(state.entries),
  });
}

function addSection(
  state: MutableManifest,
  key: ResumeSectionKey,
  order: ResumeSectionRank,
): SectionContext {
  const canonical = RESUME_SECTION_ORDER[order - 1];
  if (canonical?.key !== key || canonical.order !== order) {
    throw new TypeError('Invalid résumé section identity.');
  }

  const section = Object.freeze({ key, order });
  state.sections.push(section);
  return section;
}

function addEntity<Kind extends EntityKind>(
  state: MutableManifest,
  section: SectionContext,
  kind: Kind,
  id: EntityId<Kind>,
  order: DisplayOrder,
  parent: ResumeEntityParent | null,
): ResumeEntityIdentity {
  assertIdentifier(id);
  assertDisplayOrder(order);

  const identityKey = `${kind}\u0000${id}`;
  if (state.entityKeys.has(identityKey)) {
    throw new TypeError('Duplicate résumé entity identity.');
  }
  state.entityKeys.add(identityKey);

  const entity = Object.freeze({
    kind,
    id: id as EntityId<EntityKind>,
    order,
  });
  state.entities.push(
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

function entityParent(
  entity: ResumeEntityIdentity,
): ResumeEntityParent {
  return Object.freeze({
    kind: entity.kind,
    id: entity.id,
  });
}

function addStringFact<Value extends string>(
  state: MutableManifest,
  section: SectionContext,
  entity: ResumeEntityIdentity | null,
  fact: PublicFact<Value>,
  rawPath: string,
  valueKind: Exclude<ResumeManifestValueKind, 'period'>,
): void {
  assertFact(fact);
  assertNormalizedString(fact.value);
  addEntry(
    state,
    section,
    entity,
    fact.factId,
    rawPath,
    valueKind,
    fact.value,
  );
}

function addPeriodFact(
  state: MutableManifest,
  section: SectionContext,
  entity: ResumeEntityIdentity,
  fact: PublicFact<Period>,
  rawPath: string,
): void {
  assertFact(fact);
  addEntry(
    state,
    section,
    entity,
    fact.factId,
    rawPath,
    'period',
    serializePeriod(fact.value),
  );
}

function addContentBlocks(
  state: MutableManifest,
  section: SectionContext,
  entity: ResumeEntityIdentity | null,
  blocks: readonly ContentBlock[],
  base: string,
  required: boolean,
): void {
  assertDenseArray(blocks);
  if (required && blocks.length === 0) {
    throw new TypeError('Required résumé detail blocks are empty.');
  }

  blocks.forEach((block, blockIndex) => {
    assertPlainRecord(block);
    if (block.tag === 'paragraph') {
      assertExactKeys(block, ['tag', 'text']);
      addStringFact(
        state,
        section,
        entity,
        block.text,
        `${base}[${blockIndex}].text`,
        'text',
      );
      return;
    }

    if (block.tag !== 'list') {
      throw new TypeError('Invalid résumé content block.');
    }
    assertExactKeys(block, ['tag', 'style', 'items']);
    if (block.style !== 'ordered' && block.style !== 'unordered') {
      throw new TypeError('Invalid résumé list style.');
    }
    assertDenseArray(block.items);
    if (block.items.length === 0) {
      throw new TypeError('Résumé list block is empty.');
    }
    block.items.forEach((item, itemIndex) => {
      addStringFact(
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

function addEvidenceLinks(
  state: MutableManifest,
  section: SectionContext,
  links: readonly EvidenceLink[],
  base: string,
  parent: ResumeEntityParent | null,
): void {
  assertStrictOrder(links);

  for (const link of links) {
    assertExactKeys(link, ['id', 'order', 'label', 'destination']);
    const entity = addEntity(
      state,
      section,
      'evidence-link',
      link.id,
      link.order,
      parent,
    );
    const linkBase = `${base}[id=${link.id}]`;
    addStringFact(
      state,
      section,
      entity,
      link.label,
      `${linkBase}.label`,
      'text',
    );
    addDestinationFact(
      state,
      section,
      entity,
      link.destination,
      `${linkBase}.destination`,
    );
  }
}

function addDestinationFact(
  state: MutableManifest,
  section: SectionContext,
  entity: ResumeEntityIdentity,
  fact: EvidenceLink['destination'],
  rawPath: string,
): void {
  assertFact(fact);
  assertPlainRecord(fact.value);
  assertExactKeys(fact.value, ['tag', 'value']);
  assertNormalizedString(fact.value.value);

  if (fact.value.tag === 'external') {
    addEntry(
      state,
      section,
      entity,
      fact.factId,
      rawPath,
      'external-url',
      fact.value.value,
    );
    return;
  }
  if (fact.value.tag === 'internal') {
    addEntry(
      state,
      section,
      entity,
      fact.factId,
      rawPath,
      'internal-path',
      fact.value.value,
    );
    return;
  }
  throw new TypeError('Invalid résumé evidence destination.');
}

function addEntry(
  state: MutableManifest,
  section: SectionContext,
  entity: ResumeEntityIdentity | null,
  factId: FactId,
  rawPath: string,
  valueKind: ResumeManifestValueKind,
  normalizedValue: string,
): void {
  assertIdentifier(factId);
  if (state.factIds.has(factId)) {
    throw new TypeError('Duplicate résumé fact identity.');
  }
  state.factIds.add(factId);

  const path = factCanonicalPath(rawPath);
  if (state.factPaths.has(path)) {
    throw new TypeError('Duplicate résumé fact path.');
  }
  state.factPaths.add(path);

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
      path,
      valueKind,
      normalizedValue,
    }),
  );
}

function serializePeriod(period: Period): string {
  assertPlainRecord(period);
  assertExactKeys(period, ['start', 'end']);
  const start = serializeDatePoint(period.start);
  assertPlainRecord(period.end);

  if (period.end.tag === 'present') {
    assertExactKeys(period.end, ['tag']);
    return `start:${start}|end:present`;
  }

  const end = serializeDatePoint(period.end);
  if (
    period.start.tag !== period.end.tag ||
    period.end.value < period.start.value
  ) {
    throw new TypeError('Invalid résumé period range.');
  }
  return `start:${start}|end:${end}`;
}

function serializeDatePoint(
  point: Period['start'],
): string {
  assertPlainRecord(point);
  assertExactKeys(point, ['tag', 'value']);

  if (point.tag === 'year' && YEAR_PATTERN.test(point.value)) {
    return `year:${point.value}`;
  }
  if (
    point.tag === 'year-month' &&
    YEAR_MONTH_PATTERN.test(point.value)
  ) {
    return `year-month:${point.value}`;
  }
  throw new TypeError('Invalid résumé period point.');
}

function assertResumeProfileShape(profile: ResumeProfile): void {
  assertPlainRecord(profile);
  const optionalKeys: string[] = [];
  if (hasOwn(profile, 'education')) {
    optionalKeys.push('education');
  }
  if (hasOwn(profile, 'certifications')) {
    optionalKeys.push('certifications');
  }
  assertExactKeys(profile, [...RESUME_BASE_KEYS, ...optionalKeys]);

  assertPlainRecord(profile.identity);
  assertExactKeys(profile.identity, ['name', 'headline']);
  assertPlainRecord(profile.contactActions);
  assertExactKeys(profile.contactActions, [
    'email',
    'github',
    'additionalLinks',
  ]);

  assertDenseArray(profile.detailedIntro);
  if (profile.detailedIntro.length === 0) {
    throw new TypeError('Résumé introduction is empty.');
  }
  assertStrictOrder(profile.contactActions.additionalLinks);
  assertStrictOrder(profile.skillGroups);
  if (profile.skillGroups.length === 0) {
    throw new TypeError('Résumé skills are empty.');
  }
  for (const group of profile.skillGroups) {
    assertExactKeys(group, ['id', 'order', 'title', 'skills']);
    assertStrictOrder(group.skills);
    if (group.skills.length === 0) {
      throw new TypeError('Résumé skill group is empty.');
    }
    for (const skill of group.skills) {
      assertExactKeys(skill, ['id', 'order', 'name']);
    }
  }

  assertStrictOrder(profile.experiences);
  assertStrictOrder(profile.achievements);
  if (profile.experiences.length + profile.achievements.length === 0) {
    throw new TypeError('Résumé highlights are empty.');
  }
  for (const experience of profile.experiences) {
    assertExactKeys(experience, [
      'id',
      'order',
      'organization',
      'role',
      'period',
      'summary',
      'details',
      'evidence',
    ]);
  }
  for (const achievement of profile.achievements) {
    assertOptionalEntityKeys(
      achievement,
      ['id', 'order', 'title', 'summary', 'details', 'evidence'],
      ['period'],
    );
  }

  assertStrictOrder(profile.projectSummaries);
  if (
    profile.projectSummaries.length < 3 ||
    profile.projectSummaries.length > 6
  ) {
    throw new TypeError('Résumé project summary count is invalid.');
  }
  for (const project of profile.projectSummaries) {
    assertOptionalEntityKeys(
      project,
      ['id', 'order', 'title', 'outcomeSummary'],
      ['period'],
    );
  }

  if (hasOwn(profile, 'education')) {
    if (profile.education === undefined) {
      throw new TypeError('Résumé education cannot be explicitly undefined.');
    }
    assertStrictOrder(profile.education);
    if (profile.education.length === 0) {
      throw new TypeError('Résumé education section is empty.');
    }
    for (const education of profile.education) {
      assertOptionalEntityKeys(
        education,
        ['id', 'order', 'title', 'details', 'evidence'],
        ['subtitle', 'period'],
      );
    }
  }

  if (hasOwn(profile, 'certifications')) {
    if (profile.certifications === undefined) {
      throw new TypeError(
        'Résumé certifications cannot be explicitly undefined.',
      );
    }
    assertStrictOrder(profile.certifications);
    if (profile.certifications.length === 0) {
      throw new TypeError('Résumé certification section is empty.');
    }
    for (const certification of profile.certifications) {
      assertOptionalEntityKeys(
        certification,
        ['id', 'order', 'title', 'details', 'evidence'],
        ['issuer', 'period'],
      );
    }
  }
}

function assertOptionalEntityKeys(
  value: object,
  required: readonly string[],
  optional: readonly string[],
): void {
  const presentOptional = optional.filter((key) => hasOwn(value, key));
  for (const key of presentOptional) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      descriptor.value === undefined
    ) {
      throw new TypeError('Optional résumé field is invalid.');
    }
  }
  assertExactKeys(value, [...required, ...presentOptional]);
}

function assertStrictOrder<
  Value extends Readonly<{ id: string; order: number }>,
>(values: readonly Value[]): void {
  assertDenseArray(values);
  let previous = 0;
  for (const value of values) {
    assertPlainRecord(value);
    assertIdentifier(value.id);
    assertDisplayOrder(value.order);
    if (value.order <= previous) {
      throw new TypeError('Résumé entity order is not canonical.');
    }
    previous = value.order;
  }
}

function assertFact<Value>(
  fact: PublicFact<Value>,
): void {
  assertPlainRecord(fact);
  assertExactKeys(fact, ['factId', 'value']);
  assertIdentifier(fact.factId);
}

function assertNormalizedString(value: unknown): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.normalize('NFC') ||
    value.trim() !== value ||
    /\r/.test(value)
  ) {
    throw new TypeError('Résumé fact value is not normalized.');
  }
}

function assertDisplayOrder(
  value: unknown,
): asserts value is DisplayOrder {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError('Invalid résumé display order.');
  }
}

function assertIdentifier(
  value: unknown,
): asserts value is FactId {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    throw new TypeError('Invalid résumé stable identifier.');
  }
}

function assertPlainRecord(
  value: unknown,
): asserts value is OwnRecord {
  if (!isPlainRecord(value)) {
    throw new TypeError('Expected a plain résumé record.');
  }
}

function assertDenseArray(
  value: unknown,
): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Expected a résumé array.');
  }
}

function assertExactKeys(
  value: object,
  keys: readonly string[],
): void {
  if (!hasExactKeys(value, keys)) {
    throw new TypeError('Unexpected résumé record shape.');
  }
}

function isResumeManifestSnapshot(
  value: unknown,
): boolean {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'sourceIdentity',
      'sectionOrder',
      'entityOrder',
      'entries',
      'fingerprint',
    ]) ||
    value.schemaVersion !== RESUME_MANIFEST_SCHEMA_VERSION ||
    !isCanonicalDigestSnapshot(
      value.sourceIdentity,
      PROFILE_SOURCE_DIGEST_DOMAIN,
    ) ||
    !isCanonicalDigestSnapshot(
      value.fingerprint,
      RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
    ) ||
    !Array.isArray(value.sectionOrder) ||
    !Array.isArray(value.entityOrder) ||
    !Array.isArray(value.entries)
  ) {
    return false;
  }

  const sections = value.sectionOrder;
  if (sections.length < 4 || sections.length > 6) {
    return false;
  }
  const presentSections = new Map<string, number>();
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    if (
      !isPlainRecord(section) ||
      !hasExactKeys(section, ['key', 'order']) ||
      typeof section.key !== 'string' ||
      typeof section.order !== 'number' ||
      !isResumeSection(section.key, section.order)
    ) {
      return false;
    }
    if (index < 4 && section.order !== index + 1) {
      return false;
    }
    const previousOrder =
      index === 0 || !isPlainRecord(sections[index - 1])
        ? 0
        : sections[index - 1].order;
    if (
      index >= 4 &&
      (typeof previousOrder !== 'number' ||
        section.order <= previousOrder ||
        section.order < 5)
    ) {
      return false;
    }
    presentSections.set(section.key, section.order);
  }

  const entityKeys = new Set<string>();
  for (const entity of value.entityOrder) {
    if (
      !isPlainRecord(entity) ||
      !hasExactKeys(entity, [
        'sectionKey',
        'sectionOrder',
        'kind',
        'id',
        'order',
        'parent',
      ]) ||
      !isEntityKind(entity.kind) ||
      !isIdentifier(entity.id) ||
      !isPositiveInteger(entity.order) ||
      presentSections.get(String(entity.sectionKey)) !== entity.sectionOrder ||
      !isEntityParentSnapshot(entity.parent)
    ) {
      return false;
    }
    const key = `${entity.kind}\u0000${entity.id}`;
    if (entityKeys.has(key)) {
      return false;
    }
    entityKeys.add(key);
  }

  const factIds = new Set<string>();
  const paths = new Set<string>();
  for (let index = 0; index < value.entries.length; index += 1) {
    const entry = value.entries[index];
    if (
      !isPlainRecord(entry) ||
      !hasExactKeys(entry, [
        'entryOrder',
        'sectionKey',
        'sectionOrder',
        'entity',
        'factId',
        'path',
        'valueKind',
        'normalizedValue',
      ]) ||
      entry.entryOrder !== index + 1 ||
      presentSections.get(String(entry.sectionKey)) !== entry.sectionOrder ||
      !isEntityIdentitySnapshot(entry.entity) ||
      !isIdentifier(entry.factId) ||
      typeof entry.path !== 'string' ||
      !isManifestValueKind(entry.valueKind) ||
      typeof entry.normalizedValue !== 'string' ||
      entry.normalizedValue.length === 0
    ) {
      return false;
    }
    try {
      factCanonicalPath(entry.path);
    } catch {
      return false;
    }
    if (factIds.has(entry.factId) || paths.has(entry.path)) {
      return false;
    }
    factIds.add(entry.factId);
    paths.add(entry.path);
  }

  return value.entries.length > 0;
}

function isCanonicalDigestSnapshot(
  value: unknown,
  domain: string,
): boolean {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, [
      'domain',
      'schemaVersion',
      'algorithm',
      'digest',
    ]) &&
    value.domain === domain &&
    value.schemaVersion === 1 &&
    value.algorithm === 'sha256' &&
    isSha256(value.digest)
  );
}

function isEntityParentSnapshot(value: unknown): boolean {
  return (
    value === null ||
    (isPlainRecord(value) &&
      hasExactKeys(value, ['kind', 'id']) &&
      isEntityKind(value.kind) &&
      isIdentifier(value.id))
  );
}

function isEntityIdentitySnapshot(value: unknown): boolean {
  return (
    value === null ||
    (isPlainRecord(value) &&
      hasExactKeys(value, ['kind', 'id', 'order']) &&
      isEntityKind(value.kind) &&
      isIdentifier(value.id) &&
      isPositiveInteger(value.order))
  );
}

function isEntityKind(value: unknown): value is EntityKind {
  return (
    value === 'skill-group' ||
    value === 'skill' ||
    value === 'experience' ||
    value === 'achievement' ||
    value === 'project' ||
    value === 'education' ||
    value === 'certification' ||
    value === 'evidence-link'
  );
}

function isManifestValueKind(
  value: unknown,
): value is ResumeManifestValueKind {
  return (
    value === 'text' ||
    value === 'email' ||
    value === 'github-url' ||
    value === 'external-url' ||
    value === 'internal-path' ||
    value === 'period'
  );
}

function isResumeSection(
  key: string,
  order: unknown,
): boolean {
  return RESUME_SECTION_ORDER.some(
    (section) => section.key === key && section.order === order,
  );
}

function snapshotOwnedData(value: unknown): SnapshotResult {
  try {
    return snapshotOwnedDataInternal(value, new WeakSet<object>());
  } catch {
    return Object.freeze({ ok: false });
  }
}

function snapshotOwnedDataInternal(
  value: unknown,
  ancestors: WeakSet<object>,
): SnapshotResult {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return Object.freeze({ ok: true, value });
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? Object.freeze({ ok: true, value })
      : Object.freeze({ ok: false });
  }
  if (typeof value !== 'object' || ancestors.has(value)) {
    return Object.freeze({ ok: false });
  }

  ancestors.add(value);
  const result = Array.isArray(value)
    ? snapshotArray(value, ancestors)
    : snapshotRecord(value, ancestors);
  ancestors.delete(value);
  return result;
}

function snapshotArray(
  value: readonly unknown[],
  ancestors: WeakSet<object>,
): SnapshotResult {
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > 10_000
  ) {
    return Object.freeze({ ok: false });
  }

  const length = lengthDescriptor.value as number;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    keys.some(
      (key) =>
        typeof key !== 'string' ||
        (key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key)),
    )
  ) {
    return Object.freeze({ ok: false });
  }

  const output: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      descriptor.enumerable !== true
    ) {
      return Object.freeze({ ok: false });
    }
    const child = snapshotOwnedDataInternal(descriptor.value, ancestors);
    if (!child.ok) {
      return child;
    }
    output.push(child.value);
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze(output),
  });
}

function snapshotRecord(
  value: object,
  ancestors: WeakSet<object>,
): SnapshotResult {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return Object.freeze({ ok: false });
  }

  const keys = Reflect.ownKeys(value);
  if (
    keys.length > 1_000 ||
    keys.some((key) => typeof key !== 'string')
  ) {
    return Object.freeze({ ok: false });
  }

  const output: OwnRecord = Object.create(null);
  for (const key of keys) {
    if (typeof key !== 'string') {
      return Object.freeze({ ok: false });
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      descriptor.enumerable !== true
    ) {
      return Object.freeze({ ok: false });
    }
    const child = snapshotOwnedDataInternal(descriptor.value, ancestors);
    if (!child.ok) {
      return child;
    }
    output[key] = child.value;
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze(output),
  });
}

function deepStructuralEqual(
  left: unknown,
  right: unknown,
): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) =>
        deepStructuralEqual(value, right[index]),
      )
    );
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key) => !hasOwn(right, key))
  ) {
    return false;
  }
  return leftKeys.every((key) =>
    deepStructuralEqual(
      (left as OwnRecord)[key],
      (right as OwnRecord)[key],
    ),
  );
}

function hasExactKeys(
  value: object,
  expected: readonly string[],
): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key)) &&
    keys.every((key) => typeof key === 'string')
  );
}

function isPlainRecord(value: unknown): value is OwnRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value);
}

function isSha256(value: unknown): value is string {
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

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function freezeArray<Value>(
  values: readonly Value[],
): readonly Value[] {
  return Object.freeze([...values]);
}

function deepFreezeOwned<Value>(value: Value): Value {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreezeOwned(child);
  }
  return Object.freeze(value);
}

function sourceFailure(): ValidationResult<never> {
  return failure(
    createValidationIssue(
      'document.source.invalid',
      'profile.document.source',
    ),
  );
}

function parityFailure(): ValidationResult<never> {
  return failure(
    createValidationIssue(
      'document.parity',
      'profile.document.parity',
    ),
  );
}

function failure(
  issue: ValidationIssue,
): ValidationResult<never> {
  return Object.freeze({
    ok: false,
    issues: Object.freeze([issue]) as readonly [
      ValidationIssue,
      ...ValidationIssue[],
    ],
  });
}
