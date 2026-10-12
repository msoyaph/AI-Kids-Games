import { chromium, defineConfig, devices, firefox, webkit, type PlaywrightTestProject } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Smoke tests run against the production single-file build served by `vite preview`.
 * On macOS headless Chromium can use the real GPU through ANGLE/Metal; elsewhere (CI) it
 * falls back to SwiftShader software WebGL, which is slow — these tests check correctness
 * (loads, runs, no console errors), not performance.
 */
// A dedicated port (overridable) — never reuse a server we didn't start, or the suite could
// silently test some other app that happens to be on a common port.
const PORT = Number(process.env.E2E_PORT || 47413);
// CI runs (GitHub Actions sets CI=true): more time, one retry and failure artifacts. GitHub's
// Ubuntu runners render with SwiftShader, where the game's Auto quality picks Low by itself.
const slow = !!process.env.CI;
const gpuArgs = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
/**
 * Projects whose browser is installed. Locally (and in this repo's CI matrix) that's all six; the
 * Ai Kids Games monorepo CI installs Chromium only and so runs the three Chromium projects.
 */
function installedOnly(projects: PlaywrightTestProject[]): PlaywrightTestProject[] {
  const has = (b: { executablePath(): string }): boolean => {
    try {
      return existsSync(b.executablePath());
    } catch {
      return false;
    }
  };
  const ok = { chromium: has(chromium), firefox: has(firefox), webkit: has(webkit) };
  const keep = projects.filter((p) => ok[(p.use?.defaultBrowserType ?? ((p.name ?? '').startsWith('firefox') ? 'firefox' : 'chromium')) as keyof typeof ok]);
  const skipped = projects.filter((p) => !keep.includes(p)).map((p) => p.name);
  if (skipped.length) console.log(`Playwright: skipping ${skipped.join(', ')} (browser not installed)`);
  return keep;
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: slow ? 300_000 : 120_000,
  expect: { timeout: slow ? 20_000 : 5_000 },
  retries: slow ? 1 : 0,
  workers: 1,
  // CI keeps an HTML report plus screenshots / traces of failures (uploaded as artifacts)
  reporter: slow ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: slow ? 'retain-on-failure' : 'off',
    viewport: { width: 1280, height: 720 },
  },
  projects: installedOnly([
    { name: 'chromium', testIgnore: /touch(-playthrough)?\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, launchOptions: { args: gpuArgs } } },
    // Firefox: raw gamepad layouts, different pointer-lock / WebGL paths
    { name: 'firefox', testIgnore: /touch(-playthrough)?\.spec/, use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } } },
    // touch devices (twin-stick controls, tablet tier, rotate hint): Safari engine + Android
    { name: 'webkit-tablet', testMatch: /touch\.spec/, use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'webkit-phone', testMatch: /touch\.spec/, use: { ...devices['iPhone 15 landscape'] } },
    { name: 'chromium-tablet', testMatch: /touch\.spec/, use: { ...devices['Galaxy Tab S9 landscape'], launchOptions: { args: gpuArgs } } },
    // a Chromium phone: real CDP multi-touch at phone size, and the 5-minute touch playthrough
    { name: 'chromium-phone', testMatch: /touch(-playthrough)?\.spec/, use: { ...devices['Pixel 7 landscape'], launchOptions: { args: gpuArgs } } },
  ]),
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
