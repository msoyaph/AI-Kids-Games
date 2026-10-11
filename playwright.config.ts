import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list']],
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
