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
