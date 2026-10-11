import { defineConfig, devices } from '@playwright/test';

// On macOS use the real GPU (Metal) so WebGL is fast; elsewhere (CI) fall back to SwiftShader.
// CALEX_SWIFTSHADER=1 forces software rendering on a Mac too, to rehearse a CI run locally.
const gpuArgs = process.platform === 'darwin' && !process.env.CALEX_SWIFTSHADER ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  // CI runners render WebGL in software: give every test more time and one retry
  timeout: CI ? 300_000 : 120_000,
  expect: { timeout: CI ? 45_000 : 15_000 },
  fullyParallel: false,
  workers: CI ? 1 : 2,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { args: [...gpuArgs, '--autoplay-policy=no-user-gesture-required'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, userAgent: devices['iPad (gen 7) landscape'].userAgent } },
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, userAgent: devices['iPhone 13 landscape'].userAgent } },
    // Safari engine (iPad / iPhone are where most kids play): `npx playwright install webkit`
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1280, height: 720 }, launchOptions: { args: [] } } },
    { name: 'webkit-tablet', use: { ...devices['iPad (gen 7) landscape'], browserName: 'webkit', launchOptions: { args: [] } } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13 landscape'], browserName: 'webkit', launchOptions: { args: [] } } },
  ],
});
