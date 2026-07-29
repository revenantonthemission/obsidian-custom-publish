import { defineConfig, devices } from '@playwright/test';

const baseUrlValue = process.env.PROFILE_BASE_URL;

if (!baseUrlValue) {
  throw new Error(
    'PROFILE_BASE_URL is required; start the owned loopback preview through the U1 command router.',
  );
}

const baseUrl = new URL(baseUrlValue);
if (!['127.0.0.1', 'localhost'].includes(baseUrl.hostname)) {
  throw new Error('PROFILE_BASE_URL must use the supervised loopback host.');
}

export default defineConfig({
  testDir: './tests/e2e',
  // The completion matrix spans three projects and therefore three worker
  // processes. Setup clears the previous run's fragments and teardown merges
  // this run's into the single browser evidence record the provider validates.
  globalSetup: './tests/e2e/support/global-setup.ts',
  globalTeardown: './tests/e2e/support/global-teardown.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: '.artifacts/profile/verification/playwright',
  use: {
    baseURL: baseUrl.href,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // crossunit.spec.ts belongs to the U3 command surface (test:crossunit,
      // playwright.crossunit.config.ts) — ignoring it here keeps this
      // project's execution set exactly what it was before U3.
      testIgnore: [/profile-cross-browser\.spec\.ts/, /crossunit\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
      },
    },
    {
      name: 'firefox-focused',
      testMatch: /profile-cross-browser\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox',
      },
    },
    {
      name: 'webkit-focused',
      testMatch: /profile-cross-browser\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        browserName: 'webkit',
      },
    },
    {
      name: 'homepage-firefox',
      testMatch: /homepage\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox',
      },
    },
    {
      name: 'homepage-webkit',
      testMatch: /homepage\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        browserName: 'webkit',
      },
    },
  ],
});
