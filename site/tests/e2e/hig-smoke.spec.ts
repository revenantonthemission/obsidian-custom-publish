// Runner readiness for the HIG checks (code-generation plan Step 9). It proves
// only that playwright.hig.config.ts builds the fixture vault and serves the
// production build on loopback; the behaviour checks live in the other specs.
import { expect, test } from '@playwright/test';
import { gotoSettled } from './support/hig';

test('serves the fixture build from the production static server on loopback', async ({
  page,
  baseURL,
}) => {
  expect(new URL(baseURL ?? '').hostname).toBe('127.0.0.1');
  expect(await gotoSettled(page, '/')).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  // The code fixture exists only in fixtures/vault, so a 200 here proves the
  // build used fixture content rather than real vault output.
  expect(await gotoSettled(page, '/posts/post-with-code')).toBe(200);
  expect(await gotoSettled(page, '/route-that-does-not-exist')).toBe(404);
});
