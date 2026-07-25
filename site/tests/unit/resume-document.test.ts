import { describe, expect, test } from 'vitest';
import { resumeEvidenceTesting } from '../../src/lib/profile/resume-evidence.js';
import {
  PROFILE_SOURCE_DIGEST_DOMAIN,
  RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
  digestProfileSource,
  validateCanonicalDigest,
} from '../../src/lib/profile/canonical-digest.js';
import {
  RESUME_DOCUMENT_PUBLIC_HREF,
  RESUME_DOCUMENT_REPOSITORY_PATH,
  RESUME_DOCUMENT_SOURCE_ROUTE,
  createResumeDocumentRequest,
  getResumeDocumentLink,
  validateResumeDocumentLink,
} from '../../src/lib/profile/document-boundary.js';
import {
  RESUME_EVIDENCE_SCHEMA_VERSION,
  compareRenderedManifest,
} from '../../src/lib/profile/resume-evidence.js';
import {
  buildResumeManifestForTest,
  compareResumeFactManifests,
} from '../../src/lib/profile/resume-manifest.js';
import type {
  ResumeFactManifest,
} from '../../src/lib/profile/resume-manifest.js';
import { selectResumeProfile } from '../../src/lib/profile/selectors.js';
import type {
  ProfileData,
  ResumeProfile,
  ValidatedProfile,
} from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

describe('résumé fact manifest', () => {
  test('captures present sections, ordered entities and every atomic fact deterministically', async () => {
    const first = await manifestFixture();
    const second = await manifestFixture();

    expect(first.sectionOrder.map(({ key }) => key)).toEqual([
      'intro-contact',
      'skills',
      'highlights',
      'project-summaries',
    ]);
    expect(
      first.entityOrder
        .filter(({ kind }) => kind === 'project')
        .map(({ id }) => id),
    ).toEqual(['project-beta', 'project-gamma', 'project-alpha']);
    expect(
      first.entries.map(
        ({ factId, path, valueKind, normalizedValue }) =>
          [factId, path, valueKind, normalizedValue] as const,
      ),
    ).toEqual(EXPECTED_RESUME_FACTS);
    expect(first.entries.map(({ entryOrder }) => entryOrder)).toEqual(
      Array.from(
        { length: first.entries.length },
        (_, index) => index + 1,
      ),
    );
    expect(new Set(first.entries.map(({ factId }) => factId)).size).toBe(
      first.entries.length,
    );
    expect(first.sourceIdentity.digest).toBe(
      second.sourceIdentity.digest,
    );
    expect(first.fingerprint.digest).toBe(second.fingerprint.digest);
    expect(Object.isFrozen(first.entries)).toBe(true);
  });

  test('requires exact ordered structural parity, not set or subset equality', async () => {
    const expected = await manifestFixture();
    expect(
      compareResumeFactManifests(
        expected,
        structuredClone(expected),
      ).ok,
    ).toBe(true);

    const mutations: Array<
      readonly [string, (candidate: MutableManifest) => void]
    > = [
      [
        'changed fact',
        (candidate) => {
          candidate.entries[0]!.normalizedValue += '-changed';
        },
      ],
      [
        'deleted fact',
        (candidate) => {
          candidate.entries.splice(0, 1);
        },
      ],
      [
        'added fact',
        (candidate) => {
          candidate.entries.push(structuredClone(candidate.entries[0]!));
        },
      ],
      [
        'reordered facts',
        (candidate) => {
          candidate.entries.reverse();
        },
      ],
      [
        'changed source identity',
        (candidate) => {
          candidate.sourceIdentity.digest = '0'.repeat(64);
        },
      ],
    ];

    for (const [label, mutate] of mutations) {
      const candidate = structuredClone(expected) as MutableManifest;
      mutate(candidate);
      const result = compareResumeFactManifests(expected, candidate);
      expect(result.ok, label).toBe(false);
      if (result.ok) throw new Error(`expected ${label} to fail`);
      expect(result.issues[0]).toMatchObject({
        code: 'document.parity',
        path: 'profile.document.parity',
      });
    }
  });

  test('changes source identity for one controlled résumé fact and not for an identical copy', async () => {
    const source = validSource();
    const original = selectResumeProfile(source);
    const identical = structuredClone(original) as ResumeProfile;
    const changedCandidate = cloneProfileFixture() as unknown as {
      narrative: { resumeSummary: { value: string } };
    };
    changedCandidate.narrative.resumeSummary.value =
      '단 하나의 합성 이력서 사실을 변경했습니다.';
    const changed = selectResumeProfile(
      validSource(changedCandidate as unknown as ProfileData),
    );

    const originalDigest = expectSuccess(
      await digestProfileSource(original),
    );
    const identicalDigest = expectSuccess(
      await digestProfileSource(identical),
    );
    const changedDigest = expectSuccess(
      await digestProfileSource(changed),
    );

    expect(identicalDigest.digest).toBe(originalDigest.digest);
    expect(changedDigest.digest).not.toBe(originalDigest.digest);
  });

  test('rejects an incomplete projection instead of creating a partial manifest', async () => {
    const source = validSource();
    const resume = structuredClone(
      selectResumeProfile(source),
    ) as unknown as Record<string, unknown>;
    delete resume.identity;

    const result = await buildResumeManifestForTest(
      resume as unknown as ResumeProfile,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected invalid résumé projection');
    expect(result.issues[0]).toMatchObject({
      code: 'document.source.invalid',
      path: 'profile.document.source',
    });
  });
});

describe('résumé document source and link boundary', () => {
  test('exposes one immutable stable public link and rejects alternatives', () => {
    const link = getResumeDocumentLink();

    expect(link).toEqual({
      href: '/resume.pdf',
      label: 'PDF 이력서 다운로드',
    });
    expect(Object.isFrozen(link)).toBe(true);
    expect(validateResumeDocumentLink(structuredClone(link)).ok).toBe(
      true,
    );

    for (const candidate of [
      { ...link, href: '/other.pdf' },
      { ...link, label: '다른 문서' },
      { ...link, download: true },
      null,
    ]) {
      const result = validateResumeDocumentLink(candidate);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected invalid document link');
      expect(result.issues[0]).toMatchObject({
        code: 'document.link.invalid',
        path: 'profile.document.href',
      });
    }
  });

  test('creates a self-contained request bound to the current manifest identities', async () => {
    const manifest = await manifestFixture();
    const request = createResumeDocumentRequest(manifest);

    expect(request).toEqual({
      schemaVersion: 1,
      sourceRoute: RESUME_DOCUMENT_SOURCE_ROUTE,
      publicHref: RESUME_DOCUMENT_PUBLIC_HREF,
      repositoryPath: RESUME_DOCUMENT_REPOSITORY_PATH,
      expectedManifest: manifest,
      sourceIdentity: manifest.sourceIdentity,
      manifestFingerprint: manifest.fingerprint,
    });
    expect(request.sourceRoute).toBe('/resume');
    expect(request.publicHref).toBe('/resume.pdf');
    expect(request.repositoryPath).toBe('site/public/resume.pdf');
    expect(Object.isFrozen(request)).toBe(true);
  });

  test('validates digest domains and rejects a source digest used as a manifest digest', async () => {
    const manifest = await manifestFixture();

    expect(
      validateCanonicalDigest(
        manifest.sourceIdentity,
        PROFILE_SOURCE_DIGEST_DOMAIN,
      ).ok,
    ).toBe(true);
    expect(
      validateCanonicalDigest(
        manifest.sourceIdentity,
        RESUME_FACT_MANIFEST_DIGEST_DOMAIN,
      ).ok,
    ).toBe(false);
  });
});

describe('rendered résumé parity', () => {
  test('accepts complete web and print observations from the same manifest', async () => {
    const manifest = await manifestFixture();

    expect(
      compareRenderedManifest(
        manifest,
        renderedObservation(manifest, 'web'),
      ).ok,
    ).toBe(true);
    expect(
      compareRenderedManifest(
        manifest,
        renderedObservation(manifest, 'print'),
      ).ok,
    ).toBe(true);
  });

  test('rejects stale, changed, ambiguous and print-hidden observations', async () => {
    const manifest = await manifestFixture();

    const stale = renderedObservation(manifest, 'web');
    (
      stale.fingerprint as unknown as { digest: string }
    ).digest = '0'.repeat(64);
    expect(failureCodes(compareRenderedManifest(manifest, stale))).toContain(
      'document.stale',
    );

    const changed = renderedObservation(manifest, 'web');
    changed.entries[0]!.normalizedValue += '-changed';
    expect(
      failureCodes(compareRenderedManifest(manifest, changed)),
    ).toContain('document.parity');

    const ambiguous = renderedObservation(manifest, 'web');
    ambiguous.entries[1]!.annotationOccurrence =
      ambiguous.entries[0]!.annotationOccurrence;
    expect(
      failureCodes(compareRenderedManifest(manifest, ambiguous)),
    ).toContain('document.parity');

    const hiddenInPrint = renderedObservation(manifest, 'print');
    hiddenInPrint.entries[0]!.rendered = false;
    expect(
      failureCodes(
        compareRenderedManifest(manifest, hiddenInPrint),
      ),
    ).toContain('document.parity');
  });
});

type MutableManifest = {
  -readonly [Key in keyof ResumeFactManifest]: Key extends 'entries'
    ? Array<{
        -readonly [EntryKey in keyof ResumeFactManifest['entries'][number]]:
          ResumeFactManifest['entries'][number][EntryKey];
      }>
    : Key extends 'sourceIdentity'
      ? {
          -readonly [DigestKey in keyof ResumeFactManifest['sourceIdentity']]:
            ResumeFactManifest['sourceIdentity'][DigestKey];
        }
      : ResumeFactManifest[Key];
};

type MutableRenderedObservation = ReturnType<typeof renderedObservation>;

const EXPECTED_RESUME_FACTS = [
  [
    'identity-name',
    'profile.identity.name',
    'text',
    '테스트 사용자',
  ],
  [
    'identity-headline',
    'profile.identity.headline',
    'text',
    '정적 시스템을 설계하는 소프트웨어 엔지니어',
  ],
  [
    'narrative-resume-summary',
    'profile.narrative.resumeSummary',
    'text',
    '설계와 구현을 연결해 재현 가능한 정적 제품을 만듭니다.',
  ],
  [
    'narrative-detailed-intro',
    'profile.narrative.detailedIntro[0].text',
    'text',
    '한국어·Unicode·긴 기술 이름을 자르지 않고 전달하는 테스트 전용 소개입니다.',
  ],
  [
    'contact-email',
    'profile.contact.email',
    'email',
    'tester@example.com',
  ],
  [
    'contact-github',
    'profile.contact.github',
    'github-url',
    'https://github.com/example-user',
  ],
  [
    'skill-group-title',
    'profile.skillGroups[id=software-engineering].title',
    'text',
    '소프트웨어 엔지니어링',
  ],
  [
    'skill-rust',
    'profile.skillGroups[id=software-engineering].skills[id=rust].name',
    'text',
    'Rust',
  ],
  [
    'skill-typescript',
    'profile.skillGroups[id=software-engineering].skills[id=typescript].name',
    'text',
    'TypeScript',
  ],
  [
    'experience-role',
    'profile.experiences[id=example-company].role',
    'text',
    '소프트웨어 엔지니어',
  ],
  [
    'experience-organization',
    'profile.experiences[id=example-company].organization',
    'text',
    '예시 조직',
  ],
  [
    'experience-period',
    'profile.experiences[id=example-company].period',
    'period',
    'start:year-month:2023-01|end:present',
  ],
  [
    'experience-summary',
    'profile.experiences[id=example-company].summary',
    'text',
    '정적 콘텐츠 파이프라인의 품질과 운영 경계를 개선했습니다.',
  ],
  [
    'experience-detail-one',
    'profile.experiences[id=example-company].details[0].items[0]',
    'text',
    '명시적 계약과 자동 검증을 함께 설계했습니다.',
  ],
  [
    'project-beta-title',
    'profile.projects[id=project-beta].title',
    'text',
    '프로젝트 베타',
  ],
  [
    'project-beta-summary',
    'profile.projects[id=project-beta].outcomeSummary',
    'text',
    '베타 프로젝트의 검증 가능한 결과를 설명합니다.',
  ],
  [
    'project-gamma-title',
    'profile.projects[id=project-gamma].title',
    'text',
    '프로젝트 감마',
  ],
  [
    'project-gamma-summary',
    'profile.projects[id=project-gamma].outcomeSummary',
    'text',
    '감마 프로젝트의 검증 가능한 결과를 설명합니다.',
  ],
  [
    'project-alpha-title',
    'profile.projects[id=project-alpha].title',
    'text',
    '프로젝트 알파',
  ],
  [
    'project-alpha-summary',
    'profile.projects[id=project-alpha].outcomeSummary',
    'text',
    '복잡한 변환을 결정적인 정적 출력으로 만들었습니다.',
  ],
] as const;

async function manifestFixture(): Promise<ResumeFactManifest> {
  const result = await buildResumeManifestForTest(
    selectResumeProfile(validSource()),
  );
  if (!result.ok) {
    throw new Error(
      result.issues.map(({ code, path }) => `${code}@${path}`).join(', '),
    );
  }
  return result.value;
}

function validSource(
  input: ProfileData = cloneProfileFixture(),
): ValidatedProfile {
  const result = validateProfile(input);
  if (!result.ok) throw new Error('expected valid synthetic profile');
  return result.value;
}

function renderedObservation(
  manifest: ResumeFactManifest,
  surface: 'web' | 'print',
) {
  return {
    schemaVersion: RESUME_EVIDENCE_SCHEMA_VERSION,
    surface,
    sourceIdentity: structuredClone(manifest.sourceIdentity),
    fingerprint: structuredClone(manifest.fingerprint),
    sectionOrder: structuredClone(manifest.sectionOrder),
    entityOrder: structuredClone(manifest.entityOrder),
    entries: manifest.entries.map((entry, index) => ({
      ...structuredClone(entry),
      occurrenceOrder: index + 1,
      annotationOccurrence: index + 1,
      domPresent: true as const,
      rendered: true,
    })),
  };
}

function expectSuccess<Value>(
  result: { readonly ok: true; readonly value: Value } | {
    readonly ok: false;
  },
): Value {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected success');
  return result.value;
}

function failureCodes(
  result:
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly issues: readonly { readonly code: string }[];
      },
): string[] {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected failure');
  return result.issues.map(({ code }) => code);
}

describe('pdf period observation', () => {
  const { parsePeriodDisplayText } = resumeEvidenceTesting;

  test('inverts the rendered period into the approved manifest token', () => {
    expect(parsePeriodDisplayText('2023-07 – 2023-08')).toBe(
      'start:year-month:2023-07|end:year-month:2023-08',
    );
    expect(parsePeriodDisplayText('2019 – 2026')).toBe(
      'start:year:2019|end:year:2026',
    );
  });

  test('reads an open-ended period as the present point', () => {
    expect(parsePeriodDisplayText('2023-07 – 현재')).toBe(
      'start:year-month:2023-07|end:present',
    );
  });

  test('tolerates the layout whitespace PDF extraction produces', () => {
    // Text items arrive as glyph runs, so the spaces around the en dash are
    // layout rather than content and may be absent or doubled.
    expect(parsePeriodDisplayText('2019–2026')).toBe(
      'start:year:2019|end:year:2026',
    );
    expect(parsePeriodDisplayText('2019  –  2026')).toBe(
      'start:year:2019|end:year:2026',
    );
  });

  test('refuses a period it cannot read rather than passing it through', () => {
    expect(parsePeriodDisplayText('2023-07')).toBeNull();
    expect(parsePeriodDisplayText('2023-13 – 2023-14')).toBeNull();
    expect(parsePeriodDisplayText('2019 - 2026')).toBeNull();
    expect(parsePeriodDisplayText('2019 – 2020 – 2021')).toBeNull();
  });
});
