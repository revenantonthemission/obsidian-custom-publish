import { getProfileLocalNavigationState } from '../../lib/navigation.js';
import type { NavigationState } from '../../lib/navigation.js';
import type { ResumeDocumentLink } from '../../lib/profile/document-boundary.js';
import type {
  Achievement,
  Certification,
  ContactActions,
  ContentBlock,
  Education,
  EvidenceLink,
  Experience,
  FactId,
  Period,
  PortfolioProfile,
  PortfolioProject,
  PublicFact,
  ResumeProfile,
  ResumeProjectSummary,
  SkillGroup,
} from '../../lib/profile/types.js';

export type ProfileRouteIdentity =
  | Readonly<{
      route: 'resume';
      pathname: '/resume';
      label: 'Résumé';
    }>
  | Readonly<{
      route: 'portfolio';
      pathname: '/portfolio';
      label: 'Portfolio';
    }>;

export type ProfileLocalNavigationId =
  | 'home'
  | 'resume'
  | 'portfolio';

export interface ProfileLocalNavigationItemView {
  readonly id: ProfileLocalNavigationId;
  readonly href: '/' | '/resume' | '/portfolio';
  readonly label: '홈' | 'Résumé' | 'Portfolio';
  readonly current: boolean;
}

export interface ProfileShellView {
  readonly identity: ProfileRouteIdentity;
  readonly navigation: readonly ProfileLocalNavigationItemView[];
}

export interface TextFactView {
  readonly factId: FactId;
  readonly value: string;
}

export type TextBlockView =
  | Readonly<{
      tag: 'paragraph';
      text: TextFactView;
    }>
  | Readonly<{
      tag: 'list';
      style: 'ordered' | 'unordered';
      items: readonly TextFactView[];
    }>;

export interface PeriodView {
  readonly factId: FactId;
  readonly value: Period;
  readonly text: string;
}

export type ProfileActionTarget =
  | 'email'
  | 'external'
  | 'internal'
  | 'document';

export interface ProfileActionView {
  readonly id: string;
  readonly kind:
    | 'email'
    | 'github'
    | 'additional'
    | 'evidence'
    | 'document';
  readonly target: ProfileActionTarget;
  readonly href: string;
  readonly label: string;
  readonly order?: number;
  readonly labelFactId?: FactId;
  readonly destinationFactId?: FactId;
}

export interface SkillView {
  readonly id: string;
  readonly order: number;
  readonly name: TextFactView;
}

export interface SkillGroupView {
  readonly id: string;
  readonly order: number;
  readonly title: TextFactView;
  readonly skills: readonly SkillView[];
}

export type ResumeEntryView =
  | Readonly<{
      kind: 'career';
      id: string;
      order: number;
      role: TextFactView;
      organization: TextFactView;
      period: PeriodView;
      summary: TextFactView;
      details: readonly TextBlockView[];
      evidence: readonly ProfileActionView[];
      initiallyOpen: false;
    }>
  | Readonly<{
      kind: 'achievement';
      id: string;
      order: number;
      title: TextFactView;
      period?: PeriodView;
      summary: TextFactView;
      details: readonly TextBlockView[];
      evidence: readonly ProfileActionView[];
      initiallyOpen: false;
    }>;

export interface ResumeHighlightGroupView {
  readonly kind: 'career' | 'achievement';
  readonly heading: '경력' | '대표 성과';
  readonly entries: readonly ResumeEntryView[];
}

export interface ResumeProjectSummaryView {
  readonly id: string;
  readonly order: number;
  readonly title: TextFactView;
  readonly period?: PeriodView;
  readonly outcomeSummary: TextFactView;
  readonly portfolioHref?: string;
}

export interface EducationView {
  readonly id: string;
  readonly order: number;
  readonly title: TextFactView;
  readonly subtitle?: TextFactView;
  readonly period?: PeriodView;
  readonly details: readonly TextBlockView[];
  readonly evidence: readonly ProfileActionView[];
}

export interface CertificationView {
  readonly id: string;
  readonly order: number;
  readonly title: TextFactView;
  readonly issuer?: TextFactView;
  readonly period?: PeriodView;
  readonly details: readonly TextBlockView[];
  readonly evidence: readonly ProfileActionView[];
}

export type ResumeSectionView =
  | Readonly<{
      kind: 'intro';
      heading: '소개·연락·PDF';
      name: TextFactView;
      headline: TextFactView;
      summary: TextFactView;
      details: readonly TextBlockView[];
      actions: readonly ProfileActionView[];
    }>
  | Readonly<{
      kind: 'skills';
      heading: '핵심 역량';
      groups: readonly SkillGroupView[];
    }>
  | Readonly<{
      kind: 'highlights';
      heading: '경력·대표 성과';
      groups: readonly ResumeHighlightGroupView[];
    }>
  | Readonly<{
      kind: 'projects';
      heading: '대표 프로젝트 요약';
      projects: readonly ResumeProjectSummaryView[];
    }>
  | Readonly<{
      kind: 'education';
      heading: '교육';
      entries: readonly EducationView[];
    }>
  | Readonly<{
      kind: 'certifications';
      heading: '자격';
      entries: readonly CertificationView[];
    }>;

export interface ResumePresentation {
  readonly shell: ProfileShellView;
  readonly sections: readonly ResumeSectionView[];
}

export type CaseStudyDimensionKey =
  | 'problem'
  | 'role'
  | 'keyDecisions'
  | 'architecture'
  | 'outcomes'
  | 'lessons';

export interface CaseStudyDimensionView {
  readonly key: CaseStudyDimensionKey;
  readonly heading:
    | '문제'
    | '역할'
    | '핵심 결정'
    | '구조'
    | '결과'
    | '배운 점';
  readonly blocks: readonly TextBlockView[];
}

export interface CaseStudyView {
  readonly id: string;
  readonly order: number;
  readonly title: TextFactView;
  readonly period?: PeriodView;
  readonly outcomeSummary: TextFactView;
  readonly dimensions: readonly CaseStudyDimensionView[];
  readonly evidence: readonly ProfileActionView[];
}

export type PortfolioSectionView =
  | Readonly<{
      kind: 'intro';
      heading: '소개와 연락';
      summary: TextFactView;
      actions: readonly ProfileActionView[];
    }>
  | Readonly<{
      kind: 'projects';
      heading: '대표 프로젝트';
      projects: readonly CaseStudyView[];
    }>;

export interface PortfolioPresentation {
  readonly shell: ProfileShellView;
  readonly sections: readonly PortfolioSectionView[];
}

const PROFILE_ROUTE_IDENTITIES = Object.freeze({
  resume: Object.freeze({
    route: 'resume',
    pathname: '/resume',
    label: 'Résumé',
  }),
  portfolio: Object.freeze({
    route: 'portfolio',
    pathname: '/portfolio',
    label: 'Portfolio',
  }),
} as const satisfies Record<
  ProfileRouteIdentity['route'],
  ProfileRouteIdentity
>);

const LOCAL_NAVIGATION_IDS = Object.freeze({
  '/': 'home',
  '/resume': 'resume',
  '/portfolio': 'portfolio',
} as const);

const DIMENSION_HEADINGS = Object.freeze({
  problem: '문제',
  role: '역할',
  keyDecisions: '핵심 결정',
  architecture: '구조',
  outcomes: '결과',
  lessons: '배운 점',
} as const satisfies Record<
  CaseStudyDimensionKey,
  CaseStudyDimensionView['heading']
>);

/**
 * Maps the already-validated résumé projection to a frozen semantic tree.
 * It does not validate, sort, truncate, infer, or repair profile facts.
 */
export function buildResumePresentation(
  profile: ResumeProfile,
  documentLink: ResumeDocumentLink,
): ResumePresentation {
  const sections: ResumeSectionView[] = [
    Object.freeze({
      kind: 'intro',
      heading: '소개·연락·PDF',
      name: textFact(profile.identity.name),
      headline: textFact(profile.identity.headline),
      summary: textFact(profile.resumeSummary),
      details: contentBlocks(profile.detailedIntro),
      actions: contactActions(profile.contactActions, documentLink),
    }),
    Object.freeze({
      kind: 'skills',
      heading: '핵심 역량',
      groups: frozenArray(profile.skillGroups.map(skillGroup)),
    }),
    Object.freeze({
      kind: 'highlights',
      heading: '경력·대표 성과',
      groups: highlightGroups(profile),
    }),
    Object.freeze({
      kind: 'projects',
      heading: '대표 프로젝트 요약',
      projects: frozenArray(
        profile.projectSummaries.map(resumeProjectSummary),
      ),
    }),
  ];

  if (profile.education !== undefined) {
    sections.push(
      Object.freeze({
        kind: 'education',
        heading: '교육',
        entries: frozenArray(profile.education.map(educationView)),
      }),
    );
  }

  if (profile.certifications !== undefined) {
    sections.push(
      Object.freeze({
        kind: 'certifications',
        heading: '자격',
        entries: frozenArray(
          profile.certifications.map(certificationView),
        ),
      }),
    );
  }

  return Object.freeze({
    shell: profileShell('resume'),
    sections: frozenArray(sections),
  });
}

/**
 * Maps the complete 3–6 project projection to a frozen semantic tree.
 * The selector-provided project and dimension order is preserved verbatim.
 */
export function buildPortfolioPresentation(
  profile: PortfolioProfile,
): PortfolioPresentation {
  return Object.freeze({
    shell: profileShell('portfolio'),
    sections: frozenArray([
      Object.freeze({
        kind: 'intro',
        heading: '소개와 연락',
        summary: textFact(profile.portfolioSummary),
        actions: contactActions(profile.contactActions),
      }),
      Object.freeze({
        kind: 'projects',
        heading: '대표 프로젝트',
        projects: frozenArray(profile.projects.map(caseStudy)),
      }),
    ]),
  });
}

function profileShell(
  route: ProfileRouteIdentity['route'],
): ProfileShellView {
  const identity = PROFILE_ROUTE_IDENTITIES[route];
  const navigation = getProfileLocalNavigationState(identity.pathname);

  if (!navigation.ok) {
    throw new TypeError(
      'The fixed profile-local navigation contract is invalid.',
    );
  }

  return Object.freeze({
    identity,
    navigation: frozenArray(
      navigation.value.map(profileNavigationItem),
    ),
  });
}

function profileNavigationItem(
  item: NavigationState,
): ProfileLocalNavigationItemView {
  const id = LOCAL_NAVIGATION_IDS[
    item.href as keyof typeof LOCAL_NAVIGATION_IDS
  ];

  if (id === undefined) {
    throw new TypeError(
      'The profile-local navigation contains an unknown destination.',
    );
  }

  return Object.freeze({
    id,
    href: item.href as ProfileLocalNavigationItemView['href'],
    label: item.label as ProfileLocalNavigationItemView['label'],
    current: item.current,
  });
}

function contactActions(
  contact: ContactActions,
  documentLink?: ResumeDocumentLink,
): readonly ProfileActionView[] {
  const actions: ProfileActionView[] = [
    Object.freeze({
      id: 'email',
      kind: 'email',
      target: 'email',
      href: `mailto:${contact.email.value}`,
      label: '이메일 보내기',
      destinationFactId: contact.email.factId,
    }),
    Object.freeze({
      id: 'github',
      kind: 'github',
      target: 'external',
      href: contact.github.value,
      label: 'GitHub 프로필 보기',
      destinationFactId: contact.github.factId,
    }),
    ...contact.additionalLinks.map((link) =>
      profileAction(link, 'additional'),
    ),
  ];

  if (documentLink !== undefined) {
    actions.push(
      Object.freeze({
        id: 'resume-document',
        kind: 'document',
        target: 'document',
        href: documentLink.href,
        label: documentLink.label,
      }),
    );
  }

  return frozenArray(actions);
}

function profileAction(
  link: EvidenceLink,
  kind: 'additional' | 'evidence',
): ProfileActionView {
  return Object.freeze({
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

function evidenceActions(
  links: readonly EvidenceLink[],
): readonly ProfileActionView[] {
  return frozenArray(
    links.map((link) => profileAction(link, 'evidence')),
  );
}

function skillGroup(group: SkillGroup): SkillGroupView {
  return Object.freeze({
    id: group.id,
    order: group.order,
    title: textFact(group.title),
    skills: frozenArray(
      group.skills.map((skill) =>
        Object.freeze({
          id: skill.id,
          order: skill.order,
          name: textFact(skill.name),
        }),
      ),
    ),
  });
}

function highlightGroups(
  profile: ResumeProfile,
): readonly ResumeHighlightGroupView[] {
  const groups: ResumeHighlightGroupView[] = [];

  if (profile.experiences.length > 0) {
    groups.push(
      Object.freeze({
        kind: 'career',
        heading: '경력',
        entries: frozenArray(profile.experiences.map(careerEntry)),
      }),
    );
  }

  if (profile.achievements.length > 0) {
    groups.push(
      Object.freeze({
        kind: 'achievement',
        heading: '대표 성과',
        entries: frozenArray(
          profile.achievements.map(achievementEntry),
        ),
      }),
    );
  }

  return frozenArray(groups);
}

function careerEntry(experience: Experience): ResumeEntryView {
  return Object.freeze({
    kind: 'career',
    id: experience.id,
    order: experience.order,
    role: textFact(experience.role),
    organization: textFact(experience.organization),
    period: periodView(experience.period),
    summary: textFact(experience.summary),
    details: contentBlocks(experience.details),
    evidence: evidenceActions(experience.evidence),
    initiallyOpen: false,
  });
}

function achievementEntry(achievement: Achievement): ResumeEntryView {
  return Object.freeze({
    kind: 'achievement',
    id: achievement.id,
    order: achievement.order,
    title: textFact(achievement.title),
    ...(achievement.period === undefined
      ? {}
      : { period: periodView(achievement.period) }),
    summary: textFact(achievement.summary),
    details: contentBlocks(achievement.details),
    evidence: evidenceActions(achievement.evidence),
    initiallyOpen: false,
  });
}

function resumeProjectSummary(
  project: ResumeProjectSummary,
): ResumeProjectSummaryView {
  return Object.freeze({
    id: project.id,
    order: project.order,
    title: textFact(project.title),
    ...(project.period === undefined
      ? {}
      : { period: periodView(project.period) }),
    outcomeSummary: textFact(project.outcomeSummary),
  });
}

function educationView(education: Education): EducationView {
  return Object.freeze({
    id: education.id,
    order: education.order,
    title: textFact(education.title),
    ...(education.subtitle === undefined
      ? {}
      : { subtitle: textFact(education.subtitle) }),
    ...(education.period === undefined
      ? {}
      : { period: periodView(education.period) }),
    details: contentBlocks(education.details),
    evidence: evidenceActions(education.evidence),
  });
}

function certificationView(
  certification: Certification,
): CertificationView {
  return Object.freeze({
    id: certification.id,
    order: certification.order,
    title: textFact(certification.title),
    ...(certification.issuer === undefined
      ? {}
      : { issuer: textFact(certification.issuer) }),
    ...(certification.period === undefined
      ? {}
      : { period: periodView(certification.period) }),
    details: contentBlocks(certification.details),
    evidence: evidenceActions(certification.evidence),
  });
}

function caseStudy(project: PortfolioProject): CaseStudyView {
  return Object.freeze({
    id: project.id,
    order: project.order,
    title: textFact(project.title),
    ...(project.period === undefined
      ? {}
      : { period: periodView(project.period) }),
    outcomeSummary: textFact(project.outcomeSummary),
    dimensions: frozenArray(
      project.dimensions.map((dimension) =>
        Object.freeze({
          key: dimension.key,
          heading: DIMENSION_HEADINGS[dimension.key],
          blocks: contentBlocks(dimension.blocks),
        }),
      ),
    ),
    evidence: evidenceActions(project.evidence),
  });
}

function contentBlocks(
  blocks: readonly ContentBlock[],
): readonly TextBlockView[] {
  return frozenArray(
    blocks.map((block) => {
      if (block.tag === 'paragraph') {
        return Object.freeze({
          tag: 'paragraph',
          text: textFact(block.text),
        });
      }

      return Object.freeze({
        tag: 'list',
        style: block.style,
        items: frozenArray(block.items.map(textFact)),
      });
    }),
  );
}

function textFact<Value extends string>(
  fact: PublicFact<Value>,
): TextFactView {
  return Object.freeze({
    factId: fact.factId,
    value: fact.value,
  });
}

function periodView(fact: PublicFact<Period>): PeriodView {
  const start = Object.freeze({ ...fact.value.start });
  const end = Object.freeze({ ...fact.value.end });
  const value = Object.freeze({ start, end });

  return Object.freeze({
    factId: fact.factId,
    value,
    text: `${datePointText(start)} – ${datePointText(end)}`,
  });
}

function datePointText(point: Period['start'] | Period['end']): string {
  return point.tag === 'present' ? '현재' : point.value;
}

function frozenArray<Value>(
  values: readonly Value[],
): readonly Value[] {
  return Object.freeze([...values]);
}
