/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
    modulePreload: false,
  },
  server: { port: Number(process.env.PORT) || 5181, host: true, strictPort: false },
  preview: { port: Number(process.env.PORT) || 4181 },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/sim/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
