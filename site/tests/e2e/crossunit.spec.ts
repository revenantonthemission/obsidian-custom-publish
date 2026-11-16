// U3 LC-U3-06 — no-JS core navigation smoke (NFR-U3-002).
// Runs only under playwright.crossunit.config.ts (chromium, JavaScript
// disabled at the project level). Deliberately outside the U1 evidence
// machinery: writes no evidence fragments, same stance as homepage.spec.ts.
// Existing coverage this complements, not repeats (evidence-mapping.md §1.4):
// profile-cross-browser.spec.ts proves /resume and /portfolio render without
// JavaScript on firefox/webkit — no chromium cell, no homepage, no link
// traversal. This smoke owns exactly that remainder.
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 1440, height: 900 },
] as const;

const CORE_NAV_TARGETS = ['/resume', '/portfolio', '/tags', '/graph'] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`no-JS core navigation ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('homepage renders its opening and both capsules without JavaScript', async ({ page }) => {
      // U1 BR6.4/BR6.6: the opening is static markup, so it is complete with
      // JavaScript off.
      await page.goto('/');
      const main = page.locator('main');
      await expect(main).toBeVisible();
      await expect(main.getByRole('heading', { level: 1, name: 'Passion Project' })).toBeVisible();
      const opening = page.locator('.home-opening');
      await expect(opening.locator('.home-opening-name')).not.toBeEmpty();
      await expect(opening.locator('.home-opening-intro')).not.toBeEmpty();
      await expect(page.getByTestId('home-opening-resume-link')).toHaveAttribute('href', '/resume');
      await expect(page.getByTestId('home-opening-portfolio-link')).toHaveAttribute(
        'href',
        '/portfolio'
      );
      // U2 BR2.1: the weekly list is static markup too. This build sets no
      // build date, so its empty state is the one that renders.
      const week = page.getByTestId('week-list');
      await expect(week.getByRole('heading', { level: 2, name: '이번 주 글' })).toBeVisible();
      await expect(week.getByText('이번 주에 발행한 글이 없습니다.')).toBeVisible();
      await expect(week.getByTestId('all-posts-link')).toHaveAttribute('href', '/writing/all');
    });

    test('header exposes every core navigation target without JavaScript', async ({ page }) => {
      await page.goto('/');
      for (const target of CORE_NAV_TARGETS) {
        expect(
          await page.locator(`header a[href="${target}"]`).count(),
          `header must link to ${target}`
        ).toBeGreaterThan(0);
      }
    });

    test('anchor navigation reaches /resume without JavaScript', async ({ page }) => {
      // The header's mobile menu toggle is JS-driven, so at 320px the header
      // links exist but are hidden without JavaScript (recorded cross-unit
      // fact, ST-E04 report). The no-JS navigation path at every width is the
      // in-content homepage Résumé capsule (U1 BR6.4).
      await page.goto('/');
      await page.getByTestId('home-opening-resume-link').click();
      await expect(page).toHaveURL(/\/resume\/?$/);
      await expect(page.locator('main#main-content')).toBeVisible();
    });

    test('/resume renders directly without JavaScript on chromium', async ({ page }) => {
      await page.goto('/resume');
      await expect(page.locator('h1')).toHaveCount(1);
      const main = page.locator('main#main-content');
      await expect(main).toBeVisible();
      const text = (await main.innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    });
  });
}
