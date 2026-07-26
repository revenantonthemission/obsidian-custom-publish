import type { ProfileData } from '../../src/lib/profile/types.js';

/**
 * Synthetic Korean/Unicode data for contract tests only.
 *
 * Production modules must never import this file. The obligation-map test
 * enforces that boundary.
 */
export const validProfileFixture = {
  identity: {
    name: { factId: 'identity-name', value: '테스트 사용자' },
    headline: {
      factId: 'identity-headline',
      value: '정적 시스템을 설계하는 소프트웨어 엔지니어',
    },
  },
  narrative: {
    shortIntro: {
      factId: 'narrative-short-intro',
      value: '복잡한 지식과 도구를 명료한 제품 경험으로 바꿉니다.',
    },
    detailedIntro: [
      {
        tag: 'paragraph',
        text: {
          factId: 'narrative-detailed-intro',
          value:
            '한국어·Unicode·긴 기술 이름을 자르지 않고 전달하는 테스트 전용 소개입니다.',
        },
      },
    ],
    resumeSummary: {
      factId: 'narrative-resume-summary',
      value: '설계와 구현을 연결해 재현 가능한 정적 제품을 만듭니다.',
    },
    portfolioSummary: {
      factId: 'narrative-portfolio-summary',
      value: '문제, 역할, 결정, 구조, 결과와 배움을 한 흐름으로 설명합니다.',
    },
  },
  contact: {
    email: { factId: 'contact-email', value: 'tester@example.com' },
    github: {
      factId: 'contact-github',
      value: 'https://github.com/example-user',
    },
    additionalLinks: [],
  },
  skillGroups: [
    {
      id: 'software-engineering',
      order: 10,
      title: { factId: 'skill-group-title', value: '소프트웨어 엔지니어링' },
      skills: [
        {
          id: 'typescript',
          order: 20,
          name: { factId: 'skill-typescript', value: 'TypeScript' },
        },
        {
          id: 'rust',
          order: 10,
          name: { factId: 'skill-rust', value: 'Rust' },
        },
      ],
    },
  ],
  experiences: [
    {
      id: 'example-company',
      order: 10,
      organization: {
        factId: 'experience-organization',
        value: '예시 조직',
      },
      role: { factId: 'experience-role', value: '소프트웨어 엔지니어' },
      period: {
        factId: 'experience-period',
        value: {
          start: { tag: 'year-month', value: '2023-01' },
          end: { tag: 'present' },
        },
      },
      summary: {
        factId: 'experience-summary',
        value: '정적 콘텐츠 파이프라인의 품질과 운영 경계를 개선했습니다.',
      },
      details: [
        {
          tag: 'list',
          style: 'unordered',
          items: [
            {
              factId: 'experience-detail-one',
              value: '명시적 계약과 자동 검증을 함께 설계했습니다.',
            },
          ],
        },
      ],
      evidence: [],
    },
  ],
  achievements: [],
  projects: [
    {
      id: 'project-alpha',
      order: 30,
      title: { factId: 'project-alpha-title', value: '프로젝트 알파' },
      outcomeSummary: {
        factId: 'project-alpha-summary',
        value: '복잡한 변환을 결정적인 정적 출력으로 만들었습니다.',
      },
      problem: [
        paragraph(
          'project-alpha-problem',
          '서로 다른 입력 규칙 때문에 결과를 예측하기 어려웠습니다.',
        ),
      ],
      role: [
        paragraph(
          'project-alpha-role',
          '도메인 계약과 검증 파이프라인을 설계했습니다.',
        ),
      ],
      keyDecisions: [
        paragraph(
          'project-alpha-decision',
          '한 canonical source와 fail-closed validation을 선택했습니다.',
        ),
      ],
      architecture: [
        paragraph(
          'project-alpha-architecture',
          '순수 변환과 filesystem side effect를 분리했습니다.',
        ),
      ],
      outcomes: [
        paragraph(
          'project-alpha-outcome',
          '동일한 입력에서 동일한 사용자 결과를 생성했습니다.',
        ),
      ],
      lessons: [
        paragraph(
          'project-alpha-lesson',
          '명시적 경계가 회귀 분석 비용을 줄인다는 점을 배웠습니다.',
        ),
      ],
      evidence: [],
      relatedProfileEntity: {
        tag: 'experience',
        id: 'example-company',
      },
    },
    projectFixture('project-beta', 10, '베타'),
    projectFixture('project-gamma', 20, '감마'),
  ],
  education: [],
  certifications: [],
} as unknown as ProfileData;

export const nonNfcTextFixture = '  Cafe\u0301\r\n한글  ';
export const normalizedNonNfcTextFixture = 'Café\n한글';
export const longUnicodeFixture =
  '초장문-URL-기술명-조합-테스트-'.repeat(20) + '끝';

export function cloneProfileFixture(): ProfileData {
  return structuredClone(validProfileFixture);
}

export function profileWithProjectCount(count: number): ProfileData {
  const candidate = cloneProfileFixture() as unknown as {
    projects: unknown[];
  };
  candidate.projects = Array.from({ length: count }, (_, index) =>
    projectFixture(`boundary-project-${index + 1}`, (index + 1) * 10, `${index + 1}`),
  );
  return candidate as unknown as ProfileData;
}

export function profileWithInvalidEmail(): ProfileData {
  const candidate = cloneProfileFixture() as unknown as {
    contact: { email: { value: string } };
  };
  candidate.contact.email.value = 'invalid @ example.com';
  return candidate as unknown as ProfileData;
}

export function profileWithDuplicateProjectOrder(): ProfileData {
  const candidate = cloneProfileFixture() as unknown as {
    projects: Array<{ order: number }>;
  };
  candidate.projects[1].order = candidate.projects[0].order;
  return candidate as unknown as ProfileData;
}

function paragraph(factId: string, value: string) {
  return {
    tag: 'paragraph' as const,
    text: { factId, value },
  };
}

function projectFixture(id: string, order: number, suffix: string) {
  return {
    id,
    order,
    title: { factId: `${id}-title`, value: `프로젝트 ${suffix}` },
    outcomeSummary: {
      factId: `${id}-summary`,
      value: `${suffix} 프로젝트의 검증 가능한 결과를 설명합니다.`,
    },
    problem: [paragraph(`${id}-problem`, '해결할 문제를 구체적으로 정의했습니다.')],
    role: [paragraph(`${id}-role`, '설계와 구현 책임을 명확히 맡았습니다.')],
    keyDecisions: [
      paragraph(`${id}-decision`, '가장 중요한 기술 결정을 근거와 함께 선택했습니다.'),
    ],
    architecture: [
      paragraph(`${id}-architecture`, '구성 요소와 데이터 흐름을 분리했습니다.'),
    ],
    outcomes: [
      paragraph(`${id}-outcome`, '확인 가능한 사용자 결과를 만들었습니다.'),
    ],
    lessons: [
      paragraph(`${id}-lesson`, '후속 작업에 적용할 배움을 정리했습니다.'),
    ],
    evidence: [],
  };
}
