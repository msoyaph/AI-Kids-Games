import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build: every byte of JS/CSS is inlined into dist/index.html so the
// game works from file:// and inside a sandboxed iframe with no network access.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5_000,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: false },
});
