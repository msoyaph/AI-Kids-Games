/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  define: { __CALEX_VERSION__: JSON.stringify(pkg.version) },
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    reportCompressedSize: false,
  },
  server: { port: 5173, host: true },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/sim/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
