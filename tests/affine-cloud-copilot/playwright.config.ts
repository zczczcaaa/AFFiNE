import { testResultDir } from '@affine-test/kit/playwright';
import type {
  PlaywrightTestConfig,
  PlaywrightWorkerOptions,
} from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  fullyParallel: !process.env.CI,
  timeout: 120_000,
  outputDir: testResultDir,
  use: {
    baseURL: 'http://localhost:8080/',
    browserName:
      (process.env.BROWSER as PlaywrightWorkerOptions['browserName']) ??
      'chromium',
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1440, height: 800 },
    actionTimeout: 10 * 1000,
    locale: 'en-US',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  forbidOnly: !!process.env.CI,
  workers: 4,
  retries: 3,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: [
    {
      command: 'yarn run -T affine dev -p @affine/web',
      port: 8080,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      env: {
        COVERAGE: process.env.COVERAGE || 'false',
      },
    },
    {
      command: 'yarn run -T affine dev -p @affine/server',
      port: 3010,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://affine:affine@localhost:5432/affine',
        NODE_ENV: 'test',
        AFFINE_ENV: process.env.AFFINE_ENV ?? 'dev',
        DEBUG: 'affine:*',
        FORCE_COLOR: 'true',
        DEBUG_COLORS: 'true',
        MAILER_HOST: '0.0.0.0',
        MAILER_PORT: '1025',
        MAILER_SENDER: 'noreply@toeverything.info',
        MAILER_USER: 'noreply@toeverything.info',
        MAILER_PASSWORD: 'affine',
      },
    },
  ],
};

if (process.env.CI) {
  config.retries = 3;
}

export default config;
