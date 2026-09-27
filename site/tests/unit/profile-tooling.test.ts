import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { build as viteBuild } from 'vite';
import {
  fontMaterializerTesting,
} from '../../scripts/profile/font-materializer.mjs';
import {
  cleanProfileBuildTesting,
} from '../../scripts/profile/clean-profile-build.mjs';
import {
  assetBudgetTesting,
} from '../../scripts/profile/asset-budget.mjs';
import {
  PreviewSupervisorError,
  previewSupervisorTesting,
} from '../../scripts/profile/preview-supervisor.mjs';
import {
  BrowserRequestLedgerError,
  installRequestLedger,
} from '../../scripts/profile/request-ledger.mjs';
import {
  runWithStartupRetry,
  StartupStageError,
} from '../../scripts/profile/startup-retry.mjs';
import {
  verificationProviderTesting,
} from '../../scripts/profile/verification-provider.mjs';

const runner = resolve(process.cwd(), 'scripts/profile/pbt-runner.mjs');
const focusedFile = 'tests/pbt/u1/profile-domain.pbt.test.ts';
const focusedProperty =
  'PBT-U1-DOMAIN: normalization is idempotent for Unicode text and complete profiles';

describe('PBT runner focus regression', () => {
  test('rejects an unknown focused property before Vitest starts', () => {
    const result = runPbt({
      PBT_FILE: focusedFile,
      PBT_FOCUS: 'PBT-U1-DOMAIN: missing property',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"errorCode":"PBT_CONFIG_INVALID"');
    expect(result.stderr).toContain('"field":"PBT_FOCUS"');
    expect(result.stdout).not.toContain('RUN  v');
  });

  test('matches the connector seed suffix and executes exactly one focused property', () => {
    const result = runPbt({
      PBT_FILE: focusedFile,
      PBT_FOCUS: focusedProperty,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"seed":424242');
    expect(result.stdout).toContain(`"focus":"${focusedProperty}"`);
    expect(result.stdout).toMatch(/Tests\s+1 passed/);
    expect(result.stdout).not.toMatch(/Tests\s+\d+ skipped \(\d+\)/);
  });
});

const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map((root) =>
      rm(root, { force: true, recursive: true }),
    ),
  );
});

describe('verified Pretendard materialization', () => {
  test('publishes a complete deterministic tree and reuses it without mutation', async () => {
    const fixture = await createFontFixture();
    const staleStage = join(
      fixture.siteRoot,
      '.generated',
      '.profile-font-staging-stale',
    );
    await mkdir(staleStage, { recursive: true });
    await writeFile(join(staleStage, 'sentinel'), 'preserve');

    const first = await fontMaterializerTesting.materializeAtSiteRoot(
      fixture.siteRoot,
    );
    const manifestPath = join(fixture.outputRoot, 'manifest.json');
    const cssPath = join(fixture.outputRoot, 'pretendard-profile.css');
    const before = await stat(manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const css = await readFile(cssPath, 'utf8');

    expect(first).toMatchObject({
      status: 'materialized',
      family: 'RVNNT Profile',
      packageVersion: '1.3.9',
      outputCount: 95,
    });
    expect(manifest.outputs).toHaveLength(94);
    expect(manifest.cssTransform).toEqual({
      browserLicenseMetadataEmbedded: true,
      fontFaceMutation: 'family-alias-only',
      legalCommentPreserved: true,
    });
    expect(css).toContain("font-family: 'RVNNT Profile';");
    expect(css).not.toContain("font-family: 'Pretendard Variable';");
    expect(css.startsWith('/*!\nCopyright')).toBe(true);

    const second = await fontMaterializerTesting.materializeAtSiteRoot(
      fixture.siteRoot,
    );
    const after = await stat(manifestPath);

    expect(second.status).toBe('reused');
    expect(after.ino).toBe(before.ino);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(await readFile(join(staleStage, 'sentinel'), 'utf8')).toBe(
      'preserve',
    );
  });

  test('rejects a package-lock identity mismatch before publishing', async () => {
    const fixture = await createFontFixture();
    const packageLock = JSON.parse(
      await readFile(fixture.packageLockPath, 'utf8'),
    );
    packageLock.packages['node_modules/pretendard'].version = '1.3.8';
    await writeJson(fixture.packageLockPath, packageLock);

    await expectMaterializationError(
      fixture,
      'FONT_PACKAGE_MISMATCH',
    );
  });

  test('rejects a missing allowlisted source without fallback output', async () => {
    const fixture = await createFontFixture();
    await unlink(fixture.licensePath);

    await expectMaterializationError(fixture, 'FONT_SOURCE_MISSING');
  });

  test('rejects a same-length WOFF2 hash mismatch', async () => {
    const fixture = await createFontFixture();
    const bytes = await readFile(fixture.woff2Paths[17]);
    bytes[4] ^= 0xff;
    await writeFile(fixture.woff2Paths[17], bytes);

    await expectMaterializationError(
      fixture,
      'FONT_SOURCE_HASH_MISMATCH',
    );
  });

  test('rejects a symlinked allowlisted source', async () => {
    const fixture = await createFontFixture();
    await unlink(fixture.woff2Paths[23]);
    await symlink(fixture.woff2Paths[22], fixture.woff2Paths[23]);

    await expectMaterializationError(fixture, 'FONT_SOURCE_SYMLINK');
  });

  test('rejects a non-regular allowlisted source', async () => {
    const fixture = await createFontFixture();
    await unlink(fixture.woff2Paths[31]);
    await mkdir(fixture.woff2Paths[31]);

    await expectMaterializationError(
      fixture,
      'FONT_SOURCE_NOT_REGULAR',
    );
  });

  test('rejects traversal in the tracked allowlist', async () => {
    const fixture = await createFontFixture();
    const allowlist = await readAllowlist(fixture);
    allowlist.woff2[0].sourcePath = '../escape.woff2';
    await writeJson(fixture.allowlistPath, allowlist);

    await expectMaterializationError(fixture, 'FONT_ALLOWLIST_INVALID');
  });

  test('rejects CSS whose URL sequence does not close over the allowlist', async () => {
    const fixture = await createFontFixture();
    const css = await readFile(fixture.cssPath, 'utf8');
    const changed = css.replace(
      'PretendardVariable.subset.0.woff2',
      'PretendardVariable.subset.1.woff2',
    );
    await writeFile(fixture.cssPath, changed);

    const allowlist = await readAllowlist(fixture);
    allowlist.css.bytes = Buffer.byteLength(changed);
    allowlist.css.sha256 = digest(Buffer.from(changed));
    allowlist.sourceSetSha256 = digestAllowlistSourceSet(allowlist);
    await writeJson(fixture.allowlistPath, allowlist);

    await expectMaterializationError(
      fixture,
      'FONT_CSS_REFERENCE_MISMATCH',
    );
  });

  test('preserves and rejects a tampered published target', async () => {
    const fixture = await createFontFixture();
    await fontMaterializerTesting.materializeAtSiteRoot(fixture.siteRoot);
    const sentinelPath = join(fixture.outputRoot, 'unexpected');
    await writeFile(sentinelPath, 'do-not-delete');

    await expect(
      fontMaterializerTesting.materializeAtSiteRoot(fixture.siteRoot),
    ).rejects.toMatchObject({ code: 'FONT_OUTPUT_INVALID' });
    expect(await readFile(sentinelPath, 'utf8')).toBe('do-not-delete');
  });

  test('concurrent fresh materializers converge on one exact output', async () => {
    const fixture = await createFontFixture();

    const results = await Promise.all([
      fontMaterializerTesting.materializeAtSiteRoot(fixture.siteRoot),
      fontMaterializerTesting.materializeAtSiteRoot(fixture.siteRoot),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'materialized',
      'reused',
    ]);
    expect(await countFiles(fixture.outputRoot)).toBe(95);
    const generatedEntries = await readdir(
      join(fixture.siteRoot, '.generated'),
    );
    expect(
      generatedEntries.filter((entry) =>
        entry.startsWith('.profile-font-staging-'),
      ),
    ).toEqual([]);
    expect(generatedEntries).not.toContain('.profile-font-publish.lock');
  });

  test('Vite preserves OFL metadata in its CSS hash and emits hashed WOFF2 assets', async () => {
    const fixture = await createFontFixture();
    const materialized =
      await fontMaterializerTesting.materializeAtSiteRoot(
        fixture.siteRoot,
      );
    const entryPath = join(fixture.siteRoot, 'profile-font-entry.css');
    const outputDirectory = join(fixture.siteRoot, 'vite-dist');
    await writeFile(
      entryPath,
      '@import "./.generated/profile-font/pretendard-profile.css";\n',
    );

    await buildProfileCss(
      fixture.siteRoot,
      entryPath,
      outputDirectory,
    );

    const emittedFiles = await listFiles(outputDirectory);
    const cssOutputs = emittedFiles.filter(
      (path) => extname(path) === '.css',
    );
    const fontOutputs = emittedFiles.filter(
      (path) => extname(path) === '.woff2',
    );
    expect(cssOutputs).toHaveLength(1);
    expect(fontOutputs).toHaveLength(92);
    expect(
      fontOutputs.every((path) =>
        /PretendardVariable\.subset\.\d+-[A-Za-z0-9_-]+\.woff2$/.test(
          path,
        ),
      ),
    ).toBe(true);

    const emittedCss = await readFile(cssOutputs[0], 'utf8');
    expect(emittedCss.startsWith(materialized.licenseMetadata)).toBe(
      true,
    );
    expect(
      emittedCss.split(materialized.licenseMetadata).length - 1,
    ).toBe(1);
    expect(emittedCss).toContain('with Reserved Font Name Pretendard');
    expect(emittedCss).toContain(
      'https://github.com/orioncactus/pretendard',
    );
    expect(emittedCss).toContain('SIL Open Font License, Version 1.1');
    expect(emittedCss).toContain('http://scripts.sil.org/OFL');
    expect(emittedCss).toContain('RVNNT Profile');
    expect(emittedCss).not.toContain('Pretendard Variable');
    const emittedFontUrls = [
      ...emittedCss.matchAll(
        /url\((?:["']?)([^"')]+\.woff2)(?:["']?)\)/gu,
      ),
    ].map((match) => match[1]);
    expect(emittedFontUrls).toHaveLength(92);
    expect(new Set(emittedFontUrls).size).toBe(92);
    expect(
      emittedFontUrls.every(
        (url) =>
          url.startsWith('/assets/') &&
          !url.startsWith('//') &&
          !url.includes('\\') &&
          !/^[a-z][a-z\d+.-]*:/iu.test(url),
      ),
    ).toBe(true);
    expect(emittedFontUrls.map((url) => basename(url)).sort()).toEqual(
      fontOutputs.map((path) => basename(path)).sort(),
    );
    expect(
      emittedFiles.some((path) =>
        /(?:LICENSE|manifest\.json)$/i.test(path),
      ),
    ).toBe(false);

    const materializedCssPath = join(
      fixture.outputRoot,
      'pretendard-profile.css',
    );
    const materializedCss = await readFile(materializedCssPath, 'utf8');
    const changedMetadata = materialized.licenseMetadata.replace(
      'Reserved Font Name Pretendard',
      'Reserved Font Name Pretendard Hash Probe',
    );
    expect(changedMetadata).not.toBe(materialized.licenseMetadata);
    await writeFile(
      materializedCssPath,
      materializedCss.replace(
        materialized.licenseMetadata,
        changedMetadata,
      ),
    );

    const changedOutputDirectory = join(
      fixture.siteRoot,
      'vite-dist-changed',
    );
    await buildProfileCss(
      fixture.siteRoot,
      entryPath,
      changedOutputDirectory,
    );
    const changedCssOutputs = (
      await listFiles(changedOutputDirectory)
    ).filter((path) => extname(path) === '.css');
    expect(changedCssOutputs).toHaveLength(1);
    expect(basename(changedCssOutputs[0])).not.toBe(
      basename(cssOutputs[0]),
    );
  });
});

describe('classified startup retry', () => {
  test('retries one eligible startup failure only after proven cleanup and with fresh identities', async () => {
    const teardownAttempts: number[] = [];
    const runtimeIdentities = [
      {
        previewPid: 4101,
        previewPort: 43101,
        browserContextId: 'browser-context-1',
      },
      {
        previewPid: 4102,
        previewPort: 43102,
        browserContextId: 'browser-context-2',
      },
    ];

    const result = await runWithStartupRetry({
      createAttempt: ({ attempt }: { attempt: number }) => ({
        identity: {
          attemptId: `attempt-${attempt}`,
        },
        getRuntimeIdentity() {
          return runtimeIdentities[attempt - 1];
        },
        async run() {
          if (attempt === 1) {
            throw new StartupStageError({
              stage: 'startup.preview.readiness',
              errorCode: 'PREVIEW_READINESS_TIMEOUT',
              message: 'preview was not reachable before the deadline',
            });
          }
          return { attempt, status: 'ready' };
        },
        async teardown({
          identity,
        }: {
          identity: Record<string, unknown>;
        }) {
          teardownAttempts.push(attempt);
          return {
            status: 'succeeded',
            attempt,
            identity,
            residualResources: 0,
          };
        },
      }),
    });

    expect(result.value).toEqual({ attempt: 2, status: 'ready' });
    expect(result.evidence).toMatchObject({
      attemptCount: 2,
      retried: true,
      identities: [
        {
          attemptId: 'attempt-1',
          previewPid: 4101,
          previewPort: 43101,
          browserContextId: 'browser-context-1',
        },
        {
          attemptId: 'attempt-2',
          previewPid: 4102,
          previewPort: 43102,
          browserContextId: 'browser-context-2',
        },
      ],
    });
    expect(teardownAttempts).toEqual([1]);
  });

  test('rejects a retry that reuses an actual runtime resource identity', async () => {
    const teardownAttempts: number[] = [];

    await expect(
      runWithStartupRetry({
        createAttempt: ({ attempt }: { attempt: number }) => ({
          identity: { attemptId: `freshness-${attempt}` },
          getRuntimeIdentity() {
            return {
              previewPid: 4200 + attempt,
              previewPort: 43201,
              browserContextId: `context-${attempt}`,
            };
          },
          async run() {
            if (attempt === 1) {
              throw new StartupStageError({
                stage: 'startup.preview.launch',
                errorCode: 'PREVIEW_CHILD_SPAWN_FAILED',
                message: 'the first preview failed to launch',
              });
            }
            return { status: 'ready' };
          },
          async teardown({
            identity,
          }: {
            identity: Record<string, unknown>;
          }) {
            teardownAttempts.push(attempt);
            return {
              status: 'succeeded',
              attempt,
              identity,
              residualResources: 0,
            };
          },
        }),
      }),
    ).rejects.toMatchObject({
      errorCode: 'STARTUP_ATTEMPT_NOT_FRESH',
      attempt: 2,
      stage: 'startup.attempt.identity',
      details: expect.objectContaining({
        freshnessIssues: [
          { path: 'resource:port', reason: 'reused' },
        ],
      }),
    });
    expect(teardownAttempts).toEqual([1, 2]);
  });

  test('never retries a semantic response failure', async () => {
    const attempts: number[] = [];

    await expect(
      runWithStartupRetry({
        createAttempt: ({ attempt }: { attempt: number }) => ({
          identity: { attemptId: `semantic-${attempt}` },
          async run() {
            attempts.push(attempt);
            throw new StartupStageError({
              stage: 'semantic.static.response',
              errorCode: 'PREVIEW_STATIC_MIME_INVALID',
              message: 'a ready route returned the wrong MIME type',
            });
          },
          async teardown({
            identity,
          }: {
            identity: Record<string, unknown>;
          }) {
            return {
              status: 'succeeded',
              attempt,
              identity,
              residualResources: 0,
            };
          },
        }),
      }),
    ).rejects.toMatchObject({
      errorCode: 'PREVIEW_STATIC_MIME_INVALID',
      attempt: 1,
      stage: 'semantic.static.response',
    });
    expect(attempts).toEqual([1]);
  });

  test('refuses a retry when cleanup evidence is incomplete', async () => {
    await expect(
      runWithStartupRetry({
        createAttempt: ({ attempt }: { attempt: number }) => ({
          identity: { attemptId: `cleanup-${attempt}` },
          async run() {
            throw new StartupStageError({
              stage: 'startup.browser.launch',
              errorCode: 'BROWSER_LAUNCH_FAILED',
              message: 'browser process did not launch',
            });
          },
          async teardown({
            identity,
          }: {
            identity: Record<string, unknown>;
          }) {
            return {
              status: 'succeeded',
              attempt,
              identity,
              residualResources: 1,
            };
          },
        }),
      }),
    ).rejects.toMatchObject({
      errorCode: 'STARTUP_TEARDOWN_EVIDENCE_INVALID',
      attempt: 1,
      stage: 'startup.teardown',
    });
  });
});

describe('clean build process ownership', () => {
  test('awaits timeout escalation and proves the build process tree is released', async () => {
    const child = spawn(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      {
        detached: process.platform !== 'win32',
        stdio: 'ignore',
      },
    );

    try {
      const result = await cleanProfileBuildTesting.waitForBuildProcess(
        child,
        25,
      );
      const cleanup =
        await cleanProfileBuildTesting.releaseBuildProcessTree(child);

      expect(result).toMatchObject({
        timedOut: true,
        launchError: null,
      });
      expect(cleanup).toMatchObject({
        pid: child.pid,
        pidReleased: true,
        processTreeReleased: true,
      });
    } finally {
      await cleanProfileBuildTesting.releaseBuildProcessTree(child);
    }
  });

  test.skipIf(process.platform === 'win32')(
    'discovers and releases a detached grandchild process group',
    async () => {
      const child = spawn(
        process.execPath,
        [
          '-e',
          [
            "const { spawn } = require('node:child_process');",
            'const grandchild = spawn(',
            '  process.execPath,',
            "  ['-e', 'setInterval(() => {}, 1000)'],",
            "  { detached: true, stdio: 'ignore' },",
            ');',
            "process.stdout.write(String(grandchild.pid) + '\\n');",
            'setInterval(() => {}, 1000);',
          ].join('\n'),
        ],
        {
          detached: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );
      let grandchildPid: number | undefined;

      try {
        grandchildPid = Number(await readProcessLine(child));
        const cleanup =
          await cleanProfileBuildTesting.releaseBuildProcessTree(child);

        expect(cleanup).toMatchObject({
          pidReleased: true,
          processTreeReleased: true,
          descendantProcessTree: {
            observedProcessGroupIds: expect.arrayContaining([
              grandchildPid,
            ]),
            failures: [],
          },
        });
        expect(isTestProcessGroupAlive(grandchildPid)).toBe(false);
      } finally {
        await cleanProfileBuildTesting.releaseBuildProcessTree(child);
        if (
          grandchildPid !== undefined &&
          isTestProcessGroupAlive(grandchildPid)
        ) {
          process.kill(-grandchildPid, 'SIGKILL');
        }
      }
    },
  );
});

describe('owned preview and browser request boundaries', () => {
  test('normalizes exact readiness routes and rejects traversal or duplicates', () => {
    expect(
      previewSupervisorTesting.normalizeRequiredRoutes([
        '/resume',
        { path: '/portfolio', expectedMime: 'text/html' },
      ]),
    ).toEqual([
      { path: '/resume', expectedMime: 'text/html' },
      { path: '/portfolio', expectedMime: 'text/html' },
    ]);
    expect(() =>
      previewSupervisorTesting.normalizeRequiredRoutes(['/resume', '/resume'])
    ).toThrow(/duplicate exact path/u);
    expect(() =>
      previewSupervisorTesting.normalizeRequiredRoutes(['/resume/../private'])
    ).toThrow(/normalized route/u);
  });

  test('retains actual failed-preview cleanup proof in startup diagnostics', () => {
    const normalized = previewSupervisorTesting.normalizeStartupFailure(
      new PreviewSupervisorError('preview failed readiness', {
        code: 'PREVIEW_READINESS_TIMEOUT',
        stage: 'startup.preview.readiness',
        retryable: true,
        details: { route: '/resume' },
      }),
      {
        instanceId: 'preview-instance-1',
        cleanup: {
          pid: 4301,
          port: 43301,
          processExited: true,
          processTreeReleased: true,
          portReleased: true,
        },
      },
    );

    expect(normalized).toMatchObject({
      code: 'PREVIEW_READINESS_TIMEOUT',
      stage: 'startup.preview.readiness',
      retryable: true,
      details: {
        route: '/resume',
        instanceId: 'preview-instance-1',
        cleanup: {
          pid: 4301,
          port: 43301,
          processExited: true,
          processTreeReleased: true,
          portReleased: true,
        },
      },
    });
  });

  test('installs before pages, records both profile documents, and links emitted assets', async () => {
    const context = createFakeBrowserContext();
    const buildIdentity = {
      id: 'a'.repeat(64),
      routes: ['/resume', '/portfolio'],
    };
    const ledger = await installRequestLedger(context, {
      baseURL: 'http://127.0.0.1:41731',
      buildIdentity,
      emittedAssets: [
        {
          path: 'resume/index.html',
          bytes: 6,
          sha256: digest(Buffer.from('resume')),
        },
        {
          path: 'portfolio/index.html',
          bytes: 9,
          sha256: digest(Buffer.from('portfolio')),
        },
        {
          path: '_astro/profile.css',
          bytes: 7,
          sha256: 'b'.repeat(64),
        },
      ],
    });

    for (const route of ['/resume', '/portfolio']) {
      const request = fakeRequest({
        url: `http://127.0.0.1:41731${route}`,
        frameUrl: `http://127.0.0.1:41731${route}`,
        resourceType: 'document',
      });
      await context.dispatchRoute(request);
      context.dispatchResponse(request, 200);
    }
    const assetRequest = fakeRequest({
      url: 'http://127.0.0.1:41731/_astro/profile.css',
      frameUrl: 'http://127.0.0.1:41731/resume',
      resourceType: 'stylesheet',
    });
    await context.dispatchRoute(assetRequest);
    context.dispatchResponse(assetRequest, 200);

    const evidence = await ledger.finalize();
    expect(evidence.external).toEqual({
      attempted: 0,
      blocked: 0,
      successful: 0,
    });
    expect(evidence.missingProfileRoutes).toEqual([]);
    expect(
      evidence.successful.find(
        ({ resourceType }: { resourceType: string }) =>
          resourceType === 'stylesheet',
      )?.emittedAssetIdentity,
    ).toEqual({
      path: '_astro/profile.css',
      bytes: 7,
      sha256: 'b'.repeat(64),
    });
  });

  test('aborts a non-loopback request before response and fails closed with separate evidence', async () => {
    const context = createFakeBrowserContext();
    const ledger = await installRequestLedger(context, {
      baseURL: 'http://127.0.0.1:41731',
      buildIdentity: {
        id: 'c'.repeat(64),
        routes: ['/resume', '/portfolio'],
      },
    });
    const request = fakeRequest({
      url: 'https://cdn.example.test/profile.css',
      frameUrl: 'http://127.0.0.1:41731/resume',
      resourceType: 'stylesheet',
    });
    const routeResult = await context.dispatchRoute(request);

    expect(routeResult).toEqual({
      aborted: 'blockedbyclient',
      continued: false,
    });
    await expect(
      ledger.finalize({ requireProfileRoutes: false }),
    ).rejects.toThrow(
        expect.objectContaining<Partial<BrowserRequestLedgerError>>({
          code: 'NON_LOOPBACK_REQUEST_ATTEMPTED',
          details: expect.objectContaining({
            external: {
              attempted: 1,
              blocked: 1,
              successful: 0,
            },
          }),
        }),
      );
  });
});

describe('manifest-backed profile resource evidence', () => {
  test('counts the reachable external and inline CSS union once and reports zero profile client JavaScript', async () => {
    const fixture = createAssetBudgetManifestFixture();
    const evidence = await assetBudgetTesting.analyzeManifest(
      fixture.manifest,
      async (path: string) => requireFixtureOutput(fixture.outputs, path),
    );

    expect(evidence.result).toBe('pass');
    expect(evidence.css.uniqueAssetCount).toBe(3);
    expect(evidence.css.totalGzipBytes).toBeLessThanOrEqual(24 * 1024);
    expect(
      evidence.css.assets.find(
        ({ kind }: { kind: string }) => kind === 'inline',
      ),
    ).toMatchObject({
      routes: ['/portfolio'],
      profileStyleRoots: ['src/styles/profile/portfolio.css'],
    });
    expect(evidence.javaScript).toMatchObject({
      profileOwnedHydratedComponents: 0,
      profileOwnedNewClientChunks: 0,
    });
      const consumeAssetBudget =
        verificationProviderTesting.requireAssetBudget as (
          value: unknown,
          buildId: string,
          routeDocuments: ReadonlyMap<string, string>,
        ) => unknown;
    expect(() =>
      consumeAssetBudget(
        evidence,
        fixture.manifest.buildIdentity.id,
        new Map([
          ['/resume', 'resume/index.html'],
          ['/portfolio', 'portfolio/index.html'],
        ]),
      )
    ).not.toThrow();
  });

  test('fails closed when a profile-owned source appears in a client chunk', async () => {
    const fixture = createAssetBudgetManifestFixture();
    const clientChunk =
      fixture.manifest.rollupGraphs.client.outputs[0];
    if (clientChunk === undefined) {
      throw new Error('missing client chunk fixture');
    }
    clientChunk.modules.push('src/components/profile/ClientProfile.tsx');
    refreshAssetManifestIdentity(fixture.manifest);

    await expect(
      assetBudgetTesting.analyzeManifest(
        fixture.manifest,
        async (path: string) => requireFixtureOutput(fixture.outputs, path),
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_CLIENT_JAVASCRIPT_ADDED',
    });
  });

  test('fails closed when an unapproved profile stylesheet enters CSS provenance', async () => {
    const fixture = createAssetBudgetManifestFixture();
    const foundationChunk =
      fixture.manifest.initialRollupGraphs.prerender.outputs
      .find(({ file }: { file: string }) =>
        file === 'chunks/foundation.mjs'
      );
    if (foundationChunk?.type !== 'chunk') {
      throw new Error('missing foundation chunk fixture');
    }
    foundationChunk.modules.push('src/styles/profile/unapproved.css');
    refreshAssetManifestIdentity(fixture.manifest);

    await expect(
      assetBudgetTesting.analyzeManifest(
        fixture.manifest,
        async (path: string) => requireFixtureOutput(fixture.outputs, path),
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_CSS_SOURCE_UNAPPROVED',
    });
  });

  test('fails closed when final HTML contains an unclassified inline style', async () => {
    const fixture = createAssetBudgetManifestFixture();
    replaceFixtureOutput(
      fixture,
      'resume/index.html',
      Buffer.concat([
        requireFixtureOutput(fixture.outputs, 'resume/index.html'),
        Buffer.from('<style>.untracked{display:none}</style>'),
      ]),
    );

    await expect(
      assetBudgetTesting.analyzeManifest(
        fixture.manifest,
        async (path: string) => requireFixtureOutput(fixture.outputs, path),
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_CSS_INLINE_UNCLASSIFIED',
    });
  });

  test('fails closed when final HTML contains an unapproved inline script', async () => {
    const fixture = createAssetBudgetManifestFixture();
    replaceFixtureOutput(
      fixture,
      'portfolio/index.html',
      Buffer.concat([
        requireFixtureOutput(fixture.outputs, 'portfolio/index.html'),
        Buffer.from('<script>globalThis.profileBypass=true</script>'),
      ]),
    );

    await expect(
      assetBudgetTesting.analyzeManifest(
        fixture.manifest,
        async (path: string) => requireFixtureOutput(fixture.outputs, path),
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_INLINE_SCRIPT_UNAPPROVED',
    });
  });

  test('fails closed for an unapproved Rollup-to-inline CSS transform', async () => {
    const fixture = createAssetBudgetManifestFixture();
    const asset = fixture.manifest.initialRollupGraphs.prerender.outputs
      .find(({ file }: { file: string }) =>
        file === '_astro/portfolio.css'
      );
    if (
      asset?.type !== 'asset' ||
      typeof asset.contentBase64 !== 'string'
    ) {
      throw new Error('missing portfolio CSS asset fixture');
    }
    const bytes = Buffer.concat([
      Buffer.from(asset.contentBase64, 'base64'),
      Buffer.from('/*$vite$:2*/'),
    ]);
    Object.assign(asset, {
      bytes: bytes.byteLength,
      sha256: digest(bytes),
      contentBase64: bytes.toString('base64'),
    });
    refreshAssetManifestIdentity(fixture.manifest);

    await expect(
      assetBudgetTesting.analyzeManifest(
        fixture.manifest,
        async (path: string) => requireFixtureOutput(fixture.outputs, path),
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_CSS_INLINE_TRANSFORM_UNAPPROVED',
    });
  });
});

function createFakeBrowserContext() {
  let routeHandler:
    | ((route: {
        request(): ReturnType<typeof fakeRequest>;
        abort(reason: string): Promise<void>;
        continue(): Promise<void>;
      }) => Promise<void>)
    | undefined;
  let responseHandler:
    | ((response: {
        request(): ReturnType<typeof fakeRequest>;
        url(): string;
        status(): number;
      }) => void)
    | undefined;

  return {
    pages() {
      return [];
    },
    async route(
      _pattern: string,
      handler: NonNullable<typeof routeHandler>,
    ) {
      routeHandler = handler;
    },
    on(event: string, handler: NonNullable<typeof responseHandler>) {
      if (event === 'response') responseHandler = handler;
    },
    off() {},
    async unroute() {},
    async dispatchRoute(request: ReturnType<typeof fakeRequest>) {
      if (routeHandler === undefined) {
        throw new Error('route handler was not installed');
      }
      let aborted: string | null = null;
      let continued = false;
      await routeHandler({
        request: () => request,
        async abort(reason: string) {
          aborted = reason;
        },
        async continue() {
          continued = true;
        },
      });
      return { aborted, continued };
    },
    dispatchResponse(
      request: ReturnType<typeof fakeRequest>,
      status: number,
    ) {
      if (responseHandler === undefined) {
        throw new Error('response handler was not installed');
      }
      responseHandler({
        request: () => request,
        url: () => request.url(),
        status: () => status,
      });
    },
  };
}

function fakeRequest({
  url,
  frameUrl,
  resourceType,
}: {
  url: string;
  frameUrl: string;
  resourceType: string;
}) {
  return {
    url: () => url,
    resourceType: () => resourceType,
    isNavigationRequest: () => resourceType === 'document',
    frame: () => ({ url: () => frameUrl }),
  };
}

function createAssetBudgetManifestFixture() {
  const foundation = Buffer.from(
    '@font-face{font-family:RVNNT} .profile{display:block}',
  );
  const resume = Buffer.from(
    '.resume-entry{break-inside:avoid-page}@media print{body{font-size:10pt}}',
  );
  const portfolio = Buffer.from(
    '.case-study{display:grid}.case-study__dimension{min-width:0}',
  );
  const resumeDocument = Buffer.from(
    '<!doctype html>' +
      '<link rel="stylesheet" href="/_astro/foundation.css">' +
      '<link rel="stylesheet" href="/_astro/resume.css">',
  );
  const portfolioDocument = Buffer.from(
    '<!doctype html>' +
      '<link rel="stylesheet" href="/_astro/foundation.css">' +
      `<style>${portfolio.toString('utf8')}</style>`,
  );
  const outputs = new Map<string, Buffer>([
    ['_astro/foundation.css', foundation],
    ['_astro/resume.css', resume],
    ['portfolio/index.html', portfolioDocument],
    ['resume/index.html', resumeDocument],
  ]);
  type RollupAssetFixture = {
    type: 'asset';
    file: string;
    names: string[];
    originalFileNames: string[];
    bytes: number;
    sha256: string;
    contentBase64: string | undefined;
  };
  type RollupChunkFixture = {
    type: 'chunk';
    file: string;
    modules: string[];
    importedCss: string[];
  };
  type RollupOutputFixture =
    | RollupAssetFixture
    | RollupChunkFixture;
  const asset = (
    file: string,
    bytes: Buffer,
  ): RollupAssetFixture => ({
    type: 'asset',
    file,
    names: [],
    originalFileNames: [],
    bytes: bytes.byteLength,
    sha256: digest(bytes),
    contentBase64: file.endsWith('.css')
      ? bytes.toString('base64')
      : undefined,
  });
  const chunk = (
    file: string,
    modules: string[],
    importedCss: string[],
  ): RollupChunkFixture => ({
    type: 'chunk',
    file,
    modules,
    importedCss,
  });
  const initialPrerenderOutputs: RollupOutputFixture[] = [
    asset('_astro/foundation.css', foundation),
    asset('_astro/resume.css', resume),
    asset('_astro/portfolio.css', portfolio),
    chunk(
      'chunks/foundation.mjs',
      [
        'src/styles/profile/font.css',
        'src/styles/profile/foundation.css',
      ],
      ['_astro/foundation.css'],
    ),
    chunk(
      'chunks/resume.mjs',
      [
        'src/pages/resume.astro',
        'src/styles/profile/print.css',
        'src/styles/profile/resume.css',
      ],
      ['_astro/resume.css'],
    ),
    chunk(
      'chunks/portfolio.mjs',
      [
        'src/pages/portfolio.astro',
        'src/styles/profile/portfolio.css',
      ],
      ['_astro/portfolio.css'],
    ),
  ];
  const clientOutputs: RollupChunkFixture[] = [
    {
      type: 'chunk',
      file: '_astro/Search.js',
      modules: ['src/islands/Search.tsx'],
      importedCss: [],
    },
  ];

  const manifest = {
      schemaVersion: 1,
      buildIdentity: {
        id: '',
        sourceGraphSha256: '',
        outputSha256: '',
        routes: ['/resume', '/portfolio'],
      },
      pageGraph: {
        pages: [
          {
            component: 'src/pages/resume.astro',
            route: { route: '/resume', pathname: '/resume' },
            styles: [
              {
                depth: 1,
                order: 1,
                sheet: {
                  type: 'external',
                  src: '_astro/foundation.css',
                },
              },
              {
                depth: 1,
                order: 2,
                sheet: {
                  type: 'external',
                  src: '_astro/resume.css',
                },
              },
            ],
          },
          {
            component: 'src/pages/portfolio.astro',
            route: { route: '/portfolio', pathname: '/portfolio' },
            styles: [
              {
                depth: 1,
                order: 1,
                sheet: {
                  type: 'external',
                  src: '_astro/foundation.css',
                },
              },
              {
                depth: 1,
                order: 2,
                sheet: {
                  type: 'inline',
                  bytes: portfolio.byteLength,
                  sha256: digest(portfolio),
                  contentBase64: portfolio.toString('base64'),
                },
              },
            ],
          },
        ],
      },
      routeOutputs: [
        {
          route: '/portfolio',
          outputs: ['portfolio/index.html'],
        },
        {
          route: '/resume',
          outputs: ['resume/index.html'],
        },
      ],
      viteManifest: {
        'src/islands/Search.tsx': {
          src: 'src/islands/Search.tsx',
          file: '_astro/Search.js',
          isEntry: true,
        },
      },
      initialRollupGraphs: {
        client: { outputs: structuredClone(clientOutputs) },
        prerender: { outputs: initialPrerenderOutputs },
      },
      rollupGraphs: {
        client: { outputs: clientOutputs },
        prerender: {
          outputs: [
            asset('_astro/foundation.css', foundation),
            asset('_astro/resume.css', resume),
          ],
        },
      },
      outputFiles: [...outputs].map(([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: digest(bytes),
      })),
      tools: {
        node: process.versions.node,
        astro: 'fixture',
        vite: 'fixture',
        gzip: 'node:zlib.gzipSync(level=9,mtime=0)',
      },
    };
  refreshAssetManifestIdentity(manifest);

  return {
    outputs,
    manifest,
  };
}

function refreshAssetManifestIdentity(manifest: Record<string, any>) {
  manifest.buildIdentity.sourceGraphSha256 = digest(
    Buffer.from(
      JSON.stringify({
        pageGraph: manifest.pageGraph,
        routeOutputs: manifest.routeOutputs,
        initialRollupGraphs: manifest.initialRollupGraphs,
        rollupGraphs: manifest.rollupGraphs,
        viteManifest: manifest.viteManifest,
      }),
    ),
  );
  manifest.buildIdentity.outputSha256 = digest(
    Buffer.from(JSON.stringify(manifest.outputFiles)),
  );
  manifest.buildIdentity.id = digest(
    Buffer.from(
      JSON.stringify({
        sourceGraphSha256: manifest.buildIdentity.sourceGraphSha256,
        outputSha256: manifest.buildIdentity.outputSha256,
        builtRoutes: manifest.buildIdentity.routes,
      }),
    ),
  );
}

function replaceFixtureOutput(
  fixture: ReturnType<typeof createAssetBudgetManifestFixture>,
  path: string,
  bytes: Buffer,
) {
  fixture.outputs.set(path, bytes);
  const output = fixture.manifest.outputFiles.find(
    (entry: { path: string }) => entry.path === path,
  );
  if (output === undefined) {
    throw new Error(`missing fixture output identity: ${path}`);
  }
  Object.assign(output, {
    bytes: bytes.byteLength,
    sha256: digest(bytes),
  });
  refreshAssetManifestIdentity(fixture.manifest);
}

function readProcessLine(child: ReturnType<typeof spawn>) {
  return new Promise<string>((resolvePromise, rejectPromise) => {
    let buffer = '';
    const timeout = setTimeout(() => {
      cleanup();
      rejectPromise(new Error('child did not publish a process id'));
    }, 2_000);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      cleanup();
      resolvePromise(buffer.slice(0, newline));
    };
    const onExit = () => {
      cleanup();
      rejectPromise(new Error('child exited before publishing a process id'));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
    };
    child.stdout?.on('data', onData);
    child.once('exit', onExit);
  });
}

function isTestProcessGroupAlive(processGroupId: number) {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error: any) {
    return error?.code !== 'ESRCH';
  }
}

function requireFixtureOutput(
  outputs: Map<string, Buffer>,
  path: string,
) {
  const bytes = outputs.get(path);
  if (bytes === undefined) {
    throw new Error(`missing fixture output: ${path}`);
  }
  return bytes;
}

function runPbt(overrides: Record<string, string>) {
  const environment: Record<string, string | undefined> = {
    ...process.env,
    FORCE_COLOR: '0',
    NO_COLOR: '1',
    PBT_RUNS: '1',
    PBT_SEED: '424242',
    ...overrides,
  };
  delete environment.PBT_PATH;

  const result = spawnSync(process.execPath, [runner], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: environment,
    timeout: 120_000,
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

interface FontFixture {
  siteRoot: string;
  packageLockPath: string;
  allowlistPath: string;
  cssPath: string;
  licensePath: string;
  woff2Paths: string[];
  outputRoot: string;
}

interface AllowlistFileEntry {
  sourcePath: string;
  outputPath: string;
  bytes: number;
  sha256: string;
}

interface FontAllowlist {
  schemaVersion: number;
  sourceSetSha256: string;
  package: {
    name: string;
    version: string;
    integrity: string;
  };
  family: {
    source: string;
    output: string;
  };
  css: AllowlistFileEntry;
  license: AllowlistFileEntry;
  woff2: AllowlistFileEntry[];
}

async function createFontFixture(): Promise<FontFixture> {
  const siteRoot = await mkdtemp(join(tmpdir(), 'rvnnt-profile-font-'));
  fixtureRoots.push(siteRoot);

  const packageRoot = join(siteRoot, 'node_modules', 'pretendard');
  const cssRelative =
    'dist/web/variable/pretendardvariable-dynamic-subset.css';
  const licenseRelative = 'dist/LICENSE.txt';
  const cssPath = join(packageRoot, ...cssRelative.split('/'));
  const licensePath = join(packageRoot, ...licenseRelative.split('/'));
  const woff2Paths: string[] = [];
  const woff2Entries: AllowlistFileEntry[] = [];

  const css = createFixtureCss();
  const license = [
    'Copyright (c) 2021, Kil Hyung-jin.',
    'with Reserved Font Name Pretendard.',
    '',
    'SIL OPEN FONT LICENSE Version 1.1',
    'http://scripts.sil.org/OFL',
    '"Font Software" refers to the distributed font files.',
    '"Reserved Font Name" refers to Pretendard.',
    '',
  ].join('\n');

  await mkdir(dirname(cssPath), { recursive: true });
  await writeFile(cssPath, css);
  await writeFile(licensePath, license);

  for (let index = 0; index < 92; index += 1) {
    const sourcePath =
      `dist/web/variable/woff2-dynamic-subset/` +
      `PretendardVariable.subset.${index}.woff2`;
    const outputPath =
      `woff2-dynamic-subset/PretendardVariable.subset.${index}.woff2`;
    const absolutePath = join(packageRoot, ...sourcePath.split('/'));
    const bytes = Buffer.concat([
      Buffer.from('wOF2'),
      Buffer.from(`fixture-${index}`),
    ]);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, bytes);
    woff2Paths.push(absolutePath);
    woff2Entries.push({
      sourcePath,
      outputPath,
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  }

  await writeJson(join(packageRoot, 'package.json'), {
    name: 'pretendard',
    version: '1.3.9',
    license: 'OFL-1.1',
  });

  const integrity =
    'sha512-PaQAADyLY5v4kYFwkpSJHbSSYIkiriY/1xXw75TKoZ9UQQqeU+' +
    'tvP05yTdZAWibiIYoo8ZKtRv8PM7w0IaywSw==';
  const packageLockPath = join(siteRoot, 'package-lock.json');
  await writeJson(packageLockPath, {
    lockfileVersion: 3,
    packages: {
      '': {
        dependencies: {
          pretendard: '1.3.9',
        },
      },
      'node_modules/pretendard': {
        version: '1.3.9',
        integrity,
        license: 'OFL-1.1',
      },
    },
  });

  const allowlist: FontAllowlist = {
    schemaVersion: 1,
    sourceSetSha256: '',
    package: {
      name: 'pretendard',
      version: '1.3.9',
      integrity,
    },
    family: {
      source: 'Pretendard Variable',
      output: 'RVNNT Profile',
    },
    css: {
      sourcePath: cssRelative,
      outputPath: 'pretendard-profile.css',
      bytes: Buffer.byteLength(css),
      sha256: digest(Buffer.from(css)),
    },
    license: {
      sourcePath: licenseRelative,
      outputPath: 'LICENSE.txt',
      bytes: Buffer.byteLength(license),
      sha256: digest(Buffer.from(license)),
    },
    woff2: woff2Entries,
  };
  allowlist.sourceSetSha256 = digestAllowlistSourceSet(allowlist);

  const allowlistPath = join(
    siteRoot,
    'scripts',
    'profile',
    'font-allowlist.json',
  );
  await writeJson(allowlistPath, allowlist);

  return {
    siteRoot,
    packageLockPath,
    allowlistPath,
    cssPath,
    licensePath,
    woff2Paths,
    outputRoot: join(siteRoot, '.generated', 'profile-font'),
  };
}

function createFixtureCss() {
  const faces = Array.from({ length: 92 }, (_, index) => [
    `/* [${index}] */`,
    '@font-face {',
    "\tfont-family: 'Pretendard Variable';",
    '\tfont-style: normal;',
    '\tfont-display: swap;',
    '\tfont-weight: 45 920;',
    `\tsrc: url(./woff2-dynamic-subset/PretendardVariable.subset.${index}.woff2) format('woff2-variations');`,
    `\tunicode-range: U+${(0x20 + index).toString(16)};`,
    '}',
    '',
  ].join('\n')).join('\n');

  return [
    '/*',
    'Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard.',
    'https://github.com/orioncactus/pretendard',
    '',
    'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
    'This license is also available at: http://scripts.sil.org/OFL',
    '*/',
    faces,
  ].join('\n');
}

async function expectMaterializationError(
  fixture: FontFixture,
  code: string,
) {
  await expect(
    fontMaterializerTesting.materializeAtSiteRoot(fixture.siteRoot),
  ).rejects.toMatchObject({ code });
  await expect(lstat(fixture.outputRoot)).rejects.toMatchObject({
    code: 'ENOENT',
  });
}

async function readAllowlist(
  fixture: FontFixture,
): Promise<FontAllowlist> {
  return JSON.parse(await readFile(fixture.allowlistPath, 'utf8'));
}

function digestAllowlistSourceSet(allowlist: FontAllowlist) {
  const hash = createHash('sha256');
  for (const entry of [
    allowlist.css,
    ...allowlist.woff2,
    allowlist.license,
  ]) {
    hash.update(
      `${entry.sourcePath}\t${entry.bytes}\t${entry.sha256}\n`,
      'utf8',
    );
  }
  return hash.digest('hex');
}

function digest(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function countFiles(root: string): Promise<number> {
  let count = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    count += entry.isDirectory() ? await countFiles(path) : 1;
  }
  return count;
}

async function buildProfileCss(
  root: string,
  entryPath: string,
  outputDirectory: string,
) {
  await viteBuild({
    configFile: false,
    root,
    logLevel: 'silent',
    build: {
      assetsInlineLimit: 0,
      emptyOutDir: true,
      outDir: outputDirectory,
      rollupOptions: {
        input: entryPath,
      },
    },
  });
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else {
      files.push(path);
    }
  }
  return files.sort();
}
