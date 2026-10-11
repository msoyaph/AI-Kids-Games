import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4319);
// On macOS, new-headless Chromium can render through Metal (60fps). Elsewhere it falls back to
// SwiftShader, which is slow but still works (the tests use generous timings).
const gpuArgs = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1024, height: 700 },
    channel: 'chromium',
    launchOptions: { args: gpuArgs },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
