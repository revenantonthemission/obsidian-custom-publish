import { test } from '@fast-check/vitest';
import { expect } from 'vitest';

import {
  assembleFactApprovedProfile,
  assembleValidatedProfile,
} from '../../../src/lib/profile/assembly.js';
import {
  collectMaterializedFacts,
  validateFactApproval,
} from '../../../src/lib/profile/fact-approval.js';
import type {
  MaterializedFact,
} from '../../../src/lib/profile/fact-approval.js';
import {
  buildApprovedPortfolioMetadata,
  buildApprovedResumeMetadata,
} from '../../../src/lib/profile/metadata.js';
import type { SiteIdentity } from '../../../src/lib/profile/metadata.js';
import {
  normalizeProfile,
  normalizeText,
} from '../../../src/lib/profile/normalization.js';
import {
  productionProfileTesting,
} from '../../../src/lib/profile/production-profile.js';
import {
  selectHomepageProfile,
  selectPortfolioProfile,
  selectResumeProfile,
} from '../../../src/lib/profile/selectors.js';
import type {
  FactApprovedProfile,
  ProfileData,
  ValidatedProfile,
} from '../../../src/lib/profile/types.js';
import { validateProfile } from '../../../src/lib/profile/validation.js';
import {
  invalidSyntheticFactApprovalArbitrary,
  syntheticFactApprovalArbitrary,
} from './arbitraries/approval.js';
import { siteIdentityArbitrary } from './arbitraries/metadata.js';
import {
  invalidProfileCaseArbitrary,
  unicodeTextArbitrary,
  validProfileArbitrary,
  validProfileProjectionsArbitrary,
} from './arbitraries/profile.js';

test.prop([unicodeTextArbitrary, validProfileArbitrary])(
  'PBT-U1-DOMAIN: normalization is idempotent for Unicode text and complete profiles',
  (text, profile) => {
    const expectedText = text
      .trim()
      .replace(/\r\n?/g, '\n')
      .normalize('NFC');
    const inputSnapshot = structuredClone(profile);

    const once = normalizeText(text);
    const normalizedProfile = normalizeProfile(profile);

    expect(once).toBe(expectedText);
    expect(normalizeText(once)).toBe(once);
    expect(once).not.toContain('\r');
    expect(once).toBe(once.normalize('NFC'));
    expect(
      normalizeProfile(normalizedProfile as unknown as ProfileData),
    ).toEqual(normalizedProfile);
    expect(profile).toEqual(inputSnapshot);
  },
);

test.prop([validProfileArbitrary])(
  'PBT-U1-DOMAIN: complete generated aggregates validate without mutating input',
  (profile) => {
    const inputSnapshot = structuredClone(profile);
    const result = validateProfile(profile);

    expect(profile).toEqual(inputSnapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(formatDiagnostics(result.issues));
    }

    expect(result.value.projects).toHaveLength(profile.projects.length);
    expect(result.value.projects.length).toBeGreaterThanOrEqual(3);
    expect(result.value.projects.length).toBeLessThanOrEqual(6);
    expect(result.value.skillGroups.length).toBeGreaterThan(0);
    expect(
      result.value.experiences.length + result.value.achievements.length,
    ).toBeGreaterThan(0);
    expect(allSiblingOrdersArePositiveAndUnique(result.value)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.projects)).toBe(true);
  },
);

test.prop([validProfileArbitrary])(
  'PBT-U1-DOMAIN: materialized approval identity is deterministic under ordered source permutations',
  (profile) => {
    const inputSnapshot = structuredClone(profile);
    const permuted = reverseOrderedSources(profile);

    const first = productionProfileTesting.materialize(profile);
    const second = productionProfileTesting.materialize(permuted);
    const third = productionProfileTesting.materialize(
      structuredClone(profile),
    );

    expect(first.materializedProfileDigest).toBe(
      second.materializedProfileDigest,
    );
    expect(first.materializedProfileDigest).toBe(
      third.materializedProfileDigest,
    );
    expect(first.facts.map(factOperation)).toEqual(
      second.facts.map(factOperation),
    );
    expect(first.structuralDecisions).toEqual(
      second.structuralDecisions,
    );
    expect(profile).toEqual(inputSnapshot);
  },
);

test.prop([invalidProfileCaseArbitrary])(
  'PBT-U1-DOMAIN: one labelled mutation yields exactly its stable diagnostic and no partial value',
  ({ expected, profile }) => {
    const inputSnapshot = structuredClone(profile);
    const result = validateProfile(profile);

    expect(profile).toEqual(inputSnapshot);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('A controlled-invalid profile unexpectedly validated');
    }

    expect(
      result.issues.map(({ code, path }) => ({ code, path })),
    ).toEqual(expected);
    expect('value' in result).toBe(false);
  },
);

test.prop([validProfileProjectionsArbitrary])(
  'PBT-U1-DOMAIN: selectors sort sparse source orders and preserve every member',
  ({ validated, resume, portfolio }) => {
    expect(orderVector(resume.skillGroups)).toEqual(
      sortedOrderVector(validated.skillGroups),
    );
    for (const group of resume.skillGroups) {
      const source = validated.skillGroups.find(
        (candidate) => candidate.id === group.id,
      );
      expect(source).toBeDefined();
      expect(orderVector(group.skills)).toEqual(
        sortedOrderVector(source?.skills ?? []),
      );
    }

    expect(orderVector(resume.experiences)).toEqual(
      sortedOrderVector(validated.experiences),
    );
    expect(orderVector(resume.achievements)).toEqual(
      sortedOrderVector(validated.achievements),
    );
    expect(orderVector(resume.projectSummaries)).toEqual(
      sortedOrderVector(validated.projects),
    );
    expect(orderVector(portfolio.projects)).toEqual(
      sortedOrderVector(validated.projects),
    );
    expect(orderVector(resume.contactActions.additionalLinks)).toEqual(
      sortedOrderVector(validated.contact.additionalLinks),
    );
  },
);

test.prop([validProfileProjectionsArbitrary])(
  'PBT-U1-DOMAIN: optional values are omitted exactly while required projections remain',
  ({ validated, resume, portfolio }) => {
    expect(Object.hasOwn(resume, 'education')).toBe(
      validated.education.length > 0,
    );
    expect(Object.hasOwn(resume, 'certifications')).toBe(
      validated.certifications.length > 0,
    );
    expect(resume.contactActions.additionalLinks).toHaveLength(
      validated.contact.additionalLinks.length,
    );

    for (const experience of resume.experiences) {
      const source = validated.experiences.find(
        (candidate) => candidate.id === experience.id,
      );
      expect(source).toBeDefined();
      expect(experience.period).toEqual(source?.period);
      expect(experience.details.length).toBeGreaterThan(0);
      expect(experience.evidence).toHaveLength(
        source?.evidence.length ?? -1,
      );
    }

    for (const achievement of resume.achievements) {
      const source = validated.achievements.find(
        (candidate) => candidate.id === achievement.id,
      );
      expect(Object.hasOwn(achievement, 'period')).toBe(
        source?.period !== undefined,
      );
      expect(achievement.details.length).toBeGreaterThan(0);
      expect(achievement.evidence).toHaveLength(
        source?.evidence.length ?? -1,
      );
    }

    for (const project of portfolio.projects) {
      const source = validated.projects.find(
        (candidate) => candidate.id === project.id,
      );
      expect(Object.hasOwn(project, 'period')).toBe(
        source?.period !== undefined,
      );
      expect(Object.hasOwn(project, 'relatedProfileEntity')).toBe(
        source?.relatedProfileEntity !== undefined,
      );
      expect(project.dimensions.map((dimension) => dimension.key)).toEqual([
        'problem',
        'role',
        'keyDecisions',
        'architecture',
        'outcomes',
        'lessons',
      ]);
      expect(
        project.dimensions.every(
          (dimension) => dimension.blocks.length > 0,
        ),
      ).toBe(true);
      expect(project.evidence).toHaveLength(
        source?.evidence.length ?? -1,
      );
    }

    for (const education of resume.education ?? []) {
      const source = validated.education.find(
        (candidate) => candidate.id === education.id,
      );
      expect(source).toBeDefined();
      expect(Object.hasOwn(education, 'subtitle')).toBe(
        source?.subtitle !== undefined,
      );
      expect(Object.hasOwn(education, 'period')).toBe(
        source?.period !== undefined,
      );
      expect(education.details).toHaveLength(
        source?.details.length ?? -1,
      );
      expect(education.evidence).toHaveLength(
        source?.evidence.length ?? -1,
      );
    }

    for (const certification of resume.certifications ?? []) {
      const source = validated.certifications.find(
        (candidate) => candidate.id === certification.id,
      );
      expect(source).toBeDefined();
      expect(Object.hasOwn(certification, 'issuer')).toBe(
        source?.issuer !== undefined,
      );
      expect(Object.hasOwn(certification, 'period')).toBe(
        source?.period !== undefined,
      );
      expect(certification.details).toHaveLength(
        source?.details.length ?? -1,
      );
      expect(certification.evidence).toHaveLength(
        source?.evidence.length ?? -1,
      );
    }
  },
);

test.prop([validProfileProjectionsArbitrary])(
  'PBT-U1-DOMAIN: projected fact multisets are canonical subsets and controlled route-local changes do not affect unrelated projections',
  ({ input, validated, resume, portfolio, homepage }) => {
    const canonicalFacts = collectFactEntries(validated);
    const canonicalMultiset = factMultiset(canonicalFacts);
    expect(new Set(canonicalFacts.map((fact) => fact.factId)).size).toBe(
      canonicalFacts.length,
    );

    for (const projection of [resume, portfolio, homepage]) {
      const projectedFacts = collectFactEntries(projection);
      const projectedMultiset = factMultiset(projectedFacts);
      expect(multisetCardinality(projectedMultiset)).toBe(
        projectedFacts.length,
      );
      expect(
        new Set(projectedFacts.map((fact) => fact.factId)).size,
      ).toBe(projectedFacts.length);
      for (const [key, count] of projectedMultiset) {
        expect(canonicalMultiset.get(key) ?? 0).toBeGreaterThanOrEqual(
          count,
        );
      }
    }

    const portfolioChangedInput = structuredClone(input) as unknown as {
      narrative: { portfolioSummary: { value: string } };
    };
    portfolioChangedInput.narrative.portfolioSummary.value += ' 변경';
    const portfolioChanged = validateProfile(
      portfolioChangedInput as unknown as ProfileData,
    );
    expect(portfolioChanged.ok).toBe(true);
    if (!portfolioChanged.ok) {
      throw new Error(formatDiagnostics(portfolioChanged.issues));
    }

    expect(selectResumeProfile(portfolioChanged.value)).toEqual(resume);
    expect(selectHomepageProfile(portfolioChanged.value)).toEqual(
      homepage,
    );
    expect(
      selectPortfolioProfile(portfolioChanged.value),
    ).not.toEqual(portfolio);
    expect(
      selectPortfolioProfile(portfolioChanged.value).portfolioSummary.value,
    ).toBe(`${portfolio.portfolioSummary.value} 변경`);

    const resumeChangedInput = structuredClone(input) as unknown as {
      narrative: { resumeSummary: { value: string } };
    };
    resumeChangedInput.narrative.resumeSummary.value += ' 변경';
    const resumeChanged = validateProfile(
      resumeChangedInput as unknown as ProfileData,
    );
    expect(resumeChanged.ok).toBe(true);
    if (!resumeChanged.ok) {
      throw new Error(formatDiagnostics(resumeChanged.issues));
    }

    expect(selectPortfolioProfile(resumeChanged.value)).toEqual(
      portfolio,
    );
    expect(selectHomepageProfile(resumeChanged.value)).toEqual(homepage);
    expect(selectResumeProfile(resumeChanged.value)).not.toEqual(resume);
    expect(
      selectResumeProfile(resumeChanged.value).resumeSummary.value,
    ).toBe(`${resume.resumeSummary.value} 변경`);
  },
);

test.prop([validProfileArbitrary])(
  'PBT-U1-DOMAIN: multiple controlled violations return one stable sorted deduplicated issue set and no partial value',
  (profile) => {
    const invalidProfile = addMultipleControlledViolations(profile);
    const inputSnapshot = structuredClone(invalidProfile);
    const first = validateProfile(invalidProfile);
    const second = validateProfile(invalidProfile);

    expect(invalidProfile).toEqual(inputSnapshot);
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    if (first.ok || second.ok) {
      throw new Error('A multiple-invalid profile unexpectedly validated');
    }

    const firstIssues = first.issues.map(({ code, path }) => ({
      code,
      path,
    }));
    const secondIssues = second.issues.map(({ code, path }) => ({
      code,
      path,
    }));
    expect(firstIssues).toEqual(MULTIPLE_VIOLATION_ORACLE);
    expect(secondIssues).toEqual(firstIssues);
    expect(
      new Set(firstIssues.map(({ code, path }) => `${code}\u0000${path}`))
        .size,
    ).toBe(firstIssues.length);
    expect('value' in first).toBe(false);
    expect('value' in second).toBe(false);
  },
);

test.prop([syntheticFactApprovalArbitrary])(
  'PBT-U1-DOMAIN: synthetic all-Approved records correspond one-to-one with materialized facts before structural approval succeeds',
  ({ profile, facts, review }) => {
    const currentFacts = collectMaterializedFacts(profile);
    const records = review.inventory.records;
    const expectedCorrespondence = currentFacts.map((fact) => ({
      factId: String(fact.factId),
      canonicalPath: fact.canonicalPath,
      normalizedValue: fact.normalizedValue,
      targetSurfaces: fact.targetSurfaces,
      requirement: fact.requirement,
    }));
    const actualCorrespondence = records.map((record) => ({
      factId: record.factId,
      canonicalPath: record.canonicalPath,
      normalizedValue: record.normalizedValue,
      targetSurfaces: record.targetSurfaces,
      requirement: record.requirement,
    }));

    expect(facts).toEqual(currentFacts);
    expect(records).toHaveLength(currentFacts.length);
    expect(actualCorrespondence).toEqual(expectedCorrespondence);
    expect(records.every((record) => record.status === 'Approved')).toBe(
      true,
    );

    const result = validateFactApproval(profile, review);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(formatDiagnostics(result.issues));
    }
    expect(result.value.profile).toBe(profile);
  },
);

test.prop([invalidSyntheticFactApprovalArbitrary])(
  'PBT-U1-DOMAIN: synthetic Pending, Excluded, missing or mismatched fact records fail with their exact structural diagnostic',
  ({ expected, profile, review }) => {
    const reviewSnapshot = structuredClone(review);
    const result = validateFactApproval(profile, review);

    expect(review).toEqual(reviewSnapshot);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(
        'A controlled-invalid synthetic approval unexpectedly passed',
      );
    }
    expect(
      result.issues.map(({ code, path }) => ({ code, path })),
    ).toEqual([expected]);
    expect('value' in result).toBe(false);
  },
);

test.prop([
  validProfileProjectionsArbitrary,
  invalidProfileCaseArbitrary,
])(
  'PBT-U1-DOMAIN: assembly returns all projections for valid input and none for invalid input',
  ({ validated, resume, portfolio, homepage }, invalidCase) => {
    const assembly = assembleValidatedProfile(validated);
    expect(assembly.source).toBe(validated);
    expect(assembly.resume).toEqual(resume);
    expect(assembly.portfolio).toEqual(portfolio);
    expect(assembly.homepage).toEqual(homepage);

    const invalid = validateProfile(invalidCase.profile);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect('value' in invalid).toBe(false);
    }
  },
);

test.prop([syntheticFactApprovalArbitrary, siteIdentityArbitrary])(
  'PBT-U1-DOMAIN: production assembly and approved metadata share one exact synthetic approval source',
  ({ profile, review }, site) => {
    const approval = validateFactApproval(profile, review);
    expect(approval.ok).toBe(true);
    if (!approval.ok) {
      throw new Error(formatDiagnostics(approval.issues));
    }

    const approvedSource = approval.value;
    const assembly = assembleFactApprovedProfile(approvedSource);
    const resumeMetadata = buildApprovedResumeMetadata(
      site,
      approvedSource,
    );
    const portfolioMetadata = buildApprovedPortfolioMetadata(
      site,
      approvedSource,
    );

    expect(assembly.source).toBe(approvedSource);
    expect(assembly.source.profile).toBe(profile);
    expect(resumeMetadata.ok).toBe(true);
    expect(portfolioMetadata.ok).toBe(true);
    if (!resumeMetadata.ok || !portfolioMetadata.ok) {
      throw new Error(
        formatDiagnostics([
          ...(resumeMetadata.ok ? [] : resumeMetadata.issues),
          ...(portfolioMetadata.ok ? [] : portfolioMetadata.issues),
        ]),
      );
    }
    expect(resumeMetadata.value.description).toBe(
      assembly.resume.resumeSummary.value,
    );
    expect(portfolioMetadata.value.description).toBe(
      assembly.portfolio.portfolioSummary.value,
    );

    const structuralClone = structuredClone(
      approvedSource,
    ) as FactApprovedProfile;
    expectPublicBoundariesToReject(site, structuralClone);
  },
);

test.prop([
  invalidSyntheticFactApprovalArbitrary,
  invalidProfileCaseArbitrary,
  siteIdentityArbitrary,
])(
  'PBT-U1-DOMAIN: controlled invalid approval or profile produces no downstream public assembly or metadata',
  (invalidApprovalCase, invalidProfileCase, site) => {
    const approval = validateFactApproval(
      invalidApprovalCase.profile,
      invalidApprovalCase.review,
    );
    expect(approval.ok).toBe(false);
    if (approval.ok) {
      throw new Error('A controlled-invalid approval unexpectedly passed');
    }
    expect('value' in approval).toBe(false);

    const unregisteredApprovalCandidate = Object.freeze({
      profile: invalidApprovalCase.profile,
      approval: invalidApprovalCase.review.receipt,
    }) as unknown as FactApprovedProfile;
    expectPublicBoundariesToReject(
      site,
      unregisteredApprovalCandidate,
    );

    const profile = validateProfile(invalidProfileCase.profile);
    expect(profile.ok).toBe(false);
    if (profile.ok) {
      throw new Error('A controlled-invalid profile unexpectedly passed');
    }
    expect('value' in profile).toBe(false);

    const unregisteredProfileCandidate = Object.freeze({
      profile: invalidProfileCase.profile,
      approval: invalidApprovalCase.review.receipt,
    }) as unknown as FactApprovedProfile;
    expectPublicBoundariesToReject(
      site,
      unregisteredProfileCandidate,
    );
  },
);

function expectPublicBoundariesToReject(
  site: SiteIdentity,
  candidate: FactApprovedProfile,
): void {
  expect(() => assembleFactApprovedProfile(candidate)).toThrow(TypeError);
  for (const metadata of [
    buildApprovedResumeMetadata(site, candidate),
    buildApprovedPortfolioMetadata(site, candidate),
  ]) {
    expect(metadata.ok).toBe(false);
    if (metadata.ok) {
      throw new Error('An unregistered source produced public metadata');
    }
    expect('value' in metadata).toBe(false);
  }
}

function allSiblingOrdersArePositiveAndUnique(
  profile: ValidatedProfile,
): boolean {
  const collections: readonly (readonly unknown[])[] = [
    profile.skillGroups,
    ...profile.skillGroups.map((group) => group.skills),
    profile.experiences,
    profile.achievements,
    profile.projects,
    profile.education,
    profile.certifications,
    profile.contact.additionalLinks,
    ...profile.experiences.map((item) => item.evidence),
    ...profile.achievements.map((item) => item.evidence),
    ...profile.projects.map((item) => item.evidence),
    ...profile.education.map((item) => item.evidence),
    ...profile.certifications.map((item) => item.evidence),
  ];

  return collections.every((collection) => {
    const orders = collection.map((value) =>
      Number((value as { order: unknown }).order),
    );
    return (
      orders.every((order) => Number.isInteger(order) && order > 0) &&
      new Set(orders).size === orders.length
    );
  });
}

function orderVector(
  values: readonly unknown[],
): Array<Readonly<{ id: string; order: number }>> {
  return values.map((value) => {
    const item = value as { id: unknown; order: unknown };
    return {
      id: String(item.id),
      order: Number(item.order),
    };
  });
}

function sortedOrderVector(
  values: readonly unknown[],
): Array<Readonly<{ id: string; order: number }>> {
  return orderVector(values).sort(
    (left, right) => left.order - right.order,
  );
}

interface FactEntry {
  readonly factId: string;
  readonly value: string;
}

function collectFactEntries(value: unknown): FactEntry[] {
  const facts: FactEntry[] = [];
  visit(value);
  return facts;

  function visit(candidate: unknown): void {
    if (candidate === null || typeof candidate !== 'object') {
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }

    const record = candidate as Record<string, unknown>;
    if (
      typeof record.factId === 'string' &&
      Object.hasOwn(record, 'value')
    ) {
      facts.push({
        factId: record.factId,
        value: JSON.stringify(record.value) ?? 'undefined',
      });
      return;
    }
    Object.values(record).forEach(visit);
  }
}

function factMultiset(
  facts: readonly FactEntry[],
): ReadonlyMap<string, number> {
  const multiset = new Map<string, number>();
  for (const fact of facts) {
    const key = `${fact.factId}\u0000${fact.value}`;
    multiset.set(key, (multiset.get(key) ?? 0) + 1);
  }
  return multiset;
}

function multisetCardinality(
  multiset: ReadonlyMap<string, number>,
): number {
  return [...multiset.values()].reduce(
    (total, count) => total + count,
    0,
  );
}

function reverseOrderedSources(profile: ProfileData): ProfileData {
  const reversed = structuredClone(profile) as unknown as {
    contact: { additionalLinks: unknown[] };
    skillGroups: Array<{ skills: unknown[] }>;
    experiences: Array<{ evidence: unknown[] }>;
    achievements: Array<{ evidence: unknown[] }>;
    projects: Array<{ evidence: unknown[] }>;
    education: Array<{ evidence: unknown[] }>;
    certifications: Array<{ evidence: unknown[] }>;
  };

  reversed.contact.additionalLinks.reverse();
  reversed.skillGroups.reverse();
  reversed.skillGroups.forEach((group) => group.skills.reverse());
  reversed.experiences.reverse();
  reversed.experiences.forEach((item) => item.evidence.reverse());
  reversed.achievements.reverse();
  reversed.achievements.forEach((item) => item.evidence.reverse());
  reversed.projects.reverse();
  reversed.projects.forEach((item) => item.evidence.reverse());
  reversed.education.reverse();
  reversed.education.forEach((item) => item.evidence.reverse());
  reversed.certifications.reverse();
  reversed.certifications.forEach((item) => item.evidence.reverse());

  return reversed as unknown as ProfileData;
}

function factOperation(fact: MaterializedFact): unknown {
  return {
    factId: fact.factId,
    canonicalPath: fact.canonicalPath,
    normalizedValue: fact.normalizedValue,
    targetSurfaces: fact.targetSurfaces,
    requirement: fact.requirement,
  };
}

const MULTIPLE_VIOLATION_ORACLE = [
  {
    code: 'text.empty',
    path: 'profile.identity.name',
  },
  {
    code: 'contact.github.invalid',
    path: 'profile.contact.github',
  },
  {
    code: 'collection.range',
    path: 'profile.projects',
  },
  {
    code: 'order.positive-integer',
    path: 'profile.projects[0].order',
  },
  {
    code: 'reference.missing',
    path: 'profile.projects[0].relatedProfileEntity',
  },
] as const;

function addMultipleControlledViolations(
  profile: ProfileData,
): ProfileData {
  const invalid = structuredClone(profile) as unknown as {
    identity: { name: { value: string } };
    contact: { github: { value: string } };
    projects: Array<{
      order: number;
      relatedProfileEntity?: { tag: string; id: string };
    }>;
  };
  invalid.identity.name.value = ' \t ';
  invalid.contact.github.value = 'https://example.com/not-github';
  invalid.projects = invalid.projects.slice(0, 2);
  invalid.projects[0]!.order = 0;
  invalid.projects[0]!.relatedProfileEntity = {
    tag: 'experience',
    id: 'missing-multiple-experience',
  };
  return invalid as unknown as ProfileData;
}

function formatDiagnostics(
  issues: readonly Readonly<{ code: string; path: string }>[],
): string {
  return issues.map(({ code, path }) => `${code}@${path}`).join(', ');
}
