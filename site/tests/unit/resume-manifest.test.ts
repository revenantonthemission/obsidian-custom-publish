import { describe, expect, test } from 'vitest';
import { buildResumeManifestForTest } from '../../src/lib/profile/resume-manifest.js';
import { selectResumeProfile } from '../../src/lib/profile/selectors.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import type { ProfileData, ResumeProfile } from '../../src/lib/profile/types.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

/**
 * BR2.1 for the résumé manifest: a full-date point serializes as
 * `date:<YYYY-MM-DD>`, and the manifest refuses a point it cannot read rather
 * than passing it through. The manifest builder is called on the selected
 * résumé projection directly, so a malformed point reaches it unvalidated.
 */
const PERIOD_PATH = 'profile.experiences[id=example-company].period';

function resumeWithPeriod(start: unknown, end: unknown): ResumeProfile {
  const result = validateProfile(cloneProfileFixture());
  if (!result.ok) throw new Error('expected the valid fixture');
  const resume = structuredClone(selectResumeProfile(result.value)) as unknown as {
    experiences: Array<{ period: { value: unknown } }>;
  };
  resume.experiences[0]!.period.value = { start, end };
  return resume as unknown as ResumeProfile;
}

function validResumeWithPeriod(start: unknown, end: unknown): ResumeProfile {
  const candidate = cloneProfileFixture() as unknown as {
    experiences: Array<{ period: { value: unknown } }>;
  };
  candidate.experiences[0]!.period.value = { start, end };
  const result = validateProfile(candidate as unknown as ProfileData);
  if (!result.ok) {
    throw new Error(result.issues.map(({ code, path }) => `${code}@${path}`).join(', '));
  }
  return selectResumeProfile(result.value);
}

async function periodToken(profile: ResumeProfile): Promise<string | undefined> {
  const result = await buildResumeManifestForTest(profile);
  if (!result.ok) {
    throw new Error(result.issues.map(({ code, path }) => `${code}@${path}`).join(', '));
  }
  return result.value.entries.find(({ path }) => path === PERIOD_PATH)?.normalizedValue;
}

describe('résumé manifest period tokens (BR2.1)', () => {
  test('serializes a full-date range as date tokens', async () => {
    await expect(
      periodToken(
        validResumeWithPeriod(
          { tag: 'date', value: '2025-09-06' },
          { tag: 'date', value: '2027-09-06' }
        )
      )
    ).resolves.toBe('start:date:2025-09-06|end:date:2027-09-06');
  });

  test('serializes a full-date start with an open end', async () => {
    await expect(
      periodToken(validResumeWithPeriod({ tag: 'date', value: '2026-07-17' }, { tag: 'present' }))
    ).resolves.toBe('start:date:2026-07-17|end:present');
  });

  test('keeps the existing year and year-month tokens unchanged', async () => {
    await expect(
      periodToken(
        validResumeWithPeriod(
          { tag: 'year-month', value: '2023-07' },
          { tag: 'year-month', value: '2023-08' }
        )
      )
    ).resolves.toBe('start:year-month:2023-07|end:year-month:2023-08');
    await expect(
      periodToken(
        validResumeWithPeriod({ tag: 'year', value: '2019' }, { tag: 'year', value: '2026' })
      )
    ).resolves.toBe('start:year:2019|end:year:2026');
  });

  test.each([
    ['a single-digit month and day', { tag: 'date', value: '2025-9-6' }],
    ['a day that does not exist', { tag: 'date', value: '2025-09-31' }],
    ['a dotted display value in place of the stored one', { tag: 'date', value: '2025.09.06' }],
    ['a full date under the year-month tag', { tag: 'year-month', value: '2025-09-06' }],
  ])('refuses %s', async (_label, start) => {
    const result = await buildResumeManifestForTest(
      resumeWithPeriod(start, { tag: 'date', value: '2027-09-06' })
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a refused manifest');
    expect(result.issues.map(({ code }) => code)).toEqual(['document.source.invalid']);
  });

  test('refuses a full-date range that runs backwards', async () => {
    const result = await buildResumeManifestForTest(
      resumeWithPeriod({ tag: 'date', value: '2027-09-06' }, { tag: 'date', value: '2025-09-06' })
    );
    expect(result.ok).toBe(false);
  });
});

/**
 * BR4.2 and BR6.2 (review R-01): the seven-section order of manifest schema 2.
 * Section ranks are fixed identities, so an absent collection leaves its rank
 * unused rather than renumbering the sections after it.
 */
function certification(id: string, order: number, title: string) {
  return {
    id,
    order,
    title: { factId: `${id}-title`, value: title },
    details: [],
    evidence: [],
  };
}

function resumeWithSections(sections: Readonly<Record<string, unknown>>): ResumeProfile {
  const result = validateProfile(cloneProfileFixture());
  if (!result.ok) throw new Error('expected the valid fixture');
  return {
    ...structuredClone(selectResumeProfile(result.value)),
    ...structuredClone(sections),
  } as unknown as ResumeProfile;
}

async function manifestOf(profile: ResumeProfile) {
  const result = await buildResumeManifestForTest(profile);
  if (!result.ok) {
    throw new Error(result.issues.map(({ code, path }) => `${code}@${path}`).join(', '));
  }
  return result.value;
}

const EDUCATION = [
  {
    id: 'example-university',
    order: 10,
    title: { factId: 'education-example-title', value: '예시 대학교' },
    details: [],
    evidence: [],
  },
];

describe('résumé manifest section order, schema 2 (BR4.2, BR6.2)', () => {
  test('records seven sections with 자격증 between 학력 and 어학 자격', async () => {
    const manifest = await manifestOf(
      resumeWithSections({
        education: EDUCATION,
        credentials: [certification('aws-example', 10, 'AWS 예시 자격')],
        certifications: [certification('language-example', 10, '어학 예시 자격')],
      })
    );

    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.sectionOrder).toEqual([
      { key: 'intro-contact', order: 1 },
      { key: 'skills', order: 2 },
      { key: 'highlights', order: 3 },
      { key: 'project-summaries', order: 4 },
      { key: 'education', order: 5 },
      { key: 'credentials', order: 6 },
      { key: 'certifications', order: 7 },
    ]);
  });

  test('files a credential under its own section and canonical path', async () => {
    const manifest = await manifestOf(
      resumeWithSections({ credentials: [certification('aws-example', 10, 'AWS 예시 자격')] })
    );
    const entry = manifest.entries.find(({ factId }) => factId === 'aws-example-title');

    expect(entry).toMatchObject({
      sectionKey: 'credentials',
      sectionOrder: 6,
      path: 'profile.credentials[id=aws-example].title',
      entity: { kind: 'certification', id: 'aws-example', order: 10 },
    });
  });

  test('gives an absent collection no slot and keeps the other ranks', async () => {
    const manifest = await manifestOf(
      resumeWithSections({
        certifications: [certification('language-example', 10, '어학 예시 자격')],
      })
    );

    expect(manifest.sectionOrder.map(({ key }) => key)).not.toContain('credentials');
    expect(manifest.sectionOrder.at(-1)).toEqual({ key: 'certifications', order: 7 });
  });

  test('leaves an empty credentials collection out of the selected résumé', async () => {
    const candidate = { ...cloneProfileFixture(), credentials: [] } as unknown as ProfileData;
    const result = validateProfile(candidate);
    if (!result.ok) {
      throw new Error(result.issues.map(({ code, path }) => `${code}@${path}`).join(', '));
    }
    const manifest = await manifestOf(selectResumeProfile(result.value));

    expect(manifest.sectionOrder.map(({ key }) => key)).toEqual([
      'intro-contact',
      'skills',
      'highlights',
      'project-summaries',
    ]);
  });

  test('refuses an explicitly empty credentials section', async () => {
    const result = await buildResumeManifestForTest(resumeWithSections({ credentials: [] }));
    expect(result.ok).toBe(false);
  });
});
