// Search dialog (FR5.2, FR4.5; C-05, C-06; interaction-spec.md "Search Dialog";
// mockups W9; review finding R-08): a labelled modal dialog over an inert page,
// a combobox driving a listbox, IME-safe keys, a visible close button, and the
// idle, loading, results, empty and error states.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { HIG_WIDTHS, gotoSettled, measureTargets, undersized, viewportFor } from './support/hig';

const TARGET = { width: 44, height: 44 };
const IDLE = '제목이나 본문의 단어로 찾아보세요';
const LOADING = '검색 색인을 불러오는 중';
const FAILED = '검색을 사용할 수 없습니다';

async function openFromBar(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: '검색 열기' }).click();
  const dialog = page.getByRole('dialog', { name: '검색' });
  await expect(dialog).toBeVisible();
  return dialog;
}

function combobox(dialog: Locator): Locator {
  return dialog.getByRole('combobox', { name: '검색어' });
}

test.describe('search dialog', () => {
  test.use({ viewport: viewportFor(1024) });

  test('opens as a labelled modal dialog with focus in the combobox, over an inert page', async ({ page }) => {
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = combobox(dialog);
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('placeholder', '노트 검색');
    const reachedPage = await page.evaluate(() => {
      const link = document.querySelector<HTMLElement>('.site-header a');
      link?.focus();
      return document.activeElement === link;
    });
    expect(reachedPage).toBe(false);
  });

  test('Tab stays inside the dialog and Escape returns focus to the trigger', async ({ page, browserName }) => {
    await gotoSettled(page, '/');
    const trigger = page.getByRole('button', { name: '검색 열기' });
    const dialog = await openFromBar(page);
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    const keys = [tab, tab, tab, tab, `Shift+${tab}`, `Shift+${tab}`, `Shift+${tab}`, `Shift+${tab}`];
    for (const [step, key] of keys.entries()) {
      await page.keyboard.press(key);
      expect(
        await page.evaluate(() => document.activeElement?.closest('dialog') !== null),
        `focus left the dialog after ${step + 1} presses (${key})`,
      ).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('⌘K or Ctrl K opens it from anywhere', async ({ page }) => {
    await gotoSettled(page, '/tags');
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: '검색' });
    await expect(dialog).toBeVisible();
    await expect(combobox(dialog)).toBeFocused();
  });

  test('the combobox drives a listbox: arrows move the selection, Enter opens it', async ({ page }) => {
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    const input = combobox(dialog);
    await expect(dialog.getByText(IDLE)).toBeVisible();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await input.fill('post');
    const listbox = dialog.getByRole('listbox');
    const options = listbox.getByRole('option');
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThanOrEqual(10);
    await expect(dialog.getByRole('status')).toHaveText(`결과 ${count}개`);
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveAttribute('aria-controls', (await listbox.getAttribute('id')) ?? 'missing');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute('aria-activedescendant', (await options.nth(0).getAttribute('id')) ?? 'missing');
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(input).toHaveAttribute('aria-activedescendant', (await options.nth(1).getAttribute('id')) ?? 'missing');
    await page.keyboard.press('ArrowUp');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    const href = await options.nth(0).getAttribute('data-href');
    expect(href).toMatch(/^\/posts\/[^/]+$/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  });

  test('Enter while an IME is composing never opens a result (R-08)', async ({ page }) => {
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    const input = combobox(dialog);
    await input.fill('post');
    await expect(dialog.getByRole('option').first()).toBeVisible();
    const navigations: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest()) navigations.push(request.url());
    });
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true, cancelable: true });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(navigations).toEqual([]);
    await expect(dialog).toBeVisible();
    // The same key without composition does open it, so the check above can fail.
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: false, bubbles: true, cancelable: true });
    await expect(page).toHaveURL(/\/posts\/[^/]+\/?$/);
  });

  test('a Korean query finds Korean text', async ({ page }) => {
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    await combobox(dialog).fill('허브');
    await expect(dialog.getByRole('option', { name: /Empty Hub/ })).toBeVisible();
  });

  test('a query without matches says so', async ({ page }) => {
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    await combobox(dialog).fill('zzqqxx');
    await expect(dialog.getByText('‘zzqqxx’에 대한 결과가 없습니다')).toBeVisible();
    await expect(combobox(dialog)).toHaveAttribute('aria-expanded', 'false');
  });

  test('shows loading until the index arrives, then the idle hint (FR4.5)', async ({ page }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/search-index.json', async (route) => {
      await gate;
      await route.continue();
    });
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    await expect(dialog.getByText(LOADING)).toBeVisible();
    release();
    await expect(dialog.getByText(IDLE)).toBeVisible();
  });

  test('shows an error with a working retry when the index fails (FR4.5)', async ({ page }) => {
    let fail = true;
    await page.route('**/search-index.json', (route) => (fail ? route.abort() : route.continue()));
    await gotoSettled(page, '/');
    const dialog = await openFromBar(page);
    await expect(dialog.getByText(FAILED)).toBeVisible();
    fail = false;
    await dialog.getByRole('button', { name: '다시 시도' }).click();
    await expect(dialog.getByText(IDLE)).toBeVisible();
    await combobox(dialog).fill('simple');
    await expect(dialog.getByRole('option').first()).toBeVisible();
  });
});

for (const width of HIG_WIDTHS) {
  test.describe(`search dialog at ${width} px`, () => {
    test.use({ viewport: viewportFor(width) });

    test('has a visible 44 px close button and the designed placement', async ({ page }) => {
      await gotoSettled(page, '/');
      const dialog = await openFromBar(page);
      const close = dialog.getByRole('button', { name: '검색 닫기' });
      await expect(close).toBeVisible();
      expect(undersized(await measureTargets(page, 'dialog .search-close'), TARGET)).toEqual([]);
      // Measure the resting place, after the entrance animation has finished.
      await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      const box = (await dialog.boundingBox())!;
      if (width < 768) {
        expect(box.x).toBeLessThanOrEqual(1);
        expect(box.width).toBeGreaterThanOrEqual(width - 1);
        expect(box.y).toBeLessThanOrEqual(16);
      } else {
        expect(Math.abs(box.width - 560)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.y - 900 * 0.15)).toBeLessThanOrEqual(2);
      }
      await close.click();
      await expect(dialog).toBeHidden();
    });
  });
}
