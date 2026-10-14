import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the real single-file build (vite build, then vite preview).
const CI = !!process.env.CI;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: CI ? 120_000 : 60_000,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://127.0.0.1:4715', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite build && npx vite preview --host 127.0.0.1 --port 4715 --strictPort',
    url: 'http://127.0.0.1:4715',
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
