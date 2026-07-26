import { describe, expect, test } from 'vitest';
import { assembleValidatedProfile } from '../../src/lib/profile/assembly.js';
import {
  selectHomepageProfile,
  selectPortfolioProfile,
  selectResumeProfile,
} from '../../src/lib/profile/selectors.js';
import type {
  ProfileData,
  ValidatedProfile,
} from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

describe('profile projections', () => {
  test('sorts every ordered projection without changing the validated source', () => {
    const source = validSource();
    const before = structuredClone(source);
    const resume = selectResumeProfile(source);
    const portfolio = selectPortfolioProfile(source);

    expect(resume.skillGroups[0]?.skills.map(({ id }) => id)).toEqual([
      'rust',
      'typescript',
    ]);
    expect(resume.projectSummaries.map(({ id }) => id)).toEqual([
      'project-beta',
      'project-gamma',
      'project-alpha',
    ]);
    expect(portfolio.projects.map(({ id }) => id)).toEqual([
      'project-beta',
      'project-gamma',
      'project-alpha',
    ]);
    expect(source).toEqual(before);
    expect(Object.isFrozen(resume.projectSummaries)).toBe(true);
    expect(Object.isFrozen(portfolio.projects[0]?.dimensions)).toBe(true);
  });

  test('projects the six portfolio dimensions in their fixed semantic order', () => {
    const portfolio = selectPortfolioProfile(validSource());
    const alpha = portfolio.projects.find(
      ({ id }) => id === 'project-alpha',
    );

    expect(alpha?.dimensions.map(({ key }) => key)).toEqual([
      'problem',
      'role',
      'keyDecisions',
      'architecture',
      'outcomes',
      'lessons',
    ]);
    expect(alpha?.relatedProfileEntity).toEqual({
      tag: 'experience',
      id: 'example-company',
    });
  });

  test('omits absent optional sections and fields rather than creating placeholders', () => {
    const resume = selectResumeProfile(validSource());
    const portfolio = selectPortfolioProfile(validSource());

    expect('education' in resume).toBe(false);
    expect('certifications' in resume).toBe(false);
    expect('period' in resume.projectSummaries[0]!).toBe(false);
    expect(portfolio.projects[0]?.evidence).toEqual([]);
    expect(portfolio.projects[0]?.period).toBeUndefined();
  });

  test('preserves present optional achievements, education, certifications and evidence', () => {
    const candidate = profileWithOptionalContent();
    const source = validSource(candidate);
    const resume = selectResumeProfile(source);
    const portfolio = selectPortfolioProfile(source);

    expect(resume.achievements.map(({ id }) => id)).toEqual([
      'synthetic-award',
    ]);
    expect(resume.achievements[0]?.period).toBeUndefined();
    expect(resume.education?.map(({ id }) => id)).toEqual([
      'synthetic-school',
    ]);
    expect(resume.certifications?.map(({ id }) => id)).toEqual([
      'synthetic-certificate',
    ]);
    expect(portfolio.projects[0]?.evidence[0]).toMatchObject({
      id: 'synthetic-project-proof',
      order: 10,
    });
  });

  test('keeps a résumé-only fact out of the complete portfolio and homepage projections', () => {
    const original = validSource();
    const changedCandidate = cloneProfileFixture() as unknown as {
      narrative: { resumeSummary: { value: string } };
    };
    changedCandidate.narrative.resumeSummary.value =
      '이력서 전용 요약 변경입니다.';
    const changed = validSource(changedCandidate as unknown as ProfileData);

    const originalResume = selectResumeProfile(original);
    const changedResume = selectResumeProfile(changed);

    expect(changedResume).not.toEqual(originalResume);
    expect(selectPortfolioProfile(changed)).toEqual(
      selectPortfolioProfile(original),
    );
    expect(selectHomepageProfile(changed)).toEqual(
      selectHomepageProfile(original),
    );
  });

  test('keeps a portfolio-only detail out of the complete résumé and homepage projections', () => {
    const original = validSource();
    const changedCandidate = cloneProfileFixture() as unknown as {
      projects: Array<{
        problem: Array<{ text: { value: string } }>;
      }>;
    };
    changedCandidate.projects[0]!.problem[0]!.text.value =
      '포트폴리오 상세만 변경한 합성 입력입니다.';
    const changed = validSource(changedCandidate as unknown as ProfileData);

    expect(selectPortfolioProfile(changed)).not.toEqual(
      selectPortfolioProfile(original),
    );
    expect(selectResumeProfile(changed)).toEqual(
      selectResumeProfile(original),
    );
    expect(selectHomepageProfile(changed)).toEqual(
      selectHomepageProfile(original),
    );
  });

  test('assembles all read models from the same validated source', () => {
    const source = validSource();
    const assembly = assembleValidatedProfile(source);

    expect(assembly.source).toBe(source);
    expect(assembly.resume).toEqual(selectResumeProfile(source));
    expect(assembly.portfolio).toEqual(selectPortfolioProfile(source));
    expect(assembly.homepage).toEqual({
      name: source.identity.name,
      headline: source.identity.headline,
      shortIntro: source.narrative.shortIntro,
      routes: {
        resume: '/resume',
        portfolio: '/portfolio',
      },
    });
    expect(Object.isFrozen(assembly)).toBe(true);
  });
});

function validSource(
  input: ProfileData = cloneProfileFixture(),
): ValidatedProfile {
  const result = validateProfile(input);
  if (!result.ok) {
    throw new Error(
      result.issues.map(({ code, path }) => `${code}@${path}`).join(', '),
    );
  }
  return result.value;
}

function profileWithOptionalContent(): ProfileData {
  const candidate = cloneProfileFixture() as unknown as {
    achievements: unknown[];
    education: unknown[];
    certifications: unknown[];
    projects: Array<{ evidence: unknown[] }>;
  };
  candidate.achievements = [
    {
      id: 'synthetic-award',
      order: 10,
      title: {
        factId: 'synthetic-award-title',
        value: '합성 성취',
      },
      summary: {
        factId: 'synthetic-award-summary',
        value: '검증 가능한 합성 성취를 설명합니다.',
      },
      details: [
        {
          tag: 'paragraph',
          text: {
            factId: 'synthetic-award-detail',
            value: '실제 개인 사실이 아닌 테스트 전용 상세입니다.',
          },
        },
      ],
      evidence: [],
    },
  ];
  candidate.education = [
    {
      id: 'synthetic-school',
      order: 10,
      title: {
        factId: 'synthetic-school-title',
        value: '합성 교육 과정',
      },
      details: [],
      evidence: [],
    },
  ];
  candidate.certifications = [
    {
      id: 'synthetic-certificate',
      order: 10,
      title: {
        factId: 'synthetic-certificate-title',
        value: '합성 자격',
      },
      issuer: {
        factId: 'synthetic-certificate-issuer',
        value: '예시 발급 기관',
      },
      details: [],
      evidence: [],
    },
  ];
  candidate.projects[1]!.evidence = [
    {
      id: 'synthetic-project-proof',
      order: 10,
      label: {
        factId: 'synthetic-project-proof-label',
        value: '합성 공개 근거',
      },
      destination: {
        factId: 'synthetic-project-proof-destination',
        value: {
          tag: 'external',
          value: 'https://example.com/synthetic-proof',
        },
      },
    },
  ];
  return candidate as unknown as ProfileData;
}
