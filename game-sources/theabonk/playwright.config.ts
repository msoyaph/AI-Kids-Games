import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the production single-file build served by `vite preview`.
 * WebGL in headless Chromium uses SwiftShader (software), so frame rates are low —
 * these tests check correctness (loads, runs, no console errors), not performance.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
