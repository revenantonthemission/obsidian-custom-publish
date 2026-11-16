// Homepage smoke (U2 LC-U2-12, rewritten for the U1 site-built opening).
// Deliberately outside the U1 evidence-fragment machinery: this spec writes no
// fragments, matrix keys or obligations — the sealed U1 record rejects extra
// keys (BROWSER_EVIDENCE_INCOMPLETE).

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 1440, height: 900 },
] as const;

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const TODAY_OVERRIDE = process.env.HOMEPAGE_TODAY_OVERRIDE;

for (const viewport of VIEWPORTS) {
  test.describe(`homepage ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { ...viewport } });

    test('the opening renders with internal capsules and no external traffic', async ({ page }) => {
      // NFR-U2-009 requires zero NEW external origins. Since the HIG redesign
      // self-hosts KaTeX and the font (NFR4), no external host is allowed.
      const LEGACY_EXTERNAL_HOSTS = new Set<string>();
      const external: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        if (!local && !LEGACY_EXTERNAL_HOSTS.has(url.hostname)) {
          external.push(request.url());
        }
      });

      await page.goto('/');
      // U1 BR6.2–BR6.4: one Large Title, then the opening with two capsules.
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1, name: 'Passion Project' })).toBeVisible();
      const opening = page.locator('.home-opening');
      await expect(opening).toBeVisible();
      await expect(opening.getByRole('link', { name: 'Résumé' })).toHaveAttribute(
        'href',
        '/resume'
      );
      await expect(opening.getByRole('link', { name: 'Portfolio' })).toHaveAttribute(
        'href',
        '/portfolio'
      );

      // FR-008.2: the temporary external Notion link is gone.
      expect(await page.locator('a[href*="notion"]').count()).toBe(0);
      // The opening is static HTML — no island, no script.
      expect(await opening.locator('astro-island, script').count()).toBe(0);
      // U1 BR6.1: nothing from the retired homepage note or its slot remains.
      expect(await page.content()).not.toContain('profile:slot');
      expect(external).toEqual([]);
    });

    test('shared header navigation is preserved (FE-P-U2-06, AC-U01-03)', async ({ page }) => {
      await page.goto('/');
      for (const href of ['/tags', '/graph', '/resume', '/portfolio']) {
        expect(await page.locator(`a[href="${href}"]`).count(), `nav link ${href}`).toBeGreaterThan(
          0
        );
      }
    });

    test('axe finds no violations (NFR-U2-007)', async ({ page, browserName }) => {
      // U1 parity (NFR-U2-007 "U1과 같은 자동 axe 규칙"): U1 runs axe on
      // chromium only; WebKit reports light-theme text over dark-theme
      // backgrounds for the U1-owned theme machinery — a measurement artifact
      // this unit neither owns nor changes. Functional smoke still runs on
      // all three browsers.
      test.skip(browserName !== 'chromium', 'axe scope follows the U1 chromium-only precedent');
      // Scan under reduced motion (U1 precedent): the page fade otherwise has
      // axe sampling mid-transition colors.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      // The page fade is not reduced-motion-gated, and WebKit keeps reporting
      // mid-transition blends even after Animation.finish(). Neutralize
      // animations at scan time so axe samples the resting colors.
      await page.addStyleTag({
        content:
          '*, *::before, *::after { animation: none !important; transition: none !important; }',
      });
      await page.evaluate(() =>
        document.getAnimations().forEach((animation) => animation.finish())
      );
      // @playwright/test and @axe-core/playwright resolve different playwright-core
      // copies; the U1 spec uses the same cast.
      const results = await new AxeBuilder({
        page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'],
      })
        .withTags(AXE_TAGS)
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('capsules are keyboard reachable under reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      // Focus each anchor directly: WebKit's Tab policy skips links, so a
      // Tab-walk would test the browser default, not our markup.
      const actions = page.locator('.home-opening-actions a');
      for (const index of [0, 1]) {
        await actions.nth(index).focus();
        await expect(actions.nth(index)).toBeFocused();
      }
    });
  });
}

test.describe('discovery exclusion surfaces (BR-U2 §2.1)', () => {
  test('the homepage-as-post route is absent', async ({ page }) => {
    const response = await page.goto('/posts/fixture-homepage/');
    expect(response?.status()).toBe(404);
  });

  test('rss and sitemap carry no homepage entry', async ({ request }) => {
    const rss = await (await request.get('/rss.xml')).text();
    expect(rss).not.toContain('fixture-homepage');
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('fixture-homepage');
  });

  test('the 404 recent list carries no homepage entry', async ({ request }) => {
    const notFound = await (await request.get('/404.html')).text();
    expect(notFound).not.toContain('/posts/fixture-homepage');
  });

  test('an empty week is a plain secondary row, then 모든 글 보기 (BR2.1, US3.4)', async ({
    page,
  }) => {
    // This e2e build sets no build date, so the fixture week holds no post.
    test.skip(Boolean(TODAY_OVERRIDE), 'run without HOMEPAGE_TODAY_OVERRIDE');
    await page.goto('/');
    const section = page.getByTestId('week-list');
    await expect(section.getByRole('heading', { level: 2, name: '이번 주 글' })).toBeVisible();
    const empty = section.getByText('이번 주에 발행한 글이 없습니다.');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveCSS('color', 'rgb(99, 99, 102)');
    await expect(section.locator('a.grouped-row')).toHaveCount(1);
    await expect(section.getByTestId('all-posts-link')).toHaveAttribute('href', '/writing/all');
    await expect(page.getByRole('heading', { name: '오늘 발행된 글' })).toHaveCount(0);
  });
});
