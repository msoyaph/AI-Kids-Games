/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { communityOrigins } from './scripts/generate-community';

// Same-origin only. connect-src 'self' lets the play page stream its own game file for a real
// progress bar (owner-approved); nothing may load from or connect to another origin. The one
// exception is framing community games from their own play-origin addresses (apps/play), so they
// can't reach the website or each other.
const frames = ["'self'",...communityOrigins()].join(' ');
const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-src ${frames}; object-src 'none'; base-uri 'self'; form-action 'none'`;

const sitePolicy: Plugin = {
  name: 'site-policy-and-font-preload',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html,ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find(file => /nunito-latin-wght.*\.woff2$/.test(file));
      const preload = font ? `\n    <link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin />` : '';
      return html.replace('<meta charset="UTF-8" />',`<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />${preload}`);
    }
  }
};

export default defineConfig({
  plugins: [react(),sitePolicy],
  build: { target: 'es2022',assetsInlineLimit: 0 },
  // The community games list is generated, not committed: make it before any test imports it.
  test: { globalSetup: ['./scripts/generate-community.ts'] }
});
