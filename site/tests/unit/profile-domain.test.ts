import { describe, expect, test } from 'vitest';
import {
  hasValidatedProfileCapability,
  requireValidProfile,
  validateProfile,
} from '../../src/lib/profile/validation.js';
import {
  normalizeProfile,
  normalizeText,
} from '../../src/lib/profile/normalization.js';
import type {
  ProfileData,
  ValidationIssue,
} from '../../src/lib/profile/types.js';
import {
  cloneProfileFixture,
  nonNfcTextFixture,
  normalizedNonNfcTextFixture,
  profileWithDuplicateProjectOrder,
  profileWithInvalidEmail,
  profileWithProjectCount,
  validProfileFixture,
} from '../fixtures/profile-fixtures.js';

describe('profile domain normalization', () => {
  test('normalizes Unicode and line endings idempotently without mutating input', () => {
    const input = cloneProfileFixture();
    const before = structuredClone(input);
    (
      input.narrative.detailedIntro[0] as unknown as {
        text: { value: string };
      }
    ).text.value = nonNfcTextFixture;

    const once = normalizeProfile(input);
    const twice = normalizeProfile(once as unknown as ProfileData);

    expect(
      (
        once.narrative.detailedIntro[0] as unknown as {
          text: { value: string };
        }
      ).text.value,
    ).toBe(normalizedNonNfcTextFixture);
    expect(twice).toEqual(once);
    expect(input).toEqual({
      ...before,
      narrative: {
        ...before.narrative,
        detailedIntro: [
          {
            tag: 'paragraph',
            text: {
              factId: 'narrative-detailed-intro',
              value: nonNfcTextFixture,
            },
          },
        ],
      },
    });
    expect(normalizeText(normalizeText(nonNfcTextFixture))).toBe(
      normalizedNonNfcTextFixture,
    );
  });

  test('preserves internal whitespace, punctuation and long Unicode content', () => {
    const value =
      `  첫 문단  내부 공백\r\n둘째 문단 — ${'한글·Unicode '.repeat(80)}끝  `;
    const normalized = normalizeText(value);

    expect(normalized).toBe(
      `첫 문단  내부 공백\n둘째 문단 — ${'한글·Unicode '.repeat(80)}끝`,
    );
    expect(normalized.endsWith('끝')).toBe(true);
  });
});

describe('profile aggregate validation', () => {
  test('accepts the complete synthetic profile and returns an immutable capability', () => {
    const input = cloneProfileFixture();
    const before = structuredClone(input);
    const result = validateProfile(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected valid synthetic profile');

    expect(hasValidatedProfileCapability(result.value)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.projects[0]?.problem)).toBe(true);
    expect(input).toEqual(before);
    expect(result.value).not.toBe(input);
  });

  test('does not accept a structural imitation of ValidatedProfile', () => {
    expect(hasValidatedProfileCapability(validProfileFixture)).toBe(false);
    expect(
      hasValidatedProfileCapability(
        Object.freeze(structuredClone(validProfileFixture)),
      ),
    ).toBe(false);
  });

  test.each([
    [2, false],
    [3, true],
    [6, true],
    [7, false],
  ])('enforces the project-count boundary at %i projects', (count, valid) => {
    const result = validateProfile(profileWithProjectCount(count));

    expect(result.ok).toBe(valid);
    if (!valid) {
      expect(issueKeys(expectFailure(result))).toContain(
        'collection.range@profile.projects',
      );
    }
  });

  test('aggregates missing required identity and contact facts without a partial value', () => {
    const candidate = cloneProfileFixture() as unknown as Record<
      string,
      Record<string, unknown>
    >;
    delete (candidate.identity as Record<string, unknown>).name;
    delete (candidate.contact as Record<string, unknown>).email;
    delete (candidate.contact as Record<string, unknown>).github;

    const first = validateProfile(candidate as unknown as ProfileData);
    const second = validateProfile(candidate as unknown as ProfileData);
    const issues = expectFailure(first);

    expect(issueKeys(issues)).toEqual([
      'field.required@profile.identity.name',
      'field.required@profile.contact.email',
      'field.required@profile.contact.github',
    ]);
    expect(second).toEqual(first);
    expect('value' in first).toBe(false);
  });

  test('reports duplicate project IDs and orders instead of applying a fallback order', () => {
    const candidate = profileWithDuplicateProjectOrder() as unknown as {
      projects: Array<{ id: string; order: number }>;
    };
    candidate.projects[1]!.id = candidate.projects[0]!.id;

    const issues = expectFailure(
      validateProfile(candidate as unknown as ProfileData),
    );
    const keys = issueKeys(issues);

    expect(keys).toEqual([
      'identifier.duplicate@profile.projects[0].id',
      'order.duplicate@profile.projects[0].order',
      'identifier.duplicate@profile.projects[1].id',
      'order.duplicate@profile.projects[1].order',
    ]);
  });

  test('distinguishes absent optional evidence from supplied-invalid evidence', () => {
    expect(validateProfile(cloneProfileFixture()).ok).toBe(true);

    const candidate = cloneProfileFixture() as unknown as {
      contact: { additionalLinks: unknown[] };
    };
    candidate.contact.additionalLinks = [
      {
        id: 'unsafe-evidence',
        order: 10,
        label: {
          factId: 'unsafe-evidence-label',
          value: '검증용 근거',
        },
        destination: {
          factId: 'unsafe-evidence-destination',
          value: {
            tag: 'external',
            value: 'javascript:alert(1)',
          },
        },
      },
    ];

    expect(
      issueKeys(
        expectFailure(
          validateProfile(candidate as unknown as ProfileData),
        ),
      ),
    ).toContain(
      'evidence.url.invalid@profile.contact.additionalLinks[0].destination',
    );
  });

  test('rejects invalid email, mixed period precision and missing relation targets together', () => {
    const candidate = profileWithInvalidEmail() as unknown as {
      experiences: Array<{
        period: {
          value: {
            end: { tag: string; value: string };
          };
        };
      }>;
      projects: Array<{
        relatedProfileEntity?: { tag: string; id: string };
      }>;
    };
    candidate.experiences[0]!.period.value.end = {
      tag: 'year',
      value: '2025',
    };
    candidate.projects[0]!.relatedProfileEntity = {
      tag: 'experience',
      id: 'missing-experience',
    };

    const keys = issueKeys(
      expectFailure(
        validateProfile(candidate as unknown as ProfileData),
      ),
    );

    expect(keys).toEqual([
      'contact.email.invalid@profile.contact.email',
      'period.precision@profile.experiences[0].period',
      'reference.missing@profile.projects[0].relatedProfileEntity',
    ]);
  });

  test('throws a stable diagnostic summary when a valid capability is required', () => {
    expect(() => requireValidProfile(profileWithInvalidEmail())).toThrow(
      /contact\.email\.invalid@profile\.contact\.email/,
    );
  });
});

function expectFailure(
  result: ReturnType<typeof validateProfile>,
): readonly ValidationIssue[] {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected validation failure');
  return result.issues;
}

function issueKeys(issues: readonly ValidationIssue[]): string[] {
  return issues.map(({ code, path }) => `${code}@${path}`);
}
