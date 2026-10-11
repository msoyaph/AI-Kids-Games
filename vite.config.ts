import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react(), {
    name: 'private-static-site-policy',
    apply: 'build',
    transformIndexHtml: html => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'" />`)
  }],
  build: { target: 'es2022' }
});
