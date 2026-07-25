import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { parseViewport, type DetailsState, type ThemeName } from './matrix.js';

const SITE_ROOT = resolve(import.meta.dirname, '..', '..', '..');

/** Everything the profile routes own lives inside this shell. */
export const PROFILE_SHELL = '.profile-shell';

/**
 * BaseLayout's inline theme bootstrap reads `localStorage.theme` when no solar
 * cache and no manual override are present, then stamps `data-theme` on the
 * document element. Seeding that state before any page script runs is what
 * makes a theme deterministic instead of time-of-day dependent.
 */
export async function applyTheme(page: Page, theme: ThemeName): Promise<void> {
  await page.addInitScript((value: string) => {
    try {
      // A fresh manual override paired with today's solar cache is the one
      // state the bootstrap resolves straight to the stored theme: the
      // override has crossed no sunrise or sunset, so nothing recomputes it.
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const atHour = (hour: number): string =>
        new Date(
          `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
        ).toISOString();

      window.localStorage.setItem(
        'solar',
        JSON.stringify({
          date: day,
          sunrise: atHour(6),
          sunset: atHour(18),
        }),
      );
      window.localStorage.setItem('theme-manual', now.toISOString());
      window.localStorage.setItem('theme', value);
    } catch {
      /* A context without storage still renders the default theme. */
    }
  }, theme);
}

export async function setViewport(page: Page, viewport: string): Promise<void> {
  await page.setViewportSize(parseViewport(viewport));
}

/**
 * Waits until the route has stopped fetching. Every page must reach this state
 * before it is closed, otherwise an in-flight island request is aborted and the
 * request ledger records an attempt with no matching response.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');
}

export async function gotoRoute(page: Page, route: string): Promise<void> {
  const response = await page.goto(route, { waitUntil: 'load' });
  expect(response, `${route} must produce a response`).not.toBeNull();
  expect(response?.status(), `${route} must be 200`).toBe(200);
  await page.waitForLoadState('networkidle');
}

/**
 * Applies the `details` dimension to the profile content. `/portfolio` owns no
 * disclosure, so `all-open` is a no-op there and the cell still records that
 * the state was exercised.
 */
export async function applyDetailsState(
  page: Page,
  state: DetailsState,
): Promise<void> {
  await page.evaluate(
    ({ selector, open }: { selector: string; open: boolean }) => {
      const shell = document.querySelector(selector);
      if (shell === null) return;
      for (const element of shell.querySelectorAll('details')) {
        element.open = open;
      }
    },
    { selector: PROFILE_SHELL, open: state === 'all-open' },
  );
}

export async function countProfileDetails(page: Page): Promise<number> {
  return page.locator(`${PROFILE_SHELL} details`).count();
}

/** The document must never scroll sideways at any exercised viewport. */
export async function expectNoHorizontalOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  // Sub-pixel layout rounding is tolerated; a real overflow is never 1px.
  expect(
    overflow.scrollWidth,
    `${label} must not scroll horizontally`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export interface ClippedElement {
  readonly selector: string;
  readonly overflowX: string;
  readonly textOverflow: string;
  readonly scrollWidth: number;
  readonly clientWidth: number;
}

/**
 * Content may wrap, but it may never be cut off or ellipsised: a résumé that
 * silently truncates a role or a date is a wrong résumé, not a styled one.
 */
export async function findClippedContent(
  page: Page,
): Promise<readonly ClippedElement[]> {
  return page.evaluate((selector: string) => {
    const shell = document.querySelector(selector);
    if (shell === null) return [] as ClippedElement[];
    const clipped: ClippedElement[] = [];
    for (const element of shell.querySelectorAll<HTMLElement>('*')) {
      const style = window.getComputedStyle(element);
      const hidesOverflow = ['hidden', 'clip'].includes(style.overflowX);
      const ellipsises = style.textOverflow === 'ellipsis';
      const lineClamp = style.getPropertyValue('-webkit-line-clamp');
      const lineClamped = lineClamp !== '' && lineClamp !== 'none';
      const overflows = element.scrollWidth > element.clientWidth + 1;
      if ((hidesOverflow && overflows) || ellipsises || lineClamped) {
        clipped.push({
          selector:
            element.dataset.testid ??
            `${element.tagName.toLowerCase()}.${element.className}`,
          overflowX: style.overflowX,
          textOverflow: style.textOverflow,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        });
      }
    }
    return clipped;
  }, PROFILE_SHELL);
}

async function packageVersion(packageName: string): Promise<string> {
  const manifest = JSON.parse(
    await readFile(
      resolve(SITE_ROOT, 'node_modules', packageName, 'package.json'),
      'utf8',
    ),
  ) as { version?: unknown };
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`${packageName} does not declare a version.`);
  }
  return manifest.version;
}

export async function playwrightVersion(): Promise<string> {
  return packageVersion('@playwright/test');
}

export async function axeVersion(): Promise<string> {
  return packageVersion('axe-core');
}
