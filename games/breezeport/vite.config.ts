/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The built game may not load or send anything: no network at all. (Added to the build only,
// because the dev server needs to load modules and its live-reload connection.)
const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const noNetwork: Plugin = {
  name: 'no-network-csp',
  apply: 'build',
  transformIndexHtml: html => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
};

// One self-contained dist/index.html: every script, style and asset inlined (the game contract).
export default defineConfig({
  base: './',
  plugins: [noNetwork, viteSingleFile({ removeViteModuleLoader: true })],
  build: { target: 'es2020', assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
  server: { port: Number(process.env.PORT) || 5715 },
  preview: { port: Number(process.env.PORT) || 4715 },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts', 'tests/sim/**/*.test.ts'], testTimeout: 600_000 },
});
