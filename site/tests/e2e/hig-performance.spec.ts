// Performance and third parties (NFR2, NFR4; code-generation plan Step 31).
// Core Web Vitals are measured in Chromium on a mid-range mobile profile, a
// 412 × 823 viewport with 4× CPU throttling, against the local production
// build. NFR2's Interaction to Next Paint needs real input; Total Blocking Time
// stands in for main-thread blocking here, as in a Lighthouse navigation.
import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { HIG_ROUTES, gotoSettled } from './support/hig';

const CWV_ROUTES = [
  '/',
  '/posts/post-with-code',
  '/posts/post-with-diagrams',
  '/graph',
  '/resume',
] as const;
const CPU_SLOWDOWN = 4;
const LCP_LIMIT_MS = 2500;
const CLS_LIMIT = 0.1;
const TBT_LIMIT_MS = 200;
const LONG_TASK_MS = 50;
const BLOG_CSS_GZIP_LIMIT = 30 * 1024;
const BLOG_ROUTES = HIG_ROUTES.filter(({ kind }) => kind !== 'profile').map(({ path }) => path);

interface Vitals {
  readonly lcp: number;
  readonly cls: number;
  readonly tbt: number;
}

/** Loads the route under CPU throttling and reads LCP, CLS and TBT from the page's own entries. */
async function measureVitals(page: Page, path: string): Promise<Vitals> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.addInitScript(() => {
    const state = { lcp: 0, cls: 0, longTasks: [] as { start: number; duration: number }[] };
    Object.assign(window, { __vitals: state });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) state.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        state.longTasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: 'longtask', buffered: true });
  });
  await gotoSettled(page, path);
  // Islands that hydrate when the browser is idle (search) take their turn too.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestIdleCallback(() => requestIdleCallback(() => resolve()), { timeout: 3000 })
      )
  );
  return page.evaluate((longTaskMs: number) => {
    const state = (
      window as unknown as {
        __vitals: { lcp: number; cls: number; longTasks: { start: number; duration: number }[] };
      }
    ).__vitals;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    const tbt = state.longTasks
      .filter(({ start, duration }) => start + duration > fcp)
      .reduce((total, { duration }) => total + Math.max(0, duration - longTaskMs), 0);
    return { lcp: state.lcp, cls: state.cls, tbt };
  }, LONG_TASK_MS);
}

/** Splits CSS into top-level rules by brace depth. */
function topLevelRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push(css.slice(start, index + 1));
        start = index + 1;
      }
    }
  }
  return rules;
}

/** The stylesheet without KaTeX's own rules and font faces, which NFR2 leaves out of the budget. */
function withoutKatex(css: string): string {
  return topLevelRules(css)
    .filter((rule) => {
      const prelude = rule.slice(0, rule.indexOf('{'));
      if (/katex/i.test(prelude)) return false;
      if (prelude.trim().startsWith('@font-face') && /font-family:\s*KaTeX_/i.test(rule))
        return false;
      if (
        prelude.trim().startsWith('@media') &&
        /^\s*\.katex/.test(rule.slice(rule.indexOf('{') + 1))
      )
        return false;
      return true;
    })
    .join('');
}

test.describe('third parties (NFR4)', () => {
  for (const { path } of HIG_ROUTES) {
    test(`${path} requests nothing from another origin`, async ({ page, baseURL }) => {
      const origin = new URL(baseURL ?? 'http://127.0.0.1:4329').origin;
      const foreign: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin)
          foreign.push(request.url());
      });
      await gotoSettled(page, path);
      expect(foreign).toEqual([]);
    });
  }
});

test.describe('Core Web Vitals on a mid-range mobile profile (NFR2)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'CPU throttling and these performance entries are Chromium only'
  );
  test.use({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  for (const path of CWV_ROUTES) {
    test(`${path}: LCP under 2.5 s, CLS under 0.1, TBT under 200 ms`, async ({
      page,
    }, testInfo) => {
      const vitals = await measureVitals(page, path);
      testInfo.annotations.push({
        type: 'vitals',
        description: `LCP ${Math.round(vitals.lcp)} ms, CLS ${vitals.cls.toFixed(3)}, TBT ${Math.round(vitals.tbt)} ms`,
      });
      expect(vitals.lcp, `LCP ${Math.round(vitals.lcp)} ms`).toBeGreaterThan(0);
      expect(vitals.lcp, `LCP ${Math.round(vitals.lcp)} ms`).toBeLessThan(LCP_LIMIT_MS);
      expect(vitals.cls, `CLS ${vitals.cls.toFixed(3)}`).toBeLessThan(CLS_LIMIT);
      expect(vitals.tbt, `TBT ${Math.round(vitals.tbt)} ms`).toBeLessThan(TBT_LIMIT_MS);
    });
  }
});

test.describe('blog CSS budget (NFR2)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'the built CSS is the same in every browser'
  );

  test('each blog route loads at most 30 KiB of gzipped CSS, KaTeX excluded', async ({ page }) => {
    const over: string[] = [];
    for (const path of BLOG_ROUTES) {
      await gotoSettled(page, path);
      const { hrefs, inline } = await page.evaluate(() => ({
        hrefs: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(
          (link) => link.href
        ),
        inline: [...document.querySelectorAll('style')].map((style) => style.textContent ?? ''),
      }));
      const sheets = [...inline];
      for (const href of hrefs) sheets.push(await (await page.request.get(href)).text());
      const gzipBytes = sheets.reduce(
        (total, css) => total + gzipSync(Buffer.from(withoutKatex(css)), { level: 9 }).byteLength,
        0
      );
      if (gzipBytes > BLOG_CSS_GZIP_LIMIT) over.push(`${path}: ${gzipBytes} B`);
    }
    expect(over).toEqual([]);
  });
});
