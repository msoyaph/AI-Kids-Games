import { defineConfig,devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4190', trace: 'retain-on-failure', launchOptions: { ...(existsSync(chrome) ? { executablePath: chrome } : {}),args: ['--enable-webgl','--enable-unsafe-swiftshader'] } },
  projects: [{ name: 'desktop',use: { ...devices['Desktop Chrome'],viewport: { width: 1440,height: 1000 } } },{ name: 'phone',use: { ...devices['iPhone 13'],browserName: 'chromium' } }],
  webServer: { command: 'npm run preview',url: 'http://127.0.0.1:4190',reuseExistingServer: true,timeout: 30000 }
});
