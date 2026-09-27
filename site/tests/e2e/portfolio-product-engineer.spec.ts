import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  applyDetailsState,
  applyTheme,
  expectNoHorizontalOverflow,
  findClippedContent,
  gotoRoute,
} from './support/profile-page.js';

const ROUTE = '/portfolio/product-engineer';
const PROJECT_IDS = ['docsuri'] as const;
const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe('product engineer portfolio', () => {
  test('switches roles by keyboard and preserves the selected approved facts', async ({ page }) => {
    await gotoRoute(page, '/portfolio');
    const approvedFacts = new Map(await renderedFacts(page));
    const roles = page.getByRole('navigation', { name: '직무별 포트폴리오', exact: true });
    await expect(roles.getByRole('link', { name: 'Data Engineer / AI', exact: true }))
      .toHaveAttribute('aria-current', 'page');
    await expect(roles.locator('[aria-current="page"]')).toHaveCount(1);

    const productLink = roles.getByRole('link', { name: 'Product Engineer', exact: true });
    await expect(productLink).toHaveAttribute('href', ROUTE);
    await productLink.focus();
    await expect(productLink).toBeFocused();
    await expectVisibleFocus(productLink);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/portfolio\/product-engineer\/?$/);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Product Engineer Portfolio');
    await expect(roles.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(roles.getByRole('link', { name: 'Product Engineer', exact: true }))
      .toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.portfolio-summary')).not.toHaveAttribute('data-profile-fact-id');
    await expect(page.locator('.portfolio-project-focus')).toHaveCount(PROJECT_IDS.length);

    const projectIds = await page.locator('.portfolio-case-study').evaluateAll((elements) =>
      elements.map((element) => element.id),
    );
    expect(projectIds).toEqual(PROJECT_IDS.map((id) => `project-${id}`));
    const facts = await renderedFacts(page);
    expect(facts.length).toBeGreaterThan(0);
    expect(new Set(facts.map(([id]) => id)).size).toBe(facts.length);
    for (const [id, value] of facts) {
      expect(approvedFacts.get(id), `approved fact ${id}`).toBe(value);
    }

    const links = page.locator('.portfolio-project-navigation a[href]');
    expect(await links.count()).toBe(PROJECT_IDS.length);
    for (const link of await links.all()) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^#project-[a-z0-9-]+$/);
      await expect(page.locator(href!)).toHaveCount(1);
    }
    const shellText = await page.locator('.profile-shell').textContent();
    expect(shellText).not.toMatch(/\/Users\/|\/private\/tmp\/|file:\/\/|docsuri\.org/);

    const dataLink = roles.getByRole('link', { name: 'Data Engineer / AI', exact: true });
    await dataLink.focus();
    await expectVisibleFocus(dataLink);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/portfolio\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio');
    await expect(page.locator('.portfolio-case-study').first()).toHaveAttribute('id', 'project-docsuri');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`stays readable and accessible on mobile in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await applyTheme(page, theme);
      await gotoRoute(page, ROUTE);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const roles = page.getByRole('navigation', { name: '직무별 포트폴리오', exact: true });
      await expect(roles).toBeVisible();
      for (const link of await roles.getByRole('link').all()) {
        await expect(link).toBeVisible();
        await link.focus();
        await expect(link).toBeFocused();
        await expectVisibleFocus(link);
      }
      for (const state of ['closed', 'all-open'] as const) {
        await applyDetailsState(page, state);
        await expectNoHorizontalOverflow(page, `product engineer mobile ${theme} ${state}`);
        expect(await findClippedContent(page)).toEqual([]);
        await expectNoAxeViolations(page);
      }
    });
  }

  test('keeps role and project navigation usable without page JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: MOBILE_VIEWPORT,
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(ROUTE, { waitUntil: 'load' });
      expect(response?.status()).toBe(200);
      const projectLink = page.locator('.portfolio-project-navigation a[href="#project-docsuri"]');
      await projectLink.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/portfolio\/product-engineer\/?#project-docsuri$/);
      await expect(page.locator('#project-docsuri')).toBeVisible();
      await expectNoHorizontalOverflow(page, 'product engineer without page JavaScript');

      const dataLink = page.getByRole('navigation', { name: '직무별 포트폴리오', exact: true })
        .getByRole('link', { name: 'Data Engineer / AI', exact: true });
      await dataLink.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/portfolio\/?$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio');
    } finally {
      await context.close();
    }
  });
});

async function renderedFacts(page: Page): Promise<Array<[string, string]>> {
  return page.locator('.profile-shell [data-profile-fact-id]').evaluateAll((elements) =>
    elements.map((element): [string, string] => [
      element.getAttribute('data-profile-fact-id')!,
      (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    ]),
  );
}

async function expectVisibleFocus(locator: Locator): Promise<void> {
  const indicator = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0)
      || style.boxShadow !== 'none';
  });
  expect(indicator, 'the focused portfolio role link must have a visible focus indicator').toBe(true);
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({
    page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'],
  })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);
}
