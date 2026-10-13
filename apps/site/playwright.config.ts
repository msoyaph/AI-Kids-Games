import { defineConfig,devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const remote = process.env.AIKG_BASE_URL;
// Temporary Vercel protection-bypass secret for hosted QA on a protected preview (never committed; revoke after use).
const bypass = process.env.AIKG_VERCEL_BYPASS;
// CI runs the site's own browser tests. The long play-throughs (every game played for 20 s on
// desktop, tablet and phone, then saved and reloaded) need a real GPU, so they run locally on the
// release machine before every production release (AIKG_FULL=1 forces them anywhere).
const ci = !!process.env.CI && !process.env.AIKG_FULL;
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ci ? ['**/launch.spec.ts','**/interactions.spec.ts'] : undefined,
  fullyParallel: false,
  workers: 1,
  timeout: ci ? 180000 : 90000,
  reporter: [['list'],['json',{ outputFile: process.env.AIKG_QA_REPORT || 'test-results/launch-results.json' }]],
  expect: { timeout: ci ? 30000 : 10000 },
  use: { actionTimeout: 20000,navigationTimeout: 30000,baseURL: remote || 'http://127.0.0.1:4190',storageState: process.env.AIKG_QA_STORAGE_STATE,extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass,'x-vercel-set-bypass-cookie': 'true' } : undefined,trace: remote ? 'off' : 'retain-on-failure', launchOptions: { ...(existsSync(chrome) ? { executablePath: chrome } : {}),args: ['--enable-webgl','--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'desktop',use: { ...devices['Desktop Chrome'],viewport: { width: 1440,height: 1000 } } },
    { name: 'tablet',use: { ...devices['iPad Pro 11'],browserName: 'chromium' } },
    { name: 'phone',use: { ...devices['iPhone 13'],browserName: 'chromium' } },
    // Safari's fullscreen behavior (standard + webkit-prefixed APIs, iPhone, Home Screen) on WebKit.
    // WebKit refuses port 4190 (on its restricted list), so it gets a second server on 4191.
    // iPadOS Safari is desktop-class WebKit (Mac user agent, element fullscreen) on a touch screen;
    // Playwright's mobile WebKit profiles drop the Fullscreen API altogether, as an iPhone does.
    // Like the GPU play-throughs, these run locally and against the hosted preview before each
    // release; CI installs Chromium only.
    ...(ci ? [] : ['webkit-desktop','webkit-tablet','webkit-phone'] as const).map(name => ({ name,testMatch: /fullscreen\.spec\.ts/,use: {
      ...(name === 'webkit-desktop' ? { ...devices['Desktop Safari'],viewport: { width: 1440,height: 1000 } }
        : name === 'webkit-tablet' ? { ...devices['iPad Pro 11'],isMobile: false,hasTouch: true,userAgent: devices['Desktop Safari'].userAgent }
        : devices['iPhone 13']),
      browserName: 'webkit' as const,launchOptions: {},baseURL: remote || 'http://127.0.0.1:4191' } }))
  ],
  // With AIKG_COMMUNITY_ROOT (CI and local test builds use tests/fixtures/community), community games
  // play from a second local origin, as they do from apps/play's separate addresses when hosted.
  webServer: remote ? undefined : [
    ...[4190,4191].map(port => ({ command: `npx tsx scripts/serve-dist.ts ${port}`,url: `http://127.0.0.1:${port}`,reuseExistingServer: true,timeout: 90000 })),
    ...(process.env.AIKG_COMMUNITY_ROOT ? [{ command: 'npx tsx ../play/scripts/build.ts && npx tsx ../play/scripts/serve.ts 4320',url: 'http://127.0.0.1:4320',reuseExistingServer: true,timeout: 120000 }] : [])
  ]
});
