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
      testIgnore: /profile-cross-browser\.spec\.ts/,
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
  ],
});
