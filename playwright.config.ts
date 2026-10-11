import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;

// CI machines (GitHub-hosted) render WebGL in software on shared CPUs: give them more time, fewer workers
// and one retry; pages also report a 2-core device there so Auto quality picks Low (tests/e2e/fixtures.ts).
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: CI ? 180_000 : 90_000,
  expect: { timeout: CI ? 30_000 : 15_000 },
  fullyParallel: true,
  workers: CI ? 2 : 4,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // pulsing buttons never count as "stable" for Playwright; also exercises the reduced-motion styles
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    {
      name: 'phone-landscape',
      use: { ...devices['Pixel 7 landscape'], deviceScaleFactor: 2 },
    },
    { name: 'phone-portrait', use: { ...devices['Pixel 7'], deviceScaleFactor: 2 } },
    {
      name: 'tablet',
      use: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: devices['iPad Pro 11'].userAgent },
    },
  ],
});
