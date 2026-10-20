// Post page (FR4.2, FR5.3–FR5.7; C-05, C-06, C-07, C-14; mockups review
// findings R-03, R-05 and R-11). The outline is a panel from 1100 px and a
// modal sheet below; its rows are 44 px tall at every width (FR5.8).
import { expect, test, type Page } from '@playwright/test';
import { gotoSettled, horizontalOverflow, measureTargets, undersized, viewportFor } from './support/hig';

const CODE_POST = '/posts/post-with-code';
const ROW = { width: 44, height: 44 };

async function openSheet(page: Page) {
  await page.getByRole('button', { name: '목차 열기' }).click();
  const dialog = page.getByRole('dialog', { name: '목차와 탐색' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Composited text-on-fill contrast, as the browser renders it, for every titled callout. */
async function calloutTitleContrast(page: Page): Promise<{ type: string; ratio: number }[]> {
  return page.locator('.callout:has(.callout-title)').evaluateAll((callouts) => {
    // Computed colors arrive as rgb()/rgba() in 0–255, or, for a color-mix()
    // fill, as color(srgb r g b / a) in 0–1.
    const parse = (value: string): number[] => {
      const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
      if (!value.startsWith('color(')) return numbers;
      const [r = 0, g = 0, b = 0, alpha = 1] = numbers;
      return [r * 255, g * 255, b * 255, alpha];
    };
    const over = (top: number[], back: number[]): number[] => {
      const alpha = top[3] ?? 1;
      return [0, 1, 2].map((index) => top[index]! * alpha + back[index]! * (1 - alpha));
    };
    const luminance = (rgb: number[]): number => {
      const [r, g, b] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const page = parse(getComputedStyle(document.documentElement).backgroundColor);
    return callouts.map((callout) => {
      const title = callout.querySelector('.callout-title') as HTMLElement;
      const fill = over(parse(getComputedStyle(callout).backgroundColor), page);
      const text = over(parse(getComputedStyle(title).color), fill);
      const [lighter, darker] = [luminance(text), luminance(fill)].sort((a, b) => b - a);
      return { type: callout.className, ratio: (lighter! + 0.05) / (darker! + 0.05) };
    });
  });
}

test.describe('outline panel from 1100 px', () => {
  test.use({ viewport: viewportFor(1440) });

  test('sits beside the article with 목차 and 탐색 tabs and 44 px rows', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const panel = page.locator('.post-outline');
    await expect(panel).toBeVisible();
    await expect(page.getByRole('button', { name: '목차 열기' })).toBeHidden();
    const article = await page.locator('article').boundingBox();
    const outline = await panel.boundingBox();
    expect(outline!.x).toBeGreaterThanOrEqual(article!.x + article!.width);
    await expect(page.getByRole('tab', { name: '목차' })).toHaveAttribute('aria-selected', 'true');
    const rows = await measureTargets(page, '.post-outline .toc a');
    expect(rows.length).toBeGreaterThan(2);
    expect(undersized(rows, ROW)).toEqual([]);
  });

  test('switches tabs with the arrow, Home and End keys', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const tocTab = page.getByRole('tab', { name: '목차' });
    const navTab = page.getByRole('tab', { name: '탐색' });
    await tocTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(navTab).toBeFocused();
    await expect(navTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: '탐색' })).toBeVisible();
    await page.keyboard.press('Home');
    await expect(tocTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(navTab).toHaveAttribute('aria-selected', 'true');
  });

  test('a post without headings hides 목차 and opens on 탐색', async ({ page }) => {
    await gotoSettled(page, '/posts/post-with-callouts');
    await expect(page.getByRole('tab', { name: '목차' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: '탐색' })).toHaveAttribute('aria-selected', 'true');
  });

  test('tree rows are 44 px tall and toggles expose aria-expanded with Korean names (FR5.4)', async ({ page }) => {
    await gotoSettled(page, '/posts/simple-post');
    await page.getByRole('tab', { name: '탐색' }).click();
    // The tree names a note by its title ("Hub Page"), not by its first heading.
    const toggle = page.getByRole('button', { name: '‘Hub Page’ 접기' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(page.getByRole('button', { name: '‘Hub Page’ 펼치기' })).toHaveAttribute('aria-expanded', 'false');
    const rows = await measureTargets(page, '.post-outline .nav-tree a');
    expect(rows.length).toBeGreaterThan(0);
    expect(undersized(rows, ROW)).toEqual([]);
  });

  test('the tree shows an error with retry when /nav-tree.json fails (FR4.5)', async ({ page }) => {
    let fail = true;
    await page.route('**/nav-tree.json', (route) => (fail ? route.abort() : route.continue()));
    await gotoSettled(page, CODE_POST);
    await page.getByRole('tab', { name: '탐색' }).click();
    await expect(page.getByText('탐색 목록을 불러오지 못했습니다')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: '다시 시도' }).click();
    await expect(page.locator('.post-outline .nav-tree a').first()).toBeVisible();
  });

  test('marks the heading in view as the current location', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    await page.locator('#수식').scrollIntoViewIfNeeded();
    await page.locator('#수식').evaluate((heading) => window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 80));
    await expect(page.locator('.post-outline .toc a[href="#수식"]')).toHaveAttribute('aria-current', 'location');
  });

  test('backlinks, related posts and the local graph sit below the article', async ({ page }) => {
    await gotoSettled(page, '/posts/simple-post');
    const article = await page.locator('article').boundingBox();
    for (const name of ['이 페이지를 참조하는 글', '관련 글', '로컬 그래프']) {
      const heading = page.getByRole('heading', { name, exact: true });
      await expect(heading, name).toBeVisible();
      const box = await heading.boundingBox();
      expect(box!.y, name).toBeGreaterThan(article!.y + article!.height - 1);
    }
  });
});

for (const width of [320, 768] as const) {
  test.describe(`outline sheet at ${width} px`, () => {
    test.use({ viewport: viewportFor(width) });

    test('opens as a modal dialog, traps focus, closes on Escape and returns focus', async ({ page, browserName }) => {
      await gotoSettled(page, CODE_POST);
      const opener = page.getByRole('button', { name: '목차 열기' });
      expect(undersized(await measureTargets(page, '.outline-open'), ROW)).toEqual([]);
      const dialog = await openSheet(page);
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(page.getByRole('tab', { name: '목차' })).toBeFocused();
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      for (let step = 0; step < 12; step += 1) {
        await page.keyboard.press(tab);
        expect(
          await page.evaluate(() => document.activeElement?.closest('dialog') !== null),
          `focus left the sheet after ${step + 1} presses`,
        ).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
    });

    test('has 44 px rows and arrow-key tabs', async ({ page }) => {
      await gotoSettled(page, CODE_POST);
      await openSheet(page);
      expect(undersized(await measureTargets(page, 'dialog .toc a'), ROW)).toEqual([]);
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: '탐색' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('dialog .nav-tree a').first()).toBeVisible();
      expect(undersized(await measureTargets(page, 'dialog .nav-tree a'), ROW)).toEqual([]);
    });
  });
}

test.describe('article controls', () => {
  test.use({ viewport: viewportFor(1024) });

  test('heading fold toggles expose aria-expanded and hide the section (FR5.4)', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const fold = page.getByRole('button', { name: '‘넓은 표’ 섹션 접기' });
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    expect(undersized(await measureTargets(page, '.heading-fold-toggle'), ROW)).toEqual([]);
    await fold.click();
    const unfold = page.getByRole('button', { name: '‘넓은 표’ 섹션 펼치기' });
    await expect(unfold).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.post-content .table-wrapper')).toBeHidden();
    await unfold.click();
    await expect(page.locator('.post-content .table-wrapper')).toBeVisible();
  });

  for (const outcome of ['resolve', 'reject'] as const) {
    test(`the copy button announces when copying ${outcome === 'resolve' ? 'succeeds' : 'fails'}`, async ({ page }) => {
      await page.addInitScript((result: string) => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: () => (result === 'resolve' ? Promise.resolve() : Promise.reject(new Error('denied'))),
          },
        });
      }, outcome);
      await gotoSettled(page, CODE_POST);
      const buttons = page.getByRole('button', { name: '코드 복사' });
      await expect(buttons).toHaveCount(2);
      expect(undersized(await measureTargets(page, '.copy-btn'), ROW)).toEqual([]);
      await buttons.first().click();
      await expect(page.getByTestId('copy-status')).toHaveText(
        outcome === 'resolve' ? '코드를 복사했습니다' : '복사하지 못했습니다',
      );
    });
  }

  for (const appearance of ['light', 'dark'] as const) {
    test(`callout titles reach 4.5:1 on their tinted fill, ${appearance}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: appearance });
      // The fixtures' titled callouts: note (blue), tip (green) and example (purple).
      const pairs: { type: string; ratio: number }[] = [];
      for (const path of ['/posts/post-with-callouts', CODE_POST]) {
        await gotoSettled(page, path);
        pairs.push(...(await calloutTitleContrast(page)));
      }
      expect(pairs.length).toBeGreaterThan(2);
      expect(pairs.filter(({ ratio }) => ratio < 4.5)).toEqual([]);
    });
  }
});

test.describe('narrow widths (R-05)', () => {
  test.use({ viewport: viewportFor(320) });

  test('wide tables, display math and code scroll inside named, focusable regions', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const regions = await page.locator('.post-content :is(.table-wrapper, .katex-display, pre.shiki)').evaluateAll((elements) =>
      elements.map((element) => ({
        kind: element.className,
        overflows: element.scrollWidth > element.clientWidth + 1,
        tabindex: element.getAttribute('tabindex'),
        label: element.getAttribute('aria-label') ?? '',
      })),
    );
    const overflowing = regions.filter(({ overflows }) => overflows);
    expect(overflowing.length).toBeGreaterThanOrEqual(2);
    for (const region of overflowing) {
      expect(region.tabindex, region.kind).toBe('0');
      expect(region.label, region.kind).toMatch(/가로로 스크롤/);
    }
    const report = await horizontalOverflow(page);
    expect(report.offenders).toEqual([]);
  });

  test('diagrams fit the column', async ({ page }) => {
    await gotoSettled(page, '/posts/post-with-diagrams');
    const widths = await page.locator('.post-content img.diagram').evaluateAll((images) =>
      images
        .filter((image) => image.getClientRects().length > 0)
        .map((image) => ({
          image: image.getBoundingClientRect().width,
          column: (image.closest('.post-content') as HTMLElement).clientWidth,
        })),
    );
    expect(widths.length).toBeGreaterThan(0);
    for (const { image, column } of widths) expect(image).toBeLessThanOrEqual(column + 1);
    expect((await horizontalOverflow(page)).offenders).toEqual([]);
  });

  test('long identifiers and addresses wrap instead of overflowing', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const paragraph = page.locator('.post-content p', { hasText: 'transform_outside_fences' });
    const box = await paragraph.boundingBox();
    const column = await page.locator('.post-content').boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(column!.x + column!.width + 1);
    expect(await paragraph.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  });
});

test.describe('link preview (C-07, FR5.7)', () => {
  test.use({ viewport: viewportFor(1440) });

  test('opens on keyboard focus and closes on Escape without moving focus', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const link = page.locator('.post-content a[href^="/posts/simple-post"]').first();
    await link.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Simple Post');
    await expect(link).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id')) ?? 'missing');
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(link).toBeFocused();
  });

  test('opens on hover and stays open while the pointer is on the card', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    const link = page.locator('.post-content a[href^="/posts/simple-post"]').first();
    await link.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await tooltip.hover();
    await expect(tooltip).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(tooltip).toBeHidden();
  });
});

test.describe('link preview on touch', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox has no isMobile emulation');
  test.use({ viewport: viewportFor(390), hasTouch: true, isMobile: true });

  test('a tap navigates at once', async ({ page }) => {
    await gotoSettled(page, CODE_POST);
    await page.locator('.post-content a[href^="/posts/simple-post"]').first().tap();
    await expect(page).toHaveURL(/\/posts\/simple-post\/?$/);
  });
});
