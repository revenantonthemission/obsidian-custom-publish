// HIG redesign browser checks (code-generation plan Step 9; NFR1, NFR3, NFR7).
//
// Separate from playwright.config.ts on purpose: test:e2e's evidence-sealed
// provider and its projects stay untouched. This config owns its own build of
// the fixture vault and serves site/dist through the production static server
// (scripts/hig/build-and-serve.mjs) on 127.0.0.1:4329, which avoids the ports
// of the provider's previews (dynamic), crossunit (4326) and astro dev (4321).
//
// Matrix: the three projects below run every spec in Chromium, Firefox and
// WebKit. The widths (320, 768, 1024, 1440) and the appearances (light, dark)
// are applied inside the specs from tests/e2e/support/hig.ts, so a spec can
// pin the cells it needs (for example the performance spec runs Chromium only).
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.HIG_PORT ?? 4329);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /hig-[a-z-]+\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: process.env.HIG_WORKERS ? Number(process.env.HIG_WORKERS) : 4,
  reporter: [['list']],
  outputDir: '.artifacts/hig/playwright',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/hig/build-and-serve.mjs',
    url: `${BASE_URL}/`,
    // The fixture preprocess renders Mermaid through a headless browser and
    // the Astro build materializes the profile font, so the first start is slow.
    timeout: 600_000,
    reuseExistingServer: process.env.HIG_REUSE_SERVER === '1',
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], browserName: 'firefox' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], browserName: 'webkit' } },
  ],
});
