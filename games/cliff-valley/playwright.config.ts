import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests on the built single file (`dist/index.html`): served over http, opened
 * from file://, and inside a sandboxed iframe, on desktop / tablet / phone sizes.
 * Chromium uses software WebGL (SwiftShader) so it runs anywhere, including CI.
 */
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4181',
    browserName: 'chromium',
    launchOptions: { args: GL },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:only && npx vite preview --port 4181 --strictPort',
    url: 'http://localhost:4181',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true } },
  ],
});
