import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.COSMOS_PORT ?? 8000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Four projects, each owning a distinct class of failure. See
 * docs/rfcs/0002-quality-gates-and-cicd.md for what belongs where.
 *
 * `visual` is excluded from the default run: screenshot comparison is only
 * meaningful against a fixed renderer, so its baselines are captured on the CI
 * runner and it is invoked explicitly via `npm run test:visual`.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The decks animate heavily; motion would race assertions and screenshots.
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'functional',
      testMatch: /tests[\\/]functional[\\/].*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'e2e',
      testMatch: /tests[\\/]e2e[\\/].*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'regression',
      testMatch: /tests[\\/]regression[\\/].*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'visual',
      testMatch: /tests[\\/]visual[\\/].*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.01,
          animations: 'disabled',
          caret: 'hide',
        },
      },
    },
  ],

  webServer: {
    command: `node tools/serve.js --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
