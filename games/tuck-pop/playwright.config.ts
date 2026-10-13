import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the real single-file build (vite build, then vite preview), on
// Chromium and WebKit, at phone, tablet and desktop sizes, in portrait and landscape.
const CI = !!process.env.CI;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: CI ? 120_000 : 60_000,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : 4,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://127.0.0.1:4444', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite build && npx vite preview --host 127.0.0.1 --port 4444 --strictPort',
    url: 'http://127.0.0.1:4444',
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'chromium-tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'chromium-phone', use: { ...devices['Pixel 7'] } },
    { name: 'chromium-phone-landscape', use: { ...devices['Pixel 7 landscape'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
    { name: 'webkit-tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'] } },
    { name: 'webkit-phone-landscape', use: { ...devices['iPhone 13 landscape'] } },
  ],
});
