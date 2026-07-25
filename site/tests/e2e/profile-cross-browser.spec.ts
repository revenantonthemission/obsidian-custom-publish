import { expect, test } from '@playwright/test';
import { recordEvidenceFragment } from './support/evidence.js';
import {
  COMPATIBILITY_VIEWPORTS,
  JAVASCRIPT_STATES,
  PROFILE_ROUTES,
  compatibilityKey,
  parseViewport,
  type FocusedEngine,
} from './support/matrix.js';
import { PROFILE_SHELL, playwrightVersion } from './support/profile-page.js';

const SPEC_FILE = 'profile-cross-browser.spec.ts';

/**
 * The two focused projects exist so the non-Chromium engines are exercised
 * deliberately rather than as a side effect of a shared run.
 */
const ENGINE_BY_PROJECT: Readonly<Record<string, FocusedEngine>> =
  Object.freeze({
    'firefox-focused': 'firefox',
    'webkit-focused': 'webkit',
  });

function engineFor(projectName: string): FocusedEngine {
  const engine = ENGINE_BY_PROJECT[projectName];
  if (engine === undefined) {
    throw new Error(
      `Project "${projectName}" is not a focused engine project.`,
    );
  }
  return engine;
}

const completed: string[] = [];
let engineVersion = '';
let engineName: FocusedEngine | undefined;

test.describe('engine compatibility', () => {
  for (const route of PROFILE_ROUTES) {
    for (const viewport of COMPATIBILITY_VIEWPORTS) {
      for (const javaScript of JAVASCRIPT_STATES) {
        test(`${route} at ${viewport} with JavaScript ${javaScript}`, async ({
          browser,
        }, testInfo) => {
          const engine = engineFor(testInfo.project.name);
          engineName = engine;
          engineVersion = browser.version();

          // A dedicated context per cell: `javaScriptEnabled` is a context
          // option, and the disabled half is the whole point of this group.
          const context = await browser.newContext({
            viewport: parseViewport(viewport),
            javaScriptEnabled: javaScript === 'enabled',
          });
          try {
            const page = await context.newPage();
            const response = await page.goto(route, { waitUntil: 'load' });
            expect(response?.status(), `${route} must be 200`).toBe(200);

            // With scripting off the route must still be a complete document:
            // U1 ships no hydrated component of its own, so nothing essential
            // may depend on the island layer having run.
            await expect(page.locator('h1')).toHaveCount(1);
            await expect(page.locator('main#main-content')).toBeVisible();
            await expect(page.locator(PROFILE_SHELL)).toBeVisible();

            const readable = await page.evaluate((selector: string) => {
              const shell = document.querySelector(selector);
              const root = document.documentElement;
              return {
                textLength: (shell?.textContent ?? '').trim().length,
                scrollWidth: root.scrollWidth,
                clientWidth: root.clientWidth,
              };
            }, PROFILE_SHELL);

            expect(
              readable.textLength,
              `${route} must carry its content without scripting`,
            ).toBeGreaterThan(0);
            expect(
              readable.scrollWidth,
              `${route} @ ${viewport} must not scroll horizontally`,
            ).toBeLessThanOrEqual(readable.clientWidth + 1);

            await page.close();
          } finally {
            await context.close();
          }

          completed.push(compatibilityKey(engine, route, viewport, javaScript));
        });
      }
    }
  }

  test.afterAll(async ({}, testInfo) => {
    const expected =
      PROFILE_ROUTES.length *
      COMPATIBILITY_VIEWPORTS.length *
      JAVASCRIPT_STATES.length;
    if (completed.length !== expected || engineName === undefined) return;
    await recordEvidenceFragment({
      specFile: SPEC_FILE,
      project: testInfo.project.name,
      matrixKeys: [...completed].sort(),
      // Both engines must close their half before the matrix is complete; the
      // merge only sees all sixteen keys once each focused project ran.
      obligations: { 'javascript-on-off': 'pass' },
      tools: {
        [engineName]: engineVersion,
        playwright: await playwrightVersion(),
      },
    });
  });
});
