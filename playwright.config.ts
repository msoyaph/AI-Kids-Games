import { defineConfig, devices } from '@playwright/test';

// On macOS use the real GPU (Metal) so WebGL is fast; elsewhere fall back to SwiftShader.
const gpuArgs = process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { args: [...gpuArgs, '--autoplay-policy=no-user-gesture-required'] },
    trace: 'retain-on-failure',
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
