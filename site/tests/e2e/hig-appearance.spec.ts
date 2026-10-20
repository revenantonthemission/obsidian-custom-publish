// FR3 appearance model (C-10, C-11; mockups review finding R-07). The site
// follows the system appearance unless the reader picks light or dark; the
// choice is applied before first paint, legacy theme state never carries over,
// and nothing about the reader's location is ever requested.
import { expect, test, type Page } from '@playwright/test';
import { gotoSettled, seedStorage, viewportFor } from './support/hig';

const LEGACY_KEYS = ['theme', 'theme-manual', 'solar', 'geo', 'geo-denied'];
// Every check runs on `/`, which sits on --c-bg-grouped (mockups W5).
const LIGHT_BG = 'rgb(242, 242, 247)';
const DARK_BG = 'rgb(0, 0, 0)';
const APPEARANCE_BUTTON = /^화면 모드: /;

/** Aborts every built island chunk, so only the inline bootstrap can act. */
async function blockIslands(page: Page): Promise<void> {
  await page.route('**/_astro/*.js', (route) => route.abort());
}

async function waitForIslands(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
}

async function pageState(page: Page) {
  return page.evaluate((legacyKeys: string[]) => {
    const root = document.documentElement;
    let stored: Record<string, string | null> = {};
    try {
      stored = Object.fromEntries(
        ['appearance', ...legacyKeys].map((key) => [key, window.localStorage.getItem(key)]),
      );
    } catch {
      stored = { blocked: 'true' };
    }
    return {
      theme: root.getAttribute('data-theme'),
      appearance: root.getAttribute('data-appearance'),
      background: window.getComputedStyle(root).backgroundColor,
      stored,
    };
  }, LEGACY_KEYS);
}

test.describe('appearance model', () => {
  test.use({ viewport: viewportFor(1024) });

  test('a first visit requests no location and calls no sunrise service', async ({ page }) => {
    const sunriseRequests: string[] = [];
    await page.route('**/api.sunrise-sunset.org/**', (route) => {
      sunriseRequests.push(route.request().url());
      return route.abort();
    });
    await page.addInitScript(() => {
      const calls: string[] = [];
      Object.defineProperty(window, '__geolocationCalls', { value: calls });
      const geolocation = navigator.geolocation;
      if (geolocation) {
        geolocation.getCurrentPosition = () => {
          calls.push('getCurrentPosition');
        };
        geolocation.watchPosition = () => {
          calls.push('watchPosition');
          return 0;
        };
      }
    });
    await gotoSettled(page, '/');
    await waitForIslands(page);
    const calls = await page.evaluate(
      () => (window as unknown as { __geolocationCalls: string[] }).__geolocationCalls,
    );
    expect(calls).toEqual([]);
    expect(sunriseRequests).toEqual([]);
  });

  test('stale legacy theme state renders Automatic and every legacy key is removed', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await seedStorage(page, {
      theme: 'dark',
      'theme-manual': new Date().toISOString(),
      solar: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      geo: JSON.stringify({ lat: 37.5, lng: 127 }),
      'geo-denied': '1',
    });
    await gotoSettled(page, '/');
    const state = await pageState(page);
    expect(state.theme ?? '').toBe('');
    expect(state.appearance).toBe('auto');
    expect(state.background).toBe(LIGHT_BG);
    for (const key of LEGACY_KEYS) {
      expect(state.stored[key], `${key} must be removed`).toBeNull();
    }
  });

  test('an unrecognized stored value renders Automatic, following the system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await seedStorage(page, { appearance: 'bogus' });
    await gotoSettled(page, '/');
    const state = await pageState(page);
    expect(state.theme ?? '').toBe('');
    expect(state.appearance).toBe('auto');
    expect(state.background).toBe(DARK_BG);
  });

  test('a stored light choice renders light before any island hydrates, with the system dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await seedStorage(page, { appearance: 'light' });
    await blockIslands(page);
    await gotoSettled(page, '/');
    const state = await pageState(page);
    expect(state.theme).toBe('light');
    expect(state.appearance).toBe('light');
    expect(state.background).toBe(LIGHT_BG);
  });

  test('blocked storage renders Automatic and the button still works for the page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage is blocked', 'SecurityError');
        },
      });
    });
    await gotoSettled(page, '/');
    await waitForIslands(page);
    expect((await pageState(page)).appearance).toBe('auto');
    const button = page.getByRole('button', { name: APPEARANCE_BUTTON });
    await button.click();
    await expect(button).toHaveAccessibleName('화면 모드: 라이트');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('without JavaScript the page follows the system appearance', async ({ browser, baseURL }) => {
    for (const [colorScheme, background] of [
      ['dark', DARK_BG],
      ['light', LIGHT_BG],
    ] as const) {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled: false,
        colorScheme,
        viewport: viewportFor(1024),
      });
      const page = await context.newPage();
      await gotoSettled(page, '/');
      expect((await pageState(page)).background, colorScheme).toBe(background);
      await context.close();
    }
  });

  test('the button names the stored choice before hydration (R-07)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await seedStorage(page, { appearance: 'dark' });
    await blockIslands(page);
    await gotoSettled(page, '/');
    await expect(page.getByRole('button', { name: APPEARANCE_BUTTON })).toHaveAccessibleName('화면 모드: 다크');
    expect((await pageState(page)).background).toBe(DARK_BG);
  });
});

for (const width of [320, 1024] as const) {
  test.describe(`appearance button at ${width} px`, () => {
    test.use({ viewport: viewportFor(width) });

    test('cycles 자동, 라이트, 다크 and back, announcing and storing each mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await gotoSettled(page, '/');
      await waitForIslands(page);
      // Exactly one appearance button exists at every width.
      const button = page.getByRole('button', { name: APPEARANCE_BUTTON });
      const status = page.getByTestId('appearance-status');
      await expect(button).toHaveAccessibleName('화면 모드: 자동');

      const steps = [
        { name: '화면 모드: 라이트', announced: '화면 모드: 라이트', theme: 'light', stored: 'light', background: LIGHT_BG },
        { name: '화면 모드: 다크', announced: '화면 모드: 다크', theme: 'dark', stored: 'dark', background: DARK_BG },
        { name: '화면 모드: 자동', announced: '화면 모드: 자동 (시스템 설정을 따름)', theme: '', stored: 'auto', background: LIGHT_BG },
      ];
      for (const step of steps) {
        await button.click();
        await expect(button).toHaveAccessibleName(step.name);
        await expect(status).toHaveText(step.announced);
        const state = await pageState(page);
        expect(state.theme ?? '').toBe(step.theme);
        expect(state.stored.appearance).toBe(step.stored);
        expect(state.background).toBe(step.background);
      }
    });
  });
}
