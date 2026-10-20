// Shared chrome and the site-wide accessibility matrix (FR4.1, FR2.2–FR2.6,
// FR5.8–FR5.10; checks C-01, C-03, C-04, C-06, C-08, C-09, C-10, C-13 and C-14
// of accessibility-checklist.md, with mockups review findings R-02 and R-06).
import { expect, test, type Page } from '@playwright/test';
import {
  HIG_APPEARANCES,
  HIG_ROUTES,
  HIG_WIDTHS,
  applyTextZoom,
  axeViolations,
  gotoSettled,
  horizontalOverflow,
  measureTargets,
  undersized,
  viewportFor,
} from './support/hig';

const T1 = { width: 44, height: 44 };
/**
 * T1 chrome controls (C-04, R-06): bar buttons and links, the sheet summary,
 * footer links, the site mark. Scoped to the site chrome; the page's own
 * header elements (post and profile headers) are measured by their page specs.
 */
const CHROME_CONTROLS = '.site-header a, .site-header button, .site-header summary, .site-footer a';

/** Computes what a token resolves to on this page, as the browser reports colors. */
async function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((name: string) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

// C-01: zero axe violations on every route, at every width, in both
// appearances, with reduced motion (NFR1, A11Y-13).
for (const width of HIG_WIDTHS) {
  for (const appearance of HIG_APPEARANCES) {
    test.describe(`axe at ${width} px, ${appearance}`, () => {
      test.use({
        viewport: viewportFor(width),
        colorScheme: appearance,
        contextOptions: { reducedMotion: 'reduce' },
      });
      for (const route of HIG_ROUTES) {
        test(`no violations on ${route.path}`, async ({ page }) => {
          await gotoSettled(page, route.path);
          expect(await axeViolations(page)).toEqual([]);
        });
      }
    });
  }
}

// C-04 (chrome part): every T1 control in the bar, the sheet and the footer.
for (const width of [320, 1024] as const) {
  test.describe(`chrome targets at ${width} px`, () => {
    test.use({ viewport: viewportFor(width) });
    for (const route of HIG_ROUTES) {
      test(`T1 controls are at least 44 by 44 on ${route.path}`, async ({ page }) => {
        await gotoSettled(page, route.path);
        const boxes = await measureTargets(page, CHROME_CONTROLS);
        expect(boxes.length).toBeGreaterThan(0);
        expect(undersized(boxes, T1)).toEqual([]);
      });
    }
  });
}

test.describe('navigation sheet and bar on phones', () => {
  test.use({ viewport: viewportFor(320) });

  test('the open sheet lists the four sections at 52 px rows and hides the page behind it', async ({ page }) => {
    await gotoSettled(page, '/');
    await page.getByTestId('mobile-navigation-toggle').click();
    const sheet = page.locator('nav.mobile-nav-dropdown');
    await expect(sheet).toBeVisible();
    // Full height below the bar, not collapsed into it.
    expect((await sheet.boundingBox())?.height ?? 0).toBeGreaterThan(600);
    const rows = await measureTargets(page, 'nav.mobile-nav-dropdown a');
    expect(rows).toHaveLength(4);
    expect(undersized(rows, { width: 200, height: 52 })).toEqual([]);
    for (const selector of ['main', 'footer']) {
      expect(
        await page.locator(selector).evaluate((element) => getComputedStyle(element).visibility),
        `${selector} must be hidden from view and focus`,
      ).toBe('hidden');
    }
    await page.getByTestId('mobile-navigation-toggle').click();
    await expect(sheet).toBeHidden();
    expect(await page.locator('main').evaluate((element) => getComputedStyle(element).visibility)).toBe('visible');
  });

  test('the sheet opens and navigates without JavaScript (C-10)', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: viewportFor(320) });
    const page = await context.newPage();
    await gotoSettled(page, '/');
    await page.getByTestId('mobile-navigation-toggle').click();
    await expect(page.locator('nav.mobile-nav-dropdown')).toBeVisible();
    expect(await page.locator('main').evaluate((element) => getComputedStyle(element).visibility)).toBe('hidden');
    await page.getByTestId('mobile-navigation-link-tags').click();
    await expect(page).toHaveURL(/\/tags\/?$/);
    await context.close();
  });
});

test.describe('the floating glass bar', () => {
  test.use({ viewport: viewportFor(1024) });

  for (const appearance of HIG_APPEARANCES) {
    test(`carries primary text only, with a --c-text focus ring (C-03, R-02), ${appearance}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: appearance });
      await gotoSettled(page, '/tags');
      const primary = await tokenColor(page, '--c-text');
      const offenders = await page.locator('.site-bar').evaluate((bar, expected: string) => {
        const wrong: string[] = [];
        for (const element of bar.querySelectorAll<HTMLElement>('*')) {
          const ownText = [...element.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
          );
          if (!ownText || element.getClientRects().length === 0) continue;
          const color = getComputedStyle(element).color;
          if (color !== expected) wrong.push(`${element.tagName.toLowerCase()} "${element.textContent?.trim()}" ${color}`);
        }
        return wrong;
      }, primary);
      expect(offenders).toEqual([]);
      const current = page.locator('.desktop-nav a[aria-current="page"]');
      await current.focus();
      expect(await current.evaluate((element) => getComputedStyle(element).outlineColor)).toBe(primary);
    });
  }

  test('the bar and the back-to-top capsule use the glass material by default (FR2.4)', async ({ page }) => {
    await gotoSettled(page, '/');
    const surfaces = await page.locator('[data-material]').evaluateAll((elements) =>
      elements.map((element) => ({
        material: element.getAttribute('data-material'),
        backdrop:
          getComputedStyle(element).backdropFilter ||
          getComputedStyle(element).getPropertyValue('-webkit-backdrop-filter'),
      })),
    );
    expect(surfaces.length).toBeGreaterThanOrEqual(2);
    for (const surface of surfaces) {
      expect(surface.backdrop, `${surface.material} glass must blur`).toContain('blur');
    }
  });

  test('every glass surface turns opaque under increased contrast (C-09)', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await gotoSettled(page, '/');
    await expectOpaqueGlass(page);
  });

  test('every glass surface turns opaque under reduced transparency (C-09)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate prefers-reduced-transparency');
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
    await gotoSettled(page, '/');
    await expectOpaqueGlass(page);
  });

  test('the shortcut hint reads ⌘K on Apple platforms and Ctrl K elsewhere (C-13)', async ({ browser, baseURL }) => {
    for (const [platform, hint] of [
      ['MacIntel', '⌘K'],
      ['Win32', 'Ctrl K'],
    ] as const) {
      const context = await browser.newContext({ baseURL, viewport: viewportFor(1024) });
      const page = await context.newPage();
      await page.addInitScript((value: string) => {
        Object.defineProperty(Navigator.prototype, 'platform', { configurable: true, get: () => value });
        Object.defineProperty(Navigator.prototype, 'userAgentData', { configurable: true, get: () => undefined });
      }, platform);
      await gotoSettled(page, '/');
      const shown = await page
        .locator('.search-trigger .search-shortcut')
        .evaluate((element) => (element as HTMLElement).innerText.trim());
      expect(shown, platform).toBe(hint);
      await context.close();
    }
  });

  test('the skip link is the first stop and moves focus to the main content (C-06)', async ({ page, browserName }) => {
    await gotoSettled(page, '/');
    // WebKit's default Tab skips links, as Safari does; Option-Tab reaches them.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const skip = page.getByRole('link', { name: '본문으로 건너뛰기' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});

async function expectOpaqueGlass(page: Page): Promise<void> {
  const surfaces = await page.locator('[data-material]').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        material: element.getAttribute('data-material'),
        backdrop: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') || 'none',
        background: style.backgroundColor,
      };
    }),
  );
  expect(surfaces.length).toBeGreaterThanOrEqual(2);
  for (const surface of surfaces) {
    expect(surface.backdrop, `${surface.material} glass must not blur`).toBe('none');
    expect(surface.background, `${surface.material} glass must be opaque`).toMatch(/^rgb\(/);
  }
}

// C-08: no motion longer than 0.1 s under reduced motion, and back to top jumps.
test.describe('reduced motion', () => {
  test.use({ viewport: viewportFor(1024), contextOptions: { reducedMotion: 'reduce' } });

  for (const route of HIG_ROUTES) {
    test(`no transition or animation exceeds 0.1 s on ${route.path}`, async ({ page }) => {
      await gotoSettled(page, route.path);
      const slow = await page.evaluate(() => {
        const seconds = (value: string): number =>
          Math.max(
            0,
            ...value.split(',').map((part) => {
              const trimmed = part.trim();
              return trimmed.endsWith('ms') ? Number.parseFloat(trimmed) / 1000 : Number.parseFloat(trimmed) || 0;
            }),
          );
        const found: string[] = [];
        for (const element of document.querySelectorAll('*')) {
          for (const pseudo of [null, '::before', '::after'] as const) {
            const style = getComputedStyle(element, pseudo);
            const longest = Math.max(seconds(style.transitionDuration), seconds(style.animationDuration));
            if (longest > 0.1) found.push(`${element.tagName.toLowerCase()}.${element.className}${pseudo ?? ''} ${longest}s`);
          }
        }
        return found.slice(0, 10);
      });
      expect(slow).toEqual([]);
    });
  }

  test('back to top jumps instead of scrolling smoothly', async ({ page }) => {
    await page.setViewportSize(viewportFor(320));
    await gotoSettled(page, '/posts/post-with-code');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const button = page.locator('.back-to-top');
    await expect(button).toBeVisible();
    const afterClick = await button.evaluate((element) => {
      (element as HTMLButtonElement).click();
      return window.scrollY;
    });
    expect(afterClick).toBe(0);
  });
});

// C-14: at 320 px with the text doubled, nothing overflows sideways.
test.describe('200 % text at 320 px', () => {
  test.use({ viewport: viewportFor(320) });
  for (const route of HIG_ROUTES) {
    test(`no horizontal overflow on ${route.path}`, async ({ page }) => {
      await gotoSettled(page, route.path);
      await applyTextZoom(page, 2);
      const report = await horizontalOverflow(page);
      expect(report.offenders).toEqual([]);
      expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth + 1);
    });
  }
});
