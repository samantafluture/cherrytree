import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter @cherrytree/server run dev',
      port: 3040,
      reuseExistingServer: !process.env.CI,
      cwd: '../../..',
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter @cherrytree/client run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      cwd: '../../..',
      timeout: 30_000,
    },
  ],
});
