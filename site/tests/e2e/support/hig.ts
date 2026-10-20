// Shared helpers for the HIG redesign browser checks (playwright.hig.config.ts).
// The route list, widths and axe tags come from accessibility-checklist.md
// (C-01, C-04, C-14) and the team's testing posture: axe with the WCAG 2.2 AA
// tags at 320, 768, 1024 and 1440 px, in light and dark, with reduced motion.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

export const HIG_WIDTHS = Object.freeze([320, 768, 1024, 1440] as const);
export type HigWidth = (typeof HIG_WIDTHS)[number];

export const HIG_VIEWPORT_HEIGHT = 900;

export const HIG_APPEARANCES = Object.freeze(['light', 'dark'] as const);
export type HigAppearance = (typeof HIG_APPEARANCES)[number];

export const AXE_TAGS: readonly string[] = Object.freeze([
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]);

export type HigRouteKind =
  'home' | 'post' | 'hub' | 'tags' | 'tag' | 'graph' | 'not-found' | 'profile';

export interface HigRoute {
  readonly path: string;
  readonly kind: HigRouteKind;
  /** The HTTP status the static server answers with; 200 when absent. */
  readonly status?: number;
}

/**
 * C-01 routes. The fixture vault has no single note with code, math, callouts
 * and diagrams, so the post kind is covered by four fixture notes together.
 */
export const HIG_ROUTES: readonly HigRoute[] = Object.freeze([
  { path: '/', kind: 'home' },
  { path: '/posts/post-with-code', kind: 'post' },
  { path: '/posts/post-with-callouts', kind: 'post' },
  { path: '/posts/post-with-diagrams', kind: 'post' },
  { path: '/posts/post-with-math', kind: 'post' },
  { path: '/hubs/hub-page', kind: 'hub' },
  { path: '/tags', kind: 'tags' },
  { path: '/tags/test', kind: 'tag' },
  { path: '/graph', kind: 'graph' },
  // local-server.mjs serves 404.html with a 404 status, the page under test.
  { path: '/404', kind: 'not-found', status: 404 },
  { path: '/resume', kind: 'profile' },
  { path: '/portfolio', kind: 'profile' },
  { path: '/portfolio/product-engineer', kind: 'profile' },
  { path: '/portfolio/infra-engineer', kind: 'profile' },
] satisfies HigRoute[]);

export function viewportFor(width: number): { width: number; height: number } {
  return { width, height: HIG_VIEWPORT_HEIGHT };
}

/** The status a load of the route must return, so a check never measures an error page by mistake (R-18). */
export function expectedStatus(route: HigRoute): number {
  return route.status ?? 200;
}

/**
 * A dialog, sheet or tab panel that a page check must open before measuring
 * it (NFR1-e, AC4.1; review finding R-18). The route checks load every page
 * with these closed, so they never measured them.
 */
export interface OpenState {
  readonly name: string;
  readonly path: string;
  /** The opener is shown only below this viewport width; at every width when absent. */
  readonly shownBelow?: number;
  readonly opener: (page: Page) => Locator;
  /** Opens the state and waits until its content has rendered. */
  readonly open: (page: Page) => Promise<void>;
}

const outlineSheet = (page: Page): Locator => page.getByRole('dialog', { name: '목차와 탐색' });

async function openOutlineSheet(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: '목차 열기' }).click();
  const sheet = outlineSheet(page);
  await expect(sheet).toBeVisible();
  return sheet;
}

export const OPEN_STATES: readonly OpenState[] = Object.freeze([
  {
    name: 'search dialog with results',
    path: '/',
    opener: (page) => page.getByRole('button', { name: '검색 열기' }),
    open: async (page) => {
      await page.getByRole('button', { name: '검색 열기' }).click();
      const dialog = page.getByRole('dialog', { name: '검색' });
      await dialog.getByRole('combobox', { name: '검색어' }).fill('post');
      await expect(dialog.getByRole('option').first()).toBeVisible();
    },
  },
  {
    name: 'navigation sheet',
    path: '/',
    // chrome.css hides the toggle from 768 px, where the bar lists the sections.
    shownBelow: 768,
    opener: (page) => page.getByTestId('mobile-navigation-toggle'),
    open: async (page) => {
      await page.getByTestId('mobile-navigation-toggle').click();
      await expect(page.locator('nav.mobile-nav-dropdown')).toBeVisible();
    },
  },
  {
    name: 'outline sheet on its 목차 tab',
    path: '/posts/post-with-code',
    // outline.css shows the outline as a panel from 1100 px, without the sheet button.
    shownBelow: 1100,
    opener: (page) => page.getByRole('button', { name: '목차 열기' }),
    open: async (page) => {
      const sheet = await openOutlineSheet(page);
      await expect(sheet.getByRole('tab', { name: '목차' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(sheet.locator('.toc a').first()).toBeVisible();
    },
  },
  {
    name: 'outline sheet on its 탐색 tab',
    path: '/posts/post-with-code',
    shownBelow: 1100,
    opener: (page) => page.getByRole('button', { name: '목차 열기' }),
    open: async (page) => {
      const sheet = await openOutlineSheet(page);
      const tab = sheet.getByRole('tab', { name: '탐색' });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(sheet.locator('.nav-tree a').first()).toBeVisible();
    },
  },
  {
    name: '/graph list',
    path: '/graph',
    opener: (page) => page.getByRole('tab', { name: '목록' }),
    open: async (page) => {
      await page.getByRole('tab', { name: '목록' }).click();
      await expect(
        page.getByRole('tabpanel', { name: '목록' }).locator('.graph-list-note').first()
      ).toBeVisible();
    },
  },
] satisfies OpenState[]);

/** Writes localStorage entries before any page script runs, including the bootstrap. */
export async function seedStorage(
  page: Page,
  entries: Readonly<Record<string, string>>
): Promise<void> {
  await page.addInitScript(
    (values: Record<string, string>) => {
      try {
        for (const [key, value] of Object.entries(values)) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        /* A context without storage keeps its defaults. */
      }
    },
    { ...entries }
  );
}

/** Navigates and waits until the route has stopped fetching. */
export async function gotoSettled(page: Page, path: string): Promise<number | null> {
  const response = await page.goto(path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  return response?.status() ?? null;
}

/** Stops transitions so axe samples resting colors, never mid-fade blends. */
export async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  });
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
}

/** Runs axe with the WCAG 2.2 AA tags and returns one readable line per violation. */
export async function axeViolations(page: Page): Promise<string[]> {
  await freezeMotion(page);
  // @playwright/test and @axe-core/playwright resolve different playwright-core
  // copies; the existing profile and homepage specs use the same cast.
  const results = await new AxeBuilder({
    page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'],
  })
    .withTags([...AXE_TAGS])
    .analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(' | ')}`
  );
}

export interface TargetBox {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/** Bounding boxes of every rendered, visible element matching the selector. */
export async function measureTargets(page: Page, selector: string): Promise<TargetBox[]> {
  return page.evaluate((query: string) => {
    const boxes: { label: string; width: number; height: number }[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(query)) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hidden =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        rect.width === 0 ||
        rect.height === 0 ||
        element.closest('[hidden], [inert], details:not([open]) > :not(summary)') !== null;
      if (hidden) continue;
      const name =
        element.getAttribute('aria-label') ??
        element.textContent?.trim().slice(0, 40) ??
        element.tagName.toLowerCase();
      boxes.push({
        label: `${element.tagName.toLowerCase()}.${element.className} "${name}"`,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      });
    }
    return boxes;
  }, selector);
}

export function undersized(
  boxes: readonly TargetBox[],
  minimum: { readonly width: number; readonly height: number }
): TargetBox[] {
  // Sub-pixel layout rounding is tolerated; a real shortfall is never 0.5 px.
  return boxes.filter(
    (box) => box.width + 0.5 < minimum.width || box.height + 0.5 < minimum.height
  );
}

export interface OverflowReport {
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly offenders: readonly string[];
}

/**
 * The document must never scroll sideways, and no content may be cut off
 * sideways (C-14, AC4.1; review finding R-08). Offenders are:
 * - elements that reach past the viewport, unless an ancestor scrolls them
 *   horizontally (overflow-x auto or scroll). A hidden or clip ancestor does
 *   not excuse them: it cuts them off;
 * - boxes with overflow-x hidden or clip whose content is wider than they are
 *   (scrollWidth past clientWidth), so part of it is cut off.
 * Content that is not rendered shows nothing to cut off, and neither does a
 * visually hidden box (1 × 1 px with its overflow hidden: the
 * screen-reader-only pattern of .visually-hidden and KaTeX's MathML copy) or
 * anything inside one; those clip on purpose.
 */
export async function horizontalOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const limit = root.clientWidth + 1;
    const offenders: string[] = [];
    const describe = (element: Element): string =>
      `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`;
    const clipsSideways = (element: Element): boolean => {
      const overflowX = window.getComputedStyle(element).overflowX;
      return overflowX === 'hidden' || overflowX === 'clip';
    };
    const isVisuallyHidden = (element: Element): boolean =>
      clipsSideways(element) && element.clientWidth <= 1 && element.clientHeight <= 1;
    /** True when the element or one of its ancestors meets the test. */
    const withinAny = (element: Element | null, test: (node: Element) => boolean): boolean => {
      for (let node = element; node !== null && node !== root; node = node.parentElement) {
        if (test(node)) return true;
      }
      return false;
    };
    const isNeverShown = (element: Element): boolean => withinAny(element, isVisuallyHidden);
    const isScrolledIntoReach = (element: Element): boolean =>
      withinAny(element.parentElement, (node) => {
        const overflowX = window.getComputedStyle(node).overflowX;
        return overflowX === 'auto' || overflowX === 'scroll';
      });
    for (const element of document.body.querySelectorAll('*')) {
      if (offenders.length >= 8) break;
      // Content that is not rendered (display: none, or inside a closed
      // details, whose content-visibility: hidden slot still reports a box)
      // cannot overflow the page.
      if (!element.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }))
        continue;
      if (
        clipsSideways(element) &&
        element.scrollWidth > element.clientWidth + 1 &&
        !isNeverShown(element)
      ) {
        offenders.push(
          `${describe(element)} cuts off content: scrollWidth=${element.scrollWidth} clientWidth=${element.clientWidth}`
        );
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.right <= limit) continue;
      if (isScrolledIntoReach(element) || isNeverShown(element)) continue;
      offenders.push(`${describe(element)} right=${Math.round(rect.right)}`);
    }
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders };
  });
}

/**
 * The light and dark values of --c-segment-indicator, the ring that marks a
 * selected segment (NFR1; review finding R-05). hig-tokens.test.ts holds it
 * at 3:1 against the track; the browser checks confirm it is drawn.
 */
export const SEGMENT_INDICATOR = Object.freeze({
  light: 'rgb(99, 99, 102)',
  dark: 'rgb(161, 161, 166)',
} as const);

export interface RenderedContrast {
  readonly label: string;
  readonly ratio: number;
}

/**
 * The text contrast of every matching element as the browser paints it: its
 * color over its own and its ancestors' background colors, composited down
 * to the first opaque one. Backdrop filters are not modelled, so text on glass
 * is held to the token test's worst case instead (C-03).
 */
export async function renderedContrast(page: Page, selector: string): Promise<RenderedContrast[]> {
  return page.locator(selector).evaluateAll((elements) => {
    // Computed colors arrive as rgb()/rgba() in 0–255, or, for a color-mix()
    // value, as color(srgb r g b / a) in 0–1.
    const parse = (value: string): number[] => {
      if (value === 'transparent') return [0, 0, 0, 0];
      const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
      const [r = 0, g = 0, b = 0, alpha = 1] = numbers;
      return value.startsWith('color(') ? [r * 255, g * 255, b * 255, alpha] : [r, g, b, alpha];
    };
    const over = (top: number[], back: number[]): number[] => {
      const alpha = top[3] ?? 1;
      return [0, 1, 2].map((index) => top[index]! * alpha + back[index]! * (1 - alpha)).concat(1);
    };
    const luminance = (rgb: number[]): number => {
      const [r, g, b] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const backdrop = (element: Element): number[] => {
      const layers: number[][] = [];
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        const layer = parse(getComputedStyle(node).backgroundColor);
        if (layer[3]! > 0) layers.push(layer);
        if (layer[3]! >= 1) break;
      }
      const base = layers.at(-1)?.[3] === 1 ? layers.pop()! : [255, 255, 255, 1];
      return layers.reverse().reduce((under, layer) => over(layer, under), base);
    };
    return elements.map((element) => {
      const ground = backdrop(element);
      const text = over(parse(getComputedStyle(element).color), ground);
      const [lighter, darker] = [luminance(text), luminance(ground)].sort((a, b) => b - a);
      return {
        label: `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 40)} "${(element.textContent ?? '').trim().slice(0, 24)}"`,
        ratio: Math.round(((lighter! + 0.05) / (darker! + 0.05)) * 100) / 100,
      };
    });
  });
}

/** C-14: doubles the root font size, which every rem-based type token follows. */
export async function applyTextZoom(page: Page, factor: number): Promise<void> {
  await page.addStyleTag({ content: `html { font-size: ${16 * factor}px !important; }` });
}
