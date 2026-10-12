import { defineConfig, type Project } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4319);
/** E2E_LOW=1: standard CI runners without a GPU — Low quality, smaller window, slower timings. */
const LOW = !!process.env.E2E_LOW;
// On macOS, new-headless Chromium can render through Metal (60fps). Elsewhere it falls back to
// SwiftShader (software), which is slow but works with Low quality and the scaled timings.
// E2E_SOFTWARE=1 forces SwiftShader on a Mac too, to rehearse the CI job locally.
const software = !!process.env.E2E_SOFTWARE;
const gpuArgs =
  process.platform === 'darwin' && !software
    ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu']
    : ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', ...(software ? ['--use-angle=swiftshader'] : [])];

const chromium = { browserName: 'chromium' as const, channel: 'chromium', launchOptions: { args: gpuArgs } };
const webkit = { browserName: 'webkit' as const };

/** Touch play: phone and tablet, portrait and landscape, in Chromium and WebKit (Safari's engine). */
const SIZES = [
  ['phone-portrait', 390, 844],
  ['phone-landscape', 844, 390],
  ['tablet-portrait', 820, 1180],
  ['tablet-landscape', 1180, 820],
] as const;
const touchProjects: Project[] = [
  ['chromium', chromium],
  ['webkit', webkit],
].flatMap(([engine, use]) =>
  SIZES.map(([name, width, height]) => ({
    name: `${engine}-${name}`,
    testMatch: /(touch|playthrough)\.spec\.ts/,
    use: { ...(use as object), viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  })),
);

export default defineConfig({
  testDir: './e2e',
  timeout: LOW ? 600_000 : 180_000,
  expect: { timeout: LOW ? 60_000 : 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // a tap on something that never becomes tappable fails instead of waiting out the whole test
    actionTimeout: LOW ? 60_000 : 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // keyboard + mouse on a desktop window (the original smoke tests)
    { name: 'desktop', testMatch: /smoke\.spec\.ts/, use: { ...chromium, viewport: LOW ? { width: 800, height: 560 } : { width: 1024, height: 700 } } },
    ...touchProjects,
    // every screen on every phone / tablet size: nothing cut off, overlapping or too small
    { name: 'layout-chromium', testMatch: /layout\.spec\.ts/, use: { ...chromium } },
    { name: 'layout-webkit', testMatch: /layout\.spec\.ts/, use: { ...webkit } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
