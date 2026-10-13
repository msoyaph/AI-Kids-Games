import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the real single-file build (vite build, then vite preview), on
// Chromium and WebKit at desktop, tablet and phone sizes. Traces are kept only for failures.
const CI = !!process.env.CI;
const PORT = 4246;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: CI ? 240_000 : 120_000,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : 3,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure', video: 'off', screenshot: 'only-on-failure' },
  webServer: {
    command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'chromium-tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'chromium-phone', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
    { name: 'webkit-tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'] } },
  ],
});
