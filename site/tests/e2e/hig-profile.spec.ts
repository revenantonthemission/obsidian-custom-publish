// Profile pages and print (FR4.4, FR5.8, FR6.1; mockups W12–W14; review
// finding R-09). The approved facts, every data-profile-* attribute and the
// classes profile-presentation.test.ts pins stay as they are; these checks
// cover the HIG presentation around them. Colors are the light tokens.
import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import {
  gotoSettled,
  horizontalOverflow,
  measureTargets,
  undersized,
  viewportFor,
} from './support/hig';

const TARGET = { width: 44, height: 44 };
const PROFILE_ROUTES = [
  '/resume',
  '/portfolio',
  '/portfolio/product-engineer',
  '/portfolio/infra-engineer',
] as const;
const PORTFOLIO_ROUTES = [
  '/portfolio',
  '/portfolio/product-engineer',
  '/portfolio/infra-engineer',
] as const;
/** Routes whose shared stylesheets define what every page loads anyway. */
const BASELINE_ROUTES = ['/404', '/tags', '/graph'] as const;
const PROFILE_CSS_GZIP_LIMIT = 24 * 1024;
const CONTROLS = '.profile-shell :is(nav a, .profile-actions a, summary, .resume-project-link)';

const LIGHT = {
  bgGrouped: 'rgb(242, 242, 247)',
  surface: 'rgb(255, 255, 255)',
  fill: 'rgba(120, 120, 128, 0.12)',
} as const;

async function pageBackground(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
}

/** Every stylesheet a route applies, external or inline, as exact bytes. */
async function routeStylesheets(page: Page, path: string): Promise<Map<string, Buffer>> {
  await gotoSettled(page, path);
  const { hrefs, inline } = await page.evaluate(() => ({
    hrefs: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(
      (link) => link.href
    ),
    inline: [...document.querySelectorAll('style')].map((style) => style.textContent ?? ''),
  }));
  const sheets = new Map<string, Buffer>();
  for (const href of hrefs) {
    sheets.set(new URL(href).pathname, Buffer.from(await (await page.request.get(href)).body()));
  }
  for (const text of inline) sheets.set(`inline:${text}`, Buffer.from(text));
  return sheets;
}

test.describe('profile pages (W12, W13)', () => {
  test.use({ viewport: viewportFor(1024) });

  for (const path of PROFILE_ROUTES) {
    test(`${path} sits on the grouped background with a segmented local navigation`, async ({
      page,
    }) => {
      await gotoSettled(page, path);
      expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
      const navigation = page.locator('nav.profile-local-navigation');
      await expect(navigation.locator('ul')).toHaveCSS('background-color', LIGHT.fill);
      await expect(navigation.locator('a[aria-current="page"]')).toHaveCSS(
        'background-color',
        LIGHT.surface
      );
      expect(undersized(await measureTargets(page, '.profile-local-navigation a'), TARGET)).toEqual(
        []
      );
    });
  }

  for (const path of PORTFOLIO_ROUTES) {
    test(`${path} switches roles with a segmented control and jumps to projects by 44 px chips`, async ({
      page,
    }) => {
      await gotoSettled(page, path);
      const roles = page.locator('nav.portfolio-role-navigation');
      await expect(roles.locator('ul')).toHaveCSS('background-color', LIGHT.fill);
      await expect(roles.locator('a[aria-current="page"]')).toHaveCSS(
        'background-color',
        LIGHT.surface
      );
      expect(
        undersized(await measureTargets(page, '.portfolio-role-navigation a'), TARGET)
      ).toEqual([]);

      const chips = await page.locator('.portfolio-project-navigation a').evaluateAll((links) =>
        links.map((link) => {
          const style = getComputedStyle(link);
          return {
            text: link.textContent ?? '',
            icon: link.querySelector('svg[aria-hidden="true"]') !== null,
            capsule:
              Number.parseFloat(style.borderTopLeftRadius) >=
              link.getBoundingClientRect().height / 2 - 1,
          };
        })
      );
      expect(chips.length).toBeGreaterThan(0);
      for (const chip of chips) {
        expect(chip.text, 'no Unicode arrow glyph (FR5.9)').not.toMatch(/[↘→↗]/);
        expect(chip.icon, chip.text).toBe(true);
        expect(chip.capsule, chip.text).toBe(true);
      }
      expect(
        undersized(await measureTargets(page, '.portfolio-project-navigation a'), TARGET)
      ).toEqual([]);
    });

    test(`${path} shows each case study as a grouped card with closed disclosures`, async ({
      page,
    }) => {
      await gotoSettled(page, path);
      const cards = await page.locator('article.portfolio-case-study').evaluateAll((articles) =>
        articles.map((article) => {
          const style = getComputedStyle(article);
          return {
            id: article.id,
            background: style.backgroundColor,
            radius: style.borderTopLeftRadius,
            dimensions: article.querySelectorAll('[data-profile-dimension] > h4').length,
            open: article.querySelectorAll('details.case-study-details[open]').length,
          };
        })
      );
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        expect(card, card.id).toEqual({
          id: card.id,
          background: LIGHT.surface,
          radius: '22px',
          dimensions: 6,
          open: 0,
        });
      }
    });
  }

  test('résumé entries are grouped rows with a chevron, never a + or − glyph, and skills are grouped', async ({
    page,
  }) => {
    await gotoSettled(page, '/resume');
    const rows = await page.locator('details.resume-entry').evaluateAll((entries) =>
      entries.map((entry) => {
        const summary = entry.querySelector('summary')!;
        return {
          open: (entry as HTMLDetailsElement).open,
          background: getComputedStyle(entry).backgroundColor,
          marker: getComputedStyle(summary, '::after').content,
        };
      })
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.open).toBe(false);
      expect(row.background).toBe(LIGHT.surface);
      expect(row.marker).not.toMatch(/[+−]/);
    }
    const skills = await page
      .locator('.resume-skill-group')
      .evaluateAll((groups) => groups.map((group) => getComputedStyle(group).backgroundColor));
    expect(skills.length).toBeGreaterThan(0);
    for (const background of skills) expect(background).toBe(LIGHT.surface);
  });

  for (const path of ['/resume', '/portfolio'] as const) {
    test(`${path} contact actions are 44 px capsules`, async ({ page }) => {
      await gotoSettled(page, path);
      const actions = await page.locator('.contact-actions a').evaluateAll((links) =>
        links.map((link) => ({
          text: link.textContent?.trim() ?? '',
          capsule:
            Number.parseFloat(getComputedStyle(link).borderTopLeftRadius) >=
            link.getBoundingClientRect().height / 2 - 1,
        }))
      );
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) expect(action.capsule, action.text).toBe(true);
      expect(undersized(await measureTargets(page, '.contact-actions a'), TARGET)).toEqual([]);
    });
  }
});

test.describe('profile pages at 320 px', () => {
  test.use({ viewport: viewportFor(320) });

  for (const path of PROFILE_ROUTES) {
    test(`${path} keeps every control at 44 px and never scrolls sideways`, async ({ page }) => {
      await gotoSettled(page, path);
      const controls = await measureTargets(page, CONTROLS);
      expect(controls.length).toBeGreaterThan(3);
      expect(undersized(controls, TARGET)).toEqual([]);
      const report = await horizontalOverflow(page);
      expect(report.offenders).toEqual([]);
      expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth + 1);
    });
  }
});

test.describe('profile CSS budget', () => {
  test('the stylesheets only profile routes load stay within 24 KiB gzip', async ({ page }) => {
    const baseline: Map<string, Buffer>[] = [];
    for (const path of BASELINE_ROUTES) baseline.push(await routeStylesheets(page, path));
    const shared = new Set(
      [...baseline[0]!.keys()].filter((key) => baseline.every((sheets) => sheets.has(key)))
    );
    const profile = new Map<string, Buffer>();
    for (const path of PROFILE_ROUTES) {
      for (const [key, bytes] of await routeStylesheets(page, path)) {
        if (!shared.has(key)) profile.set(key, bytes);
      }
    }
    expect(profile.size).toBeGreaterThan(0);
    const gzipBytes = [...profile.values()].reduce(
      (total, bytes) => total + gzipSync(bytes, { level: 9 }).byteLength,
      0
    );
    expect(gzipBytes).toBeLessThanOrEqual(PROFILE_CSS_GZIP_LIMIT);
  });
});

test.describe('résumé print (W14; R-09)', () => {
  test('prints on A4 with 12 mm margins, every text run at 10 pt or more with a line height of 1.35 or more', async ({
    page,
  }) => {
    await gotoSettled(page, '/resume');
    await page.emulateMedia({ media: 'print' });
    const report = await page.evaluate(() => {
      const rules = [...document.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });
      // Browsers serialize the page size in either case ("A4" or "a4").
      const pages = rules
        .filter((rule): rule is CSSPageRule => rule instanceof CSSPageRule)
        .map((rule) => ({
          size: rule.style.getPropertyValue('size').toLowerCase(),
          margin: rule.style.getPropertyValue('margin'),
        }));
      const pointInPixels = 96 / 72;
      const offenders = new Set<string>();
      for (const element of document.querySelectorAll<HTMLElement>('.profile-shell *')) {
        const ownText = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''
        );
        if (!ownText || element.getClientRects().length === 0) continue;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden') continue;
        const size = Number.parseFloat(style.fontSize);
        const line =
          style.lineHeight === 'normal' ? Number.NaN : Number.parseFloat(style.lineHeight);
        if (size < 10 * pointInPixels - 0.05 || !(line >= size * 1.35 - 0.05)) {
          offenders.add(
            `${element.tagName.toLowerCase()}.${element.className} ${size.toFixed(2)}px / ${style.lineHeight}`
          );
        }
      }
      return { pages, offenders: [...offenders].slice(0, 20) };
    });
    expect(report.pages).toContainEqual({ size: 'a4', margin: '12mm' });
    expect(report.offenders).toEqual([]);
  });
});
