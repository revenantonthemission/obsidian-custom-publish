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

/** The hubs the fixture build published (BR1.6 reference set). */
function hubs(): PostMeta[] {
  return readdirSync(META_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(`${META_DIR}/${file}`, 'utf8')) as PostMeta)
    .filter((post) => post.is_hub);
}

/** BR1.3/BR1.4 order: published descending, then title, then slug. */
function byNewest(a: PostMeta, b: PostMeta): number {
  if (a.published !== b.published) {
    if (a.published === null) return 1;
    if (b.published === null) return -1;
    return a.published < b.published ? 1 : -1;
  }
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** The Monday–Sunday range holding the fixed HIG build date (BR1.1). */
function weekRange(iso: string): { start: string; end: string } {
  const day = new Date(`${iso}T00:00:00Z`);
  const monday = new Date(day);
  monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

/** The fixed build date the HIG runner sets (scripts/hig/build-and-serve.mjs). */
const HIG_BUILD_DATE = '2025-08-13';

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

test.describe('homepage "이번 주 글" (M1; BR2.1)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('lists the build week\'s ordinary posts newest first, then "모든 글 보기"', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    const week = weekRange(HIG_BUILD_DATE);
    const expected = ordinaryPosts()
      .filter(
        (post) =>
          post.published !== null && post.published >= week.start && post.published <= week.end
      )
      .sort(byNewest)
      .map((post) => `/posts/${post.slug}`);
    expect(expected.length).toBeGreaterThanOrEqual(2);
    const section = page.getByTestId('week-list');
    await expect(section.getByRole('heading', { level: 2, name: '이번 주 글' })).toBeVisible();
    const hrefs = await section
      .locator('a.grouped-row')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual([...expected, '/writing/all']);
    await expect(section.getByText('이번 주에 발행한 글이 없습니다.')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '오늘 발행된 글' })).toHaveCount(0);
  });

  test('the last row is "모든 글 보기" and opens /writing/all', async ({ page }) => {
    await gotoSettled(page, '/');
    const all = page.getByTestId('all-posts-link');
    await expect(all).toHaveText('모든 글 보기');
    await expect(all).toHaveAttribute('href', '/writing/all');
    await all.click();
    await expect(page).toHaveURL(/\/writing\/all$/);
    await expect(page.getByRole('heading', { level: 1, name: '모든 글' })).toBeVisible();
  });

  test('a row keeps its full post shape at 320 px', async ({ page }) => {
    await page.setViewportSize(viewportFor(320));
    await gotoSettled(page, '/');
    const first = page.getByTestId('week-list').locator('a.grouped-row').first();
    await expect(first.locator('.grouped-row-title')).toBeVisible();
    await expect(first.locator('.grouped-row-summary')).toBeVisible();
    await expect(first.locator('.grouped-row-meta time')).toHaveAttribute('datetime', '2025-08-14');
    await expect(first.locator('.grouped-row-meta')).toContainText('분 읽기');
  });
});

test.describe('/writing (M2; BR2.2)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('one h1 "Writing", its document title, and the grouped background', async ({ page }) => {
    await gotoSettled(page, '/writing');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Writing' })).toBeVisible();
    await expect(page).toHaveTitle('Writing — Passion Project');
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    ).toBe(LIGHT_BG_GROUPED);
  });

  // U3 (BR2.3, AC4.1.5): the capsules point at the moved pages.
  test('the Tags and Graph capsules point at /writing/tags and /writing/graph and open', async ({
    page,
  }) => {
    await gotoSettled(page, '/writing');
    const main = page.getByRole('main');
    const tags = main.getByRole('link', { name: 'Tags', exact: true });
    const graph = main.getByRole('link', { name: 'Graph', exact: true });
    await expect(tags).toHaveAttribute('href', '/writing/tags');
    await expect(graph).toHaveAttribute('href', '/writing/graph');
    await tags.click();
    await expect(page).toHaveURL(/\/writing\/tags$/);
    await page.goBack();
    await graph.click();
    await expect(page).toHaveURL(/\/writing\/graph$/);
  });

  test('"최근 글" holds the five newest dated posts, then "모든 글 보기"', async ({ page }) => {
    await gotoSettled(page, '/writing');
    const recent = page.getByTestId('recent-list');
    await expect(recent.getByRole('heading', { level: 2, name: '최근 글' })).toBeVisible();
    const expected = ordinaryPosts()
      .filter((post) => post.published !== null)
      .sort(byNewest)
      .slice(0, 5)
      .map((post) => `/posts/${post.slug}`);
    const hrefs = (
      await recent
        .locator('a.grouped-row')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    ).filter((href) => href !== '/writing/all');
    expect(hrefs).toEqual(expected);
    const all = page.getByTestId('all-posts-link');
    await expect(all).toHaveAttribute('href', '/writing/all');
    await expect(all).toHaveText('모든 글 보기');
  });

  test('"주제" lists each hub by title with "글 N개" and a /hubs/<slug> link', async ({ page }) => {
    await gotoSettled(page, '/writing');
    const expected = hubs().sort((a, b) =>
      a.title !== b.title ? (a.title < b.title ? -1 : 1) : a.slug < b.slug ? -1 : 1
    );
    const rows = page.getByTestId('topic-row');
    await expect(rows).toHaveCount(expected.length);
    for (const [index, hub] of expected.entries()) {
      const row = rows.nth(index);
      await expect(row).toHaveAttribute('href', `/hubs/${hub.slug}`);
      await expect(row.locator('.grouped-row-title')).toHaveText(hub.title);
      const known = new Set(ordinaryPosts().map((post) => post.slug));
      const count = hub.forward_links.filter((slug) => known.has(slug)).length;
      await expect(row.locator('.grouped-row-count')).toHaveText(`글 ${count}개`);
    }
  });

  test('no hub or site page appears among the rows (BR1.1)', async ({ page }) => {
    await gotoSettled(page, '/writing');
    const hrefs = await page
      .getByTestId('recent-list')
      .locator('a.grouped-row')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).not.toContain('/posts/hub-page');
    expect(hrefs).not.toContain('/posts/empty-hub');
    expect(hrefs.every((href) => href?.startsWith('/posts/') || href === '/writing/all')).toBe(
      true
    );
  });

  test('the click path /writing → 모든 글 보기 → /writing/all works', async ({ page }) => {
    await gotoSettled(page, '/writing');
    await page.getByTestId('all-posts-link').click();
    await expect(page).toHaveURL(/\/writing\/all$/);
    await expect(page.getByRole('heading', { level: 1, name: '모든 글' })).toBeVisible();
  });
});

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
