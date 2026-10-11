import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the production single-file build served by `vite preview`.
 * On macOS headless Chromium can use the real GPU through ANGLE/Metal; elsewhere (CI) it
 * falls back to SwiftShader software WebGL, which is slow — these tests check correctness
 * (loads, runs, no console errors), not performance.
 */
// A dedicated port (overridable) — never reuse a server we didn't start, or the suite could
// silently test some other app that happens to be on a common port.
const PORT = Number(process.env.E2E_PORT || 47413);
const gpuArgs = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, launchOptions: { args: gpuArgs } } },
    // Firefox: raw gamepad layouts, different pointer-lock / WebGL paths
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
