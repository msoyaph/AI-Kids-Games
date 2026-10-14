import { defineConfig,devices } from '@playwright/test';
import { existsSync } from 'node:fs';
// The widget in a local host harness (harness/): four origins on 127.0.0.1:4330-4333, like a real
// assistant. Chromium always; outside CI also WebKit (the srcdoc player under a strict CSP) and Firefox
// (the gamepad check).
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ci = !!process.env.CI;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: ci ? 180_000 : 120_000,
  expect: { timeout: ci ? 30_000 : 15_000 },
  reporter: [['list']],
  use: { actionTimeout: 20_000,trace: 'retain-on-failure',launchOptions: { ...(!ci && existsSync(chrome) ? { executablePath: chrome } : {}),args: ['--enable-webgl','--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'chromium',use: { ...devices['Desktop Chrome'],viewport: { width: 1280,height: 900 } } },
    ...(ci ? [] : [
      { name: 'webkit',testMatch: /(widget|gamepad)\.spec\.ts/,use: { ...devices['Desktop Safari'],viewport: { width: 1280,height: 900 },launchOptions: {} } },
      // Firefox enforces Permissions Policy differently: it checks the gamepad question in a third engine.
      { name: 'firefox',testMatch: /gamepad\.spec\.ts/,use: { ...devices['Desktop Firefox'],viewport: { width: 1280,height: 900 },launchOptions: {} } }
    ])
  ],
  webServer: { command: 'npm run build && npx tsx harness/run.ts',url: 'http://127.0.0.1:4330/health',reuseExistingServer: !ci,timeout: 180_000 }
});
