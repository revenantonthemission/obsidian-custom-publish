// U2 Writing section (functional design rules.md BR1.5, BR2.2–BR2.6;
// mockups M1–M3; accessibility-checklist.md; security-design.md §2). Runs on
// the HIG fixture build, whose build date is fixed at HIG_BUILD_DATE by
// scripts/hig/build-and-serve.mjs. The axe matrix, 44 px chrome targets,
// reduced motion and overflow checks for these routes come from HIG_ROUTES.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import type { PostMeta } from '../../src/lib/types.js';
import { gotoSettled, measureTargets, undersized, viewportFor } from './support/hig';

const TARGET = { width: 44, height: 44 };
/** Where a stuck year header sits: under the floating bar (--bar-inset × 2 + --bar-height). */
const STUCK_TOP = 12 * 2 + 52;
const LIGHT_BG_GROUPED = 'rgb(242, 242, 247)';
const HOSTILE_TITLE = 'Post <b>Bold & Co';

const META_DIR = fileURLToPath(new URL('../../../content/meta', import.meta.url));

/** The ordinary posts the fixture build published (NFR8 reference set). */
function ordinaryPosts(): PostMeta[] {
  return readdirSync(META_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(`${META_DIR}/${file}`, 'utf8')) as PostMeta)
    .filter((post) => !post.is_hub);
}

/** "8월 14일" for 2025-08-14. */
function monthDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

/** Year labels newest first, then "날짜 없음" when a post is undated. */
function expectedYearLabels(posts: readonly PostMeta[]): string[] {
  const years = [
    ...new Set(posts.flatMap((p) => (p.published ? [p.published.slice(0, 4)] : []))),
  ].sort((a, b) => (a < b ? 1 : -1));
  return posts.some((p) => p.published === null) ? [...years, '날짜 없음'] : years;
}

async function trackForeignRequests(page: Page, baseURL: string | undefined): Promise<string[]> {
  const own = new URL(baseURL ?? 'http://127.0.0.1:4329').origin;
  const foreign: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== own) {
      foreign.push(request.url());
    }
  });
  return foreign;
}

test.describe('/writing/all (M3; BR2.3–BR2.6)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('one h1 "모든 글", its document title, and a back link to /writing', async ({ page }) => {
    await gotoSettled(page, '/writing/all');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: '모든 글' })).toBeVisible();
    await expect(page).toHaveTitle('모든 글 — Passion Project');
    const back = page.getByTestId('back-link');
    await expect(back).toHaveAttribute('href', '/writing');
    await expect(back).toHaveText('Writing');
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    ).toBe(LIGHT_BG_GROUPED);
  });

  test('the count is "글 N개" for every ordinary post', async ({ page }) => {
    await gotoSettled(page, '/writing/all');
    await expect(page.locator('.listing-count')).toHaveText(`글 ${ordinaryPosts().length}개`);
  });

  test('year h2s run newest first and "날짜 없음" comes last', async ({ page }) => {
    await gotoSettled(page, '/writing/all');
    const labels = await page.locator('h2.year-header').allTextContents();
    const expected = expectedYearLabels(ordinaryPosts());
    expect(labels.map((label) => label.trim())).toEqual(expected);
    expect(expected.length).toBeGreaterThanOrEqual(3);
    expect(expected.at(-1)).toBe('날짜 없음');
    for (const group of await page.getByTestId('year-group').all()) {
      const id = await group.getAttribute('aria-labelledby');
      await expect(group.locator(`h2#${id}`)).toHaveCount(1);
    }
  });

  test('rows run newest first, title breaking a tie, each dated row with a <time>', async ({
    page,
  }) => {
    await gotoSettled(page, '/writing/all');
    const posts = ordinaryPosts();
    const bySlug = new Map(posts.map((p) => [p.slug, p]));
    const rows = await page.getByTestId('compact-row').evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute('href') ?? '',
        datetime: link.querySelector('time')?.getAttribute('datetime') ?? null,
        time: link.querySelector('time')?.textContent?.trim() ?? null,
      }))
    );
    expect(rows.length).toBe(posts.length);
    for (const row of rows) {
      const post = bySlug.get(row.href.replace('/posts/', ''));
      expect(post, row.href).toBeDefined();
      expect(row.datetime, row.href).toBe(post!.published);
      expect(row.time, row.href).toBe(post!.published ? monthDay(post!.published) : null);
    }
    // 2024-03-01 holds two posts: "Fixture E2E Post" sorts before "Post Linking Homepage".
    const order = rows.map((row) => row.href);
    expect(order.indexOf('/posts/fixture-e2e-post')).toBeLessThan(
      order.indexOf('/posts/post-linking-homepage')
    );
    expect(order[0]).toBe('/posts/this-week-post');
    expect(order.at(-1)).toBe('/posts/undated-post');
  });

  test('the row links are exactly the ordinary posts in content/meta (NFR8)', async ({ page }) => {
    await gotoSettled(page, '/writing/all');
    const hrefs = await page
      .getByTestId('compact-row')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const expected = ordinaryPosts().map((p) => `/posts/${p.slug}`);
    expect([...hrefs].sort()).toEqual([...expected].sort());
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).not.toContain('/posts/hub-page');
    expect(hrefs).not.toContain('/posts/about');
  });

  test('a title holding <b> and & renders literally (NFR5.20)', async ({ page }) => {
    await gotoSettled(page, '/writing/all');
    const row = page.getByTestId('compact-row').filter({ hasText: HOSTILE_TITLE });
    await expect(row).toHaveCount(1);
    await expect(page.locator('main b')).toHaveCount(0);
  });

  test('a year header sticks under the floating bar while its year scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 480 });
    await gotoSettled(page, '/writing/all');
    const header = page.locator('h2.year-header').first();
    await expect(header).toHaveAttribute('data-material', 'thick');
    // Scroll into the first year's rows: its header must stay pinned under the bar.
    await page
      .getByTestId('year-group')
      .first()
      .getByTestId('compact-row')
      .nth(5)
      .evaluate((row) => {
        window.scrollBy(0, row.getBoundingClientRect().top - 200);
      });
    const box = await header.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, position: getComputedStyle(element).position };
    });
    expect(box.position).toBe('sticky');
    expect(Math.abs(box.top - STUCK_TOP)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('a row focused backwards under a stuck header is fully visible (WCAG 2.4.11)', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1024, height: 480 });
    await gotoSettled(page, '/writing/all');
    const rows = page.getByTestId('year-group').first().getByTestId('compact-row');
    // Put row 6 just under where the header sticks, then Shift+Tab to row 5,
    // which is hidden under the header and the bar.
    await rows.nth(6).evaluate((row, stuckTop) => {
      window.scrollBy(0, row.getBoundingClientRect().top - (stuckTop + 4));
      (row as HTMLElement).focus({ preventScroll: true });
    }, STUCK_TOP);
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await expect(rows.nth(5)).toBeFocused();
    const layout = await rows.nth(5).evaluate((row) => {
      const header = row.closest('section')!.querySelector('.year-header')!;
      return {
        rowTop: row.getBoundingClientRect().top,
        rowBottom: row.getBoundingClientRect().bottom,
        headerBottom: header.getBoundingClientRect().bottom,
        viewport: window.innerHeight,
      };
    });
    expect(layout.rowTop).toBeGreaterThanOrEqual(layout.headerBottom - 0.5);
    expect(layout.rowBottom).toBeLessThanOrEqual(layout.viewport + 0.5);
  });

  test('under increased contrast the year header is the solid grouped background', async ({
    page,
  }) => {
    await page.emulateMedia({ contrast: 'more' });
    await gotoSettled(page, '/writing/all');
    const header = page.locator('h2.year-header').first();
    await expect(header).toHaveCSS('background-color', LIGHT_BG_GROUPED);
    await expect(header).toHaveCSS('backdrop-filter', 'none');
  });

  test('under reduced transparency the year header is the solid grouped background', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate prefers-reduced-transparency');
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
    await gotoSettled(page, '/writing/all');
    const header = page.locator('h2.year-header').first();
    await expect(header).toHaveCSS('background-color', LIGHT_BG_GROUPED);
    await expect(header).toHaveCSS('backdrop-filter', 'none');
  });

  test('every request stays on its own origin (NFR2.2)', async ({ page, baseURL }) => {
    const foreign = await trackForeignRequests(page, baseURL);
    await gotoSettled(page, '/writing/all');
    expect(foreign).toEqual([]);
  });

  test('rows and the back link are at least 44 by 44 px', async ({ page }) => {
    for (const width of [320, 1024]) {
      await page.setViewportSize(viewportFor(width));
      await gotoSettled(page, '/writing/all');
      const boxes = await measureTargets(
        page,
        '[data-testid="compact-row"], [data-testid="back-link"]'
      );
      expect(boxes.length).toBe(ordinaryPosts().length + 1);
      expect(undersized(boxes, TARGET), `${width} px`).toEqual([]);
    }
  });
});
