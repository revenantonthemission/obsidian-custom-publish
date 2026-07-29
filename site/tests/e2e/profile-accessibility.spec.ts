import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { recordEvidenceFragment } from './support/evidence.js';
import {
  AXE_VIEWPORTS,
  DETAILS_STATES,
  PROFILE_ROUTES,
  THEMES,
  axeKey,
} from './support/matrix.js';
import {
  PROFILE_SHELL,
  applyDetailsState,
  applyTheme,
  axeVersion,
  countProfileDetails,
  gotoRoute,
  playwrightVersion,
  setViewport,
} from './support/profile-page.js';

const SPEC_FILE = 'profile-accessibility.spec.ts';

/**
 * WCAG 2.0/2.1 A and AA plus 2.2 AA, with no blanket exclusion: the whole
 * document is analysed, chrome included, because a reader meets the page as a
 * whole and not as the part this unit happens to own.
 */
const WCAG_TAGS: readonly string[] = Object.freeze([
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]);

const completed: string[] = [];
let chromiumVersion = '';

test.describe('accessibility', () => {
  for (const route of PROFILE_ROUTES) {
    for (const viewport of AXE_VIEWPORTS) {
      for (const theme of THEMES) {
        for (const details of DETAILS_STATES) {
          test(`axe ${route} ${viewport} ${theme} ${details}`, async ({
            page,
          }) => {
            await applyTheme(page, theme);
            await setViewport(page, viewport);
            await gotoRoute(page, route);
            await applyDetailsState(page, details);

            // The theme must actually be the one under test, otherwise the
            // contrast findings describe a state nobody asked for.
            await expect(page.locator('html')).toHaveAttribute(
              'data-theme',
              theme,
            );

            chromiumVersion =
              page.context().browser()?.version() ?? chromiumVersion;

            // @playwright/test and @axe-core/playwright resolve different
            // playwright-core installs, so the structurally identical Page
            // types are nominally distinct. The value passed is the real page.
            const results = await new AxeBuilder({
              page: page as unknown as ConstructorParameters<
                typeof AxeBuilder
              >[0]['page'],
            })
              .withTags([...WCAG_TAGS])
              .analyze();

            expect(
              results.violations.map((violation) => ({
                id: violation.id,
                impact: violation.impact,
                nodes: violation.nodes.map((node) => node.target),
              })),
              `${route} ${viewport} ${theme} ${details} must have no WCAG violations`,
            ).toEqual([]);

            completed.push(axeKey(route, viewport, theme, details));
          });
        }
      }
    }
  }

  test('native disclosures answer the keyboard', async ({ page }) => {
    await gotoRoute(page, '/resume');
    const detailsCount = await countProfileDetails(page);
    expect(
      detailsCount,
      '/resume must own native disclosures',
    ).toBeGreaterThan(0);

    const summary = page.locator(`${PROFILE_SHELL} details > summary`).first();
    const disclosure = page.locator(`${PROFILE_SHELL} details`).first();

    await summary.focus();
    await expect(summary).toBeFocused();
    // A real <details> toggles on Enter and on Space without any script.
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await page.keyboard.press('Enter');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(disclosure).toHaveAttribute('open', '');
  });

  test('the skip link reaches main content by keyboard alone', async ({
    page,
  }) => {
    await gotoRoute(page, '/resume');
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toBeFocused();
    // A skip link that is not visible once focused helps nobody.
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('focus stays visible while tabbing the profile', async ({ page }) => {
    await gotoRoute(page, '/resume');

    for (let step = 0; step < 15; step += 1) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        if (element === null || element === document.body) return null;
        const style = window.getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
          visible: box.width > 0 && box.height > 0,
        };
      });
      if (focused === null) continue;

      expect(
        focused.visible,
        `a focused ${focused.tag} must occupy space on screen`,
      ).toBe(true);
      const hasIndicator =
        (focused.outlineStyle !== 'none' &&
          Number.parseFloat(focused.outlineWidth) > 0) ||
        focused.boxShadow !== 'none';
      expect(
        hasIndicator,
        `a focused ${focused.tag} must carry a visible focus indicator`,
      ).toBe(true);
    }
  });

  test('reduced motion is honoured', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoRoute(page, '/resume');

    const animated = await page.evaluate(() => {
      const offending: string[] = [];
      for (const element of document.querySelectorAll<HTMLElement>('*')) {
        const style = window.getComputedStyle(element);
        const duration = Number.parseFloat(style.transitionDuration) || 0;
        const animation = Number.parseFloat(style.animationDuration) || 0;
        if (duration > 0.1 || animation > 0.1) {
          offending.push(
            `${element.tagName.toLowerCase()}.${element.className}`,
          );
        }
      }
      return offending;
    });

    expect(
      animated,
      'no element may animate for longer than a moment under reduced motion',
    ).toEqual([]);
    await page.emulateMedia({ reducedMotion: null });
  });

  test.afterAll(async () => {
    const expected =
      PROFILE_ROUTES.length *
      AXE_VIEWPORTS.length *
      THEMES.length *
      DETAILS_STATES.length;
    if (completed.length !== expected) return;
    await recordEvidenceFragment({
      specFile: SPEC_FILE,
      project: 'chromium',
      matrixKeys: [...completed].sort(),
      obligations: {
        'axe-wcag-2.2-aa': 'pass',
        'keyboard-and-focus': 'pass',
        'native-details': 'pass',
      },
      tools: {
        axe: await axeVersion(),
        chromium: chromiumVersion,
        playwright: await playwrightVersion(),
      },
    });
  });
});
