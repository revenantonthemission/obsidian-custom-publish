import type {
  Achievement,
  BodyText,
  Certification,
  ContactProfile,
  ContentBlock,
  DatePoint,
  DeepReadonly,
  Education,
  EmailAddress,
  EvidenceLink,
  Experience,
  ExternalEvidenceUrl,
  FactId,
  GitHubProfileUrl,
  InternalEvidencePath,
  KoreanNarrativeText,
  KoreanSingleLineText,
  LinkDestination,
  NormalizedProfile,
  Period,
  ProfileData,
  ProfileEntityReference,
  Project,
  PublicFact,
  SingleLineText,
  Skill,
  SkillGroup,
} from './types.js';

const KEBAB_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeText(value: string): string {
  return value.trim().replace(/\r\n?/g, '\n').normalize('NFC');
}

export function isKebabIdentifier(value: unknown): value is string {
  return typeof value === 'string' && KEBAB_IDENTIFIER_PATTERN.test(value);
}

export function normalizeProfile(input: ProfileData): NormalizedProfile {
  const normalized: ProfileData = {
    identity: {
      name: normalizeSingleLineFact(input.identity.name),
      headline: normalizeKoreanSingleLineFact(input.identity.headline),
    },
    narrative: {
      shortIntro: normalizeKoreanNarrativeFact(input.narrative.shortIntro),
      detailedIntro: input.narrative.detailedIntro.map(normalizeContentBlock) as [
        ContentBlock,
        ...ContentBlock[],
      ],
      resumeSummary: normalizeKoreanSingleLineFact(
        input.narrative.resumeSummary,
      ),
      portfolioSummary: normalizeKoreanSingleLineFact(
        input.narrative.portfolioSummary,
      ),
    },
    contact: normalizeContact(input.contact),
    skillGroups: input.skillGroups.map(normalizeSkillGroup),
    experiences: input.experiences.map(normalizeExperience),
    achievements: input.achievements.map(normalizeAchievement),
    projects: input.projects.map(normalizeProject),
    education: input.education.map(normalizeEducation),
    certifications: input.certifications.map(normalizeCertification),
  };

  return deepFreeze(normalized) as NormalizedProfile;
}

function normalizeContact(contact: ContactProfile): ContactProfile {
  return {
    email: normalizeEmailFact(contact.email),
    github: normalizeGitHubFact(contact.github),
    additionalLinks: contact.additionalLinks.map(normalizeEvidenceLink),
  };
}

function normalizeSkillGroup(group: SkillGroup): SkillGroup {
  return {
    id: group.id,
    order: group.order,
    title: normalizeSingleLineFact(group.title),
    skills: group.skills.map(normalizeSkill) as [Skill, ...Skill[]],
  };
}

function normalizeSkill(skill: Skill): Skill {
  return {
    id: skill.id,
    order: skill.order,
    name: normalizeSingleLineFact(skill.name),
  };
}

function normalizeExperience(experience: Experience): Experience {
  return {
    id: experience.id,
    order: experience.order,
    organization: normalizeSingleLineFact(experience.organization),
    role: normalizeSingleLineFact(experience.role),
    period: normalizePeriodFact(experience.period),
    summary: normalizeKoreanSingleLineFact(experience.summary),
    details: experience.details.map(normalizeContentBlock) as [
      ContentBlock,
      ...ContentBlock[],
    ],
    evidence: experience.evidence.map(normalizeEvidenceLink),
  };
}

function normalizeAchievement(achievement: Achievement): Achievement {
  return {
    id: achievement.id,
    order: achievement.order,
    title: normalizeSingleLineFact(achievement.title),
    ...normalizeOptionalPeriod(achievement),
    summary: normalizeKoreanSingleLineFact(achievement.summary),
    details: achievement.details.map(normalizeContentBlock) as [
      ContentBlock,
      ...ContentBlock[],
    ],
    evidence: achievement.evidence.map(normalizeEvidenceLink),
  };
}

function normalizeProject(project: Project): Project {
  return {
    id: project.id,
    order: project.order,
    title: normalizeSingleLineFact(project.title),
    ...normalizeOptionalPeriod(project),
    outcomeSummary: normalizeKoreanSingleLineFact(project.outcomeSummary),
    problem: normalizeRequiredBlocks(project.problem),
    role: normalizeRequiredBlocks(project.role),
    keyDecisions: normalizeRequiredBlocks(project.keyDecisions),
    architecture: normalizeRequiredBlocks(project.architecture),
    outcomes: normalizeRequiredBlocks(project.outcomes),
    lessons: normalizeRequiredBlocks(project.lessons),
    evidence: project.evidence.map(normalizeEvidenceLink),
    ...normalizeOptionalReference(project),
  };
}

function normalizeEducation(education: Education): Education {
  return {
    id: education.id,
    order: education.order,
    title: normalizeSingleLineFact(education.title),
    ...normalizeOptionalSingleLineFact(education, 'subtitle'),
    ...normalizeOptionalPeriod(education),
    details: education.details.map(normalizeContentBlock),
    evidence: education.evidence.map(normalizeEvidenceLink),
  };
}

function normalizeCertification(certification: Certification): Certification {
  return {
    id: certification.id,
    order: certification.order,
    title: normalizeSingleLineFact(certification.title),
    ...normalizeOptionalSingleLineFact(certification, 'issuer'),
    ...normalizeOptionalPeriod(certification),
    details: certification.details.map(normalizeContentBlock),
    evidence: certification.evidence.map(normalizeEvidenceLink),
  };
}

function normalizeRequiredBlocks(
  blocks: readonly ContentBlock[],
): [ContentBlock, ...ContentBlock[]] {
  return blocks.map(normalizeContentBlock) as [ContentBlock, ...ContentBlock[]];
}

function normalizeContentBlock(block: ContentBlock): ContentBlock {
  if (block.tag === 'paragraph') {
    return {
      tag: 'paragraph',
      text: normalizeBodyFact(block.text),
    };
  }

  if (block.tag === 'list') {
    return {
      tag: 'list',
      style: block.style,
      items: block.items.map(normalizeSingleLineFact) as [
        PublicFact<SingleLineText>,
        ...PublicFact<SingleLineText>[],
      ],
    };
  }

  return cloneUnknownValue(block) as ContentBlock;
}

function normalizeEvidenceLink(link: EvidenceLink): EvidenceLink {
  return {
    id: link.id,
    order: link.order,
    label: normalizeSingleLineFact(link.label),
    destination: normalizeLinkDestinationFact(link.destination),
  };
}

function normalizeLinkDestinationFact(
  fact: PublicFact<LinkDestination>,
): PublicFact<LinkDestination> {
  let value: LinkDestination;

  if (fact.value.tag === 'external') {
    value = {
      tag: 'external',
      value: normalizeText(
        fact.value.value,
      ) as unknown as ExternalEvidenceUrl,
    };
  } else if (fact.value.tag === 'internal') {
    value = {
      tag: 'internal',
      value: normalizeText(
        fact.value.value,
      ) as unknown as InternalEvidencePath,
    };
  } else {
    value = cloneUnknownValue(fact.value) as LinkDestination;
  }

  return {
    factId: fact.factId,
    value,
  };
}

function normalizePeriodFact(
  fact: PublicFact<Period>,
): PublicFact<Period> {
  return {
    factId: fact.factId,
    value: normalizePeriod(fact.value),
  };
}

function normalizePeriod(period: Period): Period {
  return {
    start: cloneDatePoint(period.start),
    end:
      period.end.tag === 'present'
        ? { tag: 'present' }
        : cloneDatePoint(period.end),
  };
}

function cloneDatePoint(point: DatePoint): DatePoint {
  return {
    tag: point.tag,
    value: point.value,
  } as DatePoint;
}

function normalizeSingleLineFact(
  fact: PublicFact<SingleLineText>,
): PublicFact<SingleLineText> {
  return normalizeStringFact(fact, (value) => value as SingleLineText);
}

function normalizeBodyFact(
  fact: PublicFact<BodyText>,
): PublicFact<BodyText> {
  return normalizeStringFact(fact, (value) => value as BodyText);
}

function normalizeKoreanNarrativeFact(
  fact: PublicFact<KoreanNarrativeText>,
): PublicFact<KoreanNarrativeText> {
  return normalizeStringFact(fact, (value) => value as KoreanNarrativeText);
}

function normalizeKoreanSingleLineFact(
  fact: PublicFact<KoreanSingleLineText>,
): PublicFact<KoreanSingleLineText> {
  return normalizeStringFact(fact, (value) => value as KoreanSingleLineText);
}

function normalizeEmailFact(
  fact: PublicFact<EmailAddress>,
): PublicFact<EmailAddress> {
  return normalizeStringFact(
    fact,
    (value) => value as unknown as EmailAddress,
  );
}

function normalizeGitHubFact(
  fact: PublicFact<GitHubProfileUrl>,
): PublicFact<GitHubProfileUrl> {
  return normalizeStringFact(
    fact,
    (value) => value as unknown as GitHubProfileUrl,
  );
}

function normalizeStringFact<Value extends string>(
  fact: PublicFact<Value>,
  brand: (value: string) => Value,
): PublicFact<Value> {
  return {
    factId: fact.factId as FactId,
    value: brand(normalizeText(fact.value)),
  };
}

function normalizeOptionalPeriod(
  source: Readonly<{ period?: PublicFact<Period> }>,
): Readonly<{ period?: PublicFact<Period> }> {
  if (!hasOwn(source, 'period')) {
    return {};
  }

  return {
    period:
      source.period === undefined
        ? source.period
        : normalizePeriodFact(source.period),
  };
}

function normalizeOptionalSingleLineFact<
  Key extends 'subtitle' | 'issuer',
>(
  source: Readonly<Partial<Record<Key, PublicFact<SingleLineText>>>>,
  key: Key,
): Readonly<Partial<Record<Key, PublicFact<SingleLineText>>>> {
  if (!hasOwn(source, key)) {
    return {} as Partial<Record<Key, PublicFact<SingleLineText>>>;
  }

  const fact = source[key];
  return {
    [key]: fact === undefined ? fact : normalizeSingleLineFact(fact),
  } as Partial<Record<Key, PublicFact<SingleLineText>>>;
}

function normalizeOptionalReference(
  project: Project,
): Readonly<{ relatedProfileEntity?: ProfileEntityReference }> {
  if (!hasOwn(project, 'relatedProfileEntity')) {
    return {};
  }

  const reference = project.relatedProfileEntity;
  if (reference === undefined) {
    return { relatedProfileEntity: reference };
  }

  if (reference.tag === 'experience') {
    return {
      relatedProfileEntity: {
        tag: 'experience',
        id: reference.id,
      },
    };
  }

  if (reference.tag === 'achievement') {
    return {
      relatedProfileEntity: {
        tag: 'achievement',
        id: reference.id,
      },
    };
  }

  return {
    relatedProfileEntity: cloneUnknownValue(
      reference,
    ) as ProfileEntityReference,
  };
}

function hasOwn(
  value: object,
  key: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneUnknownValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneUnknownValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        cloneUnknownValue(child),
      ]),
    );
  }

  return value;
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
