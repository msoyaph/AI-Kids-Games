import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the real single-file build (vite build, then vite preview).
// PW_CHANNEL=chrome runs them in an installed Google Chrome instead of Playwright's own browser.
const CI = !!process.env.CI;
const PORT = 4342;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: CI ? 240_000 : 120_000,
  retries: CI ? 1 : 0,
  // one at a time on CI: each browser draws WebGL in software there, and two at once starve each other
  workers: CI ? 1 : 2,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure', channel: process.env.PW_CHANNEL || undefined },
  webServer: {
    command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
