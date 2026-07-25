import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import {
  extractJsonLdDocuments,
  serializeJsonLdDocuments,
  verifyJsonLdRoundTrip,
} from '../../../src/lib/layout/json-ld.js';
import {
  getNavigationState,
  getPrimaryNavigation,
  getPrimaryNavigationState,
  getProfileLocalNavigation,
  getProfileLocalNavigationState,
} from '../../../src/lib/navigation.js';
import {
  buildPortfolioMetadataForTest,
  buildResumeMetadataForTest,
  validateMetadataConsistencyForTest,
} from '../../../src/lib/profile/metadata.js';
import type {
  JsonLdDocument,
  JsonObject,
  MetadataProjectionSource,
  ProfilePageMetadata,
  SiteIdentity,
} from '../../../src/lib/profile/metadata.js';
import {
  jsonLdDocumentCollectionArbitrary,
  metadataProjectionCaseArbitrary,
  navigationPathCaseArbitrary,
} from './arbitraries/metadata.js';
import type {
  MetadataProjectionCase,
} from './arbitraries/metadata.js';
import {
  METADATA_MUTATION_KINDS,
  mutateMetadata,
} from './mutations.js';

const metadataMutationKindArbitrary = fc.constantFrom(
  ...METADATA_MUTATION_KINDS,
);

test.prop([metadataProjectionCaseArbitrary])(
  'U1-P08 builds route-exact metadata from visible approved projections',
  (projectionCase) => {
    const result = buildMetadata(
      projectionCase.site,
      projectionCase.source,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const metadata = result.value;
    const expectedPathname =
      projectionCase.route === 'resume' ? '/resume' : '/portfolio';
    const expectedSummary =
      projectionCase.route === 'resume'
        ? projectionCase.resume.resumeSummary.value
        : projectionCase.portfolio.portfolioSummary.value;
    const expectedTitle =
      `${projectionCase.homepage.name.value} — ${
        projectionCase.route === 'resume' ? 'Résumé' : 'Portfolio'
      }`;

    expect(metadata.pathname).toBe(expectedPathname);
    expect(metadata.title).toBe(expectedTitle);
    expect(metadata.description).toBe(expectedSummary);
    expect(metadata.canonical).toBe(
      `${projectionCase.site.origin}${expectedPathname}`,
    );
    expect(metadata.openGraph).toEqual({
      title: expectedTitle,
      description: expectedSummary,
      url: metadata.canonical,
    });
    expect(metadata.twitter).toEqual(metadata.openGraph);

    assertStructuredClaims(metadata, projectionCase);
  },
);

test.prop([
  metadataProjectionCaseArbitrary,
  metadataMutationKindArbitrary,
])(
  'U1-P08 rejects each controlled metadata mutation without partial acceptance',
  (projectionCase, mutationKind) => {
    const built = buildMetadata(
      projectionCase.site,
      projectionCase.source,
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const metadataSnapshot = structuredClone(built.value);
    const mutation = mutateMetadata(built.value, mutationKind);
    const candidateSnapshot = structuredClone(mutation.candidate);
    const result = validateMetadataConsistencyForTest(
      projectionCase.site,
      projectionCase.source,
      mutation.candidate,
    );

    expect(built.value).toEqual(metadataSnapshot);
    expect(mutation.candidate).toEqual(candidateSnapshot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.map(({ code, path }) => ({ code, path })),
    ).toContainEqual(
      {
        code: mutation.expectedCode,
        path: mutation.expectedPath,
      },
    );
    expect('value' in result).toBe(false);
  },
);

test.prop([jsonLdDocumentCollectionArbitrary])(
  'U1-P09 safely round-trips every typed JSON-LD document in order',
  (documents) => {
    const serialized = serializeJsonLdDocuments(documents);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;

    if (documents.length === 0) {
      expect(serialized.value).toBeNull();
      return;
    }

    const host = serialized.value;
    expect(host).not.toBeNull();
    if (host === null) return;
    expect(host).toHaveLength(documents.length);
    for (const script of host) {
      expect(script.type).toBe('application/ld+json');
      expect(script.payload).not.toMatch(/[<>&\u2028\u2029]/u);
    }

    const extracted = extractJsonLdDocuments(host);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(unbrandDocuments(extracted.value)).toEqual(
      unbrandDocuments(documents),
    );

    const verified = verifyJsonLdRoundTrip(documents, host);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(unbrandDocuments(verified.value)).toEqual(
        unbrandDocuments(documents),
      );
    }
  },
);

test.prop([
  fc.constantFrom<readonly JsonLdDocument[] | null | undefined>(
    null,
    undefined,
    Object.freeze([]),
  ),
])(
  'U1-P09 omits the structured-data host for absent or empty documents',
  (documents) => {
    const result = serializeJsonLdDocuments(documents);
    expect(result).toEqual({ ok: true, value: null });
  },
);

test.prop([navigationPathCaseArbitrary])(
  'U1-P10 preserves fixed navigation order and exact-segment current state',
  (pathCase) => {
    const primaryModel = getPrimaryNavigation();
    const localModel = getProfileLocalNavigation();
    const primarySnapshot = structuredClone(primaryModel);
    const localSnapshot = structuredClone(localModel);

    const primary = getPrimaryNavigationState(pathCase.pathname);
    const primaryFromModel = getNavigationState(
      primaryModel,
      pathCase.pathname,
    );
    const local = getProfileLocalNavigationState(pathCase.pathname);
    const localFromModel = getNavigationState(
      localModel,
      pathCase.pathname,
    );

    expect(primary.ok).toBe(true);
    expect(primaryFromModel.ok).toBe(true);
    expect(local.ok).toBe(true);
    expect(localFromModel.ok).toBe(true);
    if (
      !primary.ok ||
      !primaryFromModel.ok ||
      !local.ok ||
      !localFromModel.ok
    ) {
      return;
    }

    expect(primary.value).toEqual(primaryFromModel.value);
    expect(local.value).toEqual(localFromModel.value);
    expect(primary.value.map(({ label, href }) => ({ label, href }))).toEqual(
      [
        { label: 'Tags', href: '/tags' },
        { label: 'Graph', href: '/graph' },
        { label: 'Résumé', href: '/resume' },
        { label: 'Portfolio', href: '/portfolio' },
      ],
    );
    expect(local.value.map(({ label, href }) => ({ label, href }))).toEqual(
      [
        { label: '홈', href: '/' },
        { label: 'Résumé', href: '/resume' },
        { label: 'Portfolio', href: '/portfolio' },
      ],
    );

    expect(currentHref(primary.value)).toBe(
      pathCase.primaryCurrentHref,
    );
    expect(currentHref(local.value)).toBe(pathCase.localCurrentHref);
    expect(primary.value.filter((item) => item.current).length).toBeLessThanOrEqual(1);
    expect(local.value.filter((item) => item.current).length).toBeLessThanOrEqual(1);
    expect(primaryModel).toEqual(primarySnapshot);
    expect(localModel).toEqual(localSnapshot);
  },
);

function buildMetadata(
  site: SiteIdentity,
  source: MetadataProjectionSource,
) {
  return source.route === 'resume'
    ? buildResumeMetadataForTest(site, source.profile)
    : buildPortfolioMetadataForTest(
        site,
        source.name,
        source.profile,
      );
}

function assertStructuredClaims(
  metadata: ProfilePageMetadata,
  projectionCase: MetadataProjectionCase,
): void {
  if (metadata.route === 'resume') {
    expect(metadata.jsonLd.map((document) => document.schemaType)).toEqual([
      'ProfilePage',
      'Person',
    ]);
    const page = metadata.jsonLd[0].payload;
    const person = metadata.jsonLd[1].payload;
    expect(page.description).toBe(
      projectionCase.resume.resumeSummary.value,
    );
    expect(person.name).toBe(projectionCase.resume.identity.name.value);
    expect(person.email).toBe(
      projectionCase.resume.contactActions.email.value,
    );
    expect(person.sameAs).toEqual([
      projectionCase.resume.contactActions.github.value,
    ]);
    return;
  }

  expect(metadata.jsonLd.map((document) => document.schemaType)).toEqual([
    'CollectionPage',
    'ItemList',
  ]);
  const itemList = metadata.jsonLd[1].payload;
  expect(itemList.numberOfItems).toBe(
    projectionCase.portfolio.projects.length,
  );
  const elements = itemList.itemListElement as readonly JsonObject[];
  expect(elements).toHaveLength(projectionCase.portfolio.projects.length);
  elements.forEach((element, index) => {
    const project = projectionCase.portfolio.projects[index];
    const item = element.item as JsonObject;
    expect(element.position).toBe(index + 1);
    expect(item.name).toBe(project.title.value);
    expect(item.description).toBe(project.outcomeSummary.value);
  });
}

function currentHref(
  states: readonly Readonly<{ href: string; current: boolean }>[],
): string | null {
  return states.find((state) => state.current)?.href ?? null;
}

function unbrandDocuments(
  documents: readonly JsonLdDocument[],
): readonly Readonly<{
  schemaType: JsonLdDocument['schemaType'];
  payload: JsonObject;
}>[] {
  return documents.map((document) => ({
    schemaType: document.schemaType,
    payload: document.payload,
  }));
}
