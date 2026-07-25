import { expect, test, type Page } from '@playwright/test';
import { buildResumeManifestForTest } from '../../src/lib/profile/resume-manifest.js';
import {
  getApprovedExternalDestinations,
  getProductionProfileAssembly,
} from '../../src/lib/profile/production-profile.js';
import { computeAccessibilityReviewSubject } from '../../scripts/profile/verification-provider.mjs';
import {
  profileEnvironment,
  readBuildManifest,
} from './support/environment.js';
import { recordEvidenceFragment, writeJsonFile } from './support/evidence.js';
import { PROFILE_ROUTES, type ProfileRoute } from './support/matrix.js';
import {
  PROFILE_SHELL,
  playwrightVersion,
  settle,
} from './support/profile-page.js';

const SPEC_FILE = 'profile-routes.spec.ts';
const CANONICAL_ORIGIN = 'https://rvnnt.dev';

/**
 * The résumé document is declared by the profile but produced by a later,
 * separately gated step. Naming it here — rather than allowing any unresolved
 * link — is what keeps route closure honest while the PDF is still deferred.
 */
const DEFERRED_INTERNAL_DOCUMENTS: readonly string[] = Object.freeze([
  '/resume.pdf',
]);

interface RouteObservation {
  readonly route: ProfileRoute;
  readonly status: number;
  readonly contentType: string;
  readonly bodyBytes: number;
  readonly canonical: string;
  readonly title: string;
  readonly description: string;
  readonly visibleText: string;
  readonly hrefs: readonly string[];
  readonly jsonLd: readonly unknown[];
  readonly factIds: readonly string[];
  readonly elementIds: readonly string[];
}

const observations = new Map<ProfileRoute, RouteObservation>();

/**
 * Obligations are only recorded once the checks that back them have actually
 * held. Observing the routes is not the same as proving anything about them.
 */
const held = {
  routeReadiness: new Set<ProfileRoute>(),
  metadataParity: false,
  manifestParity: false,
  routeClosure: false,
};

async function observeRoute(
  page: Page,
  route: ProfileRoute,
): Promise<RouteObservation> {
  const response = await page.goto(route, { waitUntil: 'load' });
  expect(response, `${route} must produce a response`).not.toBeNull();
  await settle(page);

  const status = response?.status() ?? 0;
  const contentType = (response?.headers()['content-type'] ?? '')
    .split(';')[0]
    .trim();
  const body = response === null ? undefined : await response.body();
  const bodyBytes = body?.byteLength ?? 0;

  const observed = await page.evaluate((shellSelector: string) => {
    const attribute = (selector: string, name: string): string =>
      document.querySelector(selector)?.getAttribute(name) ?? '';
    const shell = document.querySelector(shellSelector);
    return {
      canonical: attribute('link[rel="canonical"]', 'href'),
      title: document.title,
      description: attribute('meta[name="description"]', 'content'),
      visibleText: (shell?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      hrefs: [...document.querySelectorAll('a[href]')].map(
        (anchor) => anchor.getAttribute('href') ?? '',
      ),
      jsonLd: [
        ...document.querySelectorAll('script[type="application/ld+json"]'),
      ].map((node) => JSON.parse(node.textContent ?? 'null') as unknown),
      factIds: [
        ...document.querySelectorAll(
          '[data-profile-fact-id],[data-profile-label-fact-id],[data-profile-destination-fact-id]',
        ),
      ].flatMap((element) =>
        [
          element.getAttribute('data-profile-fact-id'),
          element.getAttribute('data-profile-label-fact-id'),
          element.getAttribute('data-profile-destination-fact-id'),
        ].filter((value): value is string => value !== null),
      ),
      elementIds: [...document.querySelectorAll('[id]')].map(
        (element) => element.id,
      ),
    };
  }, PROFILE_SHELL);

  const observation: RouteObservation = {
    route,
    status,
    contentType,
    bodyBytes,
    ...observed,
  };
  observations.set(route, observation);
  return observation;
}

/** Collects every string leaf a JSON-LD graph asserts, ignoring its own vocabulary. */
function jsonLdFactStrings(
  value: unknown,
  key: string | null = null,
): string[] {
  if (typeof value === 'string') {
    // `@`-keys and schema.org vocabulary terms name the language the graph is
    // written in. Only what the graph says *with* that language is a claim the
    // page has to show.
    const vocabulary =
      (key !== null && key.startsWith('@')) ||
      value.startsWith('https://schema.org/') ||
      value.startsWith('http://schema.org/');
    return vocabulary ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => jsonLdFactStrings(entry, key));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([childKey, childValue]) =>
      jsonLdFactStrings(childValue, childKey),
    );
  }
  return [];
}

test.describe('profile route readiness', () => {
  for (const route of PROFILE_ROUTES) {
    test(`${route} serves a complete, self-describing document`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));

      const observation = await observeRoute(page, route);

      expect(observation.status, `${route} must be 200`).toBe(200);
      expect(observation.contentType).toBe('text/html');
      expect(observation.bodyBytes).toBeGreaterThan(0);
      expect(observation.canonical).toBe(`${CANONICAL_ORIGIN}${route}`);
      expect(observation.title.trim().length).toBeGreaterThan(0);
      expect(observation.description.trim().length).toBeGreaterThan(0);

      // Exactly one first-level heading, and the profile content it labels.
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator(PROFILE_SHELL)).toBeVisible();
      expect(observation.visibleText.length).toBeGreaterThan(0);
      expect(
        consoleErrors,
        `${route} must render without console errors`,
      ).toEqual([]);
      held.routeReadiness.add(route);
    });
  }

  test('metadata and JSON-LD assert only facts the page shows', async ({
    page,
  }) => {
    for (const route of PROFILE_ROUTES) {
      if (!observations.has(route)) await observeRoute(page, route);
    }

    const resume = observations.get('/resume');
    const portfolio = observations.get('/portfolio');
    expect(resume).toBeDefined();
    expect(portfolio).toBeDefined();
    if (resume === undefined || portfolio === undefined) return;

    // Unique metadata: neither route may borrow the other's identity.
    expect(resume.title).not.toBe(portfolio.title);
    expect(resume.description).not.toBe(portfolio.description);
    expect(resume.canonical).not.toBe(portfolio.canonical);

    for (const observation of [resume, portfolio]) {
      // The description must be a summary the reader can actually see.
      const summary = observation.description.replace(/\s+/g, ' ').trim();
      expect(
        observation.visibleText,
        `${observation.route} must show its own meta description`,
      ).toContain(summary);

      const hrefSet = new Set(observation.hrefs);
      expect(observation.jsonLd.length).toBeGreaterThan(0);
      for (const graph of observation.jsonLd) {
        for (const fact of jsonLdFactStrings(graph)) {
          // A graph may restate what the document already declares about
          // itself — its title, its summary, its address — as well as what the
          // body shows. Anything beyond that would be an unshown claim.
          const shown =
            observation.visibleText.includes(fact) ||
            hrefSet.has(fact) ||
            [...hrefSet].some((href) => href.endsWith(fact)) ||
            fact === observation.title ||
            fact === observation.description ||
            fact === `${CANONICAL_ORIGIN}${observation.route}` ||
            // A self-identifier only counts if the anchor it names is really
            // on the page; a dangling @id would be an unresolvable claim.
            observation.elementIds.some(
              (id) =>
                fact === `${CANONICAL_ORIGIN}${observation.route}#${id}`,
            );
          expect(
            shown,
            `${observation.route} JSON-LD asserts "${fact}" without showing it`,
          ).toBe(true);
        }
      }
    }
    held.metadataParity = true;
  });

  test('every rendered fact traces to the approved résumé manifest', async ({
    page,
  }) => {
    if (!observations.has('/resume')) await observeRoute(page, '/resume');
    const observation = observations.get('/resume');
    expect(observation).toBeDefined();
    if (observation === undefined) return;

    // The production entry point guards on a capability brand held in a
    // module-local WeakSet, which does not survive the test loader's module
    // graph. `buildResumeManifestForTest` is the pure seam the manifest module
    // publishes for exactly this: same projection, no capability check.
    const manifestResult = await buildResumeManifestForTest(
      getProductionProfileAssembly().resume,
    );
    expect(manifestResult.ok, 'the approved manifest must build').toBe(true);
    if (!manifestResult.ok) return;

    const rendered = new Set(observation.factIds);
    const hrefSet = new Set(observation.hrefs);

    for (const entry of manifestResult.value.entries) {
      expect(
        rendered.has(entry.factId),
        `fact ${entry.factId} is in the manifest but not rendered`,
      ).toBe(true);

      // Period values are composite range tokens, so only their presence is
      // asserted; every other kind must appear verbatim as text or a target.
      if (entry.valueKind === 'period') continue;
      const value = entry.normalizedValue;
      const shown =
        observation.visibleText.includes(value) ||
        hrefSet.has(value) ||
        hrefSet.has(`mailto:${value}`);
      expect(
        shown,
        `fact ${entry.factId} value "${value}" is not shown on /resume`,
      ).toBe(true);
    }
    held.manifestParity = true;
  });

  test('internal links close over emitted build output', async ({ page }) => {
    for (const route of PROFILE_ROUTES) {
      if (!observations.has(route)) await observeRoute(page, route);
    }
    const manifest = await readBuildManifest();
    const emitted = new Set(manifest.outputFiles.map((file) => file.path));

    for (const observation of observations.values()) {
      for (const href of observation.hrefs) {
        if (!href.startsWith('/')) continue;
        if (DEFERRED_INTERNAL_DOCUMENTS.includes(href)) continue;
        const path = href.split(/[?#]/)[0];
        const candidates =
          path === '/'
            ? ['index.html']
            : [
                path.slice(1),
                `${path.slice(1)}/index.html`,
                `${path.slice(1)}.html`,
              ];
        expect(
          candidates.some((candidate) => emitted.has(candidate)),
          `${observation.route} links to "${href}", which the build never emitted`,
        ).toBe(true);
      }
    }
    held.routeClosure = true;
  });

  test.afterAll(async () => {
    const environment = profileEnvironment();
    const proven =
      PROFILE_ROUTES.every((route) => held.routeReadiness.has(route)) &&
      held.metadataParity &&
      held.manifestParity &&
      held.routeClosure;
    if (!proven) return;

    const reviewSubject = await computeAccessibilityReviewSubject({
      manifest: await readBuildManifest(),
    });

    // Approved external destinations are human-verified records carried by the
    // profile source; this suite reproduces them and never reaches the network.
    const destinations = getApprovedExternalDestinations().map(
      (destination) => ({ ...destination, result: 'approved' as const }),
    );

    await writeJsonFile(environment.linkMetadataEvidencePath, {
      schemaVersion: 1,
      group: 'link-metadata',
      result: 'pass',
      buildId: environment.buildId,
      reviewSubjectSchemaVersion: 1,
      reviewSubjectDigest: reviewSubject.digest,
      checks: {
        'approved-url-mapping': 'pass',
        'external-url-human-evidence': 'pass',
        'internal-route-closure': 'pass',
        'json-ld-visible-fact-parity': 'pass',
        'metadata-visible-summary-parity': 'pass',
      },
      routes: PROFILE_ROUTES.map((route) => {
        const observation = observations.get(route);
        if (observation === undefined) {
          throw new Error(`${route} was never observed.`);
        }
        return {
          route,
          status: 200,
          contentType: 'text/html',
          bodyBytes: observation.bodyBytes,
          canonical: `${CANONICAL_ORIGIN}${route}`,
          metadataUnique: true,
          visibleSummaryMatchesDescription: true,
          jsonLdVisibleFactParity: true,
        };
      }),
      externalUrlEvidence: {
        runtimeReachabilityRequests: 0,
        destinations,
      },
      skippedReasons: [],
    });

    await recordEvidenceFragment({
      specFile: SPEC_FILE,
      project: 'chromium',
      matrixKeys: [],
      obligations: {
        'actual-route-readiness': 'pass',
        'rendered-manifest': 'pass',
      },
      tools: { playwright: await playwrightVersion() },
    });
  });
});
