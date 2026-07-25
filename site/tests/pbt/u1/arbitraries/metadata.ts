import * as fc from 'fast-check';

import type {
  JsonLdDocument,
  JsonLdSchemaType,
  JsonObject,
  JsonValue,
  MetadataProjectionSource,
  ProfileRoute,
  SiteIdentity,
} from '../../../../src/lib/profile/metadata.js';
import type {
  HomepageProfile,
  PortfolioProfile,
  ResumeProfile,
} from '../../../../src/lib/profile/types.js';
import {
  unicodeTextArbitrary,
  validProfileProjectionsArbitrary,
} from './profile.js';

export interface MetadataProjectionCase {
  readonly site: SiteIdentity;
  readonly route: ProfileRoute;
  readonly source: MetadataProjectionSource;
  readonly resume: ResumeProfile;
  readonly portfolio: PortfolioProfile;
  readonly homepage: HomepageProfile;
}

export interface NavigationPathCase {
  readonly pathname: string;
  readonly primaryCurrentHref: string | null;
  readonly localCurrentHref: string | null;
}

const schemaTypeArbitrary = fc.constantFrom<JsonLdSchemaType>(
  'ProfilePage',
  'Person',
  'CollectionPage',
  'ItemList',
);

const adversarialScriptTextArbitrary = fc
  .tuple(
    unicodeTextArbitrary,
    fc.constantFrom(
      '</script><script>unsafe()</script>',
      '<태그>&인용',
      '"quoted" / slash-like',
      'line\u2028separator\u2029paragraph',
      'Cafe\u0301와 한글',
    ),
  )
  .map(([prefix, boundary]) => `${prefix} ${boundary}`);

const jsonLeafArbitrary: fc.Arbitrary<JsonValue> = fc.oneof(
  fc.constant(null),
  fc.boolean(),
  fc.integer({ min: -10_000, max: 10_000 }),
  adversarialScriptTextArbitrary,
);

const jsonKeyArbitrary = fc.constantFrom(
  'label',
  '설명',
  'quoted',
  'items',
  'nested',
  'value',
);

const shallowJsonObjectArbitrary: fc.Arbitrary<JsonObject> = fc
  .dictionary(jsonKeyArbitrary, jsonLeafArbitrary, { maxKeys: 5 })
  .map((value) => Object.freeze(value) as JsonObject);

const nestedJsonValueArbitrary: fc.Arbitrary<JsonValue> = fc.oneof(
  jsonLeafArbitrary,
  fc
    .array(jsonLeafArbitrary, { maxLength: 5 })
    .map((value) => Object.freeze(value)),
  shallowJsonObjectArbitrary,
);

export const typedJsonLdDocumentArbitrary: fc.Arbitrary<JsonLdDocument> =
  fc
    .tuple(
      schemaTypeArbitrary,
      adversarialScriptTextArbitrary,
      fc.array(nestedJsonValueArbitrary, { maxLength: 4 }),
      shallowJsonObjectArbitrary,
    )
    .map(([schemaType, boundary, data, nested]) =>
      Object.freeze({
        schemaType,
        payload: Object.freeze({
          '@context': 'https://schema.org',
          '@type': schemaType,
          boundary,
          data: Object.freeze(data),
          nested,
        }),
      }) as unknown as JsonLdDocument,
    );

export const jsonLdDocumentCollectionArbitrary: fc.Arbitrary<
  readonly JsonLdDocument[]
> = fc
  .array(typedJsonLdDocumentArbitrary, { maxLength: 5 })
  .map((documents) => Object.freeze(documents));

export const siteIdentityArbitrary: fc.Arbitrary<SiteIdentity> = fc
  .tuple(
    fc.constantFrom('profile', 'static', 'unicode', 'resume', 'portfolio'),
    fc.integer({ min: 1, max: 9_999 }),
  )
  .map(([prefix, suffix]) =>
    Object.freeze({
      origin: `https://${prefix}-${suffix}.example.test`,
    }),
  );

export const metadataProjectionCaseArbitrary: fc.Arbitrary<
  MetadataProjectionCase
> = fc
  .tuple(
    validProfileProjectionsArbitrary,
    siteIdentityArbitrary,
    fc.constantFrom<ProfileRoute>('resume', 'portfolio'),
  )
  .map(([projections, site, route]) => {
    const source: MetadataProjectionSource =
      route === 'resume'
        ? Object.freeze({
            route,
            profile: projections.resume,
          })
        : Object.freeze({
            route,
            name: projections.homepage.name,
            profile: projections.portfolio,
          });

    return Object.freeze({
      site,
      route,
      source,
      resume: projections.resume,
      portfolio: projections.portfolio,
      homepage: projections.homepage,
    });
  });

const safeSegmentArbitrary = fc
  .array(
    fc.constantFrom('가', '나', 'é', 'x', 'y', '9', '-'),
    { minLength: 1, maxLength: 12 },
  )
  .map((characters) => characters.join(''));

const knownRouteArbitrary = fc.constantFrom(
  '/tags',
  '/graph',
  '/resume',
  '/portfolio',
);

export const navigationPathCaseArbitrary: fc.Arbitrary<NavigationPathCase> =
  fc.oneof(
    knownRouteArbitrary.map((pathname) =>
      navigationCase(
        pathname,
        pathname,
        pathname === '/resume' || pathname === '/portfolio'
          ? pathname
          : null,
      ),
    ),
    fc
      .tuple(
        fc.constantFrom('/resume', '/portfolio'),
        safeSegmentArbitrary,
      )
      .map(([root, segment]) =>
        navigationCase(`${root}/${segment}`, root, root),
      ),
    knownRouteArbitrary.map((root) =>
      navigationCase(
        `${root}/?view=한글#section`,
        root,
        root === '/resume' || root === '/portfolio' ? root : null,
      ),
    ),
    fc
      .tuple(
        fc.constantFrom('/resume', '/portfolio', '/tags', '/graph'),
        fc.constantFrom('x', '-old', '2'),
      )
      .map(([root, suffix]) =>
        navigationCase(`${root}${suffix}`, null, null),
      ),
    safeSegmentArbitrary.map((segment) =>
      navigationCase(`/unknown-${segment}`, null, null),
    ),
    fc.constant(navigationCase('/', null, '/')),
  );

function navigationCase(
  pathname: string,
  primaryCurrentHref: string | null,
  localCurrentHref: string | null,
): NavigationPathCase {
  return Object.freeze({
    pathname,
    primaryCurrentHref,
    localCurrentHref,
  });
}
