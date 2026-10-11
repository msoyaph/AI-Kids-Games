import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html: all JS and CSS inlined, no external requests.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    reportCompressedSize: false,
  },
  server: { host: true },
});
