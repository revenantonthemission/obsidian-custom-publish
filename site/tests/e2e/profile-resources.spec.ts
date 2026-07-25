import { expect, test } from '@playwright/test';
import { installRequestLedger } from '../../scripts/profile/request-ledger.mjs';
import {
  profileEnvironment,
  readBuildManifest,
  supervisedOrigin,
} from './support/environment.js';
import { recordEvidenceFragment, writeJsonFile } from './support/evidence.js';
import { PROFILE_ROUTES } from './support/matrix.js';
import { PROFILE_SHELL, playwrightVersion } from './support/profile-page.js';

const SPEC_FILE = 'profile-resources.spec.ts';

interface ObservedAsset {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

interface LedgerSnapshot {
  readonly successful: readonly {
    readonly emittedAssetIdentity: ObservedAsset | null;
  }[];
}

let localResourcePolicyHeld = false;

test.describe('local resource policy', () => {
  test('both routes load entirely from emitted build output', async ({
    browser,
  }) => {
    const environment = profileEnvironment();
    const manifest = await readBuildManifest();

    // The ledger has to be installed before the first page exists, so the
    // context is created here rather than taken from the page fixture.
    const context = await browser.newContext({ baseURL: environment.baseURL });
    const ledger = await installRequestLedger(context, {
      baseURL: environment.baseURL,
      emittedAssets: manifest.outputFiles,
      buildIdentity: manifest.buildIdentity,
    });
    expect(ledger.supervisedOrigin).toBe(supervisedOrigin());

    try {
      for (const route of PROFILE_ROUTES) {
        const page = await context.newPage();
        const response = await page.goto(route, { waitUntil: 'load' });
        expect(response?.status(), `${route} must be 200`).toBe(200);
        await expect(page.locator(PROFILE_SHELL)).toBeVisible();
        // Every subresource must finish before the page goes away, otherwise
        // an aborted island request would be recorded as an attempt with no
        // response and the ledger could never balance.
        await page.waitForLoadState('networkidle');
        await page.close();
      }

      const snapshot = ledger.snapshot() as unknown as LedgerSnapshot;
      const observed = new Map<string, ObservedAsset>();
      for (const record of snapshot.successful) {
        if (record.emittedAssetIdentity === null) continue;
        observed.set(
          record.emittedAssetIdentity.path,
          record.emittedAssetIdentity,
        );
      }
      expect(
        observed.size,
        'the routes must load at least one emitted asset',
      ).toBeGreaterThan(0);

      const evidence = await ledger.finalize({
        requireProfileRoutes: true,
        staticAssetEvidence: {
          schemaVersion: 1,
          buildId: manifest.buildIdentity.id,
          manifestSha256: manifest.buildIdentity.manifestSha256,
          observedAssets: [...observed.values()].sort((left, right) =>
            left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
          ),
        },
      });

      // finalize() already fails closed on a non-loopback attempt, a bypassed
      // interception or an unmapped asset; these assertions record the same
      // facts so a regression names the policy it broke.
      expect(evidence.external).toEqual({
        attempted: 0,
        blocked: 0,
        successful: 0,
      });
      expect(evidence.blocked).toEqual([]);
      expect(evidence.interceptionBypassed).toEqual([]);
      expect(evidence.missingProfileRoutes).toEqual([]);
      expect(evidence.missingEmittedAssetIdentities).toEqual([]);
      expect(evidence.guard.pages).toBe(0);
      expect(evidence.guard.inFlightRequests).toBe(0);
      expect(evidence.guard.pendingHandlers).toBe(0);

      await writeJsonFile(environment.requestLedgerEvidencePath, evidence);
      localResourcePolicyHeld = true;
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    if (!localResourcePolicyHeld) return;
    await recordEvidenceFragment({
      specFile: SPEC_FILE,
      project: 'chromium',
      matrixKeys: [],
      obligations: { 'local-resource-policy': 'pass' },
      tools: { playwright: await playwrightVersion() },
    });
  });
});
