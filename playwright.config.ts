import { defineConfig } from '@playwright/test';

/**
 * Smoke tests run against the single-file production build (dist/index.html).
 * Run `npm run build` first. Three viewports: desktop, tablet and phone (landscape).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4392',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 4392 --strictPort',
    port: 4392,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 } },
    { name: 'tablet', use: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'phone', use: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true } },
  ],
});
