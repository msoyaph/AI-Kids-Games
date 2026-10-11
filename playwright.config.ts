import { defineConfig } from '@playwright/test';

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

export default defineConfig({
  testDir: './e2e',
  timeout: LOW ? 600_000 : 180_000,
  expect: { timeout: LOW ? 60_000 : 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: LOW ? { width: 800, height: 560 } : { width: 1024, height: 700 },
    channel: 'chromium',
    launchOptions: { args: gpuArgs },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
