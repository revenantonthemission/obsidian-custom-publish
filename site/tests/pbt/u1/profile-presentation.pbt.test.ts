import { test } from '@fast-check/vitest';
import { expect } from 'vitest';

import {
  buildPortfolioPresentation,
  buildResumePresentation,
} from '../../../src/components/profile/presentation.js';
import type {
  PortfolioPresentation,
  ProfileActionView,
  ResumePresentation,
  TextBlockView,
} from '../../../src/components/profile/presentation.js';
import { getResumeDocumentLink } from '../../../src/lib/profile/document-boundary.js';
import { assembleValidatedProfile } from '../../../src/lib/profile/assembly.js';
import type {
  ContentBlock,
  EvidenceLink,
  Period,
  ProfileData,
  PublicFact,
} from '../../../src/lib/profile/types.js';
import { validateProfile } from '../../../src/lib/profile/validation.js';
import { validProfileProjectionsArbitrary } from './arbitraries/profile.js';

const PROJECT_DIMENSIONS = [
  'problem',
  'role',
  'keyDecisions',
  'architecture',
  'outcomes',
  'lessons',
] as const;

const DIMENSION_HEADINGS = [
  '문제',
  '역할',
  '핵심 결정',
  '구조',
  '결과',
  '배운 점',
] as const;

test.prop([validProfileProjectionsArbitrary])(
  'PBT-U1-PRESENTATION: résumé renderer-neutral tree preserves semantic hierarchy, fact attribution and closed disclosures',
  ({ resume }) => {
    const presentation = buildResumePresentation(
      resume,
      getResumeDocumentLink(),
    );

    expect(presentation.shell.identity).toEqual({
      route: 'resume',
      pathname: '/resume',
      label: 'Résumé',
    });
    expect(presentation.sections.map(({ kind }) => kind)).toEqual([
      'intro',
      'skills',
      'highlights',
      'projects',
      ...(resume.education === undefined ? [] : ['education']),
      ...(resume.certifications === undefined ? [] : ['certifications']),
    ]);

    const intro = resumeSection(presentation, 'intro');
    expect(intro.heading).toBe('소개·연락·PDF');
    expect(intro.name).toEqual(textFact(resume.identity.name));
    expect(intro.headline).toEqual(textFact(resume.identity.headline));
    expect(intro.summary).toEqual(textFact(resume.resumeSummary));
    assertTextBlocks(intro.details, resume.detailedIntro);
    assertContactActions(intro.actions, resume.contactActions, true);

    const skills = resumeSection(presentation, 'skills');
    expect(itemVector(skills.groups)).toEqual(itemVector(resume.skillGroups));
    for (const [index, group] of skills.groups.entries()) {
      const source = resume.skillGroups[index];
      expect(group.title).toEqual(textFact(source.title));
      expect(itemVector(group.skills)).toEqual(itemVector(source.skills));
      for (const [skillIndex, skill] of group.skills.entries()) {
        expect(skill.name).toEqual(textFact(source.skills[skillIndex].name));
      }
    }

    const highlights = resumeSection(presentation, 'highlights');
    expect(highlights.groups.map(({ kind }) => kind)).toEqual([
      ...(resume.experiences.length === 0 ? [] : ['career']),
      ...(resume.achievements.length === 0 ? [] : ['achievement']),
    ]);

    const careers = highlights.groups.find(({ kind }) => kind === 'career');
    if (resume.experiences.length === 0) {
      expect(careers).toBeUndefined();
    } else {
      expect(careers?.heading).toBe('경력');
      expect(itemVector(careers?.entries ?? [])).toEqual(
        itemVector(resume.experiences),
      );
      for (const [index, entry] of (careers?.entries ?? []).entries()) {
        const source = resume.experiences[index];
        expect(entry.kind).toBe('career');
        if (entry.kind !== 'career') continue;
        expect(entry.organization).toEqual(textFact(source.organization));
        expect(entry.role).toEqual(textFact(source.role));
        assertPeriod(entry.period, source.period);
        expect(entry.summary).toEqual(textFact(source.summary));
        assertTextBlocks(entry.details, source.details);
        assertEvidenceActions(entry.evidence, source.evidence);
        expect(entry.initiallyOpen).toBe(false);
      }
    }

    const achievements = highlights.groups.find(
      ({ kind }) => kind === 'achievement',
    );
    if (resume.achievements.length === 0) {
      expect(achievements).toBeUndefined();
    } else {
      expect(achievements?.heading).toBe('대표 성과');
      expect(itemVector(achievements?.entries ?? [])).toEqual(
        itemVector(resume.achievements),
      );
      for (const [index, entry] of (achievements?.entries ?? []).entries()) {
        const source = resume.achievements[index];
        expect(entry.kind).toBe('achievement');
        if (entry.kind !== 'achievement') continue;
        expect(entry.title).toEqual(textFact(source.title));
        assertPeriod(entry.period, source.period);
        expect(entry.summary).toEqual(textFact(source.summary));
        assertTextBlocks(entry.details, source.details);
        assertEvidenceActions(entry.evidence, source.evidence);
        expect(entry.initiallyOpen).toBe(false);
      }
    }

    const projects = resumeSection(presentation, 'projects');
    expect(itemVector(projects.projects)).toEqual(
      itemVector(resume.projectSummaries),
    );
    for (const [index, project] of projects.projects.entries()) {
      const source = resume.projectSummaries[index];
      expect(project.title).toEqual(textFact(source.title));
      assertPeriod(project.period, source.period);
      expect(project.outcomeSummary).toEqual(textFact(source.outcomeSummary));
      expect(Object.hasOwn(project, 'portfolioHref')).toBe(false);
    }

    assertOptionalResumeSections(presentation, resume);
    assertRendererNeutralTree(presentation);
  },
);

test.prop([validProfileProjectionsArbitrary])(
  'PBT-U1-PRESENTATION: portfolio renderer-neutral tree preserves project order and the exact six typed case-study dimensions',
  ({ portfolio }) => {
    const presentation = buildPortfolioPresentation(portfolio);

    expect(presentation.shell.identity).toEqual({
      route: 'portfolio',
      pathname: '/portfolio',
      label: 'Portfolio',
    });
    expect(presentation.sections.map(({ kind }) => kind)).toEqual([
      'intro',
      'projects',
    ]);

    const intro = portfolioSection(presentation, 'intro');
    expect(intro.heading).toBe('소개와 연락');
    expect(intro.summary).toEqual(textFact(portfolio.portfolioSummary));
    assertContactActions(intro.actions, portfolio.contactActions, false);

    const projects = portfolioSection(presentation, 'projects');
    expect(itemVector(projects.projects)).toEqual(
      itemVector(portfolio.projects),
    );
    expect(projects.projects).toHaveLength(portfolio.projects.length);
    expect(projects.projects.length).toBeGreaterThanOrEqual(3);
    expect(projects.projects.length).toBeLessThanOrEqual(6);

    for (const [index, project] of projects.projects.entries()) {
      const source = portfolio.projects[index];
      expect(project.title).toEqual(textFact(source.title));
      assertPeriod(project.period, source.period);
      expect(project.outcomeSummary).toEqual(textFact(source.outcomeSummary));
      expect(project.dimensions.map(({ key }) => key)).toEqual(
        PROJECT_DIMENSIONS,
      );
      expect(project.dimensions.map(({ heading }) => heading)).toEqual(
        DIMENSION_HEADINGS,
      );
      expect(project.dimensions).toHaveLength(6);
      for (const [dimensionIndex, dimension] of project.dimensions.entries()) {
        const sourceDimension = source.dimensions[dimensionIndex];
        expect(dimension.key).toBe(sourceDimension.key);
        assertTextBlocks(dimension.blocks, sourceDimension.blocks);
      }
      assertEvidenceActions(project.evidence, source.evidence);
    }

    assertRendererNeutralTree(presentation);
  },
);

test.prop([validProfileProjectionsArbitrary])(
  'PBT-U1-PRESENTATION: removing optional source nodes removes only their renderer-neutral nodes and actions',
  ({ input, resume, portfolio }) => {
    const strippedValidation = validateProfile(
      stripOptionalPresentationData(input),
    );
    expect(strippedValidation.ok).toBe(true);
    if (!strippedValidation.ok) {
      throw new Error(
        strippedValidation.issues
          .map(({ code, path }) => `${code}@${path}`)
          .join(', '),
      );
    }

    const stripped = assembleValidatedProfile(strippedValidation.value);
    const documentLink = getResumeDocumentLink();
    const baseResume = buildResumePresentation(resume, documentLink);
    const basePortfolio = buildPortfolioPresentation(portfolio);

    expect(buildResumePresentation(stripped.resume, documentLink)).toEqual(
      removeOptionalResumeNodes(baseResume),
    );
    expect(buildPortfolioPresentation(stripped.portfolio)).toEqual(
      removeOptionalPortfolioNodes(basePortfolio),
    );
  },
);

function resumeSection<Kind extends ResumePresentation['sections'][number]['kind']>(
  presentation: ResumePresentation,
  kind: Kind,
): Extract<ResumePresentation['sections'][number], { kind: Kind }> {
  const section = presentation.sections.find(
    (candidate) => candidate.kind === kind,
  );
  expect(section, `missing résumé ${kind} section`).toBeDefined();
  return section as Extract<
    ResumePresentation['sections'][number],
    { kind: Kind }
  >;
}

function portfolioSection<Kind extends PortfolioPresentation['sections'][number]['kind']>(
  presentation: PortfolioPresentation,
  kind: Kind,
): Extract<PortfolioPresentation['sections'][number], { kind: Kind }> {
  const section = presentation.sections.find(
    (candidate) => candidate.kind === kind,
  );
  expect(section, `missing portfolio ${kind} section`).toBeDefined();
  return section as Extract<
    PortfolioPresentation['sections'][number],
    { kind: Kind }
  >;
}

function textFact(fact: PublicFact<string>) {
  return { factId: fact.factId, value: fact.value };
}

function assertPeriod(
  actual: { factId: string; value: Period; text: string } | undefined,
  source: PublicFact<Period> | undefined,
): void {
  if (source === undefined) {
    expect(actual).toBeUndefined();
    return;
  }

  expect(actual).toEqual({
    factId: source.factId,
    value: source.value,
    text: `${datePointText(source.value.start)} – ${datePointText(source.value.end)}`,
  });
}

function datePointText(point: Period['start'] | Period['end']): string {
  return point.tag === 'present' ? '현재' : point.value;
}

function assertTextBlocks(
  actual: readonly TextBlockView[],
  source: readonly ContentBlock[],
): void {
  expect(actual).toHaveLength(source.length);
  for (const [index, block] of actual.entries()) {
    const sourceBlock = source[index];
    expect(block.tag).toBe(sourceBlock.tag);
    if (block.tag === 'paragraph' && sourceBlock.tag === 'paragraph') {
      expect(block.text).toEqual(textFact(sourceBlock.text));
      continue;
    }
    if (block.tag === 'list' && sourceBlock.tag === 'list') {
      expect(block.style).toBe(sourceBlock.style);
      expect(block.items).toEqual(sourceBlock.items.map(textFact));
      continue;
    }
    throw new Error('content block tag changed while building presentation');
  }
}

function assertContactActions(
  actual: readonly ProfileActionView[],
  contact: {
    readonly email: PublicFact<string>;
    readonly github: PublicFact<string>;
    readonly additionalLinks: readonly EvidenceLink[];
  },
  includeDocument: boolean,
): void {
  const documentLink = getResumeDocumentLink();
  const documentAction = actual.find(({ kind }) => kind === 'document');

  expect(actual.slice(0, 2)).toEqual([
    {
      id: 'email',
      kind: 'email',
      target: 'email',
      href: `mailto:${contact.email.value}`,
      label: '이메일 보내기',
      destinationFactId: contact.email.factId,
    },
    {
      id: 'github',
      kind: 'github',
      target: 'external',
      href: contact.github.value,
      label: 'GitHub 프로필 보기',
      destinationFactId: contact.github.factId,
    },
  ]);
  assertEvidenceActions(
    actual.filter(({ kind }) => kind === 'additional'),
    contact.additionalLinks,
    'additional',
  );
  expect(actual).toHaveLength(
    2 + contact.additionalLinks.length + (includeDocument ? 1 : 0),
  );
  if (!includeDocument) {
    expect(documentAction).toBeUndefined();
    return;
  }
  expect(documentAction).toEqual({
    id: 'resume-document',
    kind: 'document',
    target: 'document',
    href: documentLink.href,
    label: documentLink.label,
  });
}

function assertEvidenceActions(
  actual: readonly ProfileActionView[],
  source: readonly EvidenceLink[],
  kind: 'additional' | 'evidence' = 'evidence',
): void {
  expect(actual).toHaveLength(source.length);
  for (const [index, action] of actual.entries()) {
    const link = source[index];
    expect(action).toEqual({
      id: link.id,
      kind,
      target: link.destination.value.tag,
      href: link.destination.value.value,
      label: link.label.value,
      order: link.order,
      labelFactId: link.label.factId,
      destinationFactId: link.destination.factId,
    });
  }
}

function assertOptionalResumeSections(
  presentation: ResumePresentation,
  resume: {
    readonly education?: readonly {
      readonly id: string;
      readonly order: number;
      readonly title: PublicFact<string>;
      readonly subtitle?: PublicFact<string>;
      readonly period?: PublicFact<Period>;
      readonly details: readonly ContentBlock[];
      readonly evidence: readonly EvidenceLink[];
    }[];
    readonly certifications?: readonly {
      readonly id: string;
      readonly order: number;
      readonly title: PublicFact<string>;
      readonly issuer?: PublicFact<string>;
      readonly period?: PublicFact<Period>;
      readonly details: readonly ContentBlock[];
      readonly evidence: readonly EvidenceLink[];
    }[];
  },
): void {
  const education = presentation.sections.find(
    ({ kind }) => kind === 'education',
  );
  if (resume.education === undefined) {
    expect(education).toBeUndefined();
  } else {
    expect(education?.kind).toBe('education');
    if (education?.kind === 'education') {
      expect(itemVector(education.entries)).toEqual(itemVector(resume.education));
      for (const [index, entry] of education.entries.entries()) {
        const source = resume.education[index];
        expect(entry.title).toEqual(textFact(source.title));
        expect(entry.subtitle).toEqual(
          source.subtitle === undefined ? undefined : textFact(source.subtitle),
        );
        assertPeriod(entry.period, source.period);
        assertTextBlocks(entry.details, source.details);
        assertEvidenceActions(entry.evidence, source.evidence);
      }
    }
  }

  const certifications = presentation.sections.find(
    ({ kind }) => kind === 'certifications',
  );
  if (resume.certifications === undefined) {
    expect(certifications).toBeUndefined();
  } else {
    expect(certifications?.kind).toBe('certifications');
    if (certifications?.kind === 'certifications') {
      expect(itemVector(certifications.entries)).toEqual(
        itemVector(resume.certifications),
      );
      for (const [index, entry] of certifications.entries.entries()) {
        const source = resume.certifications[index];
        expect(entry.title).toEqual(textFact(source.title));
        expect(entry.issuer).toEqual(
          source.issuer === undefined ? undefined : textFact(source.issuer),
        );
        assertPeriod(entry.period, source.period);
        assertTextBlocks(entry.details, source.details);
        assertEvidenceActions(entry.evidence, source.evidence);
      }
    }
  }
}

function assertRendererNeutralTree(value: unknown): void {
  const forbiddenKeys = new Set([
    'html',
    'rawHtml',
    'markup',
    'markdown',
    'innerHtml',
    'clientState',
    'isOpen',
    'open',
    'onClick',
    'onToggle',
    'onChange',
    'clientDirective',
  ]);

  if (Array.isArray(value)) {
    value.forEach(assertRendererNeutralTree);
    return;
  }
  if (typeof value !== 'object' || value === null) return;

  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    expect(forbiddenKeys.has(key), `renderer-neutral tree exposed ${key}`).toBe(
      false,
    );
    assertRendererNeutralTree(child);
  }
  if (Object.hasOwn(record, 'initiallyOpen')) {
    expect(record.initiallyOpen).toBe(false);
  }
  if (Object.hasOwn(record, 'href') && Object.hasOwn(record, 'target')) {
    expect(typeof record.href).toBe('string');
    expect(record.href).not.toBe('');
    expect(['email', 'external', 'internal', 'document']).toContain(
      record.target,
    );
  }
}

function stripOptionalPresentationData(input: ProfileData): ProfileData {
  const profile = structuredClone(input) as unknown as {
    contact: { additionalLinks: unknown[] };
    experiences: Array<{ evidence: unknown[] }>;
    achievements: Array<{ evidence: unknown[]; period?: unknown }>;
    projects: Array<{
      evidence: unknown[];
      period?: unknown;
      relatedProfileEntity?: unknown;
    }>;
    education: unknown[];
    certifications: unknown[];
  };

  profile.contact.additionalLinks = [];
  profile.experiences.forEach((item) => {
    item.evidence = [];
  });
  profile.achievements.forEach((item) => {
    item.evidence = [];
    delete item.period;
  });
  profile.projects.forEach((item) => {
    item.evidence = [];
    delete item.period;
    delete item.relatedProfileEntity;
  });
  profile.education = [];
  profile.certifications = [];

  return profile as unknown as ProfileData;
}

function removeOptionalResumeNodes(
  presentation: ResumePresentation,
): ResumePresentation {
  const sections: ResumePresentation['sections'][number][] = [];
  for (const section of presentation.sections) {
    if (section.kind === 'education' || section.kind === 'certifications') {
      continue;
    }
    if (section.kind === 'intro') {
      sections.push({
        ...section,
        actions: section.actions.filter(({ kind }) => kind !== 'additional'),
      });
      continue;
    }
    if (section.kind === 'highlights') {
      sections.push({
        ...section,
        groups: section.groups.map((group) => ({
          ...group,
          entries: group.entries.map((entry) => {
            if (entry.kind === 'achievement') {
              const { period: _period, evidence: _evidence, ...required } = entry;
              return { ...required, evidence: [] };
            }
            return { ...entry, evidence: [] };
          }),
        })),
      } as ResumePresentation['sections'][number]);
      continue;
    }
    if (section.kind === 'projects') {
      sections.push({
        ...section,
        projects: section.projects.map((project) => {
          const { period: _period, ...required } = project;
          return required;
        }),
      });
      continue;
    }
    sections.push(section);
  }

  return {
    ...presentation,
    sections,
  } as ResumePresentation;
}

function removeOptionalPortfolioNodes(
  presentation: PortfolioPresentation,
): PortfolioPresentation {
  return {
    ...presentation,
    sections: presentation.sections.map((section) => {
      if (section.kind === 'intro') {
        return {
          ...section,
          actions: section.actions.filter(({ kind }) => kind !== 'additional'),
        };
      }
      return {
        ...section,
        projects: section.projects.map((project) => {
          const { period: _period, evidence: _evidence, ...required } = project;
          return { ...required, evidence: [] };
        }),
      };
    }),
  } as PortfolioPresentation;
}

function itemVector(
  values: readonly { readonly id: string; readonly order: number }[],
): Array<Readonly<{ id: string; order: number }>> {
  return values.map(({ id, order }) => ({ id, order }));
}
