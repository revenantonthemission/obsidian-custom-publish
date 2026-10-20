import { describe, expect, test } from 'vitest';
import { collectMaterializedFacts } from '../../src/lib/profile/fact-approval.js';
import { normalizeProfile } from '../../src/lib/profile/normalization.js';
import { buildResumeManifestForTest } from '../../src/lib/profile/resume-manifest.js';
import { selectPortfolioProfile, selectResumeProfile } from '../../src/lib/profile/selectors.js';
import type { ProfileData, ValidationResult } from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture, profileWithProjectCount } from '../fixtures/profile-fixtures.js';

describe('résumé project selection', () => {
  test('preserves all projects when the optional selection is absent', () => {
    const source = success(validateProfile(cloneProfileFixture()));
    expect(Object.hasOwn(source, 'resumeProjectIds')).toBe(false);
    expect(selectResumeProfile(source).projectSummaries.map(({ id }) => id)).toEqual([
      'project-beta',
      'project-gamma',
      'project-alpha',
    ]);
  });

  test('copies and freezes selection while preserving canonical project order and the full portfolio', () => {
    const selection = ['project-alpha', 'project-beta'];
    const input = withSelection(selection);
    const normalized = normalizeProfile(input);
    const source = success(validateProfile(input));
    expect(normalized.resumeProjectIds).toEqual(selection);
    expect(normalized.resumeProjectIds).not.toBe(selection);
    expect(Object.isFrozen(normalized.resumeProjectIds)).toBe(true);
    selection.reverse();
    expect(source.resumeProjectIds).toEqual(['project-alpha', 'project-beta']);
    expect(selectResumeProfile(source).projectSummaries.map(({ id }) => id)).toEqual([
      'project-beta',
      'project-alpha',
    ]);
    expect(selectPortfolioProfile(source).projects.map(({ id }) => id)).toEqual([
      'project-beta',
      'project-gamma',
      'project-alpha',
    ]);
  });

  test('builds a current one-project manifest with only selected project facts', async () => {
    const all = success(validateProfile(cloneProfileFixture()));
    const source = success(validateProfile(withSelection(['project-beta'])));
    const selectedProfile = selectResumeProfile(source);
    const manifest = success(await buildResumeManifestForTest(selectedProfile));
    const complete = success(await buildResumeManifestForTest(selectResumeProfile(all)));

    expect(selectedProfile.projectSummaries).toHaveLength(1);
    expect(
      manifest.entityOrder.filter(({ kind }) => kind === 'project').map(({ id }) => id)
    ).toEqual(['project-beta']);
    expect(
      manifest.entries
        .filter(({ path }) => path.startsWith('profile.projects['))
        .map(({ factId }) => factId)
    ).toEqual(['project-beta-title', 'project-beta-summary']);
    expect(manifest.sourceIdentity.digest).not.toBe(complete.sourceIdentity.digest);
    expect(manifest.fingerprint.digest).not.toBe(complete.fingerprint.digest);
    expect(
      (await buildResumeManifestForTest({ ...selectedProfile, projectSummaries: [] })).ok
    ).toBe(false);
  });

  test('allows a selection containing all six source projects', async () => {
    const fixture = profileWithProjectCount(6);
    const source = success(
      validateProfile({
        ...fixture,
        resumeProjectIds: fixture.projects.map(({ id }) => id).reverse(),
      })
    );
    const profile = selectResumeProfile(source);
    expect(profile.projectSummaries.map(({ id }) => id)).toEqual(
      fixture.projects.map(({ id }) => id)
    );
    expect((await buildResumeManifestForTest(profile)).ok).toBe(true);
  });

  test.each([
    ['empty selection', [], 'collection.range'],
    [
      'too many projects',
      Array.from({ length: 7 }, (_, index) => `project-${index}`),
      'collection.range',
    ],
    ['unknown project', ['missing-project'], 'reference.missing'],
    ['malformed ID', [' project-beta '], 'identifier.format'],
    ['duplicate ID', ['project-beta', 'project-beta'], 'identifier.duplicate'],
    ['explicit undefined', undefined, 'field.type'],
    ['null', null, 'field.type'],
    ['string instead of array', 'project-beta', 'field.type'],
    ['non-string ID', [42], 'field.type'],
    ['sparse array', new Array(1), 'field.type'],
    ['extended array', Object.assign(['project-beta'], { extra: true }), 'field.type'],
  ])('rejects %s without dropping the selection', (_label, selection, code) => {
    const result = validateProfile(withSelection(selection));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected an invalid résumé selection.');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code,
          path: expect.stringMatching(/^profile\.resumeProjectIds/),
        }),
      ])
    );
  });

  test('rejects selection and array accessors without invoking them', () => {
    let reads = 0;
    const read = () => {
      reads += 1;
      return ['project-beta'];
    };
    const ownAccessor = cloneProfileFixture();
    Object.defineProperty(ownAccessor, 'resumeProjectIds', { enumerable: true, get: read });
    const inherited = Object.assign(
      Object.create(Object.defineProperty({}, 'resumeProjectIds', { get: read })),
      cloneProfileFixture()
    ) as ProfileData;
    const itemAccessor = ['project-beta'];
    Object.defineProperty(itemAccessor, '0', {
      enumerable: true,
      get() {
        reads += 1;
        return 'project-beta';
      },
    });
    const iteratorAccessor = ['project-beta'];
    Object.defineProperty(iteratorAccessor, Symbol.iterator, {
      get() {
        reads += 1;
        return Array.prototype[Symbol.iterator];
      },
    });
    for (const input of [
      ownAccessor,
      inherited,
      withSelection(itemAccessor),
      withSelection(iteratorAccessor),
    ]) {
      expect(validateProfile(input).ok).toBe(false);
      expect(() => normalizeProfile(input)).toThrow(TypeError);
    }
    expect(reads).toBe(0);
  });
});

describe('résumé project details', () => {
  test('preserves absent fields and projects supported details only into the résumé', async () => {
    const original = success(validateProfile(cloneProfileFixture()));
    expect(
      selectResumeProfile(original).projectSummaries.every(
        (project) => !Object.hasOwn(project, 'details')
      )
    ).toBe(true);

    const source = success(validateProfile(withResumeDetails(detailBlocks())));
    const project = selectResumeProfile(source).projectSummaries.find(
      ({ id }) => id === 'project-beta'
    )!;
    const sourceDetails = source.projects.find(
      ({ id }) => String(id) === 'project-beta'
    )!.resumeDetails!;
    expect(project.details).toEqual(sourceDetails);
    expect(project.details).not.toBe(sourceDetails);
    expect(Object.isFrozen(project.details)).toBe(true);
    expect(JSON.stringify(project.details)).toContain('팀에서 담당한 구현 범위');
    expect(JSON.stringify(project.details)).not.toContain('  팀에서');
    expect(selectPortfolioProfile(source)).toEqual(selectPortfolioProfile(original));

    const details = collectMaterializedFacts(source).filter(({ canonicalPath }) =>
      canonicalPath.includes('.resumeDetails[')
    );
    expect(
      details.map(({ factId, canonicalPath, targetSurfaces }) => ({
        factId,
        canonicalPath,
        targetSurfaces,
      }))
    ).toEqual([
      {
        factId: 'project-beta-resume-role',
        canonicalPath: 'profile.projects[id=project-beta].resumeDetails[0].text',
        targetSurfaces: ['resume', 'pdf'],
      },
      {
        factId: 'project-beta-resume-contribution',
        canonicalPath: 'profile.projects[id=project-beta].resumeDetails[1].items[0]',
        targetSurfaces: ['resume', 'pdf'],
      },
    ]);

    const manifest = success(await buildResumeManifestForTest(selectResumeProfile(source)));
    expect(
      manifest.entries
        .filter(({ path }) => path.includes('.resumeDetails['))
        .map(({ factId, path, sectionKey, entity }) => ({
          factId,
          path,
          sectionKey,
          entityId: entity?.id,
        }))
    ).toEqual(
      details.map(({ factId, canonicalPath }) => ({
        factId,
        path: canonicalPath,
        sectionKey: 'project-summaries',
        entityId: 'project-beta',
      }))
    );
  });

  test.each([
    ['empty blocks', []],
    ['explicit undefined', undefined],
    ['null', null],
    ['sparse blocks', new Array(1)],
    ['unknown block', [{ tag: 'unknown' }]],
    ['empty list', [{ tag: 'list', style: 'unordered', items: [] }]],
    [
      'empty text',
      [{ tag: 'paragraph', text: { factId: 'project-beta-resume-role', value: '   ' } }],
    ],
    [
      'duplicate fact',
      [{ tag: 'paragraph', text: { factId: 'identity-name', value: '중복된 사실' } }],
    ],
  ])('rejects present résumé details with %s', (_label, blocks) => {
    expect(validateProfile(withResumeDetails(blocks)).ok).toBe(false);
  });

  test('rejects detail accessors and cycles without reading getters', () => {
    let reads = 0;
    const rootAccessor = withResumeDetails(detailBlocks());
    const project = rootAccessor.projects.find(({ id }) => id === 'project-beta')!;
    Object.defineProperty(project, 'resumeDetails', {
      enumerable: true,
      get() {
        reads += 1;
        return detailBlocks();
      },
    });
    const arrayAccessor = detailBlocks();
    Object.defineProperty(arrayAccessor, '0', {
      enumerable: true,
      get() {
        reads += 1;
        return detailBlocks()[0];
      },
    });
    const textAccessor = detailBlocks();
    Object.defineProperty(textAccessor[0]!.text, 'value', {
      enumerable: true,
      get() {
        reads += 1;
        return '사실';
      },
    });
    const cycle: unknown[] = [];
    cycle.push(cycle);
    for (const input of [
      rootAccessor,
      withResumeDetails(arrayAccessor),
      withResumeDetails(textAccessor),
      withResumeDetails(cycle),
    ]) {
      expect(validateProfile(input).ok).toBe(false);
    }
    expect(reads).toBe(0);
  });

  test('requires present projected details to be nonempty in the PDF manifest', async () => {
    const source = success(validateProfile(withResumeDetails(detailBlocks())));
    const profile = selectResumeProfile(source);
    for (const invalidDetails of [undefined, []]) {
      const invalid = {
        ...profile,
        projectSummaries: profile.projectSummaries.map((project) =>
          project.id === 'project-beta' ? { ...project, details: invalidDetails } : project
        ),
      };
      expect((await buildResumeManifestForTest(invalid as typeof profile)).ok).toBe(false);
    }
  });
});

function detailBlocks() {
  return [
    {
      tag: 'paragraph',
      text: { factId: 'project-beta-resume-role', value: '  팀에서 담당한 구현 범위  ' },
    },
    {
      tag: 'list',
      style: 'unordered',
      items: [
        {
          factId: 'project-beta-resume-contribution',
          value: '지원되는 사실을 프로젝트에 연결했습니다.',
        },
      ],
    },
  ];
}

function withResumeDetails(blocks: unknown): ProfileData {
  const fixture = cloneProfileFixture();
  return {
    ...fixture,
    projects: fixture.projects.map((project) =>
      project.id === 'project-beta' ? { ...project, resumeDetails: blocks } : project
    ),
  } as ProfileData;
}

function withSelection(selection: unknown): ProfileData {
  return { ...cloneProfileFixture(), resumeProjectIds: selection } as ProfileData;
}

function success<Value>(result: ValidationResult<Value>): Value {
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}
