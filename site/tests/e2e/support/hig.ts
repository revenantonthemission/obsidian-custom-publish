// Shared helpers for the HIG redesign browser checks (playwright.hig.config.ts).
// The route list, widths and axe tags come from accessibility-checklist.md
// (C-01, C-04, C-14) and the team's testing posture: axe with the WCAG 2.2 AA
// tags at 320, 768, 1024 and 1440 px, in light and dark, with reduced motion.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

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
  { path: '/404', kind: 'not-found' },
  { path: '/resume', kind: 'profile' },
  { path: '/portfolio', kind: 'profile' },
  { path: '/portfolio/product-engineer', kind: 'profile' },
  { path: '/portfolio/infra-engineer', kind: 'profile' },
] satisfies HigRoute[]);

export function viewportFor(width: number): { width: number; height: number } {
  return { width, height: HIG_VIEWPORT_HEIGHT };
}

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
 * The document must never scroll sideways. Offenders are elements that reach
 * past the viewport while no ancestor scrolls them horizontally.
 */
export async function horizontalOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const limit = root.clientWidth + 1;
    const offenders: string[] = [];
    const scrollsSideways = (element: Element | null): boolean => {
      for (let node = element; node !== null && node !== root; node = node.parentElement) {
        const overflowX = window.getComputedStyle(node).overflowX;
        if (
          overflowX === 'auto' ||
          overflowX === 'scroll' ||
          overflowX === 'hidden' ||
          overflowX === 'clip'
        ) {
          return true;
        }
      }
      return false;
    };
    for (const element of document.body.querySelectorAll('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.right <= limit) continue;
      // Content that is not rendered (display: none, or inside a closed
      // details, whose content-visibility: hidden slot still reports a box)
      // cannot overflow the page.
      if (!element.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }))
        continue;
      if (scrollsSideways(element.parentElement)) continue;
      offenders.push(
        `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)} right=${Math.round(rect.right)}`
      );
      if (offenders.length >= 8) break;
    }
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders };
  });
}

/** C-14: doubles the root font size, which every rem-based type token follows. */
export async function applyTextZoom(page: Page, factor: number): Promise<void> {
  await page.addStyleTag({ content: `html { font-size: ${16 * factor}px !important; }` });
}
