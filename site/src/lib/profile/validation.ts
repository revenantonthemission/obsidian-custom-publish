import {
  createValidationIssue,
  sortAndDedupeIssues,
} from './issues.js';
import {
  isKebabIdentifier,
  normalizeProfile,
  normalizeText,
} from './normalization.js';
import type {
  Achievement,
  Certification,
  ContentBlock,
  DatePoint,
  Education,
  EvidenceLink,
  Experience,
  Period,
  ProfileData,
  ProfileIssueCode,
  Project,
  PublicFact,
  Skill,
  SkillGroup,
  ValidatedProfile,
  ValidationIssue,
  ValidationResult,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

interface ShapeContext {
  readonly issues: ValidationIssue[];
  normalizable: boolean;
}

interface ValidationContext {
  readonly issues: ValidationIssue[];
  readonly factIds: Map<string, string[]>;
  readonly entityIds: Readonly<{
    skillGroup: Map<string, string[]>;
    skill: Map<string, string[]>;
    experience: Map<string, string[]>;
    achievement: Map<string, string[]>;
    project: Map<string, string[]>;
    education: Map<string, string[]>;
    certification: Map<string, string[]>;
    evidenceLink: Map<string, string[]>;
  }>;
}

const CONTROL_OR_WHITESPACE_PATTERN = /[\u0000-\u0020\u007f]/;
const EMAIL_LOCAL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const YEAR_PATTERN = /^\d{4}$/;
const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const GITHUB_PROFILE_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)$/;

const VALIDATED_PROFILE_CAPABILITIES = new WeakSet<object>();

export function validateProfile(
  input: ProfileData,
): ValidationResult<ValidatedProfile> {
  const shape = inspectShape(input);

  if (!shape.normalizable) {
    return validationFailure([
      ...shape.issues,
      ...validateDiscoverableUnsafeBranches(input),
    ]);
  }

  const normalized = normalizeProfile(input);
  const issues = [
    ...shape.issues,
    ...validateNormalizedProfile(normalized as unknown as ProfileData),
  ];

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  const validated = deepFreezeValidatedGraph(
    normalized,
  ) as unknown as ValidatedProfile;
  VALIDATED_PROFILE_CAPABILITIES.add(validated);

  return Object.freeze({
    ok: true,
    value: validated,
  });
}

/**
 * Runtime capability check for consumers that require an exact successful
 * `validateProfile` result rather than a structural imitation.
 *
 * @internal
 */
export function hasValidatedProfileCapability(
  candidate: unknown,
): candidate is ValidatedProfile {
  try {
    return (
      candidate !== null &&
      typeof candidate === 'object' &&
      VALIDATED_PROFILE_CAPABILITIES.has(candidate)
    );
  } catch {
    return false;
  }
}

export function requireValidProfile(input: ProfileData): ValidatedProfile {
  const result = validateProfile(input);
  if (result.ok) {
    return result.value;
  }

  const diagnostics = result.issues
    .map((issue) => `${issue.code}@${issue.path}`)
    .join(', ');
  throw new TypeError(`Profile validation failed: ${diagnostics}`);
}

function validationFailure(
  issues: readonly ValidationIssue[],
): ValidationResult<never> {
  const canonical = sortAndDedupeIssues(issues);
  const nonEmpty =
    canonical.length > 0
      ? canonical
      : [
          createValidationIssue('field.type', 'profile'),
        ];

  return Object.freeze({
    ok: false,
    issues: nonEmpty as [ValidationIssue, ...ValidationIssue[]],
  });
}

function deepFreezeValidatedGraph<Value>(
  value: Value,
  visited: WeakSet<object> = new WeakSet<object>(),
): Value {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (visited.has(value)) {
    return value;
  }

  visited.add(value);
  for (const child of Object.values(value)) {
    deepFreezeValidatedGraph(child, visited);
  }
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

function inspectShape(input: unknown): ShapeContext {
  const context: ShapeContext = {
    issues: [],
    normalizable: true,
  };

  if (!isRecord(input)) {
    addShapeIssue(context, 'field.type', 'profile');
    context.normalizable = false;
    return context;
  }

  const identity = requiredRecord(
    input,
    'identity',
    'profile.identity',
    context,
  );
  if (identity) {
    inspectTextFact(identity, 'name', 'profile.identity.name', context);
    inspectTextFact(
      identity,
      'headline',
      'profile.identity.headline',
      context,
    );
  }

  const narrative = requiredRecord(
    input,
    'narrative',
    'profile.narrative',
    context,
  );
  if (narrative) {
    inspectTextFact(
      narrative,
      'shortIntro',
      'profile.narrative.shortIntro',
      context,
    );
    inspectContentCollection(
      narrative,
      'detailedIntro',
      'profile.narrative.detailedIntro',
      true,
      context,
    );
    inspectTextFact(
      narrative,
      'resumeSummary',
      'profile.narrative.resumeSummary',
      context,
    );
    inspectTextFact(
      narrative,
      'portfolioSummary',
      'profile.narrative.portfolioSummary',
      context,
    );
  }

  const contact = requiredRecord(
    input,
    'contact',
    'profile.contact',
    context,
  );
  if (contact) {
    inspectTextFact(contact, 'email', 'profile.contact.email', context);
    inspectTextFact(contact, 'github', 'profile.contact.github', context);
    inspectEvidenceCollection(
      contact,
      'additionalLinks',
      'profile.contact.additionalLinks',
      context,
    );
  }

  const skillGroups = requiredArray(
    input,
    'skillGroups',
    'profile.skillGroups',
    context,
  );
  if (skillGroups) {
    requireMinimum(skillGroups, 1, 'profile.skillGroups', context.issues);
    skillGroups.forEach((candidate, index) => {
      const path = `profile.skillGroups[${index}]`;
      const group = arrayElementRecord(candidate, path, context);
      if (!group) {
        return;
      }
      inspectEntityControls(group, path, context);
      inspectTextFact(group, 'title', `${path}.title`, context);
      const skills = requiredArray(group, 'skills', `${path}.skills`, context);
      if (!skills) {
        return;
      }
      requireMinimum(skills, 1, `${path}.skills`, context.issues);
      skills.forEach((skillCandidate, skillIndex) => {
        const skillPath = `${path}.skills[${skillIndex}]`;
        const skill = arrayElementRecord(skillCandidate, skillPath, context);
        if (!skill) {
          return;
        }
        inspectEntityControls(skill, skillPath, context);
        inspectTextFact(skill, 'name', `${skillPath}.name`, context);
      });
    });
  }

  const experiences = inspectExperiences(input, context);
  const achievements = inspectAchievements(input, context);
  if (
    experiences &&
    achievements &&
    experiences.length + achievements.length < 1
  ) {
    context.issues.push(
      createValidationIssue('collection.minimum', 'profile.experiences', {
        min: 1,
      }),
    );
  }

  inspectProjects(input, context);
  inspectEducation(input, context);
  inspectCertifications(input, context);

  return context;
}

function inspectExperiences(
  root: UnknownRecord,
  context: ShapeContext,
): readonly unknown[] | undefined {
  const experiences = requiredArray(
    root,
    'experiences',
    'profile.experiences',
    context,
  );
  if (!experiences) {
    return undefined;
  }

  experiences.forEach((candidate, index) => {
    const path = `profile.experiences[${index}]`;
    const experience = arrayElementRecord(candidate, path, context);
    if (!experience) {
      return;
    }
    inspectEntityControls(experience, path, context);
    inspectTextFact(
      experience,
      'organization',
      `${path}.organization`,
      context,
    );
    inspectTextFact(experience, 'role', `${path}.role`, context);
    inspectPeriodFact(experience, 'period', `${path}.period`, false, context);
    inspectTextFact(experience, 'summary', `${path}.summary`, context);
    inspectContentCollection(
      experience,
      'details',
      `${path}.details`,
      true,
      context,
    );
    inspectEvidenceCollection(
      experience,
      'evidence',
      `${path}.evidence`,
      context,
    );
  });

  return experiences;
}

function inspectAchievements(
  root: UnknownRecord,
  context: ShapeContext,
): readonly unknown[] | undefined {
  const achievements = requiredArray(
    root,
    'achievements',
    'profile.achievements',
    context,
  );
  if (!achievements) {
    return undefined;
  }

  achievements.forEach((candidate, index) => {
    const path = `profile.achievements[${index}]`;
    const achievement = arrayElementRecord(candidate, path, context);
    if (!achievement) {
      return;
    }
    inspectEntityControls(achievement, path, context);
    inspectTextFact(achievement, 'title', `${path}.title`, context);
    inspectPeriodFact(
      achievement,
      'period',
      `${path}.period`,
      true,
      context,
    );
    inspectTextFact(achievement, 'summary', `${path}.summary`, context);
    inspectContentCollection(
      achievement,
      'details',
      `${path}.details`,
      true,
      context,
    );
    inspectEvidenceCollection(
      achievement,
      'evidence',
      `${path}.evidence`,
      context,
    );
  });

  return achievements;
}

function inspectProjects(root: UnknownRecord, context: ShapeContext): void {
  const projects = requiredArray(
    root,
    'projects',
    'profile.projects',
    context,
  );
  if (!projects) {
    return;
  }

  if (projects.length < 3 || projects.length > 6) {
    context.issues.push(
      createValidationIssue('collection.range', 'profile.projects', {
        min: 3,
        max: 6,
      }),
    );
  }

  projects.forEach((candidate, index) => {
    const path = `profile.projects[${index}]`;
    const project = arrayElementRecord(candidate, path, context);
    if (!project) {
      return;
    }
    inspectEntityControls(project, path, context);
    inspectTextFact(project, 'title', `${path}.title`, context);
    inspectPeriodFact(project, 'period', `${path}.period`, true, context);
    inspectTextFact(
      project,
      'outcomeSummary',
      `${path}.outcomeSummary`,
      context,
    );
    for (const dimension of [
      'problem',
      'role',
      'keyDecisions',
      'architecture',
      'outcomes',
      'lessons',
    ] as const) {
      inspectContentCollection(
        project,
        dimension,
        `${path}.${dimension}`,
        true,
        context,
      );
    }
    inspectEvidenceCollection(project, 'evidence', `${path}.evidence`, context);
    inspectOptionalReference(project, `${path}.relatedProfileEntity`, context);
  });
}

function inspectEducation(root: UnknownRecord, context: ShapeContext): void {
  const education = requiredArray(
    root,
    'education',
    'profile.education',
    context,
  );
  if (!education) {
    return;
  }

  education.forEach((candidate, index) => {
    const path = `profile.education[${index}]`;
    const item = arrayElementRecord(candidate, path, context);
    if (!item) {
      return;
    }
    inspectEntityControls(item, path, context);
    inspectTextFact(item, 'title', `${path}.title`, context);
    inspectOptionalTextFact(item, 'subtitle', `${path}.subtitle`, context);
    inspectPeriodFact(item, 'period', `${path}.period`, true, context);
    inspectContentCollection(item, 'details', `${path}.details`, false, context);
    inspectEvidenceCollection(item, 'evidence', `${path}.evidence`, context);
  });
}

function inspectCertifications(
  root: UnknownRecord,
  context: ShapeContext,
): void {
  const certifications = requiredArray(
    root,
    'certifications',
    'profile.certifications',
    context,
  );
  if (!certifications) {
    return;
  }

  certifications.forEach((candidate, index) => {
    const path = `profile.certifications[${index}]`;
    const item = arrayElementRecord(candidate, path, context);
    if (!item) {
      return;
    }
    inspectEntityControls(item, path, context);
    inspectTextFact(item, 'title', `${path}.title`, context);
    inspectOptionalTextFact(item, 'issuer', `${path}.issuer`, context);
    inspectPeriodFact(item, 'period', `${path}.period`, true, context);
    inspectContentCollection(item, 'details', `${path}.details`, false, context);
    inspectEvidenceCollection(item, 'evidence', `${path}.evidence`, context);
  });
}

function inspectEntityControls(
  entity: UnknownRecord,
  path: string,
  context: ShapeContext,
): void {
  inspectRequiredPrimitive(
    entity,
    'id',
    `${path}.id`,
    'string',
    context,
  );
  if (!hasOwn(entity, 'order') || entity.order === undefined) {
    addShapeIssue(context, 'field.required', `${path}.order`);
    context.normalizable = false;
  } else if (typeof entity.order !== 'number') {
    context.normalizable = false;
  }
}

function inspectTextFact(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ShapeContext,
): void {
  const fact = requiredRecord(owner, key, path, context);
  if (!fact) {
    return;
  }
  inspectRequiredPrimitive(
    fact,
    'factId',
    `${path}.factId`,
    'string',
    context,
  );
  inspectRequiredPrimitive(fact, 'value', `${path}.value`, 'string', context);
}

function inspectOptionalTextFact(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ShapeContext,
): void {
  if (!hasOwn(owner, key)) {
    return;
  }
  if (owner[key] === undefined) {
    addShapeIssue(context, 'field.type', path);
    return;
  }
  inspectTextFact(owner, key, path, context);
}

function inspectPeriodFact(
  owner: UnknownRecord,
  key: string,
  path: string,
  optional: boolean,
  context: ShapeContext,
): void {
  if (optional && !hasOwn(owner, key)) {
    return;
  }
  if (optional && owner[key] === undefined) {
    addShapeIssue(context, 'field.type', path);
    return;
  }

  const fact = requiredRecord(owner, key, path, context);
  if (!fact) {
    return;
  }
  inspectRequiredPrimitive(
    fact,
    'factId',
    `${path}.factId`,
    'string',
    context,
  );
  const period = requiredRecord(fact, 'value', `${path}.value`, context);
  if (!period) {
    return;
  }
  inspectDatePoint(period, 'start', `${path}.value.start`, context);
  inspectDatePoint(period, 'end', `${path}.value.end`, context);
}

function inspectDatePoint(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ShapeContext,
): void {
  const point = requiredRecord(owner, key, path, context);
  if (!point) {
    return;
  }
  inspectRequiredPrimitive(point, 'tag', `${path}.tag`, 'string', context);
  if (point.tag !== 'present') {
    inspectRequiredPrimitive(
      point,
      'value',
      `${path}.value`,
      'string',
      context,
    );
  }
}

function inspectContentCollection(
  owner: UnknownRecord,
  key: string,
  path: string,
  minimumOne: boolean,
  context: ShapeContext,
): void {
  const blocks = requiredArray(owner, key, path, context);
  if (!blocks) {
    return;
  }
  if (minimumOne) {
    requireMinimum(blocks, 1, path, context.issues);
  }

  blocks.forEach((candidate, index) => {
    const blockPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      addShapeIssue(context, 'content.block.kind', blockPath);
      context.normalizable = false;
      return;
    }

    if (candidate.tag === 'paragraph') {
      inspectTextFact(candidate, 'text', `${blockPath}.text`, context);
      return;
    }

    if (candidate.tag === 'list') {
      inspectRequiredPrimitive(
        candidate,
        'style',
        `${blockPath}.style`,
        'string',
        context,
      );
      const items = requiredArray(
        candidate,
        'items',
        `${blockPath}.items`,
        context,
      );
      if (!items) {
        return;
      }
      if (items.length === 0) {
        addShapeIssue(context, 'content.block.empty', blockPath);
      }
      items.forEach((item, itemIndex) => {
        const itemPath = `${blockPath}.items[${itemIndex}]`;
        if (!isRecord(item)) {
          addShapeIssue(context, 'field.type', itemPath);
          context.normalizable = false;
          return;
        }
        inspectRequiredPrimitive(
          item,
          'factId',
          `${itemPath}.factId`,
          'string',
          context,
        );
        inspectRequiredPrimitive(
          item,
          'value',
          `${itemPath}.value`,
          'string',
          context,
        );
      });
      return;
    }

    addShapeIssue(context, 'content.block.kind', blockPath);
    context.normalizable = false;
  });
}

function inspectEvidenceCollection(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ShapeContext,
): void {
  const links = requiredArray(owner, key, path, context);
  if (!links) {
    return;
  }

  links.forEach((candidate, index) => {
    const linkPath = `${path}[${index}]`;
    const link = arrayElementRecord(candidate, linkPath, context);
    if (!link) {
      return;
    }
    inspectEntityControls(link, linkPath, context);
    inspectTextFact(link, 'label', `${linkPath}.label`, context);

    const destination = requiredRecord(
      link,
      'destination',
      `${linkPath}.destination`,
      context,
    );
    if (!destination) {
      return;
    }
    inspectRequiredPrimitive(
      destination,
      'factId',
      `${linkPath}.destination.factId`,
      'string',
      context,
    );
    const value = requiredRecord(
      destination,
      'value',
      `${linkPath}.destination.value`,
      context,
    );
    if (!value) {
      return;
    }
    inspectRequiredPrimitive(
      value,
      'tag',
      `${linkPath}.destination.value.tag`,
      'string',
      context,
    );
    if (value.tag === 'external' || value.tag === 'internal') {
      inspectRequiredPrimitive(
        value,
        'value',
        `${linkPath}.destination.value.value`,
        'string',
        context,
      );
    } else if (typeof value.tag === 'string') {
      context.normalizable = false;
    }
  });
}

function inspectOptionalReference(
  project: UnknownRecord,
  path: string,
  context: ShapeContext,
): void {
  if (!hasOwn(project, 'relatedProfileEntity')) {
    return;
  }
  const candidate = project.relatedProfileEntity;
  if (candidate === undefined) {
    addShapeIssue(context, 'field.type', path);
    return;
  }
  if (!isRecord(candidate)) {
    addShapeIssue(context, 'reference.kind', path);
    context.normalizable = false;
    return;
  }
  inspectRequiredPrimitive(candidate, 'tag', `${path}.tag`, 'string', context);
  inspectRequiredPrimitive(candidate, 'id', `${path}.id`, 'string', context);
  if (
    typeof candidate.tag === 'string' &&
    candidate.tag !== 'experience' &&
    candidate.tag !== 'achievement'
  ) {
    context.normalizable = false;
  }
}

function requiredRecord(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ShapeContext,
): UnknownRecord | undefined {
  if (!hasOwn(owner, key) || owner[key] === undefined) {
    addShapeIssue(context, 'field.required', path);
    context.normalizable = false;
    return undefined;
  }
  if (!isRecord(owner[key])) {
    addShapeIssue(context, 'field.type', path);
    context.normalizable = false;
    return undefined;
  }
  return owner[key];
}

function requiredArray(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ShapeContext,
): readonly unknown[] | undefined {
  if (!hasOwn(owner, key) || owner[key] === undefined) {
    addShapeIssue(context, 'field.required', path);
    context.normalizable = false;
    return undefined;
  }
  if (!Array.isArray(owner[key])) {
    addShapeIssue(context, 'field.type', path);
    context.normalizable = false;
    return undefined;
  }
  return owner[key];
}

function arrayElementRecord(
  candidate: unknown,
  path: string,
  context: ShapeContext,
): UnknownRecord | undefined {
  if (!isRecord(candidate)) {
    addShapeIssue(context, 'field.type', path);
    context.normalizable = false;
    return undefined;
  }
  return candidate;
}

function inspectRequiredPrimitive(
  owner: UnknownRecord,
  key: string,
  path: string,
  expected: 'string' | 'number',
  context: ShapeContext,
  blocksNormalization = true,
): void {
  if (!hasOwn(owner, key) || owner[key] === undefined) {
    addShapeIssue(context, 'field.required', path);
    if (blocksNormalization) {
      context.normalizable = false;
    }
    return;
  }
  if (typeof owner[key] !== expected) {
    addShapeIssue(context, 'field.type', path);
    if (blocksNormalization) {
      context.normalizable = false;
    }
  }
}

function addShapeIssue(
  context: ShapeContext,
  code: ProfileIssueCode,
  path: string,
): void {
  context.issues.push(createValidationIssue(code, path));
}

function validateDiscoverableUnsafeBranches(
  input: unknown,
): readonly ValidationIssue[] {
  if (!isRecord(input)) {
    return [];
  }

  const context = createValidationContext();

  const identity = recordAt(input, 'identity');
  if (identity) {
    validateUnsafeStringFact(
      identity,
      'name',
      'profile.identity.name',
      'single-line',
      context,
    );
    validateUnsafeStringFact(
      identity,
      'headline',
      'profile.identity.headline',
      'single-line',
      context,
    );
  }

  const narrative = recordAt(input, 'narrative');
  if (narrative) {
    validateUnsafeStringFact(
      narrative,
      'shortIntro',
      'profile.narrative.shortIntro',
      'body',
      context,
    );
    validateUnsafeContentBlocks(
      narrative.detailedIntro,
      'profile.narrative.detailedIntro',
      context,
    );
    validateUnsafeStringFact(
      narrative,
      'resumeSummary',
      'profile.narrative.resumeSummary',
      'single-line',
      context,
    );
    validateUnsafeStringFact(
      narrative,
      'portfolioSummary',
      'profile.narrative.portfolioSummary',
      'single-line',
      context,
    );
  }

  const contact = recordAt(input, 'contact');
  if (contact) {
    validateUnsafeStringFact(
      contact,
      'email',
      'profile.contact.email',
      'email',
      context,
    );
    validateUnsafeStringFact(
      contact,
      'github',
      'profile.contact.github',
      'github',
      context,
    );
    validateUnsafeEvidenceLinks(
      contact.additionalLinks,
      'profile.contact.additionalLinks',
      context,
    );
  }

  validateUnsafeOrderedCollection(
    input.skillGroups,
    'profile.skillGroups',
    context.entityIds.skillGroup,
    context,
    (group, path) => {
      validateUnsafeStringFact(group, 'title', `${path}.title`, 'single-line', context);
      validateUnsafeOrderedCollection(
        group.skills,
        `${path}.skills`,
        context.entityIds.skill,
        context,
        (skill, skillPath) => {
          validateUnsafeStringFact(
            skill,
            'name',
            `${skillPath}.name`,
            'single-line',
            context,
          );
        },
      );
    },
  );

  validateUnsafeOrderedCollection(
    input.experiences,
    'profile.experiences',
    context.entityIds.experience,
    context,
    (experience, path) => {
      validateUnsafeStringFact(
        experience,
        'organization',
        `${path}.organization`,
        'single-line',
        context,
      );
      validateUnsafeStringFact(
        experience,
        'role',
        `${path}.role`,
        'single-line',
        context,
      );
      validateUnsafePeriodFact(experience, 'period', `${path}.period`, context);
      validateUnsafeStringFact(
        experience,
        'summary',
        `${path}.summary`,
        'single-line',
        context,
      );
      validateUnsafeContentBlocks(experience.details, `${path}.details`, context);
      validateUnsafeEvidenceLinks(experience.evidence, `${path}.evidence`, context);
    },
  );

  validateUnsafeOrderedCollection(
    input.achievements,
    'profile.achievements',
    context.entityIds.achievement,
    context,
    (achievement, path) => {
      validateUnsafeStringFact(
        achievement,
        'title',
        `${path}.title`,
        'single-line',
        context,
      );
      validateUnsafePeriodFact(achievement, 'period', `${path}.period`, context);
      validateUnsafeStringFact(
        achievement,
        'summary',
        `${path}.summary`,
        'single-line',
        context,
      );
      validateUnsafeContentBlocks(achievement.details, `${path}.details`, context);
      validateUnsafeEvidenceLinks(achievement.evidence, `${path}.evidence`, context);
    },
  );

  validateUnsafeOrderedCollection(
    input.projects,
    'profile.projects',
    context.entityIds.project,
    context,
    (project, path) => {
      validateUnsafeStringFact(
        project,
        'title',
        `${path}.title`,
        'single-line',
        context,
      );
      validateUnsafePeriodFact(project, 'period', `${path}.period`, context);
      validateUnsafeStringFact(
        project,
        'outcomeSummary',
        `${path}.outcomeSummary`,
        'single-line',
        context,
      );
      for (const dimension of [
        'problem',
        'role',
        'keyDecisions',
        'architecture',
        'outcomes',
        'lessons',
      ] as const) {
        validateUnsafeContentBlocks(
          project[dimension],
          `${path}.${dimension}`,
          context,
        );
      }
      validateUnsafeEvidenceLinks(project.evidence, `${path}.evidence`, context);
      const reference = recordAt(project, 'relatedProfileEntity');
      if (reference) {
        if (
          typeof reference.tag === 'string' &&
          reference.tag !== 'experience' &&
          reference.tag !== 'achievement'
        ) {
          context.issues.push(
            createValidationIssue(
              'reference.kind',
              `${path}.relatedProfileEntity`,
            ),
          );
        } else {
          validateIdentifier(
            reference.id,
            `${path}.relatedProfileEntity.id`,
            undefined,
            context,
          );
        }
      }
    },
  );

  validateUnsafeOrderedCollection(
    input.education,
    'profile.education',
    context.entityIds.education,
    context,
    (education, path) => {
      validateUnsafeStringFact(
        education,
        'title',
        `${path}.title`,
        'single-line',
        context,
      );
      validateUnsafeStringFact(
        education,
        'subtitle',
        `${path}.subtitle`,
        'single-line',
        context,
      );
      validateUnsafePeriodFact(education, 'period', `${path}.period`, context);
      validateUnsafeContentBlocks(education.details, `${path}.details`, context);
      validateUnsafeEvidenceLinks(education.evidence, `${path}.evidence`, context);
    },
  );

  validateUnsafeOrderedCollection(
    input.certifications,
    'profile.certifications',
    context.entityIds.certification,
    context,
    (certification, path) => {
      validateUnsafeStringFact(
        certification,
        'title',
        `${path}.title`,
        'single-line',
        context,
      );
      validateUnsafeStringFact(
        certification,
        'issuer',
        `${path}.issuer`,
        'single-line',
        context,
      );
      validateUnsafePeriodFact(
        certification,
        'period',
        `${path}.period`,
        context,
      );
      validateUnsafeContentBlocks(
        certification.details,
        `${path}.details`,
        context,
      );
      validateUnsafeEvidenceLinks(
        certification.evidence,
        `${path}.evidence`,
        context,
      );
    },
  );

  addDuplicateIssues(
    context.factIds,
    'fact.identifier.duplicate',
    context.issues,
  );
  for (const occurrences of Object.values(context.entityIds)) {
    addDuplicateIssues(occurrences, 'identifier.duplicate', context.issues);
  }
  validateUnsafeProjectReferences(input, context);

  return context.issues;
}

type UnsafeStringFactKind =
  | 'single-line'
  | 'body'
  | 'content-single-line'
  | 'content-body'
  | 'email'
  | 'github';

function validateUnsafeStringFact(
  owner: UnknownRecord,
  key: string,
  path: string,
  kind: UnsafeStringFactKind,
  context: ValidationContext,
  contentEmptyPath = path,
): void {
  const fact = recordAt(owner, key);
  if (!fact) {
    return;
  }
  validateFactId(fact as unknown as PublicFact<unknown>, path, context);
  if (typeof fact.value !== 'string') {
    return;
  }

  const value = normalizeText(fact.value);
  const isContent =
    kind === 'content-single-line' || kind === 'content-body';
  if (value.length === 0) {
    context.issues.push(
      createValidationIssue(
        isContent ? 'content.block.empty' : 'text.empty',
        isContent ? contentEmptyPath : path,
      ),
    );
    return;
  }

  if (
    (kind === 'single-line' || kind === 'content-single-line') &&
    value.includes('\n')
  ) {
    context.issues.push(createValidationIssue('field.type', path));
  } else if (kind === 'email' && !isValidEmail(value)) {
    context.issues.push(
      createValidationIssue('contact.email.invalid', path),
    );
  } else if (kind === 'github' && !isValidGitHubProfileUrl(value)) {
    context.issues.push(
      createValidationIssue('contact.github.invalid', path),
    );
  }
}

function validateUnsafePeriodFact(
  owner: UnknownRecord,
  key: string,
  path: string,
  context: ValidationContext,
): void {
  const fact = recordAt(owner, key);
  if (!fact) {
    return;
  }
  validateFactId(fact as unknown as PublicFact<unknown>, path, context);
  const period = recordAt(fact, 'value');
  const start = period ? recordAt(period, 'start') : undefined;
  const end = period ? recordAt(period, 'end') : undefined;
  if (!period || !start || !end) {
    return;
  }
  validatePeriod(
    { start, end } as unknown as Period,
    path,
    context,
  );
}

function validateUnsafeContentBlocks(
  candidate: unknown,
  path: string,
  context: ValidationContext,
): void {
  if (!Array.isArray(candidate)) {
    return;
  }
  candidate.forEach((blockCandidate, index) => {
    if (!isRecord(blockCandidate)) {
      return;
    }
    const blockPath = `${path}[${index}]`;
    if (blockCandidate.tag === 'paragraph') {
      validateUnsafeStringFact(
        blockCandidate,
        'text',
        `${blockPath}.text`,
        'content-body',
        context,
        blockPath,
      );
      return;
    }
    if (blockCandidate.tag === 'list') {
      if (
        typeof blockCandidate.style === 'string' &&
        blockCandidate.style !== 'ordered' &&
        blockCandidate.style !== 'unordered'
      ) {
        context.issues.push(
          createValidationIssue('field.type', `${blockPath}.style`),
        );
      }
      if (!Array.isArray(blockCandidate.items)) {
        return;
      }
      blockCandidate.items.forEach((item, itemIndex) => {
        if (!isRecord(item)) {
          return;
        }
        validateUnsafeStringFact(
          { item },
          'item',
          `${blockPath}.items[${itemIndex}]`,
          'content-single-line',
          context,
        );
      });
    }
  });
}

function validateUnsafeEvidenceLinks(
  candidate: unknown,
  path: string,
  context: ValidationContext,
): void {
  validateUnsafeOrderedCollection(
    candidate,
    path,
    context.entityIds.evidenceLink,
    context,
    (link, linkPath) => {
      validateUnsafeStringFact(
        link,
        'label',
        `${linkPath}.label`,
        'single-line',
        context,
      );
      const destination = recordAt(link, 'destination');
      if (!destination) {
        return;
      }
      validateFactId(
        destination as unknown as PublicFact<unknown>,
        `${linkPath}.destination`,
        context,
      );
      const value = recordAt(destination, 'value');
      if (!value || typeof value.value !== 'string') {
        return;
      }
      const normalizedValue = normalizeText(value.value);
      const valid =
        value.tag === 'external'
          ? isValidExternalEvidenceUrl(normalizedValue)
          : value.tag === 'internal'
            ? isValidInternalEvidencePath(normalizedValue)
            : false;
      if (!valid) {
        context.issues.push(
          createValidationIssue(
            'evidence.url.invalid',
            `${linkPath}.destination`,
          ),
        );
      }
    },
  );
}

function validateUnsafeOrderedCollection(
  candidate: unknown,
  path: string,
  entityIds: Map<string, string[]>,
  context: ValidationContext,
  validateItem: (item: UnknownRecord, path: string) => void,
): void {
  if (!Array.isArray(candidate)) {
    return;
  }
  const orders = new Map<string, string[]>();
  candidate.forEach((itemCandidate, index) => {
    if (!isRecord(itemCandidate)) {
      return;
    }
    const itemPath = `${path}[${index}]`;
    validateIdentifier(itemCandidate.id, `${itemPath}.id`, entityIds, context);
    if (hasOwn(itemCandidate, 'order') && itemCandidate.order !== undefined) {
      validateOrder(itemCandidate.order, `${itemPath}.order`, orders, context);
    }
    validateItem(itemCandidate, itemPath);
  });
  addDuplicateIssues(orders, 'order.duplicate', context.issues);
}

function validateUnsafeProjectReferences(
  root: UnknownRecord,
  context: ValidationContext,
): void {
  const experienceIds = unsafeEntityIdSet(root.experiences);
  const achievementIds = unsafeEntityIdSet(root.achievements);
  if (!Array.isArray(root.projects)) {
    return;
  }
  root.projects.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      return;
    }
    const reference = recordAt(candidate, 'relatedProfileEntity');
    if (
      !reference ||
      (reference.tag !== 'experience' && reference.tag !== 'achievement') ||
      typeof reference.id !== 'string' ||
      !isKebabIdentifier(reference.id)
    ) {
      return;
    }
    const exists =
      reference.tag === 'experience'
        ? experienceIds.has(reference.id)
        : achievementIds.has(reference.id);
    if (!exists) {
      context.issues.push(
        createValidationIssue(
          'reference.missing',
          `profile.projects[${index}].relatedProfileEntity`,
        ),
      );
    }
  });
}

function unsafeEntityIdSet(candidate: unknown): ReadonlySet<string> {
  if (!Array.isArray(candidate)) {
    return new Set();
  }
  return new Set(
    candidate
      .filter(isRecord)
      .map((entity) => entity.id)
      .filter((id): id is string => typeof id === 'string'),
  );
}

function recordAt(
  owner: UnknownRecord,
  key: string,
): UnknownRecord | undefined {
  return isRecord(owner[key]) ? owner[key] : undefined;
}

function validateNormalizedProfile(
  profile: ProfileData,
): readonly ValidationIssue[] {
  const context = createValidationContext();

  validateTextFact(profile.identity.name, 'profile.identity.name', true, context);
  validateTextFact(
    profile.identity.headline,
    'profile.identity.headline',
    true,
    context,
  );
  validateTextFact(
    profile.narrative.shortIntro,
    'profile.narrative.shortIntro',
    false,
    context,
  );
  validateContentBlocks(
    profile.narrative.detailedIntro,
    'profile.narrative.detailedIntro',
    true,
    context,
  );
  validateTextFact(
    profile.narrative.resumeSummary,
    'profile.narrative.resumeSummary',
    true,
    context,
  );
  validateTextFact(
    profile.narrative.portfolioSummary,
    'profile.narrative.portfolioSummary',
    true,
    context,
  );

  validateEmailFact(profile.contact.email, 'profile.contact.email', context);
  validateGitHubFact(profile.contact.github, 'profile.contact.github', context);
  validateEvidenceLinks(
    profile.contact.additionalLinks,
    'profile.contact.additionalLinks',
    context,
  );

  requireMinimum(profile.skillGroups, 1, 'profile.skillGroups', context.issues);
  validateOrderedCollection(
    profile.skillGroups,
    'profile.skillGroups',
    context.entityIds.skillGroup,
    context,
    (group, path) => validateSkillGroup(group, path, context),
  );

  validateOrderedCollection(
    profile.experiences,
    'profile.experiences',
    context.entityIds.experience,
    context,
    (experience, path) => validateExperience(experience, path, context),
  );
  validateOrderedCollection(
    profile.achievements,
    'profile.achievements',
    context.entityIds.achievement,
    context,
    (achievement, path) => validateAchievement(achievement, path, context),
  );
  if (profile.experiences.length + profile.achievements.length < 1) {
    context.issues.push(
      createValidationIssue('collection.minimum', 'profile.experiences', {
        min: 1,
      }),
    );
  }

  if (profile.projects.length < 3 || profile.projects.length > 6) {
    context.issues.push(
      createValidationIssue('collection.range', 'profile.projects', {
        min: 3,
        max: 6,
      }),
    );
  }
  validateOrderedCollection(
    profile.projects,
    'profile.projects',
    context.entityIds.project,
    context,
    (project, path) => validateProject(project, path, context),
  );

  validateOrderedCollection(
    profile.education,
    'profile.education',
    context.entityIds.education,
    context,
    (education, path) => validateEducation(education, path, context),
  );
  validateOrderedCollection(
    profile.certifications,
    'profile.certifications',
    context.entityIds.certification,
    context,
    (certification, path) =>
      validateCertification(certification, path, context),
  );

  addDuplicateIssues(
    context.factIds,
    'fact.identifier.duplicate',
    context.issues,
  );
  for (const occurrences of Object.values(context.entityIds)) {
    addDuplicateIssues(
      occurrences,
      'identifier.duplicate',
      context.issues,
    );
  }
  validateProjectReferences(profile, context);

  return context.issues;
}

function createValidationContext(): ValidationContext {
  return {
    issues: [],
    factIds: new Map(),
    entityIds: {
      skillGroup: new Map(),
      skill: new Map(),
      experience: new Map(),
      achievement: new Map(),
      project: new Map(),
      education: new Map(),
      certification: new Map(),
      evidenceLink: new Map(),
    },
  };
}

function validateSkillGroup(
  group: SkillGroup,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(group.title, `${path}.title`, true, context);
  requireMinimum(group.skills, 1, `${path}.skills`, context.issues);
  validateOrderedCollection(
    group.skills,
    `${path}.skills`,
    context.entityIds.skill,
    context,
    (skill, skillPath) => validateSkill(skill, skillPath, context),
  );
}

function validateSkill(
  skill: Skill,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(skill.name, `${path}.name`, true, context);
}

function validateExperience(
  experience: Experience,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(
    experience.organization,
    `${path}.organization`,
    true,
    context,
  );
  validateTextFact(experience.role, `${path}.role`, true, context);
  validatePeriodFact(experience.period, `${path}.period`, context);
  validateTextFact(experience.summary, `${path}.summary`, true, context);
  validateContentBlocks(experience.details, `${path}.details`, true, context);
  validateEvidenceLinks(experience.evidence, `${path}.evidence`, context);
}

function validateAchievement(
  achievement: Achievement,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(achievement.title, `${path}.title`, true, context);
  if (achievement.period !== undefined) {
    validatePeriodFact(achievement.period, `${path}.period`, context);
  }
  validateTextFact(achievement.summary, `${path}.summary`, true, context);
  validateContentBlocks(achievement.details, `${path}.details`, true, context);
  validateEvidenceLinks(achievement.evidence, `${path}.evidence`, context);
}

function validateProject(
  project: Project,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(project.title, `${path}.title`, true, context);
  if (project.period !== undefined) {
    validatePeriodFact(project.period, `${path}.period`, context);
  }
  validateTextFact(
    project.outcomeSummary,
    `${path}.outcomeSummary`,
    true,
    context,
  );
  for (const dimension of [
    'problem',
    'role',
    'keyDecisions',
    'architecture',
    'outcomes',
    'lessons',
  ] as const) {
    validateContentBlocks(
      project[dimension],
      `${path}.${dimension}`,
      true,
      context,
    );
  }
  validateEvidenceLinks(project.evidence, `${path}.evidence`, context);

  if (project.relatedProfileEntity !== undefined) {
    const reference = project.relatedProfileEntity as unknown as UnknownRecord;
    if (
      typeof reference.tag === 'string' &&
      reference.tag !== 'experience' &&
      reference.tag !== 'achievement'
    ) {
      context.issues.push(
        createValidationIssue(
          'reference.kind',
          `${path}.relatedProfileEntity`,
        ),
      );
    } else {
      validateIdentifier(
        reference.id,
        `${path}.relatedProfileEntity.id`,
        undefined,
        context,
      );
    }
  }
}

function validateEducation(
  education: Education,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(education.title, `${path}.title`, true, context);
  if (education.subtitle !== undefined) {
    validateTextFact(education.subtitle, `${path}.subtitle`, true, context);
  }
  if (education.period !== undefined) {
    validatePeriodFact(education.period, `${path}.period`, context);
  }
  validateContentBlocks(education.details, `${path}.details`, false, context);
  validateEvidenceLinks(education.evidence, `${path}.evidence`, context);
}

function validateCertification(
  certification: Certification,
  path: string,
  context: ValidationContext,
): void {
  validateTextFact(certification.title, `${path}.title`, true, context);
  if (certification.issuer !== undefined) {
    validateTextFact(certification.issuer, `${path}.issuer`, true, context);
  }
  if (certification.period !== undefined) {
    validatePeriodFact(certification.period, `${path}.period`, context);
  }
  validateContentBlocks(
    certification.details,
    `${path}.details`,
    false,
    context,
  );
  validateEvidenceLinks(certification.evidence, `${path}.evidence`, context);
}

function validateOrderedCollection<Item extends { readonly id: unknown; readonly order: unknown }>(
  items: readonly Item[],
  path: string,
  entityIds: Map<string, string[]>,
  context: ValidationContext,
  validateItem: (item: Item, path: string) => void,
): void {
  const orders = new Map<string, string[]>();

  items.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    validateIdentifier(item.id, `${itemPath}.id`, entityIds, context);
    validateOrder(item.order, `${itemPath}.order`, orders, context);
    validateItem(item, itemPath);
  });

  addDuplicateIssues(orders, 'order.duplicate', context.issues);
}

function validateIdentifier(
  value: unknown,
  path: string,
  occurrences: Map<string, string[]> | undefined,
  context: ValidationContext,
): void {
  if (typeof value !== 'string') {
    return;
  }
  if (!isKebabIdentifier(value)) {
    context.issues.push(createValidationIssue('identifier.format', path));
  }
  if (occurrences) {
    addOccurrence(occurrences, value, path);
  }
}

function validateOrder(
  value: unknown,
  path: string,
  occurrences: Map<string, string[]>,
  context: ValidationContext,
): void {
  if (value === undefined) {
    return;
  }
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    context.issues.push(
      createValidationIssue('order.positive-integer', path),
    );
  }
  if (typeof value === 'number') {
    addOccurrence(occurrences, Object.is(value, -0) ? '0' : String(value), path);
  }
}

function validateTextFact(
  fact: PublicFact<string>,
  path: string,
  singleLine: boolean,
  context: ValidationContext,
): void {
  validateFactId(fact, path, context);
  if (fact.value.length === 0) {
    context.issues.push(createValidationIssue('text.empty', path));
    return;
  }
  if (singleLine && fact.value.includes('\n')) {
    context.issues.push(createValidationIssue('field.type', path));
  }
}

function validateEmailFact(
  fact: PublicFact<string>,
  path: string,
  context: ValidationContext,
): void {
  validateFactId(fact, path, context);
  if (fact.value.length === 0) {
    context.issues.push(createValidationIssue('text.empty', path));
    return;
  }
  if (!isValidEmail(fact.value)) {
    context.issues.push(
      createValidationIssue('contact.email.invalid', path),
    );
  }
}

function validateGitHubFact(
  fact: PublicFact<string>,
  path: string,
  context: ValidationContext,
): void {
  validateFactId(fact, path, context);
  if (fact.value.length === 0) {
    context.issues.push(createValidationIssue('text.empty', path));
    return;
  }
  if (!isValidGitHubProfileUrl(fact.value)) {
    context.issues.push(
      createValidationIssue('contact.github.invalid', path),
    );
  }
}

function validatePeriodFact(
  fact: PublicFact<Period>,
  path: string,
  context: ValidationContext,
): void {
  validateFactId(fact, path, context);
  validatePeriod(fact.value, path, context);
}

function validatePeriod(
  period: Period,
  path: string,
  context: ValidationContext,
): void {
  const start = validateDatePoint(period.start, `${path}.value.start`, false, context);
  const end =
    period.end.tag === 'present'
      ? { valid: true, precision: 'present' as const, ordinal: undefined }
      : validateDatePoint(period.end, `${path}.value.end`, true, context);

  if (!start.valid || !end.valid || end.precision === 'present') {
    return;
  }
  if (start.precision !== end.precision) {
    context.issues.push(
      createValidationIssue('period.precision', path),
    );
    return;
  }
  if (
    start.ordinal !== undefined &&
    end.ordinal !== undefined &&
    end.ordinal < start.ordinal
  ) {
    context.issues.push(createValidationIssue('period.range', path));
  }
}

function validateDatePoint(
  point: DatePoint,
  path: string,
  allowPresent: boolean,
  context: ValidationContext,
):
  | Readonly<{
      valid: true;
      precision: 'year' | 'year-month';
      ordinal: number;
    }>
  | Readonly<{
      valid: false;
      precision?: never;
      ordinal?: never;
    }> {
  const candidate = point as unknown as UnknownRecord;
  if (candidate.tag === 'present') {
    if (!allowPresent) {
      context.issues.push(createValidationIssue('period.value', path));
    }
    return { valid: false };
  }
  if (typeof candidate.tag !== 'string') {
    return { valid: false };
  }
  if (candidate.tag !== 'year' && candidate.tag !== 'year-month') {
    context.issues.push(createValidationIssue('period.precision', path));
    return { valid: false };
  }
  if (typeof candidate.value !== 'string') {
    return { valid: false };
  }

  if (candidate.tag === 'year') {
    if (!YEAR_PATTERN.test(candidate.value) || Number(candidate.value) < 1) {
      context.issues.push(createValidationIssue('period.value', path));
      return { valid: false };
    }
    return {
      valid: true,
      precision: 'year',
      ordinal: Number(candidate.value),
    };
  }

  const match = YEAR_MONTH_PATTERN.exec(candidate.value);
  if (!match || Number(match[1]) < 1) {
    context.issues.push(createValidationIssue('period.value', path));
    return { valid: false };
  }
  return {
    valid: true,
    precision: 'year-month',
    ordinal: Number(match[1]) * 12 + Number(match[2]),
  };
}

function validateContentBlocks(
  blocks: readonly ContentBlock[],
  path: string,
  minimumOne: boolean,
  context: ValidationContext,
): void {
  if (minimumOne) {
    requireMinimum(blocks, 1, path, context.issues);
  }

  blocks.forEach((block, index) => {
    const blockPath = `${path}[${index}]`;
    if (block.tag === 'paragraph') {
      validateFactId(block.text, `${blockPath}.text`, context);
      if (block.text.value.length === 0) {
        context.issues.push(
          createValidationIssue('content.block.empty', blockPath),
        );
      }
      return;
    }

    if (block.tag === 'list') {
      if (block.style !== 'ordered' && block.style !== 'unordered') {
        context.issues.push(
          createValidationIssue('field.type', `${blockPath}.style`),
        );
      }
      if (block.items.length === 0) {
        context.issues.push(
          createValidationIssue('content.block.empty', blockPath),
        );
      }
      block.items.forEach((item, itemIndex) => {
        const itemPath = `${blockPath}.items[${itemIndex}]`;
        validateFactId(item, itemPath, context);
        if (item.value.length === 0) {
          context.issues.push(
            createValidationIssue('content.block.empty', itemPath),
          );
        } else if (item.value.includes('\n')) {
          context.issues.push(
            createValidationIssue('field.type', itemPath),
          );
        }
      });
      return;
    }

    context.issues.push(
      createValidationIssue('content.block.kind', blockPath),
    );
  });
}

function validateEvidenceLinks(
  links: readonly EvidenceLink[],
  path: string,
  context: ValidationContext,
): void {
  validateOrderedCollection(
    links,
    path,
    context.entityIds.evidenceLink,
    context,
    (link, linkPath) => {
      validateTextFact(link.label, `${linkPath}.label`, true, context);
      validateFactId(link.destination, `${linkPath}.destination`, context);
      const destination = link.destination.value as unknown as UnknownRecord;
      if (
        destination.tag === 'external' &&
        typeof destination.value === 'string'
      ) {
        if (!isValidExternalEvidenceUrl(destination.value)) {
          context.issues.push(
            createValidationIssue(
              'evidence.url.invalid',
              `${linkPath}.destination`,
            ),
          );
        }
        return;
      }
      if (
        destination.tag === 'internal' &&
        typeof destination.value === 'string'
      ) {
        if (!isValidInternalEvidencePath(destination.value)) {
          context.issues.push(
            createValidationIssue(
              'evidence.url.invalid',
              `${linkPath}.destination`,
            ),
          );
        }
        return;
      }
      if (typeof destination.tag === 'string') {
        context.issues.push(
          createValidationIssue(
            'evidence.url.invalid',
            `${linkPath}.destination`,
          ),
        );
      }
    },
  );
}

function validateFactId(
  fact: PublicFact<unknown>,
  path: string,
  context: ValidationContext,
): void {
  const factId = fact.factId as unknown;
  if (typeof factId !== 'string') {
    return;
  }
  const factIdPath = `${path}.factId`;
  if (!isKebabIdentifier(factId)) {
    context.issues.push(
      createValidationIssue('fact.identifier.format', factIdPath),
    );
  }
  addOccurrence(context.factIds, factId, factIdPath);
}

function validateProjectReferences(
  profile: ProfileData,
  context: ValidationContext,
): void {
  const experienceIds = new Set(
    profile.experiences
      .map((experience) => experience.id as unknown)
      .filter((id): id is string => typeof id === 'string'),
  );
  const achievementIds = new Set(
    profile.achievements
      .map((achievement) => achievement.id as unknown)
      .filter((id): id is string => typeof id === 'string'),
  );

  profile.projects.forEach((project, index) => {
    const reference = project.relatedProfileEntity;
    if (!reference) {
      return;
    }
    const path = `profile.projects[${index}].relatedProfileEntity`;
    const candidate = reference as unknown as UnknownRecord;
    if (
      candidate.tag !== 'experience' &&
      candidate.tag !== 'achievement'
    ) {
      return;
    }
    if (
      typeof candidate.id !== 'string' ||
      !isKebabIdentifier(candidate.id)
    ) {
      return;
    }
    const exists =
      candidate.tag === 'experience'
        ? experienceIds.has(candidate.id)
        : achievementIds.has(candidate.id);
    if (!exists) {
      context.issues.push(
        createValidationIssue('reference.missing', path),
      );
    }
  });
}

function isValidEmail(value: string): boolean {
  if (
    value.length === 0 ||
    CONTROL_OR_WHITESPACE_PATTERN.test(value) ||
    value.includes(':') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    return false;
  }
  const parts = value.split('@');
  if (parts.length !== 2) {
    return false;
  }
  const [local, domain] = parts;
  if (
    !local ||
    !domain ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !EMAIL_LOCAL_PATTERN.test(local)
  ) {
    return false;
  }
  const labels = domain.split('.');
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        DOMAIN_LABEL_PATTERN.test(label),
    )
  );
}

function isValidGitHubProfileUrl(value: string): boolean {
  const match = GITHUB_PROFILE_PATTERN.exec(value);
  return match !== null && !match[1].includes('--');
}

function isValidExternalEvidenceUrl(value: string): boolean {
  if (
    !value.startsWith('https://') ||
    CONTROL_OR_WHITESPACE_PATTERN.test(value) ||
    value.includes('\\')
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

function isValidInternalEvidencePath(value: string): boolean {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('//') ||
    value.includes('\\') ||
    CONTROL_OR_WHITESPACE_PATTERN.test(value)
  ) {
    return false;
  }

  const rawPath = value.split(/[?#]/, 1)[0] ?? '';
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return false;
  }
  if (decodedPath.includes('\\') || decodedPath.includes('//')) {
    return false;
  }
  return !decodedPath
    .split('/')
    .some((segment) => segment === '.' || segment === '..');
}

function requireMinimum(
  collection: readonly unknown[],
  min: number,
  path: string,
  issues: ValidationIssue[],
): void {
  if (collection.length < min) {
    issues.push(
      createValidationIssue('collection.minimum', path, { min }),
    );
  }
}

function addOccurrence(
  occurrences: Map<string, string[]>,
  value: string,
  path: string,
): void {
  const paths = occurrences.get(value);
  if (paths) {
    paths.push(path);
  } else {
    occurrences.set(value, [path]);
  }
}

function addDuplicateIssues(
  occurrences: ReadonlyMap<string, readonly string[]>,
  code: 'fact.identifier.duplicate' | 'identifier.duplicate' | 'order.duplicate',
  issues: ValidationIssue[],
): void {
  for (const paths of occurrences.values()) {
    if (paths.length < 2) {
      continue;
    }
    for (const path of paths) {
      issues.push(createValidationIssue(code, path));
    }
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
