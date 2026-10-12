import { defineConfig } from '@playwright/test';

/**
 * Smoke tests run against the single-file production build (dist/index.html).
 * Run `npm run build` first. Three viewports: desktop, tablet and phone (landscape).
 */
// On macOS use the real GPU (Metal). Elsewhere (CI's Linux runners have no GPU) use software
// WebGL (SwiftShader), which is slow: CI gets longer timeouts, two workers and one retry.
// SPACESKY_SWIFTSHADER=1 rehearses a CI run on a Mac.
const CI = !!process.env.CI;
const software = process.platform !== 'darwin' || !!process.env.SPACESKY_SWIFTSHADER;
const gpuArgs = software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: CI || software ? 300_000 : 120_000,
  expect: { timeout: CI || software ? 30_000 : 10_000 },
  fullyParallel: true,
  workers: CI ? 2 : undefined,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4392',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    // Use the real GPU when available (otherwise headless Chromium renders WebGL in software at ~10 fps).
    launchOptions: { args: gpuArgs },
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
