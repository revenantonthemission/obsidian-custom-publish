// Discovery exclusion surfaces (U1 FR2.2; BR-U2 §2.1).
//
// The retired homepage note ("Fixture Homepage.md" in the fixture vault) must
// stay out of every discovery surface: it has no post route, no RSS entry, no
// sitemap entry and no 404 recent-list entry.
//
// The same three checks live in homepage.spec.ts, which runs only under the
// evidence-sealed `npm run test:e2e` and therefore waits for the maintainer's
// manual accessibility record. This copy runs in the HIG suite, against the
// same production static server, so the surfaces are proved on every HIG run
// without that record.
import { expect, test } from '@playwright/test';

const RETIRED_HOMEPAGE_SLUG = 'fixture-homepage';

test.describe('discovery exclusion surfaces (FR2.2)', () => {
  test('the homepage-as-post route is absent', async ({ page }) => {
    const response = await page.goto(`/posts/${RETIRED_HOMEPAGE_SLUG}/`);
    expect(response?.status()).toBe(404);
  });

  test('rss and sitemap carry no homepage entry', async ({ request }) => {
    const rss = await (await request.get('/rss.xml')).text();
    expect(rss).not.toContain(RETIRED_HOMEPAGE_SLUG);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain(RETIRED_HOMEPAGE_SLUG);
  });

  test('the 404 recent list carries no homepage entry', async ({ request }) => {
    const notFound = await (await request.get('/404.html')).text();
    expect(notFound).not.toContain(`/posts/${RETIRED_HOMEPAGE_SLUG}`);
  });
});
