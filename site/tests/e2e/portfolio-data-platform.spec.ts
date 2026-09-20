import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  applyDetailsState,
  applyTheme,
  expectNoHorizontalOverflow,
  findClippedContent,
  gotoRoute,
} from './support/profile-page.js';

// These are regression checks, not a new human-review or evidence fragment.
// The existing six profile specs continue to own the verification matrix.
const ROUTE = '/portfolio';
const DOCSURI = '#project-docsuri';
const DIMENSIONS = [
  'problem',
  'role',
  'keyDecisions',
  'architecture',
  'outcomes',
  'lessons',
] as const;
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 900 },
] as const;
const THEMES = ['light', 'dark'] as const;

test.describe('data-platform portfolio', () => {
  test('keeps the DocSuri role, incident and bounded measurement in the document', async ({
    page,
  }) => {
    await gotoRoute(page, ROUTE);
    const article = page.locator(DOCSURI);
    await expect(article).toBeVisible();
    await expect(page.locator('.portfolio-case-study').first()).toHaveAttribute(
      'id',
      'project-docsuri',
    );
    await expect(article.locator('h3')).toHaveText('DocSuri');

    expect(
      await article.locator('[data-profile-dimension]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-profile-dimension')),
      ),
    ).toEqual(DIMENSIONS);

    // These dimensions are the immediately readable case study, not hidden
    // behind a summary. Its larger decision/architecture/lesson notes may fold.
    for (const key of ['problem', 'role', 'outcomes']) {
      const dimension = article.locator(`[data-profile-dimension="${key}"]`);
      await expect(dimension.locator('h4')).toBeVisible();
      expect(await dimension.locator('details').count()).toBe(0);
    }

    const problem = article.locator('[data-profile-dimension="problem"]');
    await expect(problem).toContainText('503');
    await expect(problem).toContainText(/백필|수집/);
    const role = article.locator('[data-profile-dimension="role"]');
    await expect(role).toContainText(/Data Engineer|데이터 엔지니어/);
    await expect(role).toContainText(/코퍼스|수집/);
    await expect(role).toContainText('인프라');

    // Pin the conditions and denominator alongside the attractive number.
    // textContent deliberately includes closed native disclosure bodies.
    const documentText = (await article.textContent()) ?? '';
    expect(documentText).toMatch(/20\s*VU/);
    expect(documentText).toMatch(/664\.9\s*ms/);
    expect(documentText).toMatch(/전체\s*HTTP/);
    expect(documentText).toContain('0.01%');
    expect(documentText).toMatch(/반복.*단일|단일.*반복/);
    expect(documentText).toMatch(/현재|당시|과거/);

    const factIds = await article.locator('[data-profile-fact-id]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('data-profile-fact-id')),
    );
    expect(factIds.length).toBeGreaterThan(0);
    expect(new Set(factIds).size).toBe(factIds.length);
  });

  test('publishes neither private evidence paths nor the retired live-service claim', async ({
    page,
  }) => {
    await gotoRoute(page, ROUTE);
    const text = (await page.locator('.profile-shell').textContent()) ?? '';
    expect(text).not.toMatch(/\/Users\/|\/private\/tmp\/|file:\/\//);
    expect(text).not.toContain('docsuri.org');
    const hrefs = await page.locator('.profile-shell a[href]').evaluateAll(
      (anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
    );
    for (const href of hrefs) {
      expect(href).not.toMatch(/^(?:file:|\/Users\/|\/private\/tmp\/)/);
      expect(href).not.toMatch(/^(?:\.?\.?\/)*(?:aidlc-docs|docs\/portfolio|evidence)\//);
      expect(href).not.toMatch(/^https?:\/\/(?:www\.)?docsuri\.org(?:[/?#]|$)/);
    }
  });

  test('project jump navigation resolves to the existing case-study anchors', async ({
    page,
  }) => {
    await gotoRoute(page, ROUTE);
    const navigation = page.locator('.portfolio-project-navigation');
    await expect(navigation).toBeVisible();
    const links = navigation.locator('a[href]');
    expect(await links.count()).toBe(await page.locator('.portfolio-case-study').count());
    expect(await navigation.locator('[data-profile-fact-id]').count()).toBe(0);

    for (const link of await links.all()) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^#project-[a-z0-9-]+$/);
      await expect(page.locator(href!)).toHaveCount(1);
    }
    const docsuriLink = navigation.locator('a[href="#project-docsuri"]');
    await docsuriLink.focus();
    await expect(docsuriLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/portfolio(?:\/)?#project-docsuri$/);
    await expect(page.locator(DOCSURI)).toBeVisible();
  });

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`details remain keyboard-readable without clipping at ${viewport.width}px ${theme}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await applyTheme(page, theme);
        await gotoRoute(page, ROUTE);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        const disclosures = page.locator(`${DOCSURI} details.case-study-details`);
        expect(await disclosures.count()).toBeGreaterThan(0);
        for (const details of await disclosures.all()) {
          await expect(details).not.toHaveAttribute('open', '');
          const dimension = await details.evaluate((element) =>
            element.closest('[data-profile-dimension]')?.getAttribute('data-profile-dimension'),
          );
          expect(['keyDecisions', 'architecture', 'lessons']).toContain(dimension);
          const summary = details.locator(':scope > summary');
          await expect(summary).toBeVisible();
          await summary.focus();
          await expect(summary).toBeFocused();
          await expectVisibleFocus(summary);
          await page.keyboard.press('Enter');
          await expect(details).toHaveAttribute('open', '');
          await page.keyboard.press('Enter');
          await expect(details).not.toHaveAttribute('open', '');
          await page.keyboard.press('Space');
          await expect(details).toHaveAttribute('open', '');
          await expect(summary).toBeFocused();
        }

        for (const state of ['closed', 'all-open'] as const) {
          await applyDetailsState(page, state);
          await expectNoHorizontalOverflow(page, `portfolio ${viewport.width}px ${theme} ${state}`);
          expect(await findClippedContent(page)).toEqual([]);
          await expectNoAxeViolations(page);
        }

        await applyDetailsState(page, 'closed');
        await page.evaluate(() => window.scrollTo(0, 0));
        const overviewPath = test.info().outputPath(`portfolio-${viewport.width}-${theme}.png`);
        await page.screenshot({ path: overviewPath, fullPage: false });
        await test.info().attach(`portfolio-${viewport.width}-${theme}`, {
          path: overviewPath,
          contentType: 'image/png',
        });
        await page.locator(`${DOCSURI} h3`).scrollIntoViewIfNeeded();
        const caseStudyPath = test.info().outputPath(`docsuri-${viewport.width}-${theme}.png`);
        await page.screenshot({ path: caseStudyPath, fullPage: false });
        await test.info().attach(`docsuri-${viewport.width}-${theme}`, {
          path: caseStudyPath,
          contentType: 'image/png',
        });
      });
    }
  }

  test('native portfolio details remain operable with page JavaScript disabled', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: VIEWPORTS[0],
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(ROUTE, { waitUntil: 'load' });
      expect(response?.status()).toBe(200);
      const details = page.locator(`${DOCSURI} details.case-study-details`).first();
      const summary = details.locator(':scope > summary');
      await expect(summary).toBeVisible();
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await page.keyboard.press('Space');
      await expect(details).not.toHaveAttribute('open', '');
      await expectNoHorizontalOverflow(page, 'portfolio without page JavaScript');
    } finally {
      await context.close();
    }
  });
});

async function expectVisibleFocus(locator: Locator): Promise<void> {
  const indicator = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0)
      || style.boxShadow !== 'none';
  });
  expect(indicator, 'the focused summary must have a visible focus indicator').toBe(true);
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
