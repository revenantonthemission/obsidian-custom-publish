import type {
  Achievement,
  Certification,
  ContactActions,
  ContentBlock,
  ContentBlocks,
  Education,
  EvidenceLink,
  Experience,
  HomepageProfile,
  NonEmptyReadonlyArray,
  PortfolioProfile,
  PortfolioProject,
  ProfileData,
  ProfileEntityReference,
  Project,
  ProjectDimensions,
  ResumeProfile,
  ResumeProjectSummary,
  Skill,
  SkillGroup,
  ValidatedProfile,
} from './types.js';

const PROFILE_ROUTES = Object.freeze({
  resume: '/resume' as const,
  portfolio: '/portfolio' as const,
});

export function selectResumeProfile(
  profile: ValidatedProfile,
): ResumeProfile {
  const source = profile as unknown as ProfileData;
  const education = frozenArray(
    numericOrder(source.education).map(copyEducation),
  );
  const certifications = frozenArray(
    numericOrder(source.certifications).map(copyCertification),
  );

  const projection: ResumeProfile = {
    identity: Object.freeze({
      name: source.identity.name,
      headline: source.identity.headline,
    }),
    resumeSummary: source.narrative.resumeSummary,
    detailedIntro: copyRequiredBlocks(source.narrative.detailedIntro),
    contactActions: copyContactActions(source),
    skillGroups: frozenArray(
      numericOrder(source.skillGroups).map(copySkillGroup),
    ),
    experiences: frozenArray(
      numericOrder(source.experiences).map(copyExperience),
    ),
    achievements: frozenArray(
      numericOrder(source.achievements).map(copyAchievement),
    ),
    projectSummaries: frozenArray(
      numericOrder(source.projects).map(copyProjectSummary),
    ),
    ...(education.length === 0
      ? {}
      : {
          education:
            education as NonEmptyReadonlyArray<Education>,
        }),
    ...(certifications.length === 0
      ? {}
      : {
          certifications:
            certifications as NonEmptyReadonlyArray<Certification>,
        }),
  };

  return Object.freeze(projection);
}

export function selectPortfolioProfile(
  profile: ValidatedProfile,
): PortfolioProfile {
  const source = profile as unknown as ProfileData;

  return Object.freeze({
    portfolioSummary: source.narrative.portfolioSummary,
    contactActions: copyContactActions(source),
    projects: frozenArray(
      numericOrder(source.projects).map(copyPortfolioProject),
    ),
  });
}

export function selectHomepageProfile(
  profile: ValidatedProfile,
): HomepageProfile {
  const source = profile as unknown as ProfileData;

  return Object.freeze({
    name: source.identity.name,
    headline: source.identity.headline,
    shortIntro: source.narrative.shortIntro,
    routes: PROFILE_ROUTES,
  });
}

function copyContactActions(profile: ProfileData): ContactActions {
  return Object.freeze({
    email: profile.contact.email,
    github: profile.contact.github,
    additionalLinks: copyEvidenceLinks(profile.contact.additionalLinks),
  });
}

function copySkillGroup(group: SkillGroup): SkillGroup {
  return Object.freeze({
    id: group.id,
    order: group.order,
    title: group.title,
    skills: frozenArray(
      numericOrder(group.skills).map(copySkill),
    ) as NonEmptyReadonlyArray<Skill>,
  });
}

function copySkill(skill: Skill): Skill {
  return Object.freeze({
    id: skill.id,
    order: skill.order,
    name: skill.name,
  });
}

function copyExperience(experience: Experience): Experience {
  return Object.freeze({
    id: experience.id,
    order: experience.order,
    organization: experience.organization,
    role: experience.role,
    period: experience.period,
    summary: experience.summary,
    details: copyRequiredBlocks(experience.details),
    evidence: copyEvidenceLinks(experience.evidence),
  });
}

function copyAchievement(achievement: Achievement): Achievement {
  return Object.freeze({
    id: achievement.id,
    order: achievement.order,
    title: achievement.title,
    ...(achievement.period === undefined
      ? {}
      : { period: achievement.period }),
    summary: achievement.summary,
    details: copyRequiredBlocks(achievement.details),
    evidence: copyEvidenceLinks(achievement.evidence),
  });
}

function copyProjectSummary(project: Project): ResumeProjectSummary {
  return Object.freeze({
    id: project.id,
    order: project.order,
    title: project.title,
    ...(project.period === undefined ? {} : { period: project.period }),
    outcomeSummary: project.outcomeSummary,
  });
}

function copyPortfolioProject(project: Project): PortfolioProject {
  return Object.freeze({
    id: project.id,
    order: project.order,
    title: project.title,
    ...(project.period === undefined ? {} : { period: project.period }),
    outcomeSummary: project.outcomeSummary,
    dimensions: copyProjectDimensions(project),
    evidence: copyEvidenceLinks(project.evidence),
    ...(project.relatedProfileEntity === undefined
      ? {}
      : {
          relatedProfileEntity: copyReference(
            project.relatedProfileEntity,
          ),
        }),
  });
}

function copyProjectDimensions(project: Project): ProjectDimensions {
  return Object.freeze([
    Object.freeze({
      key: 'problem' as const,
      blocks: copyRequiredBlocks(project.problem),
    }),
    Object.freeze({
      key: 'role' as const,
      blocks: copyRequiredBlocks(project.role),
    }),
    Object.freeze({
      key: 'keyDecisions' as const,
      blocks: copyRequiredBlocks(project.keyDecisions),
    }),
    Object.freeze({
      key: 'architecture' as const,
      blocks: copyRequiredBlocks(project.architecture),
    }),
    Object.freeze({
      key: 'outcomes' as const,
      blocks: copyRequiredBlocks(project.outcomes),
    }),
    Object.freeze({
      key: 'lessons' as const,
      blocks: copyRequiredBlocks(project.lessons),
    }),
  ]);
}

function copyEducation(education: Education): Education {
  return Object.freeze({
    id: education.id,
    order: education.order,
    title: education.title,
    ...(education.subtitle === undefined
      ? {}
      : { subtitle: education.subtitle }),
    ...(education.period === undefined ? {} : { period: education.period }),
    details: frozenArray(education.details),
    evidence: copyEvidenceLinks(education.evidence),
  });
}

function copyCertification(
  certification: Certification,
): Certification {
  return Object.freeze({
    id: certification.id,
    order: certification.order,
    title: certification.title,
    ...(certification.issuer === undefined
      ? {}
      : { issuer: certification.issuer }),
    ...(certification.period === undefined
      ? {}
      : { period: certification.period }),
    details: frozenArray(certification.details),
    evidence: copyEvidenceLinks(certification.evidence),
  });
}

function copyEvidenceLinks(
  links: readonly EvidenceLink[],
): readonly EvidenceLink[] {
  return frozenArray(
    numericOrder(links).map((link) =>
      Object.freeze({
        id: link.id,
        order: link.order,
        label: link.label,
        destination: link.destination,
      }),
    ),
  );
}

function copyRequiredBlocks(
  blocks: readonly ContentBlock[],
): ContentBlocks {
  return frozenArray(blocks) as ContentBlocks;
}

function copyReference(
  reference: ProfileEntityReference,
): ProfileEntityReference {
  if (reference.tag === 'experience') {
    return Object.freeze({
      tag: 'experience',
      id: reference.id,
    });
  }

  return Object.freeze({
    tag: 'achievement',
    id: reference.id,
  });
}

function numericOrder<Value extends Readonly<{ order: number }>>(
  values: readonly Value[],
): Value[] {
  return [...values].sort(
    (left, right) => left.order - right.order,
  );
}

function frozenArray<Value>(
  values: readonly Value[],
): readonly Value[] {
  return Object.freeze([...values]);
}
