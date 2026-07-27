import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  composeVerificationEvidence,
  computeAccessibilityReviewSubject,
  verificationEvidenceSchema,
  verificationProviderTesting,
  type AccessibilityReviewSubject,
  type ComposeVerificationEvidenceInput,
} from '../../scripts/profile/verification-provider.mjs';

const fixtureRoots: string[] = [];
type MutableComposeVerificationEvidenceInput = {
  -readonly [Key in keyof ComposeVerificationEvidenceInput]: any;
};

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe('LC-U1-18 fail-closed verification evidence', () => {
  test('accepts only a complete current browser/link/resource/manual aggregate', () => {
    const fixture = createCompleteEvidenceFixture();

    const result = composeVerificationEvidence(fixture);

    expect(result.result).toBe('pass');
    expect(result.accessibilityReviewSubject.digest).toBe(
      fixture.accessibilityReviewSubject.digest,
    );
    expect(result.groups.browser.completedMatrix).toEqual(
      verificationEvidenceSchema.browserMatrix,
    );
  });

  test('rejects a claimed browser pass that omits specs, matrix, tools, and no-skip counts', () => {
    const fixture = createCompleteEvidenceFixture();
    fixture.browserEvidence = {
      schemaVersion: 1,
      group: 'browser',
      result: 'pass',
      buildId: fixture.buildIdentity.id,
      reviewSubjectDigest: fixture.accessibilityReviewSubject.digest,
    };

    expect(() => composeVerificationEvidence(fixture)).toThrow(
      expect.objectContaining({ code: 'BROWSER_EVIDENCE_INCOMPLETE' }),
    );
  });

  test('rejects a link group bound to a different review subject', () => {
    const fixture = createCompleteEvidenceFixture();
    fixture.linkMetadataEvidence.reviewSubjectDigest = 'f'.repeat(64);

    expect(() => composeVerificationEvidence(fixture)).toThrow(
      expect.objectContaining({
        code: 'LINK_METADATA_EVIDENCE_INCOMPLETE',
      }),
    );
  });

  test('rejects a claimed asset-budget pass without provenance or gzip evidence', () => {
    const fixture = createCompleteEvidenceFixture();
    fixture.assetBudgetEvidence = {
      schemaVersion: 1,
      rule: 'PERF-01/LC-U1-04/LC-U1-05',
      result: 'pass',
      buildIdentity: fixture.buildIdentity,
      routes: [],
      javaScript: {
        profileOwnedHydratedComponents: 0,
        profileOwnedNewClientChunks: 0,
      },
    };

    expect(() => composeVerificationEvidence(fixture)).toThrow(
      expect.objectContaining({
        code: 'ASSET_BUDGET_EVIDENCE_INCOMPLETE',
      }),
    );
  });

  test('rejects a zero-count request claim without actual route and asset observations', () => {
    const fixture = createCompleteEvidenceFixture();
    fixture.requestLedgerEvidence.attempted = [];
    fixture.requestLedgerEvidence.successful = [];
    fixture.requestLedgerEvidence.staticAssetEvidence.observedAssets = [];

    expect(() => composeVerificationEvidence(fixture)).toThrow(
      expect.objectContaining({
        code: 'REQUEST_LEDGER_EVIDENCE_INCOMPLETE',
      }),
    );
  });

  test('rejects an arbitrary manual checklist in place of the required state matrix', () => {
    const fixture = createCompleteEvidenceFixture();
    fixture.manualWebAccessibilityRecord.states = [
      {
        route: '/resume',
        engine: 'chromium',
        viewport: '320x800',
        theme: 'light',
        details: 'closed',
        checks: { anything: 'pass' },
      },
    ];

    expect(() => composeVerificationEvidence(fixture)).toThrow(
      expect.objectContaining({
        code: 'MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE',
      }),
    );
  });

  test('rejects an arbitrary command and insecure external destination', () => {
    const commandFixture = createCompleteEvidenceFixture();
    commandFixture.command = '';
    expect(() => composeVerificationEvidence(commandFixture)).toThrow(
      expect.objectContaining({ code: 'VERIFICATION_COMMAND_INVALID' }),
    );

    const linkFixture = createCompleteEvidenceFixture();
    linkFixture.linkMetadataEvidence.externalUrlEvidence.destinations[0].url =
      'http://example.com/profile';
    expect(() => composeVerificationEvidence(linkFixture)).toThrow(
      expect.objectContaining({
        code: 'LINK_METADATA_EVIDENCE_INCOMPLETE',
      }),
    );
  });

  test('binds request observations to the exact clean manifest digest and outputs', () => {
    const digestFixture = createCompleteEvidenceFixture();
    digestFixture.requestLedgerEvidence.staticAssetEvidence.manifestSha256 =
      '0'.repeat(64);
    expect(() => composeVerificationEvidence(digestFixture)).toThrow(
      expect.objectContaining({
        code: 'REQUEST_LEDGER_EVIDENCE_INCOMPLETE',
      }),
    );

    const outputFixture = createCompleteEvidenceFixture();
    outputFixture.buildManifest.outputFiles =
      outputFixture.buildManifest.outputFiles.filter(
        ({ path }: { path: string }) => path !== '_astro/profile.woff2',
      );
    expect(() => composeVerificationEvidence(outputFixture)).toThrow(
      expect.objectContaining({
        code: 'VERIFICATION_BUILD_MANIFEST_IDENTITY_MISMATCH',
      }),
    );
  });

  test('recomputes the review subject from fixed source, config, lock, and route assets', async () => {
    const fixture = await createReviewSubjectFixture();
    const first = await computeAccessibilityReviewSubject(fixture);

    // A file inside the subject must move the digest: changing a stylesheet
    // changes what a reviewer sees, so prior reviews have to go stale.
    await writeFile(
      join(fixture.siteRoot, 'src/styles/global.css'),
      ':root { --c-accent: #0f766e; }\n',
    );
    const afterStyleChange = await computeAccessibilityReviewSubject(fixture);

    // A file outside it must not. `playwright.config.ts` configures the
    // automated run; the twelve reviewed states come from
    // REQUIRED_MANUAL_MATRIX, not from the runner. Keeping it in the subject
    // twice invalidated completed reviews for edits that could not change a
    // single rendered pixel.
    await writeFile(
      join(fixture.siteRoot, 'playwright.config.ts'),
      'export default { retries: 0 };\n',
    );
    const afterRunnerChange = await computeAccessibilityReviewSubject(fixture);

    expect(first.digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(afterStyleChange.digest).not.toBe(first.digest);
    expect(afterRunnerChange.digest).toBe(afterStyleChange.digest);
    // The provider must never again be its own review subject.
    expect(verificationEvidenceSchema.reviewSubjectSourceFiles).not.toContain(
      'scripts/profile/verification-provider.mjs',
    );
    expect(first.authoredFiles.map(({ path }) => path)).toContain(
      'package-lock.json',
    );
    expect(first.buildAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/resume',
          kind: 'route-html',
        }),
        expect.objectContaining({
          route: '/portfolio',
          kind: 'route-js',
        }),
      ]),
    );
  });

  test('never reclassifies a mixed or semantic Playwright failure as startup-retryable', () => {
    const classify =
      verificationProviderTesting
        .isEligibleIsolatedBrowserLaunchFailure as (
          input: Record<string, unknown>,
        ) => boolean;
    const launchFailure = {
      stage: 'startup.browser.launch',
      result: 'fail',
      errorCode: 'BROWSER_ENGINE_LAUNCH_FAILED',
    };
    const failedProcess = { exitCode: 1, signal: null };

    expect(
      classify({
        executionPhase: 'playwright-verification',
        processEvidence: failedProcess,
        launchFailure,
      }),
    ).toBe(false);
    expect(
      classify({
        executionPhase: 'browser-preflight',
        processEvidence: failedProcess,
        launchFailure,
      }),
    ).toBe(true);
  });
});

function createCompleteEvidenceFixture(): MutableComposeVerificationEvidenceInput {
  const buildIdentity = {
    id: '',
    manifestSha256: 'a'.repeat(64),
    sourceGraphSha256: '',
    outputSha256: '',
    routes: ['/resume', '/portfolio'],
  };
  const accessibilityReviewSubject = createReviewSubject();
  const stylesheet = {
    path: '_astro/profile.css',
    bytes: 120,
    sha256: 'b'.repeat(64),
  };
  const font = {
    path: '_astro/profile.woff2',
    bytes: 240,
    sha256: 'c'.repeat(64),
  };
  const resumeDocument = {
    path: 'resume/index.html',
    bytes: 500,
    sha256: 'e'.repeat(64),
  };
  const portfolioDocument = {
    path: 'portfolio/index.html',
    bytes: 500,
    sha256: 'f'.repeat(64),
  };
  const buildManifest = {
    buildIdentity: {
      id: '',
      sourceGraphSha256: '',
      outputSha256: '',
      routes: buildIdentity.routes,
    },
    pageGraph: { pages: [] },
    routeOutputs: [
      {
        route: '/resume',
        outputs: [resumeDocument.path],
      },
      {
        route: '/portfolio',
        outputs: [portfolioDocument.path],
      },
    ],
    initialRollupGraphs: {},
    rollupGraphs: {},
    viteManifest: {},
    outputFiles: [
      resumeDocument,
      portfolioDocument,
      stylesheet,
      font,
    ],
  };
  buildIdentity.sourceGraphSha256 = digest(
    JSON.stringify({
      pageGraph: buildManifest.pageGraph,
      routeOutputs: buildManifest.routeOutputs,
      initialRollupGraphs: buildManifest.initialRollupGraphs,
      rollupGraphs: buildManifest.rollupGraphs,
      viteManifest: buildManifest.viteManifest,
    }),
  );
  buildIdentity.outputSha256 = digest(
    JSON.stringify(buildManifest.outputFiles),
  );
  buildIdentity.id = digest(
    JSON.stringify({
      sourceGraphSha256: buildIdentity.sourceGraphSha256,
      outputSha256: buildIdentity.outputSha256,
      builtRoutes: buildIdentity.routes,
    }),
  );
  Object.assign(buildManifest.buildIdentity, {
    id: buildIdentity.id,
    sourceGraphSha256: buildIdentity.sourceGraphSha256,
    outputSha256: buildIdentity.outputSha256,
  });
  const request = (
    id: number,
    url: string,
    resourceType: string,
    logicalRoute: '/resume' | '/portfolio' | null,
    emittedAssetIdentity:
      | typeof stylesheet
      | typeof resumeDocument
      | null,
  ) => ({
    id,
    url,
    resourceType,
    initiator:
      logicalRoute === null
        ? null
        : `http://127.0.0.1:41731${logicalRoute}`,
    logicalRoute,
    sameOrigin: true,
    emittedAssetIdentity,
  });
  const attempted = [
    request(
      1,
      'http://127.0.0.1:41731/resume',
      'document',
      '/resume',
      resumeDocument,
    ),
    request(
      2,
      'http://127.0.0.1:41731/portfolio',
      'document',
      '/portfolio',
      portfolioDocument,
    ),
    request(
      3,
      'http://127.0.0.1:41731/_astro/profile.css',
      'stylesheet',
      '/resume',
      stylesheet,
    ),
    request(
      4,
      'http://127.0.0.1:41731/_astro/profile.woff2',
      'font',
      '/resume',
      font,
    ),
  ];
  const manualStates = verificationEvidenceSchema.manualMatrix.map((key) => {
    const [route, engine, viewport, theme, details] = key.split('|');
    return {
      route,
      engine,
      viewport,
      theme,
      details,
      checks: Object.fromEntries(
        verificationEvidenceSchema.manualChecks.map((check) => [
          check,
          'pass',
        ]),
      ),
    };
  });

  return {
    command: 'test:e2e',
    buildIdentity,
    buildManifest,
    accessibilityReviewSubject,
    browserEvidence: {
      schemaVersion: 1,
      group: 'browser',
      result: 'pass',
      buildId: buildIdentity.id,
      reviewSubjectSchemaVersion: 1,
      reviewSubjectDigest: accessibilityReviewSubject.digest,
      specFiles: [...verificationEvidenceSchema.browserSpecFiles],
      completedMatrix: [...verificationEvidenceSchema.browserMatrix],
      obligations: Object.fromEntries(
        verificationEvidenceSchema.browserObligations.map((obligation) => [
          obligation,
          'pass',
        ]),
      ),
      skippedReasons: [],
      summary: {
        discovered: 6,
        passed: 6,
        failed: 0,
        skipped: 0,
        didNotRun: 0,
      },
      tools: {
        playwright: '1.61.1',
        axe: '4.12.1',
        chromium: 'chromium-123',
        firefox: 'firefox-124',
        webkit: 'webkit-18',
      },
    },
    linkMetadataEvidence: {
      schemaVersion: 1,
      group: 'link-metadata',
      result: 'pass',
      buildId: buildIdentity.id,
      reviewSubjectSchemaVersion: 1,
      reviewSubjectDigest: accessibilityReviewSubject.digest,
      checks: Object.fromEntries(
        verificationEvidenceSchema.linkChecks.map((check) => [check, 'pass']),
      ),
      routes: ['/resume', '/portfolio'].map((route) => ({
        route,
        status: 200,
        contentType: 'text/html',
        bodyBytes: 100,
        canonical: `https://rvnnt.dev${route}`,
        metadataUnique: true,
        visibleSummaryMatchesDescription: true,
        jsonLdVisibleFactParity: true,
      })),
      externalUrlEvidence: {
        runtimeReachabilityRequests: 0,
        destinations: [
          {
            url: 'https://github.com/rvnnt',
            verifier: 'Reviewer',
            checkedAt: '2026-07-25T00:00:00.000Z',
            result: 'approved',
          },
        ],
      },
      skippedReasons: [],
    },
    assetBudgetEvidence: {
      schemaVersion: 1,
      rule: 'PERF-01/LC-U1-04/LC-U1-05',
      buildIdentity,
      result: 'pass',
      routes: ['/resume', '/portfolio'].map((route) => ({
        route,
        component: `src/pages/${route.slice(1)}.astro`,
        document: {
          path: `${route.slice(1)}/index.html`,
          sha256:
            route === '/resume'
              ? resumeDocument.sha256
              : portfolioDocument.sha256,
          rawBytes: 500,
          externalStyles: [stylesheet.path],
          inlineStyles: [],
          inlineScripts: [],
          clientRoots: [],
        },
        styles: [
          {
            depth: 1,
            order: 1,
            kind: 'external',
            path: stylesheet.path,
            sha256: stylesheet.sha256,
            rawBytes: stylesheet.bytes,
            ownership: 'profile',
            profileStyleRoots: ['src/styles/profile/foundation.css'],
            provenanceChunks: ['chunks/profile.mjs'],
          },
        ],
      })),
      css: {
        limitGzipBytes: 24 * 1024,
        totalGzipBytes: 80,
        uniqueAssetCount: 1,
        assets: [
          {
            kind: 'external',
            path: stylesheet.path,
            emittedAssetPaths: [stylesheet.path],
            sha256: stylesheet.sha256,
            rawBytes: stylesheet.bytes,
            gzipBytes: 80,
            routes: ['/resume', '/portfolio'],
            profileStyleRoots: ['src/styles/profile/foundation.css'],
            provenanceChunks: ['chunks/profile.mjs'],
            finalLocations: [],
            sourceRollupAssetPaths: [],
          },
        ],
        gzip: {
          implementation: 'node:zlib.gzipSync',
          options: { level: 9, mtime: 0 },
          node: process.versions.node,
        },
        buildTools: {
          node: process.versions.node,
          astro: '6.1.5',
          vite: '7.3.2',
          gzip: 'node:zlib.gzipSync(level=9,mtime=0)',
        },
      },
      javaScript: {
        profileOwnedHydratedComponents: 0,
        profileOwnedNewClientChunks: 0,
        inheritedClientChunkCount: 0,
        inheritedEntryAllowlist: [
          'node_modules/@astrojs/preact/dist/client.js',
          'src/islands/Search.tsx',
          'src/islands/ThemeToggle.tsx',
        ],
        reachableEntries: [],
        reachableChunks: [],
        unknownReachableEntries: [],
        profileEntries: [],
        profileChunks: [],
      },
    },
    requestLedgerEvidence: {
      schemaVersion: 1,
      rule: 'PERF-02/LC-U1-06',
      supervisedOrigin: 'http://127.0.0.1:41731',
      buildIdentity,
      attempted,
      blocked: [],
      successful: attempted.map((record) => ({ ...record, status: 200 })),
      external: { attempted: 0, blocked: 0, successful: 0 },
      guard: {
        routeRegistration: 'playwright-disposable',
        pendingHandlers: 0,
        inFlightRequests: 0,
        pages: 0,
      },
      interceptionBypassed: [],
      missingEmittedAssetIdentities: [],
      missingProfileRoutes: [],
      staticAssetEvidence: {
        schemaVersion: 1,
        buildId: buildIdentity.id,
        manifestSha256: 'a'.repeat(64),
        observedAssets: [
          resumeDocument,
          portfolioDocument,
          stylesheet,
          font,
        ],
      },
    },
    manualWebAccessibilityRecord: {
      schemaVersion: 1,
      result: 'pass',
      reviewSubjectSchemaVersion: 1,
      reviewSubjectDigest: accessibilityReviewSubject.digest,
      reviewer: 'Reviewer',
      reviewedAt: '2026-07-25T00:00:00.000Z',
      states: manualStates,
      targetSizeExceptions: [],
      skippedReasons: [],
    },
  };
}

function createReviewSubject(): AccessibilityReviewSubject {
  const authoredFiles = [
    ...verificationEvidenceSchema.reviewSubjectSourceFiles,
    ...verificationEvidenceSchema.reviewSubjectSourceDirectories.map(
      (directory) => `${directory}/fixture.ts`,
    ),
  ]
    .sort()
    .map((path) => ({
      path,
      bytes: 10,
      sha256: '1'.repeat(64),
    }));
  const subject = {
    schemaVersion: 1 as const,
    domain: 'rvnnt.accessibility-review-subject.v1' as const,
    algorithm: 'sha256' as const,
    authoredFiles,
    buildAssets: [
      {
        route: '/portfolio' as const,
        kind: 'route-css' as const,
        path: '_astro/portfolio.css',
        bytes: 10,
        sha256: '2'.repeat(64),
      },
      {
        route: '/portfolio' as const,
        kind: 'route-html' as const,
        path: 'portfolio/index.html',
        bytes: 10,
        sha256: '3'.repeat(64),
      },
      {
        route: '/resume' as const,
        kind: 'route-css' as const,
        path: '_astro/resume.css',
        bytes: 10,
        sha256: '4'.repeat(64),
      },
      {
        route: '/resume' as const,
        kind: 'route-html' as const,
        path: 'resume/index.html',
        bytes: 10,
        sha256: '5'.repeat(64),
      },
    ],
    tools: {
      node: process.versions.node,
      astro: '6.1.5',
      vite: '7.3.2',
      playwright: '1.61.1',
      axe: '4.12.1',
    },
  };
  const digest = (
    verificationProviderTesting.digestAccessibilityReviewSubject as (
      value: typeof subject,
    ) => string
  )(subject);
  return { ...subject, digest };
}

async function createReviewSubjectFixture() {
  const siteRoot = await mkdtemp(join(tmpdir(), 'review-subject-'));
  fixtureRoots.push(siteRoot);
  const fixedFiles = [
    ...verificationEvidenceSchema.reviewSubjectSourceFiles,
  ];
  for (const directory of [
    'src/components/profile',
    'src/lib/layout',
    'src/styles/profile',
  ]) {
    await writeFixtureFile(
      siteRoot,
      `${directory}/fixture.ts`,
      `${directory}\n`,
    );
  }
  for (const path of fixedFiles) {
    await writeFixtureFile(siteRoot, path, `${path}\n`);
  }
  const packageLock = {
    packages: {
      'node_modules/@playwright/test': { version: '1.61.1' },
      'node_modules/@axe-core/playwright': { version: '4.12.1' },
    },
  };
  await writeFixtureFile(
    siteRoot,
    'package-lock.json',
    `${JSON.stringify(packageLock)}\n`,
  );

  const outputContents = new Map([
    [
      'resume/index.html',
      '<link href="/_astro/profile.css"><script src="/_astro/app.js"></script>',
    ],
    [
      'portfolio/index.html',
      '<link href="/_astro/profile.css"><script src="/_astro/app.js"></script>',
    ],
    ['_astro/profile.css', '.profile{display:block}'],
    ['_astro/app.js', 'export{}'],
  ]);
  for (const [path, content] of outputContents) {
    await writeFixtureFile(siteRoot, `dist/${path}`, content);
  }
  const outputFiles = [...outputContents].map(([path, content]) => ({
    path,
    bytes: Buffer.byteLength(content),
    sha256: digest(content),
  }));
  const manifest = {
    buildIdentity: { id: '9'.repeat(64) },
    outputFiles,
    routeOutputs: [
      { route: '/portfolio', outputs: ['portfolio/index.html'] },
      { route: '/resume', outputs: ['resume/index.html'] },
    ],
    pageGraph: ['/resume', '/portfolio'].map((route) => ({
      route: { route, pathname: route },
      styles: [
        {
          sheet: {
            type: 'external',
            src: '_astro/profile.css',
          },
        },
      ],
    })),
    tools: {
      node: process.versions.node,
      astro: '6.1.5',
      vite: '7.3.2',
    },
  };
  return { siteRoot, manifest };
}

async function writeFixtureFile(
  root: string,
  path: string,
  content: string,
) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
