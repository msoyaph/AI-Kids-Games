import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the real single-file build (vite build, then vite preview).
// On a Mac, Chromium draws with the real GPU (Metal); elsewhere (CI) it falls back to SwiftShader,
// and E2E_LOW=1 asks the game for its Low quality and gives the tests more time.
const CI = !!process.env.CI;
const LOW = !!process.env.E2E_LOW;
const mac = process.platform === 'darwin' && !process.env.E2E_SOFTWARE;
const gpuArgs = mac ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const chromium = { launchOptions: { args: gpuArgs } };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: (CI || LOW ? 3 : 1) * 60_000,
  expect: { timeout: (CI || LOW ? 3 : 1) * 8_000 },
  retries: CI ? 1 : 0,
  workers: CI ? 1 : 3,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://127.0.0.1:4769', trace: 'retain-on-failure', actionTimeout: 15_000 },
  webServer: {
    command: 'npx vite build && npx vite preview --host 127.0.0.1 --port 4769 --strictPort',
    url: 'http://127.0.0.1:4769',
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, ...chromium } },
    { name: 'chromium-tablet', use: { ...devices['Galaxy Tab S4'], ...chromium } },
    { name: 'chromium-phone', use: { ...devices['Pixel 7'], ...chromium } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
    { name: 'webkit-tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'] } },
  ],
});
