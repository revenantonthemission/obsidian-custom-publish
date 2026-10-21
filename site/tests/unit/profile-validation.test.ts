import { describe, expect, test } from 'vitest';
import { validateProfile } from '../../src/lib/profile/validation.js';
import type { ProfileData, ValidationIssue } from '../../src/lib/profile/types.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

/**
 * BR1.1–BR1.3 and BR2.1: the full-date precision. The fixture's one experience
 * period is the probe, so every case changes a single period and nothing else.
 */
const PERIOD_PATH = 'profile.experiences[0].period';

type PointInput = Readonly<{ tag: string; value?: string }>;

function profileWithPeriod(start: PointInput, end: PointInput): ProfileData {
  const candidate = cloneProfileFixture() as unknown as {
    experiences: Array<{ period: { value: { start: PointInput; end: PointInput } } }>;
  };
  candidate.experiences[0]!.period.value = { start, end };
  return candidate as unknown as ProfileData;
}

function issueKeys(input: ProfileData): string[] {
  const result = validateProfile(input);
  if (result.ok) return [];
  return result.issues.map(({ code, path }: ValidationIssue) => `${code}@${path}`);
}

describe('full-date periods (BR1.1, BR2.1)', () => {
  test('accepts a real calendar day on both ends', () => {
    const result = validateProfile(
      profileWithPeriod({ tag: 'date', value: '2025-09-06' }, { tag: 'date', value: '2027-09-06' })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected a valid date period');
    expect(result.value.experiences[0]?.period.value).toEqual({
      start: { tag: 'date', value: '2025-09-06' },
      end: { tag: 'date', value: '2027-09-06' },
    });
  });

  test('accepts the 29th of February in a leap year', () => {
    expect(
      issueKeys(
        profileWithPeriod(
          { tag: 'date', value: '2028-02-29' },
          { tag: 'date', value: '2028-03-01' }
        )
      )
    ).toEqual([]);
  });

  test('accepts an open end after a full-date start', () => {
    expect(
      issueKeys(profileWithPeriod({ tag: 'date', value: '2025-09-06' }, { tag: 'present' }))
    ).toEqual([]);
  });

  test.each([
    ['2026-02-29', 'not a leap year'],
    ['2025-09-31', 'September has 30 days'],
    ['2025-13-01', 'there is no 13th month'],
    ['2025-9-6', 'month and day must be two digits'],
    ['2025-09-00', 'there is no day zero'],
    ['0000-01-01', 'there is no year zero'],
  ])('rejects %s with the existing point code (%s)', (value) => {
    expect(
      issueKeys(profileWithPeriod({ tag: 'date', value }, { tag: 'date', value: '2029-07-17' }))
    ).toEqual([`period.value@${PERIOD_PATH}.value.start`]);
  });
});

describe('full-date period ranges (BR1.2, BR1.3)', () => {
  test('rejects a full-date start with a year-month end as mixed precision', () => {
    expect(
      issueKeys(
        profileWithPeriod(
          { tag: 'date', value: '2025-09-06' },
          { tag: 'year-month', value: '2027-09' }
        )
      )
    ).toEqual([`period.precision@${PERIOD_PATH}`]);
  });

  test('rejects a full-date range that runs backwards', () => {
    expect(
      issueKeys(
        profileWithPeriod(
          { tag: 'date', value: '2027-09-06' },
          { tag: 'date', value: '2027-09-05' }
        )
      )
    ).toEqual([`period.range@${PERIOD_PATH}`]);
  });

  test('accepts an end date in the future, because it is a validity window', () => {
    expect(
      issueKeys(
        profileWithPeriod(
          { tag: 'date', value: '2026-07-17' },
          { tag: 'date', value: '2029-07-17' }
        )
      )
    ).toEqual([]);
  });

  test('accepts a range that starts and ends on the same day', () => {
    expect(
      issueKeys(
        profileWithPeriod(
          { tag: 'date', value: '2026-07-17' },
          { tag: 'date', value: '2026-07-17' }
        )
      )
    ).toEqual([]);
  });
});
