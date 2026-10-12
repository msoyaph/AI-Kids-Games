import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the production single-file build served by `vite preview`.
 * On macOS headless Chromium can use the real GPU through ANGLE/Metal; elsewhere (CI) it
 * falls back to SwiftShader software WebGL, which is slow — these tests check correctness
 * (loads, runs, no console errors), not performance.
 */
const gpuArgs = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: gpuArgs,
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
