import { expect, test } from '@playwright/test';
import { recordEvidenceFragment } from './support/evidence.js';
import {
  PROFILE_ROUTES,
  RESPONSIVE_VIEWPORTS,
  responsiveKey,
} from './support/matrix.js';
import {
  PROFILE_SHELL,
  expectNoHorizontalOverflow,
  findClippedContent,
  gotoRoute,
  playwrightVersion,
  setViewport,
} from './support/profile-page.js';

const SPEC_FILE = 'profile-responsive.spec.ts';

const completed: string[] = [];

test.describe('responsive boundaries', () => {
  for (const route of PROFILE_ROUTES) {
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      test(`${route} at ${viewport} reads without overflow or clipping`, async ({
        page,
      }) => {
        await setViewport(page, viewport);
        await gotoRoute(page, route);

        const label = `${route} @ ${viewport}`;
        await expectNoHorizontalOverflow(page, label);

        const clipped = await findClippedContent(page);
        expect(clipped, `${label} hides or truncates profile content`).toEqual(
          [],
        );

        // The content itself must still be laid out, not collapsed to nothing.
        const shell = page.locator(PROFILE_SHELL);
        await expect(shell).toBeVisible();
        const box = await shell.boundingBox();
        expect(box, `${label} must lay out the profile shell`).not.toBeNull();
        expect(box?.height ?? 0).toBeGreaterThan(0);
        expect(box?.width ?? 0).toBeGreaterThan(0);

        completed.push(responsiveKey(route, viewport));
      });
    }
  }

  test.afterAll(async () => {
    const expected = PROFILE_ROUTES.length * RESPONSIVE_VIEWPORTS.length;
    if (completed.length !== expected) return;
    await recordEvidenceFragment({
      specFile: SPEC_FILE,
      project: 'chromium',
      matrixKeys: [...completed].sort(),
      obligations: {
        'responsive-boundaries': 'pass',
        'overflow-clipping-truncation': 'pass',
      },
      tools: { playwright: await playwrightVersion() },
    });
  });
});
