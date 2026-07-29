// U3 LC-U3-08 wiring — dedicated config for the cross-unit no-JS smoke.
// Separate from playwright.config.ts on purpose (PD-U3-02): test:e2e's
// evidence-sealed provider and its five projects stay untouched, and this
// config never reads PROFILE_BASE_URL — it owns a plain `astro preview`
// of the existing build instead. Port 4326 avoids the provider's previews.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4326;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /crossunit\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: '.artifacts/crossunit/playwright',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // --host pins IPv4: astro preview may otherwise bind only ::1, which
    // passes a bare port-readiness check while 127.0.0.1 connections fail.
    command: `npx astro preview --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'crossunit-chromium',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
    },
  ],
});
