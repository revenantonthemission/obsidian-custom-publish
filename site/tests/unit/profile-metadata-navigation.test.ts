import { describe, expect, test } from 'vitest';
import { extractJsonLdDocuments, serializeJsonLdDocuments } from '../../src/lib/layout/json-ld.js';
import {
  LEGACY_ROUTE_RESOURCE_POLICY,
  PROFILE_ROUTE_RESOURCE_POLICY,
  resolveRouteResourcePolicy,
  validateRouteResourcePolicy,
} from '../../src/lib/layout/profile-resources.js';
import {
  getNavigationState,
  getPrimaryNavigation,
  getPrimaryNavigationState,
  getProfileLocalNavigation,
  getProfileLocalNavigationState,
  resolveNavigationMarker,
} from '../../src/lib/navigation.js';
import {
  buildPortfolioMetadataForTest,
  buildResumeMetadataForTest,
  validateMetadataConsistencyForTest,
} from '../../src/lib/profile/metadata.js';
import type {
  JsonLdDocument,
  MetadataProjectionSource,
  ProfilePageMetadata,
} from '../../src/lib/profile/metadata.js';
import {
  selectHomepageProfile,
  selectPortfolioProfile,
  selectResumeProfile,
} from '../../src/lib/profile/selectors.js';
import type { ValidatedProfile } from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

const site = Object.freeze({ origin: 'https://example.test' });

describe('profile metadata', () => {
  test('builds exact résumé title, canonical, visible descriptions and minimal JSON-LD', () => {
    const profile = selectResumeProfile(validSource());
    const result = buildResumeMetadataForTest(site, profile);
    const metadata = expectSuccess(result);

    expect(metadata).toMatchObject({
      route: 'resume',
      pathname: '/resume',
      title: '테스트 사용자 — Résumé',
      description: '설계와 구현을 연결해 재현 가능한 정적 제품을 만듭니다.',
      canonical: 'https://example.test/resume',
      openGraph: {
        title: '테스트 사용자 — Résumé',
        description: '설계와 구현을 연결해 재현 가능한 정적 제품을 만듭니다.',
        url: 'https://example.test/resume',
      },
      twitter: {
        title: '테스트 사용자 — Résumé',
        description: '설계와 구현을 연결해 재현 가능한 정적 제품을 만듭니다.',
        url: 'https://example.test/resume',
      },
    });
    expect(metadata.jsonLd.map(({ schemaType }) => schemaType)).toEqual(['ProfilePage', 'Person']);
    expect(metadata.jsonLd[1]?.payload).toEqual(
      expect.objectContaining({
        '@type': 'Person',
        name: '테스트 사용자',
        email: 'tester@example.com',
        sameAs: ['https://github.com/example-user'],
      })
    );
    expect(metadata.jsonLd[1]?.payload).not.toHaveProperty('worksFor');
  });

  test('builds ordered portfolio ItemList from the visible projection only', () => {
    const source = validSource();
    const profile = selectPortfolioProfile(source);
    const name = selectHomepageProfile(source).name;
    const metadata = expectSuccess(buildPortfolioMetadataForTest(site, name, profile));
    const itemList = metadata.jsonLd[1]?.payload as {
      numberOfItems: number;
      itemListElement: Array<{
        position: number;
        item: { name: string; description: string };
      }>;
    };

    expect(metadata.title).toBe('테스트 사용자 — Portfolio');
    expect(metadata.description).toBe(profile.portfolioSummary.value);
    expect(itemList.numberOfItems).toBe(3);
    expect(
      itemList.itemListElement.map(({ position, item: { name } }) => [position, name])
    ).toEqual([
      [1, '프로젝트 베타'],
      [2, '프로젝트 감마'],
      [3, '프로젝트 알파'],
    ]);
  });

  test('rejects changed visible descriptions and stronger structured-data claims', () => {
    const source = validSource();
    const profile = selectResumeProfile(source);
    const metadata = expectSuccess(buildResumeMetadataForTest(site, profile));
    const projection: MetadataProjectionSource = Object.freeze({
      route: 'resume',
      profile,
    });

    const changedDescription = structuredClone(metadata);
    (changedDescription as unknown as { description: string }).description =
      '화면에 없는 더 강한 설명';
    expect(
      failureKeys(validateMetadataConsistencyForTest(site, projection, changedDescription))
    ).toContain('metadata.description.mismatch@profile.metadata.resume.description');

    const strongerClaim = structuredClone(metadata) as unknown as {
      jsonLd: Array<{ payload: Record<string, unknown> }>;
    };
    strongerClaim.jsonLd[1]!.payload.worksFor = {
      '@type': 'Organization',
      name: '추론한 조직',
    };
    expect(
      failureKeys(validateMetadataConsistencyForTest(site, projection, strongerClaim))
    ).toContain('metadata.claim.unsupported@profile.metadata.resume.jsonLd');
  });

  test('rejects non-origin HTTPS site identities without producing partial metadata', () => {
    const result = buildResumeMetadataForTest(
      { origin: 'https://example.test/base' },
      selectResumeProfile(validSource())
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected invalid site identity');
    expect(result.issues[0]).toMatchObject({
      code: 'metadata.route.invalid',
      path: 'profile.metadata.resume.canonical',
    });
    expect('value' in result).toBe(false);
  });
});

describe('JSON-LD host boundary', () => {
  test('round-trips Unicode and script-like text without leaving a script terminator', () => {
    const document = {
      schemaType: 'Person',
      payload: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: '테스트 </script><script>alert("x")</script> \u2028 끝',
      },
    } as unknown as JsonLdDocument;
    const serialized = serializeJsonLdDocuments([document]);
    const host = expectSuccess(serialized);

    expect(host).not.toBeNull();
    expect(host?.[0]?.payload).not.toMatch(/[<>&\u2028\u2029]/);

    const extracted = expectSuccess(extractJsonLdDocuments(host));
    expect(extracted).toEqual([document]);
  });

  test('emits no script for absent or empty structured-data collections', () => {
    expect(expectSuccess(serializeJsonLdDocuments(undefined))).toBeNull();
    expect(expectSuccess(serializeJsonLdDocuments(null))).toBeNull();
    expect(expectSuccess(serializeJsonLdDocuments([]))).toBeNull();
  });
});

describe('shared navigation contracts', () => {
  test('keeps the one-item primary model and the unchanged profile-local model', () => {
    expect(getPrimaryNavigation()).toEqual([{ href: '/writing', label: 'Writing' }]);
    expect(getProfileLocalNavigation()).toEqual([
      { href: '/', label: '홈' },
      { href: '/resume', label: 'Résumé' },
      { href: '/portfolio', label: 'Portfolio' },
    ]);
    expect(Object.isFrozen(getPrimaryNavigation())).toBe(true);
    expect(getPrimaryNavigation().every((item) => Object.isFrozen(item))).toBe(true);
    expect(Object.isFrozen(getProfileLocalNavigation())).toBe(true);
  });

  test.each([
    ['/writing', 'page'],
    ['/writing/', 'page'],
    ['/writing?ref=nav#top', 'page'],
    ['/writing/all', 'section'],
    ['/writing/all/', 'section'],
    ['/writing/all?from=writing', 'section'],
    ['/writing/tags', 'section'],
    ['/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C', 'section'],
    ['/writing/graph', 'section'],
    ['/', null],
    ['/writing-old', null],
    ['/writingold', null],
    ['/Writing', null],
    ['/WRITING/all', null],
    ['/resume', null],
    ['/portfolio', null],
    ['/posts/post-with-code', null],
  ])('resolves the Writing marker for %s', (pathname, expectedMarker) => {
    expect(resolveNavigationMarker(pathname)).toBe(expectedMarker);
  });

  test('carries the marker vocabulary on the primary state', () => {
    expect(expectSuccess(getPrimaryNavigationState('/writing'))).toEqual([
      { href: '/writing', label: 'Writing', current: true, ariaCurrent: 'page' },
    ]);
    expect(expectSuccess(getPrimaryNavigationState('/writing/all'))).toEqual([
      { href: '/writing', label: 'Writing', current: true, ariaCurrent: 'true' },
    ]);
    expect(expectSuccess(getPrimaryNavigationState('/resume'))).toEqual([
      { href: '/writing', label: 'Writing', current: false, ariaCurrent: null },
    ]);
  });

  test('marks only the current profile-local route and never the home item on descendants', () => {
    const states = expectSuccess(getProfileLocalNavigationState('/portfolio/example'));

    expect(states.map(({ href, current, ariaCurrent }) => [href, current, ariaCurrent])).toEqual([
      ['/', false, null],
      ['/resume', false, null],
      ['/portfolio', true, 'page'],
    ]);
  });

  test('fails closed for altered models and unsafe paths', () => {
    const altered = [...getPrimaryNavigation(), { href: '/extra', label: 'Extra' }];
    expect(failureKeys(getNavigationState(altered, '/writing'))).toContain(
      'navigation.model.invalid@profile.navigation.model'
    );
    expect(failureKeys(getPrimaryNavigationState('/writing%2fhidden'))).toContain(
      'navigation.current.invalid@profile.navigation.current'
    );
    expect(failureKeys(getPrimaryNavigationState('/writing//all'))).toContain(
      'navigation.current.invalid@profile.navigation.current'
    );
  });

  // NFR5.21 (review R-02): the remaining unnormalisable path classes. Each is
  // rejected with the coded diagnostic, never guessed into a marker.
  test.each([
    ['a NUL control character', '/writing\u0000'],
    ['a tab', '/writing\tall'],
    ['a space', '/writing all'],
    ['a DEL control character', '/writing/all\u007f'],
  ])('fails closed for a path with %s', (_label, pathname) => {
    expect(failureKeys(getPrimaryNavigationState(pathname))).toEqual([
      'navigation.current.invalid@profile.navigation.current',
    ]);
    expect(resolveNavigationMarker(pathname)).toBeNull();
  });

  test.each([['/writing%zz'], ['/writing/all%E'], ['/writing%']])(
    'fails closed for the bad percent escape in %s',
    (pathname) => {
      expect(failureKeys(getPrimaryNavigationState(pathname))).toEqual([
        'navigation.current.invalid@profile.navigation.current',
      ]);
      expect(resolveNavigationMarker(pathname)).toBeNull();
    }
  );

  test.each([['/writing\\all'], ['/writing%5Call']])(
    'fails closed for the backslash in %s',
    (pathname) => {
      expect(failureKeys(getPrimaryNavigationState(pathname))).toEqual([
        'navigation.current.invalid@profile.navigation.current',
      ]);
      expect(resolveNavigationMarker(pathname)).toBeNull();
    }
  );

  // NFR5.21's hostile-model check. The site build reaches the navigation
  // model only through getPrimaryNavigationState (Header.astro), which
  // validates through getNavigationState and throws on a failed result, so a
  // hostile model fed to that same validation entry fails the build with the
  // coded diagnostic.
  test.each([
    ['two items', [...getPrimaryNavigation(), { href: '/tags', label: 'Tags' }]],
    ['Writing pointing at /blog', [{ href: '/blog', label: 'Writing' }]],
    ['Writing pointing at a descendant', [{ href: '/writing/all', label: 'Writing' }]],
    ['a relabelled Writing item', [{ href: '/writing', label: 'Blog' }]],
    ['no items', []],
  ])('rejects a hostile primary model with %s', (_label, hostileModel) => {
    expect(failureKeys(getNavigationState(hostileModel, '/writing'))).toEqual([
      'navigation.model.invalid@profile.navigation.model',
    ]);
  });

  test('validates the build entry through the same model check', () => {
    expect(getPrimaryNavigationState('/writing/all')).toEqual(
      getNavigationState(getPrimaryNavigation(), '/writing/all')
    );
  });

  test('keeps the models and the states frozen', () => {
    const states = expectSuccess(getPrimaryNavigationState('/writing'));

    expect(Object.isFrozen(states)).toBe(true);
    expect(states.every((state) => Object.isFrozen(state))).toBe(true);
  });
});

describe('profile route resources', () => {
  test('uses local profile fonts only for exact profile routes and trailing slash variants', () => {
    expect(expectSuccess(resolveRouteResourcePolicy('/resume'))).toBe(
      PROFILE_ROUTE_RESOURCE_POLICY
    );
    expect(expectSuccess(resolveRouteResourcePolicy('/portfolio/'))).toBe(
      PROFILE_ROUTE_RESOURCE_POLICY
    );
    expect(expectSuccess(resolveRouteResourcePolicy('/resume-old'))).toBe(
      LEGACY_ROUTE_RESOURCE_POLICY
    );
    expect(expectSuccess(resolveRouteResourcePolicy('/tags'))).toBe(LEGACY_ROUTE_RESOURCE_POLICY);
  });

  test('rejects mixed or injected resource policies', () => {
    expect(
      failureKeys(
        validateRouteResourcePolicy('/resume', {
          ...PROFILE_ROUTE_RESOURCE_POLICY,
          headResources: [
            {
              id: 'remote-font',
              rel: 'stylesheet',
              href: 'https://example.test/font.css',
              crossorigin: '',
            },
          ],
        })
      )
    ).toContain('metadata.route.invalid@profile.metadata.resources');
  });
});

function validSource(): ValidatedProfile {
  const result = validateProfile(cloneProfileFixture());
  if (!result.ok) throw new Error('expected valid synthetic profile');
  return result.value;
}

function expectSuccess<Value>(
  result:
    | { readonly ok: true; readonly value: Value }
    | {
        readonly ok: false;
      }
): Value {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected success');
  return result.value;
}

function failureKeys(
  result:
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly issues: readonly {
          readonly code: string;
          readonly path: string;
        }[];
      }
): string[] {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected failure');
  return result.issues.map(({ code, path }) => `${code}@${path}`);
}
