import { describe, expect, test } from 'vitest';
import {
  LEGACY_ROUTE_RESOURCE_POLICY,
  PROFILE_ROUTE_RESOURCE_POLICY,
  resolveRouteResourcePolicy,
  validateRouteResourcePolicy,
} from '../../src/lib/layout/profile-resources.js';
import {
  buildApprovedPortfolioMetadata,
  buildPortfolioMetadataForTest,
  validateMetadataConsistency,
} from '../../src/lib/profile/metadata.js';
import {
  getPortfolioRole,
  selectPortfolioForRole,
} from '../../src/lib/profile/portfolio-roles.js';
import { getProductionProfileAssembly } from '../../src/lib/profile/production-profile.js';
import type {
  FactApprovedProfile,
  ValidationResult,
} from '../../src/lib/profile/types.js';

const site = Object.freeze({ origin: 'https://example.test' });

describe('role-aware portfolio metadata', () => {
  test('preserves the default portfolio metadata and approved summary', () => {
    const assembly = getProductionProfileAssembly();
    const metadata = success(buildApprovedPortfolioMetadata(site, assembly.source));

    expect(metadata).toEqual(success(buildPortfolioMetadataForTest(
      site,
      assembly.homepage.name,
      assembly.portfolio,
    )));
    expect(metadata).toMatchObject({
      route: 'portfolio',
      pathname: '/portfolio',
      title: `${assembly.homepage.name.value} — Portfolio`,
      description: assembly.portfolio.portfolioSummary.value,
      canonical: 'https://example.test/portfolio',
    });
    expect(success(validateMetadataConsistency(
      site, assembly.source, 'portfolio', metadata,
    ))).toEqual(metadata);
  });

  test('uses the product role in canonical, social metadata and every JSON-LD identity', () => {
    const assembly = getProductionProfileAssembly();
    const role = getPortfolioRole('product-engineer');
    const profile = selectPortfolioForRole(assembly.portfolio, role.id);
    const metadata = success(buildApprovedPortfolioMetadata(site, assembly.source, role.id));
    const canonical = 'https://example.test/portfolio/product-engineer';
    const title = `${assembly.homepage.name.value} — Product Engineer Portfolio`;

    expect(metadata).toMatchObject({
      route: 'portfolio',
      pathname: '/portfolio/product-engineer',
      title,
      description: role.introduction,
      canonical,
      openGraph: { title, description: role.introduction, url: canonical },
      twitter: { title, description: role.introduction, url: canonical },
    });
    expect(metadata.jsonLd[0]).toEqual({
      schemaType: 'CollectionPage',
      payload: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection-page`,
        url: canonical,
        name: title,
        description: role.introduction,
        mainEntity: { '@id': `${canonical}#projects` },
      },
    });
    expect(metadata.jsonLd[1]).toEqual({
      schemaType: 'ItemList',
      payload: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${canonical}#projects`,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: 1,
        itemListElement: profile.projects.map((project, index) => {
          const url = `${canonical}#project-${project.id}`;
          return {
            '@type': 'ListItem',
            position: index + 1,
            url,
            item: {
              '@type': 'CreativeWork',
              '@id': url,
              url,
              name: project.title.value,
              description: project.outcomeSummary.value,
              citation: project.evidence.map(({ destination }) =>
                destination.value.tag === 'external'
                  ? destination.value.value
                  : `${site.origin}${destination.value.value}`,
              ),
            },
          };
        }),
      },
    });
    expect(profile.projects.map(({ id }) => id)).toEqual(['docsuri']);
    expect(success(validateMetadataConsistency(
      site, assembly.source, 'portfolio', metadata,
    ))).toEqual(metadata);
    expect(Object.isFrozen(metadata.jsonLd[1]?.payload)).toBe(true);
  });

  test('rejects mismatched role routes, descriptions and project positions', () => {
    const { source } = getProductionProfileAssembly();
    const metadata = success(buildApprovedPortfolioMetadata(site, source, 'product-engineer'));
    const misplaced = structuredClone(metadata) as unknown as {
      jsonLd: Array<{ payload: { itemListElement: Array<{ position: number }> } }>;
    };
    misplaced.jsonLd[1]!.payload.itemListElement[0]!.position = 2;

    for (const candidate of [
      { ...metadata, pathname: '/portfolio/unknown' },
      { ...metadata, pathname: '/portfolio' },
      { ...metadata, canonical: `${site.origin}/portfolio` },
      { ...metadata, description: 'A stronger claim outside the selected role.' },
      misplaced,
    ]) {
      expect(validateMetadataConsistency(site, source, 'portfolio', candidate).ok).toBe(false);
    }
  });

  test('keeps the fact-approval capability gate for each role', () => {
    const { source } = getProductionProfileAssembly();
    const forged = structuredClone(source) as FactApprovedProfile;
    for (const roleId of ['data-engineer-ai', 'product-engineer'] as const) {
      const metadata = success(buildApprovedPortfolioMetadata(site, source, roleId));
      expect(buildApprovedPortfolioMetadata(site, forged, roleId).ok).toBe(false);
      expect(validateMetadataConsistency(site, forged, 'portfolio', metadata).ok).toBe(false);
    }
  });

  test('does not invoke a candidate pathname accessor when resolving the role', () => {
    const { source } = getProductionProfileAssembly();
    const metadata = success(buildApprovedPortfolioMetadata(site, source, 'product-engineer'));
    let reads = 0;
    const candidate = {
      ...metadata,
      get pathname() {
        reads += 1;
        return '/portfolio/product-engineer';
      },
    };

    expect(validateMetadataConsistency(site, source, 'portfolio', candidate).ok).toBe(false);
    expect(reads).toBe(0);
  });
});

describe('portfolio role resources', () => {
  test.each(['/portfolio/product-engineer', '/portfolio/product-engineer/'])(
    'uses only local profile fonts for %s',
    (pathname) => {
      expect(success(resolveRouteResourcePolicy(pathname))).toBe(PROFILE_ROUTE_RESOURCE_POLICY);
      expect(success(validateRouteResourcePolicy(pathname, PROFILE_ROUTE_RESOURCE_POLICY)))
        .toBe(PROFILE_ROUTE_RESOURCE_POLICY);
      expect(validateRouteResourcePolicy(pathname, LEGACY_ROUTE_RESOURCE_POLICY).ok).toBe(false);
    },
  );

  test.each(['/portfolio/example', '/portfolio/product-engineer/case-study', '/portfolio/product-engineer-old'])(
    'retains legacy resources for unregistered path %s',
    (pathname) => {
      expect(success(resolveRouteResourcePolicy(pathname))).toBe(LEGACY_ROUTE_RESOURCE_POLICY);
    },
  );
});

function success<Value>(result: ValidationResult<Value>): Value {
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}
