import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single self-contained dist/index.html: all JS + CSS inlined, no external requests.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000,
    reportCompressedSize: false,
  },
  server: { port: Number(process.env.PORT) || 5173, host: '127.0.0.1' },
  preview: { port: Number(process.env.PORT) || 4173, host: '127.0.0.1' },
});
