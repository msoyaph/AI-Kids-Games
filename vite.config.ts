import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Same-origin only. connect-src 'self' lets the play page stream its own game file for a real
// progress bar (owner-approved); nothing may load from or connect to another origin.
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

const sitePolicy: Plugin = {
  name: 'site-policy-and-font-preload',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html,ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find(file => /nunito-latin-wght.*\.woff2$/.test(file));
      const preload = font ? `\n    <link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin />` : '';
      return html.replace('<head>',`<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />${preload}`);
    }
  }
};

export default defineConfig({
  plugins: [react(),sitePolicy],
  build: { target: 'es2022',assetsInlineLimit: 0 }
});
