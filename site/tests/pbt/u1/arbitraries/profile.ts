import { fc } from '@fast-check/vitest';

import { assembleValidatedProfile } from '../../../../src/lib/profile/assembly.js';
import type {
  HomepageProfile,
  PortfolioProfile,
  ProfileData,
  ProfileIssueCode,
  ProfilePath,
  ResumeProfile,
  ValidatedProfile,
} from '../../../../src/lib/profile/types.js';
import { validateProfile } from '../../../../src/lib/profile/validation.js';

type SourcePermutation = 'identity' | 'reverse' | 'rotate';
type RelationChoice = 'none' | 'experience' | 'achievement';
type HighlightMode = 'experience-only' | 'achievement-only' | 'both';
type DetailMode = 'paragraph' | 'list' | 'both';
type PeriodMode = 'year' | 'year-month' | 'present';
type EvidenceDestinationMode = 'external' | 'internal';

interface ProfileBlueprint {
  readonly text: string;
  readonly token: number;
  readonly projectCount: number;
  readonly sourcePermutation: SourcePermutation;
  readonly additionalLink: boolean;
  readonly additionalLinkDestination: EvidenceDestinationMode;
  readonly experienceEvidence: boolean;
  readonly experienceEvidenceDestination: EvidenceDestinationMode;
  readonly experienceDetailMode: DetailMode;
  readonly experiencePeriodMode: PeriodMode;
  readonly achievementEvidence: boolean;
  readonly achievementEvidenceDestination: EvidenceDestinationMode;
  readonly achievementDetailMode: DetailMode;
  readonly projectEvidence: boolean;
  readonly projectEvidenceDestination: EvidenceDestinationMode;
  readonly projectDetailMode: DetailMode;
  readonly highlightMode: HighlightMode;
  readonly achievementPeriod: boolean;
  readonly achievementPeriodMode: PeriodMode;
  readonly projectPeriod: boolean;
  readonly projectPeriodMode: PeriodMode;
  readonly education: boolean;
  readonly educationSubtitle: boolean;
  readonly educationPeriod: boolean;
  readonly educationPeriodMode: PeriodMode;
  readonly educationDetails: boolean;
  readonly educationDetailMode: DetailMode;
  readonly educationEvidence: boolean;
  readonly educationEvidenceDestination: EvidenceDestinationMode;
  readonly certification: boolean;
  readonly certificationIssuer: boolean;
  readonly certificationPeriod: boolean;
  readonly certificationPeriodMode: PeriodMode;
  readonly certificationDetails: boolean;
  readonly certificationDetailMode: DetailMode;
  readonly certificationEvidence: boolean;
  readonly certificationEvidenceDestination: EvidenceDestinationMode;
  readonly relation: RelationChoice;
}

export interface ValidProfileProjections {
  readonly input: ProfileData;
  readonly validated: ValidatedProfile;
  readonly resume: ResumeProfile;
  readonly portfolio: PortfolioProfile;
  readonly homepage: HomepageProfile;
}

export interface InvalidProfileCase {
  readonly label:
    | 'blank-name'
    | 'invalid-email'
    | 'invalid-github'
    | 'missing-experience-period'
    | 'missing-experience-detail'
    | 'missing-project-reference'
    | 'wrong-kind-project-reference'
    | 'project-count-two'
    | 'project-count-seven'
    | 'mixed-project-period-precision'
    | 'reversed-project-period'
    | 'missing-project-dimension'
    | 'duplicate-project-id'
    | 'duplicate-project-order'
    | 'zero-project-order'
    | 'invalid-external-url'
    | 'invalid-internal-url';
  readonly profile: ProfileData;
  readonly expected: readonly Readonly<{
    code: ProfileIssueCode;
    path: ProfilePath;
  }>[];
}

const singleLineUnicodeArbitrary = fc.constantFrom(
  '한국어와 TypeScript 5.9 — 정적 검증',
  'Cafe\u0301와 Rust·WebAssembly',
  '문자 그대로 <script>가 아닌 설명',
  `긴-기술-이름-${'유니코드-'.repeat(24)}끝`,
);

export const unicodeTextArbitrary = fc.oneof(
  singleLineUnicodeArbitrary,
  fc.constant('  Cafe\u0301\r\n한국어 문단\r두 번째 줄  '),
  fc
    .array(
      fc.constantFrom('한', '글', 'A', '9', 'é', '\u0301', '🙂', '—', ' '),
      { minLength: 1, maxLength: 80 },
    )
    .map((characters) => `  ${characters.join('')}  `),
);

const projectCountArbitrary = fc.oneof(
  { weight: 5, arbitrary: fc.constant(3) },
  { weight: 2, arbitrary: fc.constant(4) },
  { weight: 2, arbitrary: fc.constant(5) },
  { weight: 5, arbitrary: fc.constant(6) },
);

const profileBlueprintArbitrary = fc.record({
  text: singleLineUnicodeArbitrary,
  token: fc.integer({ min: 0, max: 9_999 }),
  projectCount: projectCountArbitrary,
  sourcePermutation: fc.constantFrom<SourcePermutation>(
    'identity',
    'reverse',
    'rotate',
  ),
  additionalLink: fc.boolean(),
  additionalLinkDestination:
    fc.constantFrom<EvidenceDestinationMode>('external', 'internal'),
  experienceEvidence: fc.boolean(),
  experienceEvidenceDestination:
    fc.constantFrom<EvidenceDestinationMode>('external', 'internal'),
  experienceDetailMode:
    fc.constantFrom<DetailMode>('paragraph', 'list', 'both'),
  experiencePeriodMode:
    fc.constantFrom<PeriodMode>('year', 'year-month', 'present'),
  achievementEvidence: fc.boolean(),
  achievementEvidenceDestination:
    fc.constantFrom<EvidenceDestinationMode>('external', 'internal'),
  achievementDetailMode:
    fc.constantFrom<DetailMode>('paragraph', 'list', 'both'),
  projectEvidence: fc.boolean(),
  projectEvidenceDestination:
    fc.constantFrom<EvidenceDestinationMode>('external', 'internal'),
  projectDetailMode:
    fc.constantFrom<DetailMode>('paragraph', 'list', 'both'),
  highlightMode: fc.constantFrom<HighlightMode>(
    'experience-only',
    'achievement-only',
    'both',
  ),
  achievementPeriod: fc.boolean(),
  achievementPeriodMode:
    fc.constantFrom<PeriodMode>('year', 'year-month', 'present'),
  projectPeriod: fc.boolean(),
  projectPeriodMode:
    fc.constantFrom<PeriodMode>('year', 'year-month', 'present'),
  education: fc.boolean(),
  educationSubtitle: fc.boolean(),
  educationPeriod: fc.boolean(),
  educationPeriodMode:
    fc.constantFrom<PeriodMode>('year', 'year-month', 'present'),
  educationDetails: fc.boolean(),
  educationDetailMode:
    fc.constantFrom<DetailMode>('paragraph', 'list', 'both'),
  educationEvidence: fc.boolean(),
  educationEvidenceDestination:
    fc.constantFrom<EvidenceDestinationMode>('external', 'internal'),
  certification: fc.boolean(),
  certificationIssuer: fc.boolean(),
  certificationPeriod: fc.boolean(),
  certificationPeriodMode:
    fc.constantFrom<PeriodMode>('year', 'year-month', 'present'),
  certificationDetails: fc.boolean(),
  certificationDetailMode:
    fc.constantFrom<DetailMode>('paragraph', 'list', 'both'),
  certificationEvidence: fc.boolean(),
  certificationEvidenceDestination:
    fc.constantFrom<EvidenceDestinationMode>('external', 'internal'),
  relation: fc.constantFrom<RelationChoice>(
    'none',
    'experience',
    'achievement',
  ),
});

/**
 * A shrink-friendly complete aggregate. IDs and sparse orders are constructed
 * from collection positions, so shrinking optional content never compromises
 * an unrelated uniqueness invariant.
 */
export const validProfileArbitrary = profileBlueprintArbitrary.map(
  buildProfile,
);

export const validatedProfileArbitrary = validProfileArbitrary.map(
  requireGeneratedProfile,
);

export const validProfileProjectionsArbitrary =
  validProfileArbitrary.map((input): ValidProfileProjections => {
    const validated = requireGeneratedProfile(input);
    const assembly = assembleValidatedProfile(validated);

    return {
      input,
      validated,
      resume: assembly.resume,
      portfolio: assembly.portfolio,
      homepage: assembly.homepage,
    };
  });

export const invalidProfileCaseArbitrary = fc
  .tuple(
    validProfileArbitrary,
    fc.constantFrom<InvalidProfileCase['label']>(
      'blank-name',
      'invalid-email',
      'invalid-github',
      'missing-experience-period',
      'missing-experience-detail',
      'missing-project-reference',
      'wrong-kind-project-reference',
      'project-count-two',
      'project-count-seven',
      'mixed-project-period-precision',
      'reversed-project-period',
      'missing-project-dimension',
      'duplicate-project-id',
      'duplicate-project-order',
      'zero-project-order',
      'invalid-external-url',
      'invalid-internal-url',
    ),
  )
  .map(([profile, label]) => mutateOneInvariant(profile, label));

function requireGeneratedProfile(profile: ProfileData): ValidatedProfile {
  const result = validateProfile(profile);
  if (!result.ok) {
    const diagnostics = result.issues
      .map((issue) => `${issue.code}@${issue.path}`)
      .join(', ');
    throw new Error(`Generated profile violated its contract: ${diagnostics}`);
  }
  return result.value;
}

function buildProfile(blueprint: ProfileBlueprint): ProfileData {
  const suffix = `${blueprint.token}`;
  const text = blueprint.text;
  const achievements = blueprint.highlightMode !== 'experience-only'
    ? [
        {
          id: 'achievement-one',
          order: 35,
          title: fact('achievement-one-title', `대표 성과 ${suffix}`),
          ...(blueprint.achievementPeriod
            ? {
                period: fact(
                  'achievement-one-period',
                  validPeriod(blueprint.achievementPeriodMode, 2022),
                ),
              }
            : {}),
          summary: fact(
            'achievement-one-summary',
            `${text} 성과를 재현 가능한 결과로 만들었습니다.`,
          ),
          details: detailBlocks(
            'achievement-one-detail',
            `${text}\r\n성과 근거를 정적 결과에 연결했습니다.`,
            blueprint.achievementDetailMode,
          ),
          evidence: blueprint.achievementEvidence
            ? [
                evidenceLink(
                  'achievement-one-link',
                  45,
                  'achievement-one-link-label',
                  'achievement-one-link-destination',
                  evidenceDestination(
                    blueprint.achievementEvidenceDestination,
                    'achievement-one',
                  ),
                ),
              ]
            : [],
        },
      ]
    : [];

  const projects = Array.from(
    { length: blueprint.projectCount },
    (_, index) =>
      project(
        index + 1,
        blueprint,
        resolveRelation(blueprint, index),
      ),
  );

  const profile = {
    identity: {
      name: fact('identity-name', `  테스트 사용자 ${suffix}  `),
      headline: fact(
        'identity-headline',
        `${text} 시스템을 설계하는 엔지니어`,
      ),
    },
    narrative: {
      shortIntro: fact(
        'narrative-short-intro',
        `  ${text}\r\n복잡한 지식을 명료한 경험으로 바꿉니다.  `,
      ),
      detailedIntro: [
        paragraph(
          'narrative-detailed-intro',
          `  ${text}\r\n문단 내부 줄바꿈은 보존합니다.  `,
        ),
      ],
      resumeSummary: fact(
        'narrative-resume-summary',
        `${text} 설계와 구현을 연결합니다.`,
      ),
      portfolioSummary: fact(
        'narrative-portfolio-summary',
        `${text} 문제와 결정을 한 흐름으로 설명합니다.`,
      ),
    },
    contact: {
      email: fact('contact-email', `tester${suffix}@example.com`),
      github: fact(
        'contact-github',
        `https://github.com/example-${suffix}`,
      ),
      additionalLinks: blueprint.additionalLink
        ? [
            evidenceLink(
              'contact-link',
              40,
              'contact-link-label',
              'contact-link-destination',
              evidenceDestination(
                blueprint.additionalLinkDestination,
                `contact-${suffix}`,
              ),
            ),
          ]
        : [],
    },
    skillGroups: permute(
      [
        {
          id: 'systems',
          order: 30,
          title: fact('skill-group-systems-title', '시스템 설계'),
          skills: permute(
            [
              {
                id: 'rust',
                order: 50,
                name: fact('skill-rust-name', 'Rust'),
              },
              {
                id: 'typescript',
                order: 10,
                name: fact('skill-typescript-name', 'TypeScript'),
              },
            ],
            blueprint.sourcePermutation,
          ),
        },
        {
          id: 'quality',
          order: 10,
          title: fact('skill-group-quality-title', '품질 공학'),
          skills: [
            {
              id: 'property-testing',
              order: 20,
              name: fact(
                'skill-property-testing-name',
                'Property-based testing',
              ),
            },
          ],
        },
      ],
      blueprint.sourcePermutation,
    ),
    experiences:
      blueprint.highlightMode === 'achievement-only'
        ? []
        : [
            {
              id: 'experience-one',
              order: 25,
              organization: fact(
                'experience-one-organization',
                '예시 조직',
              ),
              role: fact(
                'experience-one-role',
                '소프트웨어 엔지니어',
              ),
              period: fact(
                'experience-one-period',
                validPeriod(blueprint.experiencePeriodMode, 2021),
              ),
              summary: fact(
                'experience-one-summary',
                `${text} 품질 경계를 개선했습니다.`,
              ),
              details: detailBlocks(
                'experience-one-detail',
                `${text} 계약과 검증을 함께 설계했습니다.`,
                blueprint.experienceDetailMode,
              ),
              evidence: blueprint.experienceEvidence
                ? [
                    evidenceLink(
                      'experience-one-link',
                      55,
                      'experience-one-link-label',
                      'experience-one-link-destination',
                      evidenceDestination(
                        blueprint.experienceEvidenceDestination,
                        'experience-one',
                      ),
                    ),
                  ]
                : [],
            },
          ],
    achievements,
    projects: permute(projects, blueprint.sourcePermutation),
    education: blueprint.education
      ? [
          {
            id: 'education-one',
            order: 20,
            title: fact('education-one-title', '예시 교육'),
            ...(blueprint.educationSubtitle
              ? {
                  subtitle: fact(
                    'education-one-subtitle',
                    '컴퓨터 시스템 과정',
                  ),
                }
              : {}),
            ...(blueprint.educationPeriod
              ? {
                  period: fact(
                    'education-one-period',
                    validPeriod(blueprint.educationPeriodMode, 2017),
                  ),
                }
              : {}),
            details: blueprint.educationDetails
              ? detailBlocks(
                'education-one-detail',
                `${text} 기반 시스템을 학습했습니다.`,
                blueprint.educationDetailMode,
              )
              : [],
            evidence: blueprint.educationEvidence
              ? [
                  evidenceLink(
                    'education-one-link',
                    65,
                    'education-one-link-label',
                    'education-one-link-destination',
                    evidenceDestination(
                      blueprint.educationEvidenceDestination,
                      'education-one',
                    ),
                  ),
                ]
              : [],
          },
        ]
      : [],
    certifications: blueprint.certification
      ? [
          {
            id: 'certification-one',
            order: 60,
            title: fact('certification-one-title', '예시 자격'),
            ...(blueprint.certificationIssuer
              ? {
                  issuer: fact(
                    'certification-one-issuer',
                    '예시 발급 기관',
                  ),
                }
              : {}),
            ...(blueprint.certificationPeriod
              ? {
                  period: fact(
                    'certification-one-period',
                    validPeriod(blueprint.certificationPeriodMode, 2020),
                  ),
                }
              : {}),
            details: blueprint.certificationDetails
              ? detailBlocks(
                  'certification-one-detail',
                  `${text} 자격 기준을 검증했습니다.`,
                  blueprint.certificationDetailMode,
                )
              : [],
            evidence: blueprint.certificationEvidence
              ? [
                  evidenceLink(
                    'certification-one-link',
                    75,
                    'certification-one-link-label',
                    'certification-one-link-destination',
                    evidenceDestination(
                      blueprint.certificationEvidenceDestination,
                      'certification-one',
                    ),
                  ),
                ]
              : [],
          },
        ]
      : [],
  };

  return profile as unknown as ProfileData;
}

function project(
  ordinal: number,
  blueprint: ProfileBlueprint,
  relatedProfileEntity:
    | Readonly<{ tag: 'experience' | 'achievement'; id: string }>
    | undefined,
) {
  const base = `project-${ordinal}`;
  const text = blueprint.text;
  const period = blueprint.projectPeriod
    ? {
        period: fact(
          `${base}-period`,
          validPeriod(blueprint.projectPeriodMode, 2023),
        ),
      }
    : {};
  const evidence = blueprint.projectEvidence
    ? [
        evidenceLink(
          `${base}-link`,
          70,
          `${base}-link-label`,
          `${base}-link-destination`,
          evidenceDestination(
            blueprint.projectEvidenceDestination,
            base,
          ),
        ),
      ]
    : [];

  return {
    id: base,
    order: ordinal * 20 + (ordinal % 2 === 0 ? 7 : 0),
    title: fact(`${base}-title`, `프로젝트 ${ordinal}`),
    ...period,
    outcomeSummary: fact(
      `${base}-summary`,
      `${text} 프로젝트 ${ordinal}의 결과입니다.`,
    ),
    problem: detailBlocks(
      `${base}-problem`,
      `${text} 문제 ${ordinal}을 정의했습니다.`,
      blueprint.projectDetailMode,
    ),
    role: detailBlocks(
      `${base}-role`,
      `${text} 역할 ${ordinal}을 맡았습니다.`,
      blueprint.projectDetailMode,
    ),
    keyDecisions: detailBlocks(
      `${base}-decision`,
      `${text} 핵심 결정 ${ordinal}을 기록했습니다.`,
      blueprint.projectDetailMode,
    ),
    architecture: detailBlocks(
      `${base}-architecture`,
      `${text} 구조 ${ordinal}을 분리했습니다.`,
      blueprint.projectDetailMode,
    ),
    outcomes: detailBlocks(
      `${base}-outcome`,
      `${text} 결과 ${ordinal}을 검증했습니다.`,
      blueprint.projectDetailMode,
    ),
    lessons: detailBlocks(
      `${base}-lesson`,
      `${text} 배움 ${ordinal}을 정리했습니다.`,
      blueprint.projectDetailMode,
    ),
    evidence,
    ...(relatedProfileEntity === undefined
      ? {}
      : { relatedProfileEntity }),
  };
}

function resolveRelation(
  blueprint: ProfileBlueprint,
  projectIndex: number,
):
  | Readonly<{ tag: 'experience' | 'achievement'; id: string }>
  | undefined {
  if (projectIndex !== 0 || blueprint.relation === 'none') {
    return undefined;
  }
  if (
    blueprint.relation === 'achievement' &&
    blueprint.highlightMode !== 'experience-only'
  ) {
    return { tag: 'achievement', id: 'achievement-one' };
  }
  if (blueprint.highlightMode !== 'achievement-only') {
    return { tag: 'experience', id: 'experience-one' };
  }
  return { tag: 'achievement', id: 'achievement-one' };
}

function mutateOneInvariant(
  source: ProfileData,
  label: InvalidProfileCase['label'],
): InvalidProfileCase {
  const profile = structuredClone(source) as unknown as {
    identity: { name: { value: string } };
    contact: {
      email: { value: string };
      github: { value: string };
      additionalLinks: Array<MutableEvidenceLink>;
    };
    experiences: Array<MutableExperience>;
    projects: Array<{
      id: string;
      order: number;
      problem: unknown[];
      evidence: Array<MutableEvidenceLink>;
      period?: {
        factId: string;
        value: {
          start: { tag: string; value?: string };
          end: { tag: string; value?: string };
        };
      };
      relatedProfileEntity?: { tag: string; id: string };
    }>;
  };

  const expectedByLabel: Record<
    InvalidProfileCase['label'],
    InvalidProfileCase['expected']
  > = {
    'blank-name': [issue('text.empty', 'profile.identity.name')],
    'invalid-email': [
      issue('contact.email.invalid', 'profile.contact.email'),
    ],
    'invalid-github': [
      issue('contact.github.invalid', 'profile.contact.github'),
    ],
    'missing-experience-period': [
      issue('field.required', 'profile.experiences[0].period'),
    ],
    'missing-experience-detail': [
      issue('collection.minimum', 'profile.experiences[0].details'),
    ],
    'missing-project-reference': [
      issue(
        'reference.missing',
        'profile.projects[0].relatedProfileEntity',
      ),
    ],
    'wrong-kind-project-reference': [
      issue(
        'reference.kind',
        'profile.projects[0].relatedProfileEntity',
      ),
    ],
    'project-count-two': [
      issue('collection.range', 'profile.projects'),
    ],
    'project-count-seven': [
      issue('collection.range', 'profile.projects'),
    ],
    'mixed-project-period-precision': [
      issue('period.precision', 'profile.projects[0].period'),
    ],
    'reversed-project-period': [
      issue('period.range', 'profile.projects[0].period'),
    ],
    'missing-project-dimension': [
      issue('collection.minimum', 'profile.projects[0].problem'),
    ],
    'duplicate-project-id': [
      issue('identifier.duplicate', 'profile.projects[0].id'),
      issue('identifier.duplicate', 'profile.projects[1].id'),
    ],
    'duplicate-project-order': [
      issue('order.duplicate', 'profile.projects[0].order'),
      issue('order.duplicate', 'profile.projects[1].order'),
    ],
    'zero-project-order': [
      issue('order.positive-integer', 'profile.projects[0].order'),
    ],
    'invalid-external-url': [
      issue(
        'evidence.url.invalid',
        'profile.contact.additionalLinks[0].destination',
      ),
    ],
    'invalid-internal-url': [
      issue(
        'evidence.url.invalid',
        'profile.projects[0].evidence[0].destination',
      ),
    ],
  };

  if (label === 'blank-name') {
    profile.identity.name.value = ' \t ';
  } else if (label === 'invalid-email') {
    profile.contact.email.value = 'invalid @example.com';
  } else if (label === 'invalid-github') {
    profile.contact.github.value = 'https://example.com/not-github';
  } else if (label === 'missing-experience-period') {
    const experience = ensureExperience(profile.experiences);
    delete experience.period;
  } else if (label === 'missing-experience-detail') {
    ensureExperience(profile.experiences).details = [];
  } else if (label === 'missing-project-reference') {
    profile.projects[0]!.relatedProfileEntity = {
      tag: 'experience',
      id: 'missing-experience',
    };
  } else if (label === 'wrong-kind-project-reference') {
    profile.projects[0]!.relatedProfileEntity = {
      tag: 'education',
      id: 'education-one',
    };
  } else if (label === 'project-count-two') {
    profile.projects = profile.projects.slice(0, 2);
  } else if (label === 'project-count-seven') {
    const originals = [...profile.projects];
    while (profile.projects.length < 7) {
      const ordinal = profile.projects.length + 1;
      const source = originals[(ordinal - 1) % originals.length]!;
      profile.projects.push(
        cloneProjectForBoundary(source, ordinal) as typeof source,
      );
    }
  } else if (label === 'mixed-project-period-precision') {
    profile.projects[0]!.period = {
      factId: 'project-invalid-period',
      value: {
        start: { tag: 'year', value: '2023' },
        end: { tag: 'year-month', value: '2024-12' },
      },
    };
  } else if (label === 'reversed-project-period') {
    profile.projects[0]!.period = {
      factId: 'project-invalid-period',
      value: {
        start: { tag: 'year-month', value: '2025-01' },
        end: { tag: 'year-month', value: '2024-12' },
      },
    };
  } else if (label === 'missing-project-dimension') {
    profile.projects[0]!.problem = [];
  } else if (label === 'duplicate-project-id') {
    profile.projects[1]!.id = profile.projects[0]!.id;
  } else if (label === 'duplicate-project-order') {
    profile.projects[1]!.order = profile.projects[0]!.order;
  } else if (label === 'invalid-external-url') {
    const link = ensureContactEvidence(profile.contact.additionalLinks);
    link.destination.value = {
      tag: 'external',
      value: 'http://example.com/not-https',
    };
  } else if (label === 'invalid-internal-url') {
    const link = ensureProjectEvidence(profile.projects[0]!.evidence);
    link.destination.value = {
      tag: 'internal',
      value: '/notes/../private',
    };
  } else {
    profile.projects[0]!.order = 0;
  }

  return {
    label,
    profile: profile as unknown as ProfileData,
    expected: expectedByLabel[label],
  };
}

interface MutableEvidenceLink {
  id: string;
  order: number;
  label: { factId: string; value: string };
  destination: {
    factId: string;
    value:
      | { tag: 'external'; value: string }
      | { tag: 'internal'; value: string };
  };
}

interface MutableExperience {
  id: string;
  order: number;
  organization: { factId: string; value: string };
  role: { factId: string; value: string };
  period?: {
    factId: string;
    value: {
      start: { tag: string; value?: string };
      end: { tag: string; value?: string };
    };
  };
  summary: { factId: string; value: string };
  details: unknown[];
  evidence: MutableEvidenceLink[];
}

function issue(
  code: ProfileIssueCode,
  path: string,
): Readonly<{ code: ProfileIssueCode; path: ProfilePath }> {
  return { code, path: path as ProfilePath };
}

function ensureExperience(
  experiences: MutableExperience[],
): MutableExperience {
  if (experiences[0] !== undefined) {
    return experiences[0];
  }

  const experience: MutableExperience = {
    id: 'mutation-experience',
    order: 9_901,
    organization: fact(
      'mutation-experience-organization',
      '합성 검증 조직',
    ),
    role: fact('mutation-experience-role', '합성 검증 역할'),
    period: fact(
      'mutation-experience-period',
      validPeriod('year', 2020),
    ),
    summary: fact(
      'mutation-experience-summary',
      '합성 mutation의 기준 경험입니다.',
    ),
    details: [
      paragraph(
        'mutation-experience-detail',
        '합성 mutation에만 사용하는 기준 상세입니다.',
      ),
    ],
    evidence: [],
  };
  experiences.push(experience);
  return experience;
}

function ensureContactEvidence(
  links: MutableEvidenceLink[],
): MutableEvidenceLink {
  if (links[0] !== undefined) {
    return links[0];
  }

  const link = evidenceLink(
    'mutation-contact-link',
    9_902,
    'mutation-contact-link-label',
    'mutation-contact-link-destination',
    {
      tag: 'external',
      value: 'https://example.com/evidence/mutation-contact',
    },
  );
  links.push(link);
  return link;
}

function ensureProjectEvidence(
  links: MutableEvidenceLink[],
): MutableEvidenceLink {
  if (links[0] !== undefined) {
    return links[0];
  }

  const link = evidenceLink(
    'mutation-project-link',
    9_903,
    'mutation-project-link-label',
    'mutation-project-link-destination',
    {
      tag: 'internal',
      value: '/notes/mutation-project',
    },
  );
  links.push(link);
  return link;
}

function cloneProjectForBoundary(
  source: unknown,
  ordinal: number,
): unknown {
  const project = structuredClone(source) as Record<string, unknown>;
  const prefix = `boundary-seven-${ordinal}`;
  project.id = prefix;
  project.order = 10_000 + ordinal * 100;
  rewriteFactIds(project, prefix);

  if (Array.isArray(project.evidence)) {
    project.evidence.forEach((candidate, index) => {
      if (candidate !== null && typeof candidate === 'object') {
        (candidate as Record<string, unknown>).id =
          `${prefix}-evidence-${index + 1}`;
      }
    });
  }
  return project;
}

function rewriteFactIds(value: unknown, prefix: string): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => rewriteFactIds(item, prefix));
    return;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.factId === 'string') {
    record.factId = `${prefix}-${record.factId}`;
  }
  Object.values(record).forEach((item) =>
    rewriteFactIds(item, prefix),
  );
}

function fact<Id extends string, Value>(factId: Id, value: Value) {
  return { factId, value };
}

function validPeriod(mode: PeriodMode, startYear: number) {
  if (mode === 'year') {
    return {
      start: { tag: 'year' as const, value: String(startYear) },
      end: { tag: 'year' as const, value: String(startYear + 2) },
    };
  }
  if (mode === 'year-month') {
    return {
      start: {
        tag: 'year-month' as const,
        value: `${startYear}-02`,
      },
      end: {
        tag: 'year-month' as const,
        value: `${startYear + 2}-11`,
      },
    };
  }
  return {
    start: {
      tag: 'year-month' as const,
      value: `${startYear}-02`,
    },
    end: { tag: 'present' as const },
  };
}

function detailBlocks(
  factIdBase: string,
  value: string,
  mode: DetailMode,
) {
  const singleLineValue = value.replace(/\r\n?|\n/g, ' — ');
  if (mode === 'paragraph') {
    return [paragraph(`${factIdBase}-paragraph`, value)];
  }
  if (mode === 'list') {
    return [list(`${factIdBase}-list`, singleLineValue)];
  }
  return [
    paragraph(`${factIdBase}-paragraph`, value),
    list(`${factIdBase}-list`, `${singleLineValue} 목록`),
  ];
}

function paragraph(factId: string, value: string) {
  return {
    tag: 'paragraph' as const,
    text: fact(factId, value),
  };
}

function list(factId: string, value: string) {
  return {
    tag: 'list' as const,
    style: 'unordered' as const,
    items: [fact(factId, value)] as const,
  };
}

function evidenceDestination(
  mode: EvidenceDestinationMode,
  slug: string,
):
  | Readonly<{ tag: 'external'; value: string }>
  | Readonly<{ tag: 'internal'; value: string }> {
  return mode === 'external'
    ? {
        tag: 'external',
        value: `https://example.com/evidence/${slug}`,
      }
    : {
        tag: 'internal',
        value: `/notes/${slug}`,
      };
}

function evidenceLink(
  id: string,
  order: number,
  labelFactId: string,
  destinationFactId: string,
  destination:
    | Readonly<{ tag: 'external'; value: string }>
    | Readonly<{ tag: 'internal'; value: string }>,
) {
  return {
    id,
    order,
    label: fact(labelFactId, '검증 근거'),
    destination: fact(destinationFactId, destination),
  };
}

function permute<Value>(
  values: readonly Value[],
  mode: SourcePermutation,
): Value[] {
  if (mode === 'reverse') {
    return [...values].reverse();
  }
  if (mode === 'rotate' && values.length > 1) {
    return [...values.slice(1), values[0]!];
  }
  return [...values];
}
