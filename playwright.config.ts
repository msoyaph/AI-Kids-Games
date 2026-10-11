import { defineConfig,devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const remote = process.env.AIKG_BASE_URL;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  reporter: [['list'],['json',{ outputFile: process.env.AIKG_QA_REPORT || 'test-results/launch-results.json' }]],
  expect: { timeout: 10000 },
  use: { actionTimeout: 20000,navigationTimeout: 30000,baseURL: remote || 'http://127.0.0.1:4190',storageState: process.env.AIKG_QA_STORAGE_STATE,trace: remote ? 'off' : 'retain-on-failure', launchOptions: { ...(existsSync(chrome) ? { executablePath: chrome } : {}),args: ['--enable-webgl','--enable-unsafe-swiftshader'] } },
  projects: [{ name: 'desktop',use: { ...devices['Desktop Chrome'],viewport: { width: 1440,height: 1000 } } },{ name: 'tablet',use: { ...devices['iPad Pro 11'],browserName: 'chromium' } },{ name: 'phone',use: { ...devices['iPhone 13'],browserName: 'chromium' } }],
  webServer: remote ? undefined : { command: 'npm run preview',url: 'http://127.0.0.1:4190',reuseExistingServer: true,timeout: 90000 }
});
